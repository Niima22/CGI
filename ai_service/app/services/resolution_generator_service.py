from __future__ import annotations

import json
from pathlib import Path
from zipfile import ZipFile
import xml.etree.ElementTree as ET

from sklearn.metrics.pairwise import cosine_similarity

from app.models.schemas import (
    GenerateResolutionFrameRequest,
    GenerateResolutionFrameResponse,
    SimilarResolutionCase,
)
from app.services.embedding_service import EmbeddingService


RESOLUTION_TYPES = [
    "01 - Aide à l’utilisation",
    "02 - Correction donnée ou modification de paramétrage",
    "03 - Script, fix ou contournement",
    "04 - Aucune action nécessaire ou possible",
    "05 - Hors périmètre support",
    "06 - Intervention sur matériel",
]

SPREADSHEET_NS = {"a": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
REL_NS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"


class ResolutionGeneratorService:
    def __init__(self) -> None:
        data_dir = Path(__file__).resolve().parents[1] / "data"
        excel_path = self._find_excel_dataset(data_dir)
        primary_json_path = data_dir / "trame_quality_examples.json"
        fallback_json_path = data_dir / "clean_resolution_examples.json"

        self._examples = self._load_knowledge_base(excel_path, primary_json_path, fallback_json_path)
        self._example_texts = [self._example_to_text(example) for example in self._examples]
        self._embedding_service = EmbeddingService(self._example_texts)
        self._example_embeddings = self._embedding_service.encode(self._example_texts)

    def generate(self, request: GenerateResolutionFrameRequest) -> GenerateResolutionFrameResponse:
        similar_cases = self._find_similar_cases(request)
        missing_elements = self._missing_elements(request)
        resolution_type = self._suggest_resolution_type(request, similar_cases)
        resolution_frame = self._build_resolution_frame(request, resolution_type)
        quality_score = self._quality_score(resolution_frame, request, missing_elements)
        confidence_score = self._confidence_score(similar_cases, missing_elements)

        return GenerateResolutionFrameResponse(
            resolutionFrame=resolution_frame,
            resolutionType=resolution_type,
            qualityScore=quality_score,
            confidenceScore=confidence_score,
            missingElements=missing_elements,
            similarCases=similar_cases,
        )

    def _find_excel_dataset(self, data_dir: Path) -> Path | None:
        matches = list(data_dir.glob("Copie de TDC Qualit*.xlsx"))
        return matches[0] if matches else None

    def _load_knowledge_base(
        self,
        excel_path: Path | None,
        primary_json_path: Path,
        fallback_json_path: Path,
    ) -> list[dict[str, object]]:
        if excel_path and excel_path.exists():
            excel_examples = self._load_excel_examples(excel_path)
            if excel_examples:
                return excel_examples

        if primary_json_path.exists():
            primary_examples = self._load_json_examples(primary_json_path)
            if primary_examples:
                return primary_examples

        fallback_examples = self._load_json_examples(fallback_json_path)
        if not fallback_examples:
            raise RuntimeError("Resolution examples knowledge base is empty.")

        return fallback_examples

    def _load_json_examples(self, data_path: Path) -> list[dict[str, object]]:
        with data_path.open(encoding="utf-8") as file:
            examples = json.load(file)

        if not isinstance(examples, list):
            raise RuntimeError(f"{data_path.name} must be a JSON list.")

        return [example for example in examples if isinstance(example, dict)]

    def _load_excel_examples(self, data_path: Path) -> list[dict[str, object]]:
        rows = self._read_xlsx_sheet(data_path, "Picking")
        if not rows:
            return []

        headers = [str(value).strip() for value in rows[0]]
        examples: list[dict[str, object]] = []

        for row in rows[1:]:
            record = {headers[index]: row[index] if index < len(row) else "" for index in range(len(headers))}
            example = {
                "bannette": self._cell_text(record.get("Bannette")),
                "ticketTitle": self._cell_text(record.get("Titre")),
                "description": self._cell_text(record.get("Description")),
                "solution": self._cell_text(record.get("Solution")),
                "resolutionType": self._cell_text(record.get("Type de résolution")),
                "requestSummary": self._cell_text(record.get("Synthèse de la demande")),
                "actionsResult": self._cell_text(record.get("Actions / Résultat")),
                "correctedResolutionType": self._cell_text(record.get("Correction Type de résolution")),
            }

            if example["ticketTitle"] or example["description"] or example["solution"]:
                examples.append(example)

        return examples

    def _read_xlsx_sheet(self, data_path: Path, sheet_name: str) -> list[list[str]]:
        with ZipFile(data_path) as workbook:
            shared_strings = self._read_shared_strings(workbook)
            sheet_path = self._sheet_path(workbook, sheet_name)
            if not sheet_path:
                return []

            root = ET.fromstring(workbook.read(sheet_path))
            rows: list[list[str]] = []
            for row in root.findall(".//a:sheetData/a:row", SPREADSHEET_NS):
                values: list[str] = []
                for cell in row.findall("a:c", SPREADSHEET_NS):
                    index = self._column_index(cell.attrib.get("r", "A"))
                    while len(values) <= index:
                        values.append("")
                    values[index] = self._cell_value(cell, shared_strings)
                rows.append(values)
            return rows

    def _read_shared_strings(self, workbook: ZipFile) -> list[str]:
        if "xl/sharedStrings.xml" not in workbook.namelist():
            return []

        root = ET.fromstring(workbook.read("xl/sharedStrings.xml"))
        return [
            "".join(text.text or "" for text in item.findall(".//a:t", SPREADSHEET_NS))
            for item in root.findall("a:si", SPREADSHEET_NS)
        ]

    def _sheet_path(self, workbook: ZipFile, sheet_name: str) -> str | None:
        root = ET.fromstring(workbook.read("xl/workbook.xml"))
        relationships = ET.fromstring(workbook.read("xl/_rels/workbook.xml.rels"))
        targets = {item.attrib["Id"]: item.attrib["Target"] for item in relationships}

        for sheet in root.findall(".//a:sheet", SPREADSHEET_NS):
            if sheet.attrib.get("name") != sheet_name:
                continue
            relationship_id = sheet.attrib.get(f"{{{REL_NS}}}id")
            target = targets.get(relationship_id or "")
            if not target:
                return None
            return "xl/" + target.lstrip("/")

        return None

    def _cell_value(self, cell: ET.Element, shared_strings: list[str]) -> str:
        value = cell.find("a:v", SPREADSHEET_NS)
        text = "" if value is None or value.text is None else value.text
        if cell.attrib.get("t") == "s" and text:
            return shared_strings[int(text)]
        return text

    def _column_index(self, cell_reference: str) -> int:
        letters = "".join(character for character in cell_reference if character.isalpha())
        index = 0
        for letter in letters:
            index = index * 26 + ord(letter.upper()) - 64
        return max(0, index - 1)

    def _cell_text(self, value: object) -> str:
        if value is None:
            return ""
        text = str(value).strip()
        return "" if text.lower() in {"nan", "none"} else text

    def _find_similar_cases(self, request: GenerateResolutionFrameRequest) -> list[SimilarResolutionCase]:
        query_text = self._request_to_text(request)
        query_embedding = self._embedding_service.encode([query_text])
        similarities = cosine_similarity(query_embedding, self._example_embeddings)[0]
        ranked_indexes = similarities.argsort()[::-1][:3]

        return [
            self._to_similar_case(self._examples[index], float(similarities[index]))
            for index in ranked_indexes
        ]

    def _to_similar_case(self, example: dict[str, object], score: float) -> SimilarResolutionCase:
        return SimilarResolutionCase(
            ticketTitle=str(example.get("ticketTitle", "")),
            solution=str(example.get("solution", "")),
            resolutionType=str(example.get("resolutionType", "")),
            similarityScore=round(score, 4),
        )

    def _suggest_resolution_type(
        self,
        request: GenerateResolutionFrameRequest,
        similar_cases: list[SimilarResolutionCase],
    ) -> str:
        text = " ".join([request.ticketTitle, request.bannette, request.requestSummary]).lower()
        if any(keyword in text for keyword in ["matériel", "materiel", "balance", "imprimante", "terminal", "caisse"]):
            return "06 - Intervention sur matériel"

        if similar_cases and similar_cases[0].similarityScore >= 0.15:
            candidate = similar_cases[0].resolutionType.strip()
            if candidate:
                return candidate

        if any(keyword in text for keyword in ["script", "fix", "contournement"]):
            return "03 - Script, fix ou contournement"
        if any(keyword in text for keyword in ["hors périmètre", "hors perimetre", "fournisseur", "partenaire"]):
            return "05 - Hors périmètre support"
        if not [action for action in request.actionsDone if action.strip()]:
            return "04 - Aucune action nécessaire ou possible"
        if any(keyword in text for keyword in ["aide", "utilisation", "comment"]):
            return "01 - Aide à l’utilisation"
        return "02 - Correction donnée ou modification de paramétrage"

    def _build_resolution_frame(self, request: GenerateResolutionFrameRequest, resolution_type: str) -> str:
        summary = request.requestSummary.strip() or "Synthèse non renseignée par le consultant."
        actions = [action.strip() for action in request.actionsDone if action.strip()]
        action_lines = "\n".join(f"- {action}" for action in actions) if actions else "- Aucune action renseignée par le consultant."

        return "\n".join(
            [
                "Bonjour,",
                "",
                "Synthèse de la demande :",
                summary,
                "",
                "Actions réalisées :",
                action_lines,
                "",
                "Suite à notre échange, nous confirmons la résolution du ticket.",
                "",
                "",
                f"Type de résolution : {resolution_type}",
            ]
        )

    def _missing_elements(self, request: GenerateResolutionFrameRequest) -> list[str]:
        missing = []
        if not request.ticketTitle.strip():
            missing.append("ticketTitle est vide : le titre du ticket doit être renseigné.")
        if not request.bannette.strip():
            missing.append("bannette est vide : le domaine ou la bannette doit être renseigné.")
        if not request.requestSummary.strip():
            missing.append("requestSummary est vide : la synthèse de la demande doit être renseignée.")
        if not [action for action in request.actionsDone if action.strip()]:
            missing.append("actionsDone est vide : aucune action réalisée n’a été fournie.")
        if not [tool for tool in request.toolsUsed if tool.strip()]:
            missing.append("toolsUsed est vide : aucun outil utilisé n’a été fourni.")
        return missing

    def _quality_score(
        self,
        resolution_frame: str,
        request: GenerateResolutionFrameRequest,
        missing_elements: list[str],
    ) -> float:
        checks = [
            "Bonjour," in resolution_frame,
            "Synthèse de la demande :" in resolution_frame,
            "Actions réalisées :" in resolution_frame,
            "résolution du ticket" in resolution_frame,
            "Type de résolution :" in resolution_frame,
            bool(request.requestSummary.strip()),
            bool([action for action in request.actionsDone if action.strip()]),
            bool([tool for tool in request.toolsUsed if tool.strip()]),
        ]
        score = sum(1 for check in checks if check) / len(checks)
        penalty = 0.08 * len(missing_elements)
        return round(max(0.0, min(1.0, score - penalty)), 2)

    def _confidence_score(self, similar_cases: list[SimilarResolutionCase], missing_elements: list[str]) -> float:
        best_similarity = similar_cases[0].similarityScore if similar_cases else 0.0
        completeness_penalty = 0.12 * len(missing_elements)
        return round(max(0.0, min(1.0, best_similarity - completeness_penalty)), 2)

    def _request_to_text(self, request: GenerateResolutionFrameRequest) -> str:
        return " ".join(
            [
                request.ticketTitle,
                request.bannette,
                request.requestSummary,
                " ".join(request.actionsDone),
                " ".join(request.toolsUsed),
            ]
        )

    def _example_to_text(self, example: dict[str, object]) -> str:
        return " ".join(
            [
                str(example.get("ticketTitle", "")),
                str(example.get("description", "")),
                str(example.get("solution", "")),
                str(example.get("domain", "")),
                str(example.get("bannette", "")),
                str(example.get("resolutionType", "")),
            ]
        )
