# Book Store Inventory App — Technical Design Document

**Version:** 1.1  
**Date:** 2026-03-05  
**Status:** Draft

---

## 1. Overview

This document describes the target technical architecture and design decisions for the Book Store Inventory App. It is intended for engineers implementing or reviewing the system.

The system enables admins to catalog books via AI-assisted photo recognition and provides retail buyers with a searchable book catalog via web (and later mobile).

---

## 2. Architecture Overview

The system follows a **3-tier architecture** with a clear separation between the client layer, API layer, and data layer.

```
┌─────────────────────────────────────────────────────────┐
│                      Clients                            │
│         Web Browser (React)  │  Mobile App (Phase 2)    │
└─────────────────┬───────────────────────────────────────┘
                  │ HTTPS / REST  (proxied via Nginx)
┌─────────────────▼───────────────────────────────────────┐
│                   API Layer (Node.js / Express)         │
│                                                         │
│   ┌─────────────┐  ┌──────────────┐  ┌────────────── ─┐ │
│   │ Books API   │  │ AI Service   │  │ Search Service │ │
│   │ (CRUD)      │  │ (Anthropic)  │  │ (Elasticsearch)│ │
│   └─────────────┘  └──────────────┘  └─────────────── ┘ │
└───────┬───────────────────┬──────────────────┬──────────┘
        │                   │                  │
┌───────▼──────┐   ┌────────▼──────┐  ┌───────▼──────────┐
│  PostgreSQL  │   │  Anthropic    │  │  Elasticsearch   │
│  (Primary DB)│   │  LLM API      │  │  (Search Index)  │
└──────────────┘   └───────────────┘  └──────────────────┘
```

**Docker networking:**

```
backend_net  →  postgres, elasticsearch, backend
frontend_net →  backend, frontend (nginx)
```

PostgreSQL and Elasticsearch are isolated in `backend_net` and never directly reachable from the host. Nginx in `frontend_net` reverse-proxies `/books` API requests to the backend.

---

## 3. Technology Stack

| Layer            | Technology                        | Rationale                                                              |
|------------------|-----------------------------------|------------------------------------------------------------------------|
| Frontend         | React 18, Vite, Tailwind CSS      | Fast HMR in dev, component-based UI, utility-first styling             |
| HTTP Client      | Axios                             | Promise-based, interceptor support                                     |
| Routing          | React Router v6                   | Client-side SPA routing                                                |
| Backend API      | Node.js (ESM), Express 4          | Lightweight, async-friendly                                            |
| DB Client        | `pg` (node-postgres) or Drizzle   | Thin PostgreSQL client; no ORM overhead for simple queries             |
| Primary Database | PostgreSQL 16                     | Relational, ACID-compliant; `JSONB` available for flexible metadata    |
| Search Engine    | Elasticsearch 8                   | Full-text + fuzzy search; richer query DSL than PostgreSQL FTS         |
| AI / LLM         | Anthropic Claude (vision API)     | Extracts book metadata from photos; strong JSON instruction-following  |
| Containerization | Docker, Docker Compose            | Consistent local and production environments                           |
| Web Server       | Nginx                             | Serves React SPA static assets; reverse-proxies API requests           |

---

## 4. Component Design

### 4.1 Backend API (Node.js / Express)

Responsible for all business logic, data access, and external service orchestration.

**Key modules:**

| Module                        | Responsibility                                                         |
|-------------------------------|------------------------------------------------------------------------|
| `index.js`                    | App bootstrap: middleware stack, DB connection, server start           |
| `routes/booksRoute.js`        | REST endpoints for book CRUD, search, and AI photo recognition         |
| `models/bookModel.js`         | PostgreSQL query helpers (replaces Mongoose model)                     |
| `services/bookRecognition.js` | Calls Anthropic vision API; parses and validates JSON response         |
| `services/searchService.js`   | Elasticsearch client: index, update, delete, and multi-field search    |
| `middleware/validate.js`      | Input validation and sanitization (title, author, year, price, stock)  |

