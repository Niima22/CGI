from pydantic import BaseModel, Field


class GenerateResolutionRequest(BaseModel):
    titre: str = Field(..., min_length=1)
    synthese: str = Field(..., min_length=1)
    actions: list[str] = Field(default_factory=list)
    bannette: str | None = None
    outils: str | None = None
    partie_concernee: str | None = None
    statut: str | None = None


class GenerateResolutionResponse(BaseModel):
    resolution: str


class AnalyzeTicketRequest(BaseModel):
    titre: str = Field(..., min_length=1)
    synthese: str = Field(..., min_length=1)
    resolution: str = Field(..., min_length=1)


class AnalyzeTicketResponse(BaseModel):
    synthese_demande: int
    actions_resultat: int
    formule_politesse: int
    conformite_solution: int
    statut_global: str
    criteres_non_conformes: list[str]
    explication: str
    proposition_correction: str
    score_confiance: float


class TrainModelRequest(BaseModel):
    excel_path: str
    sheet_name: str = "Picking"
    train_classifier: bool = True
    fine_tune_generator: bool = False


class TrainModelResponse(BaseModel):
    status: str
    detail: str
