from __future__ import annotations

import json
from pathlib import Path

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


class ResolutionGeneratorService:
    def __init__(self) -> None:
        data_path = Path(__file__).resolve().parents[1] / "data" / "clean_resolution_examples.json"
        self._examples = self._load_examples(data_path)
        self._example_texts = [self._example_to_text(example) for example in self._examples]
        self._embedding_service = EmbeddingService(self._example_texts)
        self._example_embeddings = self._embedding_service.encode(self._example_texts)

    def generate(self, request: GenerateResolutionFrameRequest) -> GenerateResolutionFrameResponse:
        similar_cases = self._find_similar_cases(request)
        missing_elements = self._missing_elements(request)
        resolution_type = self._suggest_resolution_type(request, similar_cases)
        resolution_frame = self._build_resolution_frame(request)
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

    def _load_examples(self, data_path: Path) -> list[dict[str, str]]:
        with data_path.open(encoding="utf-8") as file:
            examples = json.load(file)

        if not isinstance(examples, list):
            raise RuntimeError("Clean resolution examples must be a JSON list.")

        return [example for example in examples if isinstance(example, dict)]

    def _find_similar_cases(self, request: GenerateResolutionFrameRequest) -> list[SimilarResolutionCase]:
        query_text = self._request_to_text(request)
        query_embedding = self._embedding_service.encode([query_text])
        similarities = cosine_similarity(query_embedding, self._example_embeddings)[0]
        ranked_indexes = similarities.argsort()[::-1][:3]

        return [
            self._to_similar_case(self._examples[index], float(similarities[index]))
            for index in ranked_indexes
        ]

    def _to_similar_case(self, example: dict[str, str], score: float) -> SimilarResolutionCase:
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
        if similar_cases and similar_cases[0].similarityScore >= 0.15:
            candidate = similar_cases[0].resolutionType
            if candidate in RESOLUTION_TYPES:
                return candidate

        text = " ".join([request.ticketTitle, request.bannette, request.requestSummary]).lower()
        if any(keyword in text for keyword in ["matériel", "materiel", "balance", "imprimante", "terminal", "caisse"]):
            return "06 - Intervention sur matériel"
        if any(keyword in text for keyword in ["script", "fix", "contournement"]):
            return "03 - Script, fix ou contournement"
        if any(keyword in text for keyword in ["hors périmètre", "hors perimetre", "fournisseur", "partenaire"]):
            return "05 - Hors périmètre support"
        if not request.actionsDone:
            return "04 - Aucune action nécessaire ou possible"
        if any(keyword in text for keyword in ["aide", "utilisation", "comment"]):
            return "01 - Aide à l’utilisation"
        return "02 - Correction donnée ou modification de paramétrage"

    def _build_resolution_frame(self, request: GenerateResolutionFrameRequest) -> str:
        summary = request.requestSummary.strip() or "Synthèse non renseignée par le consultant."
        actions = [action.strip() for action in request.actionsDone if action.strip()]
        tools = [tool.strip() for tool in request.toolsUsed if tool.strip()]

        if actions:
            action_lines = "\n".join(f"- {action}" for action in actions)
        else:
            action_lines = "- Aucune action renseignée par le consultant."

        tool_text = ", ".join(tools) if tools else "Aucun outil renseigné par le consultant."

        return "\n".join(
            [
                "Bonjour,",
                "",
                "1. Synthèse de la demande :",
                summary,
                "",
                "2. Actions réalisées :",
                action_lines,
                "",
                f"Outils utilisés : {tool_text}",
                "",
                "Suite au traitement réalisé, nous vous confirmons la résolution du ticket.",
                "Si toutefois vous aviez besoin d’une assistance complémentaire, le support reste à votre entière disposition.",
                "Aidez-nous à améliorer notre service en prenant quelques secondes pour compléter l’enquête de satisfaction.",
                "",
                "Bonne journée,",
                "Le Support Informatique Carrefour",
            ]
        )

    def _missing_elements(self, request: GenerateResolutionFrameRequest) -> list[str]:
        missing = []
        if not request.requestSummary.strip():
            missing.append("requestSummary est vide : la synthèse de la demande doit être renseignée.")
        if not [action for action in request.actionsDone if action.strip()]:
            missing.append("actionsDone est vide : aucune action réalisée n’a été fournie.")
        return missing

    def _quality_score(
        self,
        resolution_frame: str,
        request: GenerateResolutionFrameRequest,
        missing_elements: list[str],
    ) -> float:
        checks = [
            "Bonjour," in resolution_frame,
            "1. Synthèse de la demande :" in resolution_frame,
            "2. Actions réalisées :" in resolution_frame,
            "résolution du ticket" in resolution_frame,
            "assistance complémentaire" in resolution_frame,
            "enquête de satisfaction" in resolution_frame,
            "Bonne journée," in resolution_frame,
            "Le Support Informatique Carrefour" in resolution_frame,
            bool(request.requestSummary.strip()),
            bool([action for action in request.actionsDone if action.strip()]),
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

    def _example_to_text(self, example: dict[str, str]) -> str:
        return " ".join(
            [
                str(example.get("ticketTitle", "")),
                str(example.get("description", "")),
                str(example.get("solution", "")),
            ]
        )
