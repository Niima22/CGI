from __future__ import annotations

import argparse
from pathlib import Path

from preprocessing.excel_ingestion import clean_dataset, ingest_raw_directory, load_ticket_excel, write_processed_dataset
from training.fine_tune_generator import fine_tune_generator
from training.train_classifier import train_classifier
from utils.config import DEFAULT_EXCEL_SHEET, RAW_DATA_DIR


def main() -> None:
    parser = argparse.ArgumentParser(description="Run the full Quality Lab AI training pipeline.")
    parser.add_argument("--excel", help="Path to one annotated Excel file. If omitted, all Excel files in --raw-dir are ingested.")
    parser.add_argument("--raw-dir", default=str(RAW_DATA_DIR), help="Directory containing raw Excel files.")
    parser.add_argument("--sheet", default=DEFAULT_EXCEL_SHEET)
    parser.add_argument("--skip-classifier", action="store_true")
    parser.add_argument("--skip-generator", action="store_true")
    args = parser.parse_args()

    if args.excel:
        raw_df = load_ticket_excel(args.excel, args.sheet)
        cleaned = clean_dataset(raw_df, source_file=Path(args.excel).name)
    else:
        cleaned, _ = ingest_raw_directory(Path(args.raw_dir), args.sheet)

    write_processed_dataset(cleaned)

    if not args.skip_classifier:
        train_classifier()

    if not args.skip_generator:
        fine_tune_generator()


if __name__ == "__main__":
    main()
