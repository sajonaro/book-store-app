# Book Store — MERN App

A full-stack book management application built with **MongoDB, Express, React, and Node.js**, containerised with **Docker** and running with **Bun**.

---

## Architecture

```
Browser
  └── frontend  (nginx, port 8080)
        ├── /           → React SPA (static files)
        └── /books/*    → proxied to backend (internal)
              └── backend  (Bun + Express, port 5555, internal)
                    └── mongo  (MongoDB 7, port 27017, internal)
```

- **Frontend** — React 18 + Vite + Tailwind CSS, served by nginx
- **Backend** — Express on Bun runtime (hardened with helmet, rate-limiting, mongo-sanitize)
- **Database** — MongoDB 7 with authenticated access, data persisted in a named Docker volume

---

## Running with Docker Compose (recommended)

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) ≥ 24
- [Docker Compose](https://docs.docker.com/compose/) v2 (ships with Docker Desktop)

### Steps

```bash
# 1. Clone / enter the repo
cd book-store

# 2. Create your environment file from the template
cp .env.example .env

# 3. Open .env and set a strong MongoDB password
#    MONGO_ROOT_PASSWORD=<your-strong-password>

# 4. Build images and start all services
docker compose up --build

# The app is now available at http://localhost:8080
```

To run in the background:

```bash
docker compose up --build -d
```

To stop and remove containers (data volume is preserved):

```bash
docker compose down
```

To also remove the database volume (⚠ deletes all data):

```bash
docker compose down -v
```

### Environment variables (`.env`)

| Variable | Default | Required | Description |
|---|---|---|---|
| `MONGO_ROOT_USER` | `admin` | No | MongoDB root username |
| `MONGO_ROOT_PASSWORD` | — | **Yes** | MongoDB root password |
| `MONGO_DB` | `bookstore` | No | Database name |
| `FRONTEND_PORT` | `8080` | No | Host port for the web UI |

---

## Running locally (without Docker)

### Prerequisites

- [Node.js](https://nodejs.org/) ≥ 20  **or** [Bun](https://bun.sh/) ≥ 1.0
- A running MongoDB instance (local or [MongoDB Atlas](https://www.mongodb.com/atlas))

### Backend

```bash
cd book-store

# Install dependencies
npm install          # or: bun install

# Create a .env file in this directory
cat > .env <<'EOF'
PORT=5555
mongoDBURL=mongodb://localhost:27017/bookstore
EOF

# Start the server
node backend/index.js    # or: bun run backend/index.js
```

The API will be available at `http://localhost:5555/books`.

### Frontend

```bash
cd book-store/frontend

# Install dependencies
npm install          # or: bun install

# Start the Vite dev server (proxies /books → localhost:5555 automatically)
npm run dev          # or: bun run dev
```

The UI will be available at `http://localhost:5173`.

---

## API Reference

Base path: `/books`

| Method | Path | Description |
|---|---|---|
| `GET` | `/books` | List all books |
| `POST` | `/books` | Create a book |
| `GET` | `/books/:id` | Get a single book |
| `PUT` | `/books/:id` | Update a book |
| `DELETE` | `/books/:id` | Delete a book |

**Book object**

```json
{
  "title": "The Pragmatic Programmer",
  "author": "Andrew Hunt",
  "publishYear": 1999
}
```

---

## Security measures

| Area | Measure |
|---|---|
| HTTP headers | `helmet` — sets HSTS, X-Frame-Options, CSP, X-Content-Type-Options, etc. |
| CORS | Configurable origin whitelist via `ALLOWED_ORIGINS` env var |
| Rate limiting | 100 requests / 15 min per IP (`express-rate-limit`) |
| Payload size | Requests larger than 10 KB are rejected |
| NoSQL injection | `express-mongo-sanitize` strips `$` and `.` from user input |
| Input validation | Field trimming, max lengths, year range enforced on every write |
| ObjectId safety | All `:id` params validated before hitting the database |
| Error messages | Only generic messages returned in production (no stack traces) |
| Non-root container | Backend runs as a dedicated non-root `appuser` |
| Network isolation | MongoDB and backend are on an internal Docker network — not exposed to the host |
| Secrets | `.env` is git-ignored; only `.env.example` is committed |