**Security middleware:**

| Middleware              | Purpose                                                     |
|-------------------------|-------------------------------------------------------------|
| `helmet`                | HTTP security headers                                       |
| `cors`                  | Origin allowlist via `ALLOWED_ORIGINS` env var             |
| `express-rate-limit`    | 100 req / 15 min per IP (global); 10 req / min on `/recognize`) |
| `express.json({ limit: '10kb' })` | Payload size cap to prevent DoS                  |

### 4.2 Frontend (React / Vite)

Single-page application built with Vite and served by Nginx in production. In development, Vite's dev server proxies `/books` to the backend on port 5555.

**Pages:**

| Page               | Route               | Responsibility                                           |
|--------------------|---------------------|----------------------------------------------------------|
| `Home.jsx`         | `/`                 | Catalog browse; table / card toggle; keyword search      |
| `CreateBooks.jsx`  | `/books/create`     | Admin: photo upload → AI pre-fill → review → save        |
| `EditBook.jsx`     | `/books/:id/edit`   | Admin: edit metadata, price, stock count                 |
| `ShowBook.jsx`     | `/books/:id`        | Buyer: book detail view                                  |
| `DeleteBook.jsx`   | `/books/:id/delete` | Admin: confirm and delete a book record                  |

**Shared components:**

| Component                        | Responsibility            |
|----------------------------------|---------------------------|
| `components/home/BooksTable.jsx` | Tabular catalog view      |
| `components/home/BooksCard.jsx`  | Card/grid catalog view    |
| `components/home/BookModal.jsx`  | Quick-view modal          |
| `components/Spinner.jsx`         | Loading indicator         |
| `components/BackButton.jsx`      | Navigation helper         |

### 4.3 AI Book Recognition Service

When an admin uploads a photo on the Create page:

1. Frontend sends `multipart/form-data` POST to `/books/recognize`
2. Backend receives the image buffer and encodes it as base64
3. A structured prompt + image is sent to the **Anthropic Claude** vision API
4. Claude returns a strict JSON object:
   ```json
   {
     "title": "...",
     "author": "...",
     "isbn": "...",
     "publisher": "...",
     "year": 1987,
     "genre": "...",
     "description": "..."
   }
   ```
   Fields the model cannot determine are returned as `null` (never hallucinated)
5. The response is forwarded to the frontend for admin review before the record is saved

### 4.4 Elasticsearch Integration

Books are indexed synchronously on every create and update operation.

| Parameter       | Value                                                              |
|-----------------|--------------------------------------------------------------------|
| Index name      | `books`                                                            |
| Indexed fields  | `title`, `author`, `isbn`, `genre`, `description`, `year`         |
| Search strategy | `multi_match` query with `fuzziness: AUTO`                        |
| Sync strategy   | Synchronous write-through (acceptable at MVP scale)               |

---

## 5. Data Model

### PostgreSQL — `books` table

```sql
CREATE TABLE books (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title        VARCHAR(500)   NOT NULL,
    author       VARCHAR(500)   NOT NULL,
    isbn         VARCHAR(20),              -- nullable: vintage books may lack ISBN
    publisher    VARCHAR(255),
    publish_year INTEGER,
    genre        VARCHAR(100),
    description  TEXT,
    price        NUMERIC(10,2)  NOT NULL DEFAULT 0.00,
    stock        INTEGER        NOT NULL DEFAULT 0,
    created_at   TIMESTAMPTZ    NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ    NOT NULL DEFAULT now()
);
```

> **JSONB note:** If future requirements call for storing arbitrary per-book metadata (e.g. edition variants, translations), a `metadata JSONB` column can be added without migrating to a document database.

---

## 6. API Design

### Base URL: `/books`

