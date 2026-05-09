from fastapi import APIRouter

from app.models.schemas import SearchRequest, SearchResponse
from app.services.search_service import SearchService

router = APIRouter()
search_service = SearchService()


@router.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "ai-microservice"}


@router.post("/ai/search", response_model=SearchResponse)
def search_knowledge_base(request: SearchRequest) -> SearchResponse:
    return search_service.search(request)
