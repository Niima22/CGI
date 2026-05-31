from pydantic import BaseModel, Field


class AccountRequest(BaseModel):
    email: str = Field(..., min_length=1)
    password: str = Field(..., min_length=6)


class SignupRequest(AccountRequest):
    full_name: str | None = None
    role: str = Field(..., pattern="^(Consultant|Supervisor)$")


class AuthUser(BaseModel):
    email: str
    full_name: str | None = None
    role: str


class AuthResponse(BaseModel):
    token: str
    user: AuthUser


class SearchRequest(BaseModel):
    title: str = Field(..., min_length=1)
    description: str = Field(..., min_length=1)
    category: str | None = None
    priority: str | None = None
    resolution: str | None = None
    closing_comment: str | None = None
    top_k: int = Field(default=3, ge=1, le=10)


class KnowledgeBaseMatch(BaseModel):
    article_id: str
    title: str
    category: str
    resolution_type: str
    similarity_score: float
    comment: str


class SearchResponse(BaseModel):
    query_summary: str
    matches: list[KnowledgeBaseMatch]


class SolutionEvaluationRequest(BaseModel):
    ticket_id: str = Field(..., min_length=1)
    title: str = Field(..., min_length=1)
    bannette: str = Field(..., min_length=1)
    synthese: str = Field(..., min_length=1)
    actions: list[str] = Field(..., min_length=1)
    outils: str | None = None
    resolution_frame: str = Field(..., min_length=1)


class CriterionEvaluation(BaseModel):
    status: str
    comment: str


class SolutionEvaluationResponse(BaseModel):
    ticket_id: str
    bannette: str
    trame_resolution: CriterionEvaluation
    type_resolution: CriterionEvaluation


class TicketCreateRequest(BaseModel):
    id: str = Field(..., min_length=1)
    title: str = Field(..., min_length=1)
    department: str = Field(..., min_length=1)
    summary: str = Field(..., min_length=1)
    actions: list[str] = Field(..., min_length=1)
    tools: str | None = None
    resolution_frame: str = Field(..., min_length=1)


class TicketResponse(TicketCreateRequest):
    created_at: str
    created_by_email: str | None = None
