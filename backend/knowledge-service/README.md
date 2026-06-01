# Knowledge Service

## Purpose

Manages knowledge base articles, procedures, known issues, tags, and reusable resolution references.

## Planned Features

- Article creation and approval.
- Article search and filtering.
- Tag and category management.
- Link knowledge entries to ticket categories.
- Provide reference material for AI-assisted workflows.

## Planned Entities

- KnowledgeArticle
- KnowledgeCategory
- KnowledgeTag
- ArticleRevision
- ArticleFeedback

## Planned Endpoints

- `GET /knowledge/articles`
- `GET /knowledge/articles/{id}`
- `POST /knowledge/articles`
- `PATCH /knowledge/articles/{id}`
- `GET /knowledge/search`
- `POST /knowledge/articles/{id}/feedback`

## Dependencies

- PostgreSQL for knowledge content.
- Ticket Service for ticket-linked references.
- FastAPI AI Service may consume knowledge context through backend calls later.
