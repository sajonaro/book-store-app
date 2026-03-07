# Book Store Inventory App

A full-stack book inventory system for admins to catalog books via AI-assisted photo recognition, and for buyers to browse and search the catalog.

## Quick Start

### Prerequisites

- Docker & Docker Compose
- An OpenAI / Anthropic API key

### 1. Configure environment

```bash
cp app/.env.example app/.env
# Edit app/.env — fill in DB credentials, API keys, ports
```

**Key variables:**

| Variable            | Default       | Description                        |
|---------------------|---------------|------------------------------------|
| `POSTGRES_USER`     | `bookstore`   | PostgreSQL username                |
| `POSTGRES_PASSWORD` | —             | PostgreSQL password (**required**) |
| `POSTGRES_DB`       | `bookstore`   | Database name                      |
| `ANTHROPIC_API_KEY` | —             | Anthropic API key (**required**)   |
| `PORT`              | `5555`        | Backend port (internal)            |
| `FRONTEND_PORT`     | `8081`        | Host port exposed by nginx         |
| `AI_API_PORT`       | `8000`        | AI service port (for local tests)  |

### 2. Add AI credentials

```bash
echo "your-openai-or-anthropic-key" > app/ai-api/credentials/openai_key.txt
```

### 3. Run

```bash
cd app
docker compose up --build
```

Open **http://localhost:8081** (or whatever `FRONTEND_PORT` is set to).







## Docs

- [`docs/tech-design.md`](docs/tech-design.md) — architecture, data model, API design
- [`docs/specs.md`](docs/specs.md) — feature specifications
- [`docs/PRD.md`](docs/PRD.md) — product requirements
