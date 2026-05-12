from pathlib import Path


BASE_DIR = Path(__file__).resolve().parents[1]
DATASETS_DIR = BASE_DIR / "datasets"
RAW_DATA_DIR = DATASETS_DIR / "raw"
PROCESSED_DATA_DIR = DATASETS_DIR / "processed"
EXPORTS_DIR = DATASETS_DIR / "exports"
MODELS_DIR = BASE_DIR / "models"

DEFAULT_EXCEL_SHEET = "Picking"
DEFAULT_CLASSIFIER_MODEL = "camembert-base"
DEFAULT_GENERATION_MODEL = "Qwen/Qwen2.5-1.5B-Instruct"

GENERATION_MODEL_DIR = MODELS_DIR / "generation-lora"
CLASSIFIER_MODEL_DIR = MODELS_DIR / "supervision-classifier"

CRITERIA = [
    "synthese_demande",
    "actions_resultat",
    "formule_politesse",
]

CONFIDENCE_REVIEW_THRESHOLD = 0.70
