from __future__ import annotations

import argparse
import json
import unicodedata
from dataclasses import dataclass
from pathlib import Path

import pandas as pd
from sklearn.model_selection import train_test_split

from preprocessing.text_cleaning import join_ticket_text, normalize_binary_label, normalize_text
from utils.config import DEFAULT_EXCEL_SHEET, PROCESSED_DATA_DIR, RAW_DATA_DIR


DATASET_SCHEMAS = [
    {
        "name": "quality_lab_picking",
        "aliases": {
            "ticket_id": ["ID Ticket", "ID TICKET", "N° Ticket", "Nr ticket", "N Ticket"],
            "ticket_text": ["Texte ticket", "Ticket text", "Contenu ticket"],
            "title": ["Titre", "TITRE", "Title", "Objet"],
            "description": ["Description", "DESCRIPTION", "Demande", "Description ticket"],
            "solution": ["Solution", "SOLUTION", "Trame de résolution", "Resolution"],
            "department": ["Bannette", "Bannettes", "BANNETTE RESOLUTION", "Département", "Departement"],
            "resolver": ["Résolu par", "Responsable"],
            "type_resolution": ["Type de résolution", "Type resolution", "TYPE"],
            "label_summary": ["Synthèse de la demande", "Synthese de la demande"],
            "label_actions": ["Actions / Résultat", "Actions / Resultat"],
            "label_politeness": ["Formule de politesse"],
            "label_solution": ["Conformité Solution", "Conformite Solution"],
        },
    },
    {
        "name": "generic_ticket_quality",
        "aliases": {
            "ticket_id": ["ticket_id", "ticket id", "id", "id_ticket"],
            "ticket_text": ["ticket_text", "texte_ticket", "text", "texte", "contenu"],
            "title": ["title", "titre", "subject", "objet"],
            "description": ["description", "summary", "resume", "résumé", "synthese", "synthèse"],
            "solution": ["solution", "resolution", "résolution", "closing comment", "commentaire cloture"],
            "department": ["department", "departement", "département", "queue", "bannette"],
            "resolver": ["resolver", "agent", "resolu par", "résolu par"],
            "type_resolution": ["resolution_type", "type_resolution", "type de resolution", "type de résolution"],
            "label_summary": ["synthese_demande", "synthèse demande", "synthese de la demande"],
            "label_actions": ["actions_resultat", "actions resultat", "actions / resultat", "actions / résultat"],
            "label_politeness": ["formule_politesse", "politesse", "formule de politesse"],
            "label_solution": ["conformite_solution", "conformité solution", "conformite solution"],
        },
    },
]

COLUMN_ALIASES = DATASET_SCHEMAS[0]["aliases"]
REQUIRED_COLUMNS = ["label_summary", "label_actions", "label_politeness"]
TEXT_COLUMNS = ["ticket_text", "title", "description", "solution"]


@dataclass
class SheetIngestionResult:
    file_path: Path
    sheet_name: str
    raw_df: pd.DataFrame
    mapped_df: pd.DataFrame
    schema_name: str
    mapped_columns: dict[str, str]
    skipped_columns: list[str]


@dataclass
class IngestionReport:
    detected_files: list[Path]
    valid_sheets: list[SheetIngestionResult]
    invalid_files: dict[str, str]


def _column_key(value: object) -> str:
    text = normalize_text(value).lower()
    text = unicodedata.normalize("NFKD", text)
    text = "".join(char for char in text if not unicodedata.combining(char))
    return " ".join(text.replace("_", " ").replace("-", " ").split())


def _find_column(columns: list[str], aliases: list[str]) -> str | None:
    normalized = {_column_key(column): column for column in columns}
    for alias in aliases:
        match = normalized.get(_column_key(alias))
        if match:
            return match
    return None


def _map_columns_with_schema(df: pd.DataFrame, schema: dict) -> tuple[pd.DataFrame, dict[str, str], list[str]]:
    mapped: dict[str, pd.Series] = {}
    mapped_columns: dict[str, str] = {}
    columns = [str(column) for column in df.columns]

    for target, aliases in schema["aliases"].items():
        source = _find_column(columns, aliases)
        if source is not None:
            mapped[target] = df[source]
            mapped_columns[target] = source

    missing = [column for column in REQUIRED_COLUMNS if column not in mapped]
    if not any(column in mapped for column in TEXT_COLUMNS):
        missing.append("ticket_text or one of title/description/solution")

    if missing:
        raise ValueError(f"Missing required columns: {missing}")

    skipped_columns = [column for column in columns if column not in set(mapped_columns.values())]
    return pd.DataFrame(mapped), mapped_columns, skipped_columns


