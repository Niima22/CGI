from __future__ import annotations

import tempfile
from pathlib import Path

import pandas as pd
from fastapi import BackgroundTasks, FastAPI, File, HTTPException, UploadFile

from api.schemas import (
    AnalyzeTicketRequest,
    AnalyzeTicketResponse,
    GenerateResolutionRequest,
    GenerateResolutionResponse,
    TrainModelRequest,
    TrainModelResponse,
)
from inference.generator import GenerationModelNotReady, ResolutionGenerator
from inference.supervision import ClassifierModelNotReady, TicketSupervisor
from preprocessing.excel_ingestion import clean_dataset, load_ticket_excel, write_processed_dataset
from training.fine_tune_generator import fine_tune_generator
from training.train_classifier import train_classifier

app = FastAPI(
    title="Quality Lab AI Engine",
    description="ML/LLM engine for ticket resolution generation and quality supervision.",
    version="0.1.0",
)

generator = ResolutionGenerator()
supervisor = TicketSupervisor()


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "quality-lab-ai-engine"}


@app.post("/generate-resolution", response_model=GenerateResolutionResponse)
def generate_resolution(request: GenerateResolutionRequest) -> GenerateResolutionResponse:
    try:
        resolution = generator.generate(request.model_dump())
    except GenerationModelNotReady as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    return GenerateResolutionResponse(resolution=resolution)


@app.post("/analyze-ticket", response_model=AnalyzeTicketResponse)
def analyze_ticket(request: AnalyzeTicketRequest) -> AnalyzeTicketResponse:
    try:
        result = supervisor.analyze(request.model_dump())
    except ClassifierModelNotReady as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    return AnalyzeTicketResponse(**result)


@app.post("/batch-analyze")
async def batch_analyze(file: UploadFile = File(...), sheet_name: str = "Picking") -> dict:
    suffix = Path(file.filename or "").suffix or ".xlsx"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(await file.read())
        tmp_path = Path(tmp.name)

    try:
        raw_df = load_ticket_excel(tmp_path, sheet_name)
        cleaned = clean_dataset(raw_df)
        results = []
        for _, row in cleaned.iterrows():
            try:
                results.append(
                    {
                        "ticket_id": row["ticket_id"],
                        **supervisor.analyze(
                            {
                                "titre": row["title"],
                                "synthese": row["description"],
                                "resolution": row["solution"],
                            }
                        ),
                    }
                )
            except ClassifierModelNotReady as exc:
                raise HTTPException(status_code=503, detail=str(exc)) from exc
    finally:
        tmp_path.unlink(missing_ok=True)

    return {
        "count": len(results),
        "results": results,
    }


def _train_pipeline(request: TrainModelRequest) -> None:
    raw_df = load_ticket_excel(request.excel_path, request.sheet_name)
    cleaned = clean_dataset(raw_df)
    write_processed_dataset(cleaned)

    if request.train_classifier:
        train_classifier()

    if request.fine_tune_generator:
        fine_tune_generator()


@app.post("/train-model", response_model=TrainModelResponse)
def train_model(request: TrainModelRequest, background_tasks: BackgroundTasks) -> TrainModelResponse:
    if not Path(request.excel_path).exists():
        raise HTTPException(status_code=400, detail="Excel file not found.")

    background_tasks.add_task(_train_pipeline, request)
    return TrainModelResponse(
        status="started",
        detail="Training pipeline started in background. Check logs and models directory for outputs.",
    )
