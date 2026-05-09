from pydantic import BaseModel, Field


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
