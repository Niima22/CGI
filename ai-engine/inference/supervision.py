from __future__ import annotations

from pathlib import Path

import torch
from transformers import AutoModelForSequenceClassification, AutoTokenizer

from preprocessing.text_cleaning import join_ticket_text, normalize_text
from utils.config import CLASSIFIER_MODEL_DIR, CONFIDENCE_REVIEW_THRESHOLD, CRITERIA


class ClassifierModelNotReady(RuntimeError):
    pass


CRITERION_LABELS = {
    "synthese_demande": "Synthèse de la demande",
    "actions_resultat": "Actions / Résultat",
    "formule_politesse": "Formule de politesse",
}


class TicketSupervisor:
    def __init__(self, model_dir: Path = CLASSIFIER_MODEL_DIR, max_length: int = 384) -> None:
        self.model_dir = Path(model_dir)
        self.max_length = max_length
        self.tokenizer = None
        self.model = None

    def load(self) -> None:
        if not self.model_dir.exists() or not any(self.model_dir.iterdir()):
            raise ClassifierModelNotReady(
                f"Classifier model not found in {self.model_dir}. Run training/train_classifier.py first."
            )

        self.tokenizer = AutoTokenizer.from_pretrained(self.model_dir)
        self.model = AutoModelForSequenceClassification.from_pretrained(self.model_dir)
        self.model.eval()

    def analyze(self, payload: dict) -> dict:
        if self.model is None or self.tokenizer is None:
            self.load()

        title = normalize_text(payload.get("titre") or payload.get("title"))
        description = normalize_text(payload.get("synthese") or payload.get("description"))
        solution = normalize_text(payload.get("resolution") or payload.get("solution") or payload.get("trame"))
        text = join_ticket_text(title, description, solution)

        inputs = self.tokenizer(
            text,
            truncation=True,
            padding="max_length",
            max_length=self.max_length,
            return_tensors="pt",
        )

        with torch.no_grad():
            logits = self.model(**inputs).logits[0]
            probabilities = torch.sigmoid(logits).cpu().numpy()

        predictions = (probabilities >= 0.5).astype(int)
        criteria = {criterion: int(predictions[index]) for index, criterion in enumerate(CRITERIA)}
        conformite = int(all(criteria.values()))
        confidence = float(min(max(probabilities), 1 - min(probabilities)))
        non_conformes = [CRITERION_LABELS[key] for key, value in criteria.items() if value == 0]

        status = "Conforme" if conformite else "Non conforme"
        if confidence < CONFIDENCE_REVIEW_THRESHOLD:
            status = "A vérifier"

        return {
            **criteria,
            "conformite_solution": conformite,
            "statut_global": status,
            "criteres_non_conformes": non_conformes,
            "explication": self._explain(non_conformes, confidence),
            "proposition_correction": self._suggest(non_conformes),
            "score_confiance": round(confidence, 4),
        }

    def _explain(self, criteria: list[str], confidence: float) -> str:
        if confidence < CONFIDENCE_REVIEW_THRESHOLD:
            return "Le score de confiance est faible. Le ticket doit être vérifié par un superviseur."
        if not criteria:
            return "La résolution contient les éléments qualité attendus."
        return "Critères non conformes détectés : " + ", ".join(criteria) + "."

    def _suggest(self, criteria: list[str]) -> str:
        if not criteria:
            return "Aucune correction nécessaire."

        suggestions = {
            "Synthèse de la demande": "Ajouter une reformulation claire de la demande initiale de l'utilisateur.",
            "Actions / Résultat": "Détailler les actions réalisées et le résultat obtenu après intervention.",
            "Formule de politesse": "Ajouter une formule de politesse professionnelle en fin de résolution.",
        }
        return " ".join(suggestions[criterion] for criterion in criteria)