| Method | Endpoint           | Description                                      | Auth Required |
|--------|--------------------|--------------------------------------------------|---------------|
| GET    | `/books`           | List all books; supports `?q=` full-text search  | No            |
| GET    | `/books/:id`       | Get a single book by UUID                        | No            |
| POST   | `/books`           | Create a new book record                         | Admin         |
| PUT    | `/books/:id`       | Update book metadata, price, or stock            | Admin         |
| DELETE | `/books/:id`       | Delete a book record                             | Admin         |
| POST   | `/books/recognize` | Upload photo → extract metadata via AI           | Admin         |

### Response envelope

```json
// Collection
{ "count": 42, "data": [ ... ] }

// Single resource
{ "data": { ... } }

// Error
{ "msg": "Human-readable error message" }
```

---

## 7. Infrastructure & Deployment

All services run as Docker containers orchestrated by Docker Compose.

```
docker-compose.yml
├── postgres    → PostgreSQL 16  (backend_net; not exposed to host)
├── elastic     → Elasticsearch 8 (backend_net; not exposed to host)
├── backend     → Node.js/Express :5555 (backend_net + frontend_net)
└── frontend    → React SPA via Nginx :8080→:80 (frontend_net)
```

**Environment configuration** is managed via `.env` (see `.env.example`). Secrets must never be committed to source control.

**`.env.example`:**

```
# PostgreSQL
POSTGRES_USER=bookstore
POSTGRES_PASSWORD=changeme_strong_password_here
POSTGRES_DB=bookstore

# Elasticsearch
ELASTIC_URL=http://elastic:9200

# Anthropic
ANTHROPIC_API_KEY=sk-ant-...

# Backend
PORT=5555
ALLOWED_ORIGINS=http://localhost:8080
NODE_ENV=production

# Frontend
FRONTEND_PORT=8080
```

**Health checks:** All services define `healthcheck` blocks so Docker Compose waits for dependencies before starting dependent containers (`postgres` → `backend` → `frontend`).

---

## 8. Key Design Decisions

| Decision                            | Choice                                  | Rationale                                                                               |
|-------------------------------------|-----------------------------------------|-----------------------------------------------------------------------------------------|
| Primary database                    | PostgreSQL                              | Structured book data fits a relational model; JSONB available if flexible fields needed |
| DB client                           | `pg` (node-postgres) or Drizzle         | Lightweight; avoids ORM overhead for simple CRUD                                        |
| Search engine                       | Elasticsearch                           | Purpose-built for full-text and fuzzy search at scale                                  |
| Search index sync                   | Synchronous write-through               | Simple at MVP scale; can move to async queue (Bull + Redis) if write load grows         |
| AI provider                         | Anthropic Claude (vision)               | Strong vision + JSON instruction-following without fine-tuning                          |
| Image handling                      | Base64 in API request (not persisted)   | Simplest MVP path; Phase 2 should persist images in object storage (S3 / GCS)           |
| Authentication                      | None (MVP — internal admin tool)        | Out of scope for initial release; JWT-based auth planned as follow-up                   |
| Mobile                              | Deferred to Phase 2                     | Web catalog must be stable first; same REST API will serve mobile clients               |
| Docker networking                   | Two isolated bridge networks            | `backend_net` keeps DB off the internet; `frontend_net` connects Nginx ↔ backend       |

---

## 9. Open Questions / Future Work

- [ ] Add JWT authentication for admin routes before any public-facing deployment
- [ ] Persist uploaded book images to object storage (S3 / GCS); store URL in `books.cover_image_url`
- [ ] Add tighter rate limit on `/books/recognize` to control Anthropic API spend
- [ ] Switch Elasticsearch sync to async queue (Bull + Redis) for write-heavy scenarios
- [ ] Implement Android and iOS apps (Phase 2) consuming the same REST API
- [ ] Add `updated_at` auto-update trigger in PostgreSQL (or handle at the application layer)
- [ ] Add monitoring and alerting (Prometheus + Grafana, or Datadog)
- [ ] Define backup and restore strategy for the PostgreSQL data volume
