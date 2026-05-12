from __future__ import annotations

import json
from pathlib import Path

import numpy as np
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix, precision_recall_fscore_support

from utils.config import CRITERIA


def evaluate_multilabel(y_true: np.ndarray, y_pred: np.ndarray, output_dir: str | Path | None = None) -> dict:
    metrics: dict[str, object] = {}

    for index, criterion in enumerate(CRITERIA):
        precision, recall, f1, _ = precision_recall_fscore_support(
            y_true[:, index],
            y_pred[:, index],
            average="binary",
            zero_division=0,
        )
        metrics[criterion] = {
            "accuracy": accuracy_score(y_true[:, index], y_pred[:, index]),
            "precision": precision,
            "recall": recall,
            "f1": f1,
            "confusion_matrix": confusion_matrix(y_true[:, index], y_pred[:, index]).tolist(),
            "classification_report": classification_report(
                y_true[:, index],
                y_pred[:, index],
                zero_division=0,
                output_dict=True,
            ),
        }

    true_conformity = (y_true.sum(axis=1) == len(CRITERIA)).astype(int)
    pred_conformity = (y_pred.sum(axis=1) == len(CRITERIA)).astype(int)
    precision, recall, f1, _ = precision_recall_fscore_support(
        true_conformity,
        pred_conformity,
        average="binary",
        zero_division=0,
    )
    metrics["conformite_solution"] = {
        "accuracy": accuracy_score(true_conformity, pred_conformity),
        "precision": precision,
        "recall": recall,
        "f1": f1,
        "confusion_matrix": confusion_matrix(true_conformity, pred_conformity).tolist(),
        "classification_report": classification_report(
            true_conformity,
            pred_conformity,
            zero_division=0,
            output_dict=True,
        ),
    }

    if output_dir:
        path = Path(output_dir)
        path.mkdir(parents=True, exist_ok=True)
        with (path / "classification_metrics.json").open("w", encoding="utf-8") as file:
            json.dump(metrics, file, ensure_ascii=False, indent=2)

    return metrics