def detect_and_map_columns(df: pd.DataFrame) -> tuple[pd.DataFrame, str, dict[str, str], list[str]]:
    errors = []
    for schema in DATASET_SCHEMAS:
        try:
            mapped, mapped_columns, skipped_columns = _map_columns_with_schema(df, schema)
            return mapped, schema["name"], mapped_columns, skipped_columns
        except ValueError as error:
            errors.append(f"{schema['name']}: {error}")
    raise ValueError("; ".join(errors))


def map_columns(df: pd.DataFrame) -> pd.DataFrame:
    mapped, _, _, _ = detect_and_map_columns(df)
    return mapped


def load_ticket_excel(path: str | Path, sheet_name: str = DEFAULT_EXCEL_SHEET) -> pd.DataFrame:
    workbook = pd.read_excel(path, sheet_name=None, engine="openpyxl")

    if sheet_name in workbook:
        return workbook[sheet_name]

    for _, candidate_df in workbook.items():
        try:
            map_columns(candidate_df)
            return candidate_df
        except ValueError:
            continue

    available = ", ".join(workbook.keys())
    raise ValueError(f"No usable ticket sheet found. Available sheets: {available}")


def _excel_files(raw_dir: Path) -> list[Path]:
    files: list[Path] = []
    for pattern in ["*.xlsx", "*.xlsm", "*.xls"]:
        files.extend(raw_dir.glob(pattern))
    return sorted(path for path in files if not path.name.startswith("~$"))


def inspect_workbook(path: Path, preferred_sheet: str = DEFAULT_EXCEL_SHEET) -> list[SheetIngestionResult]:
    workbook = pd.read_excel(path, sheet_name=None, engine="openpyxl")
    sheet_items = list(workbook.items())

    if preferred_sheet in workbook:
        sheet_items = [(preferred_sheet, workbook[preferred_sheet])] + [
            (name, df) for name, df in sheet_items if name != preferred_sheet
        ]

    valid_results: list[SheetIngestionResult] = []
    for sheet_name, sheet_df in sheet_items:
        print(f"[INFO] {path.name} / {sheet_name} detected columns: {list(sheet_df.columns)}")
        try:
            mapped_df, schema_name, mapped_columns, skipped_columns = detect_and_map_columns(sheet_df)
        except ValueError as error:
            print(f"[WARNING] {path.name} / {sheet_name} skipped: {error}")
            continue

        print(f"[INFO] {path.name} / {sheet_name} schema: {schema_name}")
        print(f"[INFO] {path.name} / {sheet_name} mapped columns: {mapped_columns}")
        print(f"[INFO] {path.name} / {sheet_name} skipped columns: {skipped_columns}")
        valid_results.append(
            SheetIngestionResult(
                file_path=path,
                sheet_name=sheet_name,
                raw_df=sheet_df,
                mapped_df=mapped_df,
                schema_name=schema_name,
                mapped_columns=mapped_columns,
                skipped_columns=skipped_columns,
            )
        )

    return valid_results


def ingest_raw_directory(raw_dir: Path = RAW_DATA_DIR, sheet_name: str = DEFAULT_EXCEL_SHEET) -> tuple[pd.DataFrame, IngestionReport]:
    files = _excel_files(raw_dir)
    print(f"[INFO] detected files: {[path.name for path in files]}")

    valid_sheets: list[SheetIngestionResult] = []
    invalid_files: dict[str, str] = {}

    for path in files:
        try:
            results = inspect_workbook(path, sheet_name)
        except Exception as error:
            invalid_files[path.name] = str(error)
            print(f"[WARNING] {path.name} skipped: {error}")
            continue

        if not results:
            invalid_files[path.name] = "No sheet matched the configured schemas."
            print(f"[WARNING] {path.name} skipped: no valid sheet found.")
            continue

        valid_sheets.extend(results)

    print(f"[INFO] invalid files: {invalid_files}")
    if not valid_sheets:
        raise ValueError(f"No valid Excel datasets found in {raw_dir}")

    cleaned_frames = [
        clean_dataset(result.mapped_df, source_file=result.file_path.name, already_mapped=True)
        for result in valid_sheets
    ]
    merged = pd.concat(cleaned_frames, ignore_index=True)
    report = IngestionReport(detected_files=files, valid_sheets=valid_sheets, invalid_files=invalid_files)
    return merged, report


