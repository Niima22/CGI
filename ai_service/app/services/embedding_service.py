from typing import Iterable

import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer


class EmbeddingService:
    def __init__(self, corpus: Iterable[str], model_name: str = "all-MiniLM-L6-v2") -> None:
        self._model = None
        self._vectorizer = None
        self._uses_sentence_transformers = False
        self._corpus = list(corpus)

        try:
            from sentence_transformers import SentenceTransformer

            self._model = SentenceTransformer(model_name)
            self._uses_sentence_transformers = True
        except Exception:
            self._vectorizer = TfidfVectorizer(stop_words="english")
            self._vectorizer.fit(self._corpus)

    @property
    def backend_name(self) -> str:
        if self._uses_sentence_transformers:
            return "sentence-transformers"
        return "tfidf-fallback"

    def encode(self, texts: list[str]) -> np.ndarray:
        if self._model is not None:
            embeddings = self._model.encode(texts, convert_to_numpy=True, normalize_embeddings=True)
            return np.asarray(embeddings)

        if self._vectorizer is None:
            raise RuntimeError("Embedding service is not initialized.")

        return self._vectorizer.transform(texts).toarray()
