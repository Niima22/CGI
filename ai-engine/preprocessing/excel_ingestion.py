from __future__ import annotations

import argparse
import json
from pathlib import Path

import pandas as pd
from sklearn.model_selection import train_test_split

from preprocessing.text_cleaning import join_ticket_text, normalize_binary_label, normalize_text
from utils.config import DEFAULT_EXCEL_SHEET, PROCESSED_DATA_DIR


COLUMN_ALIASES = {
    "ticket_id": ["ID Ticket", "ID TICKET", "N° Ticket", "Nr ticket", "N Ticket"],
    "title": ["Titre", "TITRE", "Title"],
    "description": ["Description", "DESCRIPTION"],
    "solution": ["Solution", "SOLUTION", "Trame de résolution"],
    "department": ["Bannette", "Bannettes", "BANNETTE RESOLUTION"],
    "resolver": ["Résolu par", "Responsable", "Résponsable"],
    "type_resolution": ["Type de résolution", "TYPE"],
    "label_summary": ["Synthèse de la demande"],
    "label_actions": ["Actions / Résultat"],
    "label_politeness": ["Formule de politesse"],
    "label_solution": ["Conformité Solution"],
}

REQUIRED_COLUMNS = [
    "ticket_id",
    "title",
    "description",
    "solution",
    "label_summary",
    "label_actions",
    "label_politeness",
]


def _find_column(columns: list[str], aliases: list[str]) -> str | None:
    normalized = {normalize_text(column).lower(): column for column in columns}
    for alias in aliases:
        match = normalized.get(normalize_text(alias).lower())
        if match:
            return match
    return None


def map_columns(df: pd.DataFrame) -> pd.DataFrame:
    mapped: dict[str, pd.Series] = {}
    columns = list(df.columns)

    for target, aliases in COLUMN_ALIASES.items():
        source = _find_column(columns, aliases)
        if source is not None:
            mapped[target] = df[source]

    missing = [column for column in REQUIRED_COLUMNS if column not in mapped]
    if missing:
        raise ValueError(f"Missing required Excel columns: {missing}")

    return pd.DataFrame(mapped)


def load_ticket_excel(path: str | Path, sheet_name: str = DEFAULT_EXCEL_SHEET) -> pd.DataFrame:
    workbook = pd.read_excel(path, sheet_name=None, engine="openpyxl")

    if sheet_name in workbook:
        return workbook[sheet_name]

    for candidate_name, candidate_df in workbook.items():
        try:
            map_columns(candidate_df)
            return candidate_df
        except ValueError:
            continue

    available = ", ".join(workbook.keys())
    raise ValueError(f"No usable ticket sheet found. Available sheets: {available}")


def clean_dataset(df: pd.DataFrame) -> pd.DataFrame:
    mapped = map_columns(df)

    for column in ["ticket_id", "title", "description", "solution", "department", "resolver", "type_resolution"]:
        if column in mapped:
            mapped[column] = mapped[column].map(normalize_text)
        else:
            mapped[column] = ""

    mapped["synthese_demande"] = mapped["label_summary"].map(normalize_binary_label)
    mapped["actions_resultat"] = mapped["label_actions"].map(normalize_binary_label)
    mapped["formule_politesse"] = mapped["label_politeness"].map(normalize_binary_label)

    mapped = mapped.dropna(subset=["synthese_demande", "actions_resultat", "formule_politesse"])
    mapped = mapped[mapped["solution"].str.len() > 0]
    mapped = mapped[mapped["title"].str.len() > 0]

    for column in ["synthese_demande", "actions_resultat", "formule_politesse"]:
        mapped[column] = mapped[column].astype(int)

    mapped["conformite_solution"] = (
        (mapped["synthese_demande"] == 1)
        & (mapped["actions_resultat"] == 1)
        & (mapped["formule_politesse"] == 1)
    ).astype(int)
    mapped["statut_global"] = mapped["conformite_solution"].map({1: "Conforme", 0: "Non conforme"})
    mapped["text"] = mapped.apply(
        lambda row: join_ticket_text(row["title"], row["description"], row["solution"]),
        axis=1,
    )
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
    for _, row in df.iterrows():
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
    parser.add_argument("--excel", required=True, help="Path to the annotated Excel file.")
    parser.add_argument("--sheet", default=DEFAULT_EXCEL_SHEET, help="Excel sheet name.")
    parser.add_argument("--output-dir", default=str(PROCESSED_DATA_DIR), help="Output directory.")
    args = parser.parse_args()

    raw_df = load_ticket_excel(args.excel, args.sheet)
    cleaned = clean_dataset(raw_df)
    write_processed_dataset(cleaned, Path(args.output_dir))
    print(f"Processed {len(cleaned)} valid rows into {args.output_dir}")


if __name__ == "__main__":
    main()
