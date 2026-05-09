from sklearn.metrics.pairwise import cosine_similarity

from app.data.mock_data import MOCK_KNOWLEDGE_BASE
from app.models.schemas import KnowledgeBaseMatch, SearchRequest, SearchResponse
from app.services.embedding_service import EmbeddingService


class SearchService:
    def __init__(self) -> None:
        self._articles = MOCK_KNOWLEDGE_BASE
        self._article_texts = [self._article_to_text(article) for article in self._articles]
        self._embedding_service = EmbeddingService(self._article_texts)
        self._article_embeddings = self._embedding_service.encode(self._article_texts)

    def search(self, request: SearchRequest) -> SearchResponse:
        query_text = self._request_to_text(request)
        query_embedding = self._embedding_service.encode([query_text])
        similarities = cosine_similarity(query_embedding, self._article_embeddings)[0]

        ranked_indexes = similarities.argsort()[::-1][: request.top_k]
        matches = [
            self._to_match(index=index, score=float(similarities[index]))
            for index in ranked_indexes
        ]

        return SearchResponse(
            query_summary=self._summarize_request(request),
            matches=matches,
        )

    def _to_match(self, index: int, score: float) -> KnowledgeBaseMatch:
        article = self._articles[index]
        return KnowledgeBaseMatch(
            article_id=article["id"],
            title=article["title"],
            category=article["category"],
            resolution_type=article["resolution_type"],
            similarity_score=round(score, 4),
            comment=self._build_comment(article["category"], score),
        )

    def _build_comment(self, category: str, score: float) -> str:
        backend = self._embedding_service.backend_name
        if score >= 0.65:
            confidence = "Strong semantic match"
        elif score >= 0.35:
            confidence = "Moderate semantic match"
        else:
            confidence = "Weak semantic match"

        return f"{confidence} in {category} using {backend} embeddings."

    def _request_to_text(self, request: SearchRequest) -> str:
        fields = [
            request.title,
            request.description,
            request.category,
            request.priority,
            request.resolution,
            request.closing_comment,
        ]
        return " ".join(field for field in fields if field)

    def _summarize_request(self, request: SearchRequest) -> str:
        category = request.category or "Uncategorized"
        priority = request.priority or "No priority"
        return f"{request.title} | Category: {category} | Priority: {priority}"

    def _article_to_text(self, article: dict[str, str]) -> str:
        return " ".join(
            [
                article["title"],
                article["content"],
                article["category"],
                article["resolution_type"],
            ]
        )
