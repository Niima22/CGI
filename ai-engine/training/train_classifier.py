from __future__ import annotations

import argparse
from pathlib import Path

import numpy as np
import pandas as pd
import torch
from datasets import Dataset
from transformers import AutoModelForSequenceClassification, AutoTokenizer, Trainer, TrainingArguments

from evaluations.classification_metrics import evaluate_multilabel
from utils.config import CLASSIFIER_MODEL_DIR, CRITERIA, DEFAULT_CLASSIFIER_MODEL, PROCESSED_DATA_DIR


def load_split(path: Path) -> pd.DataFrame:
    if not path.exists():
        raise FileNotFoundError(f"Dataset split not found: {path}")
    return pd.read_json(path, lines=True)


def to_hf_dataset(df: pd.DataFrame, tokenizer, max_length: int) -> Dataset:
    dataset = Dataset.from_pandas(
        pd.DataFrame(
            {
                "text": df["text"].tolist(),
                "labels": df[CRITERIA].astype(float).values.tolist(),
            }
        )
    )

    def tokenize(batch):
        return tokenizer(
            batch["text"],
            truncation=True,
            padding="max_length",
            max_length=max_length,
        )

    return dataset.map(tokenize, batched=True).remove_columns(["text"])


def sigmoid_metrics(eval_pred) -> dict:
    logits, labels = eval_pred
    probabilities = 1 / (1 + np.exp(-logits))
    predictions = (probabilities >= 0.5).astype(int)
    metrics = evaluate_multilabel(labels.astype(int), predictions)
    flat = {}
    for name, values in metrics.items():
        flat[f"{name}_accuracy"] = values["accuracy"]
        flat[f"{name}_f1"] = values["f1"]
        flat[f"{name}_precision"] = values["precision"]
        flat[f"{name}_recall"] = values["recall"]
    return flat


def train_classifier(
    dataset_dir: Path = PROCESSED_DATA_DIR,
    output_dir: Path = CLASSIFIER_MODEL_DIR,
    base_model: str = DEFAULT_CLASSIFIER_MODEL,
    epochs: int = 4,
    batch_size: int = 8,
    max_length: int = 384,
) -> None:
    train_df = load_split(dataset_dir / "train.jsonl")
    validation_df = load_split(dataset_dir / "validation.jsonl")
    test_df = load_split(dataset_dir / "test.jsonl")

    tokenizer = AutoTokenizer.from_pretrained(base_model)
    model = AutoModelForSequenceClassification.from_pretrained(
        base_model,
        num_labels=len(CRITERIA),
        problem_type="multi_label_classification",
    )

    train_dataset = to_hf_dataset(train_df, tokenizer, max_length)
    validation_dataset = to_hf_dataset(validation_df, tokenizer, max_length)
    test_dataset = to_hf_dataset(test_df, tokenizer, max_length)

    args = TrainingArguments(
        output_dir=str(output_dir),
        eval_strategy="epoch",
        save_strategy="epoch",
        learning_rate=2e-5,
        per_device_train_batch_size=batch_size,
        per_device_eval_batch_size=batch_size,
        num_train_epochs=epochs,
        weight_decay=0.01,
        load_best_model_at_end=True,
        metric_for_best_model="conformite_solution_f1",
        greater_is_better=True,
        logging_steps=25,
    )

    trainer = Trainer(
        model=model,
        args=args,
        train_dataset=train_dataset,
        eval_dataset=validation_dataset,
        tokenizer=tokenizer,
        compute_metrics=sigmoid_metrics,
    )
    trainer.train()

    output_dir.mkdir(parents=True, exist_ok=True)
    trainer.save_model(str(output_dir))
    tokenizer.save_pretrained(str(output_dir))

    predictions = trainer.predict(test_dataset)
    probabilities = torch.sigmoid(torch.tensor(predictions.predictions)).numpy()
    y_pred = (probabilities >= 0.5).astype(int)
    y_true = np.asarray(test_df[CRITERIA].astype(int).values)
    evaluate_multilabel(y_true, y_pred, output_dir / "evaluation")


def main() -> None:
    parser = argparse.ArgumentParser(description="Train the ticket supervision classifier.")
    parser.add_argument("--dataset-dir", default=str(PROCESSED_DATA_DIR))
    parser.add_argument("--output-dir", default=str(CLASSIFIER_MODEL_DIR))
    parser.add_argument("--base-model", default=DEFAULT_CLASSIFIER_MODEL)
    parser.add_argument("--epochs", type=int, default=4)
    parser.add_argument("--batch-size", type=int, default=8)
    parser.add_argument("--max-length", type=int, default=384)
    args = parser.parse_args()

    train_classifier(
        dataset_dir=Path(args.dataset_dir),
        output_dir=Path(args.output_dir),
        base_model=args.base_model,
        epochs=args.epochs,
        batch_size=args.batch_size,
        max_length=args.max_length,
    )


if __name__ == "__main__":
    main()
