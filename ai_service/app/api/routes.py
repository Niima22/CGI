from fastapi import APIRouter, Header, HTTPException
from psycopg import OperationalError

from app.models.schemas import (
    AccountRequest,
    AuthResponse,
    AuthUser,
    GenerateResolutionFrameRequest,
    GenerateResolutionFrameResponse,
    SearchRequest,
    SearchResponse,
    SolutionEvaluationRequest,
    SolutionEvaluationResponse,
    SignupRequest,
    TicketCreateRequest,
    TicketResponse,
)
from app.services.auth_service import AccountExistsError, AuthError, AuthService
from app.services.evaluation_service import EvaluationService
from app.services.resolution_generator_service import ResolutionGeneratorService
from app.services.search_service import SearchService
from app.services.ticket_service import TicketService

router = APIRouter()
auth_service = AuthService()
search_service = SearchService()
evaluation_service = EvaluationService()
ticket_service = TicketService()
resolution_generator_service = ResolutionGeneratorService()


def _token_from_header(authorization: str) -> str:
    return authorization.removeprefix("Bearer ").strip()


@router.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "ai-microservice"}


@router.post("/auth/signup", response_model=AuthResponse)
def signup(request: SignupRequest) -> AuthResponse:
    try:
        return auth_service.signup(request)
    except OperationalError as exc:
        raise HTTPException(status_code=503, detail="PostgreSQL connection is not configured or unavailable.") from exc
    except AccountExistsError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    except AuthError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/auth/login", response_model=AuthResponse)
def login(request: AccountRequest) -> AuthResponse:
    try:
        return auth_service.login(request)
    except OperationalError as exc:
        raise HTTPException(status_code=503, detail="PostgreSQL connection is not configured or unavailable.") from exc
    except AuthError as exc:
        raise HTTPException(status_code=401, detail=str(exc)) from exc


@router.get("/auth/me", response_model=AuthUser)
def me(authorization: str = Header(default="")) -> AuthUser:
    token = _token_from_header(authorization)
    if not token:
        raise HTTPException(status_code=401, detail="Missing session token.")

    try:
        return auth_service.user_from_token(token)
    except OperationalError as exc:
        raise HTTPException(status_code=503, detail="PostgreSQL connection is not configured or unavailable.") from exc
    except AuthError as exc:
        raise HTTPException(status_code=401, detail=str(exc)) from exc


@router.post("/ai/search", response_model=SearchResponse)
def search_knowledge_base(request: SearchRequest) -> SearchResponse:
    return search_service.search(request)


@router.post("/generate-resolution-frame", response_model=GenerateResolutionFrameResponse)
def generate_resolution_frame(request: GenerateResolutionFrameRequest) -> GenerateResolutionFrameResponse:
    return resolution_generator_service.generate(request)


@router.get("/tickets", response_model=list[TicketResponse])
def list_tickets() -> list[TicketResponse]:
    try:
        return ticket_service.list_tickets()
    except OperationalError as exc:
        raise HTTPException(status_code=503, detail="PostgreSQL connection is not configured or unavailable.") from exc


@router.post("/tickets", response_model=TicketResponse)
def create_ticket(request: TicketCreateRequest, authorization: str = Header(default="")) -> TicketResponse:
    token = _token_from_header(authorization)
    if not token:
        raise HTTPException(status_code=401, detail="Missing session token.")

    try:
        user = auth_service.user_row_from_token(token)
        return ticket_service.create_ticket(request, user_id=int(user["id"]))
    except OperationalError as exc:
        raise HTTPException(status_code=503, detail="PostgreSQL connection is not configured or unavailable.") from exc
    except AuthError as exc:
        raise HTTPException(status_code=401, detail=str(exc)) from exc


@router.post("/ai/evaluate-solution", response_model=SolutionEvaluationResponse)
def evaluate_solution(request: SolutionEvaluationRequest) -> SolutionEvaluationResponse:
    return evaluation_service.evaluate(request)
