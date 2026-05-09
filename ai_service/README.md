# AI Microservice

Independent FastAPI service for AI ticket assistance.

## Folder Structure

```text
ai_service/
  app/
    api/
      routes.py
    data/
      mock_data.py
    models/
      schemas.py
    services/
      embedding_service.py
      search_service.py
    main.py
  requirements.txt
```

## Run Locally

```bash
cd ai_service
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8001
```

For local transformer embeddings, install the optional ML dependency:

```bash
pip install -r requirements-ml.txt
```

Without `sentence-transformers`, the service uses a scikit-learn TF-IDF embedding fallback so the API remains testable.

Health check:

```bash
curl http://localhost:8001/health
```

Correction interface:

```text
http://localhost:8001/
```

Search:

```bash
curl -X POST http://localhost:8001/ai/search ^
  -H "Content-Type: application/json" ^
  -d "{\"title\":\"Cannot connect to VPN\",\"description\":\"User gets authentication failed when opening VPN client\",\"category\":\"Network\",\"priority\":\"High\",\"top_k\":3}"
```
