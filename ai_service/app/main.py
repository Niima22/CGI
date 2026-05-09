from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.api.routes import router

BASE_DIR = Path(__file__).resolve().parent

app = FastAPI(
    title="AI Ticket Microservice",
    description="Independent AI service for ticket search, analysis, prediction, and treatment evaluation.",
    version="0.1.0",
)

app.include_router(router)
app.mount("/static", StaticFiles(directory=BASE_DIR / "static"), name="static")


@app.get("/", include_in_schema=False)
def correction_interface() -> FileResponse:
    return FileResponse(BASE_DIR / "static" / "index.html")
