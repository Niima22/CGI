# Quality Lab AI Engine

Independent AI/ML engine for ticket quality supervision and professional resolution generation.

## What This Module Provides

- Excel ingestion for annotated historical support tickets.
- NLP preprocessing and dataset cleaning.
- Train/validation/test split generation.
- Multi-label supervision classifier:
  - `synthese_demande`
  - `actions_resultat`
  - `formule_politesse`
- Automatic business-rule calculation:
  - `conformite_solution = 1` only if all three criteria are `1`.
- LoRA instruction fine-tuning pipeline for professional resolution generation.
- FastAPI endpoints for inference, batch analysis, and training trigger.
- Evaluation outputs:
  - accuracy
  - precision
  - recall
  - F1-score
  - confusion matrix
  - classification report

## Structure

```text
ai-engine/
  datasets/
    raw/
    processed/
    exports/
  preprocessing/
  training/
  inference/
  evaluations/
  models/
  notebooks/
  api/
  utils/
  requirements.txt
  Dockerfile
  README.md
```

## Prepare Environment

```powershell
cd ai-engine
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

## Prepare Dataset

Put the Excel file in `datasets/raw/`, then run:

```powershell
python -m preprocessing.excel_ingestion --excel datasets/raw/tickets.xlsx --sheet Picking
```

Outputs are written to `datasets/processed/`:

- `train.jsonl`
- `validation.jsonl`
- `test.jsonl`
- `generation_train.jsonl`
- `full_cleaned.jsonl`

## Train Supervision Classifier

```powershell
python -m training.train_classifier --base-model camembert-base
```

Model output:

```text
models/supervision-classifier/
```

Evaluation output:

```text
models/supervision-classifier/evaluation/classification_metrics.json
```

## Fine-Tune Generation Model With LoRA

```powershell
python -m training.fine_tune_generator --base-model Qwen/Qwen2.5-1.5B-Instruct
```

Model adapter output:

```text
models/generation-lora/
```

For larger models like Mistral 7B, Qwen2.5 7B, or Llama 3 Instruct, use a GPU environment.

## Run Full Pipeline

```powershell
python -m training.run_pipeline --excel datasets/raw/tickets.xlsx --sheet Picking
```

Skip generation fine-tuning if you only want the classifier:

```powershell
python -m training.run_pipeline --excel datasets/raw/tickets.xlsx --sheet Picking --skip-generator
```

## Run API

```powershell
uvicorn api.main:app --reload --port 8010
```

Endpoints:

- `POST /generate-resolution`
- `POST /analyze-ticket`
- `POST /batch-analyze`
- `POST /train-model`
- `GET /health`

If models are not trained yet, inference endpoints return `503` instead of fake predictions.

## Hybrid Logic

The classifier predicts the three quality criteria separately. The final conformity is calculated by the business rule:

```text
if synthese_demande == 1 and actions_resultat == 1 and formule_politesse == 1:
    conformite_solution = 1
else:
    conformite_solution = 0
```

If confidence is lower than the configured threshold, the ticket is marked:

```text
A vérifier
```

## Docker

```powershell
docker build -t quality-lab-ai-engine .
docker run -p 8010:8010 quality-lab-ai-engine
```
