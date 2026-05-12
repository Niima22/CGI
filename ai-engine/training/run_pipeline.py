from __future__ import annotations

import argparse
from pathlib import Path

from preprocessing.excel_ingestion import clean_dataset, load_ticket_excel, write_processed_dataset
from training.fine_tune_generator import fine_tune_generator
from training.train_classifier import train_classifier
from utils.config import DEFAULT_EXCEL_SHEET


def main() -> None:
    parser = argparse.ArgumentParser(description="Run the full Quality Lab AI training pipeline.")
    parser.add_argument("--excel", required=True, help="Path to the annotated Excel file.")
    parser.add_argument("--sheet", default=DEFAULT_EXCEL_SHEET)
    parser.add_argument("--skip-classifier", action="store_true")
    parser.add_argument("--skip-generator", action="store_true")
    args = parser.parse_args()

    raw_df = load_ticket_excel(args.excel, args.sheet)
    cleaned = clean_dataset(raw_df)
    write_processed_dataset(cleaned)

    if not args.skip_classifier:
        train_classifier()

    if not args.skip_generator:
        fine_tune_generator()


if __name__ == "__main__":
    main()