def clean_dataset(df: pd.DataFrame, source_file: str = "", already_mapped: bool = False) -> pd.DataFrame:
    mapped = df.copy() if already_mapped else map_columns(df)

    for column in ["ticket_id", "title", "description", "solution", "department", "resolver", "type_resolution"]:
        if column in mapped:
            mapped[column] = mapped[column].map(normalize_text)
        else:
            mapped[column] = ""

    if "ticket_text" in mapped:
        mapped["ticket_text"] = mapped["ticket_text"].map(normalize_text)
    else:
        mapped["ticket_text"] = ""

    mapped["synthese_demande"] = mapped["label_summary"].map(normalize_binary_label)
    mapped["actions_resultat"] = mapped["label_actions"].map(normalize_binary_label)
    mapped["formule_politesse"] = mapped["label_politeness"].map(normalize_binary_label)

    mapped = mapped.dropna(subset=["synthese_demande", "actions_resultat", "formule_politesse"])
    mapped["ticket_text"] = mapped.apply(
        lambda row: row["ticket_text"] or join_ticket_text(row["title"], row["description"], row["solution"]),
        axis=1,
    )
    mapped = mapped[mapped["ticket_text"].str.len() > 0]

    for column in ["synthese_demande", "actions_resultat", "formule_politesse"]:
        mapped[column] = mapped[column].astype(int)

    mapped["conformite_solution"] = (
        (mapped["synthese_demande"] == 1)
        & (mapped["actions_resultat"] == 1)
        & (mapped["formule_politesse"] == 1)
    ).astype(int)
    mapped["statut_global"] = mapped["conformite_solution"].map({1: "Conforme", 0: "Non conforme"})
    mapped["source_file"] = source_file
    mapped["text"] = mapped["ticket_text"]
    mapped["generation_input"] = mapped.apply(build_generation_input, axis=1)
    mapped["generation_output"] = mapped["solution"]

    return mapped.reset_index(drop=True)


def build_generation_input(row: pd.Series) -> str:
    return json.dumps(
        {
            "ticket_id": row.get("ticket_id", ""),
            "titre": row.get("title", ""),
            "synthese": row.get("description", ""),
            "actions": row.get("solution", ""),
            "bannette": row.get("department", ""),
            "outils": "",
            "partie_concernee": "",
            "statut": row.get("statut_global", ""),
        },
        ensure_ascii=False,
    )


def build_instruction_dataset(df: pd.DataFrame) -> list[dict]:
    records = []
    generator_df = df[df["generation_output"].astype(str).str.len() > 0]
    for _, row in generator_df.iterrows():
        records.append(
            {
                "instruction": "Génère une résolution de ticket professionnelle",
                "input": json.loads(row["generation_input"]),
                "output": row["generation_output"],
            }
        )
    return records


def split_dataset(df: pd.DataFrame, seed: int = 42) -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    stratify = df["conformite_solution"] if df["conformite_solution"].nunique() > 1 else None
    train_df, temp_df = train_test_split(df, test_size=0.30, random_state=seed, stratify=stratify)
    temp_stratify = temp_df["conformite_solution"] if temp_df["conformite_solution"].nunique() > 1 else None
    validation_df, test_df = train_test_split(temp_df, test_size=0.50, random_state=seed, stratify=temp_stratify)
    return train_df.reset_index(drop=True), validation_df.reset_index(drop=True), test_df.reset_index(drop=True)


def write_processed_dataset(df: pd.DataFrame, output_dir: Path = PROCESSED_DATA_DIR) -> None:
    if df.empty:
        raise ValueError("No valid rows found after ingestion and cleaning.")

    output_dir.mkdir(parents=True, exist_ok=True)
    train_df, validation_df, test_df = split_dataset(df)

    for name, split_df in [("train", train_df), ("validation", validation_df), ("test", test_df)]:
        split_df.to_json(output_dir / f"{name}.jsonl", orient="records", lines=True, force_ascii=False)

    instructions = build_instruction_dataset(train_df)
    with (output_dir / "generation_train.jsonl").open("w", encoding="utf-8") as file:
        for record in instructions:
            file.write(json.dumps(record, ensure_ascii=False) + "\n")

    df.to_json(output_dir / "full_cleaned.jsonl", orient="records", lines=True, force_ascii=False)


def main() -> None:
    parser = argparse.ArgumentParser(description="Ingest and clean ticket Excel data.")
    parser.add_argument("--excel", help="Path to one annotated Excel file. If omitted, all Excel files in --raw-dir are ingested.")
    parser.add_argument("--raw-dir", default=str(RAW_DATA_DIR), help="Directory containing raw Excel files.")
    parser.add_argument("--sheet", default=DEFAULT_EXCEL_SHEET, help="Excel sheet name.")
    parser.add_argument("--output-dir", default=str(PROCESSED_DATA_DIR), help="Output directory.")
    args = parser.parse_args()

    if args.excel:
        excel_path = Path(args.excel)
        raw_df = load_ticket_excel(excel_path, args.sheet)
        cleaned = clean_dataset(raw_df, source_file=excel_path.name)
    else:
        cleaned, _ = ingest_raw_directory(Path(args.raw_dir), args.sheet)

    write_processed_dataset(cleaned, Path(args.output_dir))
    print(f"Processed {len(cleaned)} valid rows into {args.output_dir}")


if __name__ == "__main__":
    main()
