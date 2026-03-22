# Book Store Inventory App

A multi-tenant full-stack book inventory system for admins to catalog books via AI-assisted photo recognition, and for buyers to browse and search the catalog.

## Architecture Overview

- **Frontend**: React + TypeScript (Vite), served via Nginx
- **Backend**: TypeScript (Bun runtime), Express-style REST API
- **Database**: PostgreSQL 16 — stores tenants, users, books, search config
- **Search**: Elasticsearch 8 — per-tenant indices (`books-{tenantId}`) for full data isolation
- **AI API**: Python FastAPI service — photo-based book recognition (Anthropic/OpenAI)
- **Kibana**: Optional — use `books-*` data view to inspect all tenant indices

## Multi-Tenant Model

Each registered book store is a **tenant** with:
- Fully isolated book catalog and user accounts
- A dedicated Elasticsearch index (`books-{tenantId}`)
- A per-tenant AES-256 encryption key (stored in PostgreSQL, generated at registration)
- Optional OpenAI API key for AI book recognition (configured in Store Settings after registration)

## Quick Start

### Prerequisites

- Docker & Docker Compose

### 1. Configure environment

```bash
cp app/.env.example app/.env
# Edit app/.env — fill in DB credentials and any optional settings
```

**Key variables:**

| Variable            | Default       | Description                          |
|---------------------|---------------|--------------------------------------|
| `POSTGRES_USER`     | `bookstore`   | PostgreSQL username                  |
| `POSTGRES_PASSWORD` | —             | PostgreSQL password (**required**)   |
| `POSTGRES_DB`       | `bookstore`   | Database name                        |
| `PORT`              | `5555`        | Backend port (internal)              |
| `FRONTEND_PORT`     | `8081`        | Host port exposed by Nginx           |
| `AI_API_PORT`       | `8000`        | AI service port (for local tests)    |
| `PUBLIC_BASE_URL`   | `http://localhost:8081` | Base URL for QR code deep-links |

### 2. (Optional) Add AI credentials

To enable AI-powered book recognition at the system level, add your Anthropic or OpenAI key:

```bash
echo "your-anthropic-or-openai-key" > app/ai-api/credentials/openai_key.txt
```

Alternatively, each tenant can configure their own OpenAI API key after registration via **Store Settings → API Key**.

### 3. Run

```bash
cd app
docker compose up --build
```

Open **http://localhost:8081** (or whatever `FRONTEND_PORT` is set to).

## Registering a Store

1. Go to **http://localhost:8081/register**
2. Fill in: Store Name, Your Name, Email, Password
3. Your store is created and you are logged in automatically
4. Configure your OpenAI API key (for AI book recognition) in **Store Settings**

## Seeding Sample Books

Use the seed script to populate a tenant's catalog from the command line:

```bash
python app/seed_books.py <admin_email>
```

**Example:**
```bash
python app/seed_books.py admin@mybookstore.com
```

The script looks up the tenant by email, then inserts ~100 classic books into their catalog. Duplicate ISBNs are silently skipped.

## User Roles

| Role           | Scope        | Capabilities                                                         |
|----------------|--------------|----------------------------------------------------------------------|
| `superuser`    | System-wide  | View all tenants, suspend/reactivate tenants, reset admin passwords  |
| `tenant-admin` | Own tenant   | Full book CRUD, settings, logo, API key, user management, QR code   |
| `user`         | Own tenant   | Scan books via AI, update book info; no settings access              |

## Elasticsearch Tenant Segregation

Each tenant gets their own Elasticsearch index: `books-{tenantId}`.  
Indices are created lazily on first use. Kibana can use the `books-*` wildcard data view.

Per-tenant search field configuration is available in Store Settings → Search Index Settings.

## Docs

- [`docs/tech-design.md`](docs/tech-design.md) — architecture, data model, API design
- [`docs/specs.md`](docs/specs.md) — feature specifications
- [`docs/PRD.md`](docs/PRD.md) — product requirements
