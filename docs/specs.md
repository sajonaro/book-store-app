# Book Store Inventory App — Technical Specifications

## Why

Book store admins waste hours manually entering book data, and vintage books often have no digital records at all. Retail buyers have no convenient way to search the catalog. We need a system that automates book cataloging via AI photo recognition and exposes a searchable catalog to buyers via web (and later mobile).

## What

Build a full-stack inventory and catalog system on top of the existing React/Express codebase, migrating the database from MongoDB to PostgreSQL, adding Elasticsearch for search, and integrating the Anthropic Claude vision API for AI-assisted book metadata extraction.

## Constraints

### Must
- Replace MongoDB / Mongoose with PostgreSQL 16 + `pg` (node-postgres)
- Extend the book schema with: `isbn`, `publisher`, `genre`, `description`, `price`, `stock`
- Integrate Anthropic Claude vision API for photo-based metadata extraction
- Index all book records in Elasticsearch 8 for full-text search
- Expose a `POST /books/recognize` endpoint for photo upload → metadata extraction
- Support `?q=` query parameter on `GET /books` for keyword search via Elasticsearch
- Keep all existing security middleware: `helmet`, `cors`, `express-rate-limit`
- All services start with `docker compose up` (no manual setup)

### Must Not
- Expose PostgreSQL or Elasticsearch ports to the host in production
- Store Anthropic API key or DB credentials in source control
- Break existing frontend routes (`/`, `/books/create`, `/books/:id`, `/books/:id/edit`, `/books/:id/delete`)
- Remove response envelope format: `{ count, data }` for collections, `{ data }` for single records, `{ msg }` for errors

### Out of Scope
- ~~Authentication / authorization (JWT auth is a follow-up task)~~ — **see T10/T11 below**
- Persistent image storage (images are processed in-memory as base64; S3/GCS is Phase 2)
- Android / iOS mobile apps (Phase 2)
- Payment processing or e-commerce checkout
- Book recommendations engine

## Current State

- Express app in `book-store/backend/` (Node.js ESM modules)
- Mongoose `Book` model in `book-store/backend/models/bookModel.js` — fields: `title`, `author`, `publishYear`
- CRUD routes in `book-store/backend/routes/booksRoute.js` — uses MongoDB ObjectId validation
- React SPA in `book-store/frontend/src/` — pages: Home, CreateBooks, EditBook, ShowBook, DeleteBook
- Docker Compose has: `mongo`, `backend`, `frontend` (nginx)
- No Elasticsearch service, no AI integration yet

## Tasks

### ~~T1: Replace MongoDB with PostgreSQL~~ ✅ DONE

**What:** Swap Mongoose for `pg` (node-postgres). Connect to PostgreSQL in `index.js`. Create the `books` table on startup if it doesn't exist.

**Files:**
- `book-store/backend/index.js`
- `book-store/backend/models/bookModel.js`
- `book-store/backend/package.json`
- `book-store/docker-compose.yml`
- `book-store/.env.example`

**Schema:**
```sql
CREATE TABLE IF NOT EXISTS books (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title        VARCHAR(500)   NOT NULL,
    author       VARCHAR(500)   NOT NULL,
    isbn         VARCHAR(20),
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

**Verify:**
- `docker compose up` starts without errors
- `POST /books` with `{ title, author, publish_year }` returns `201` and a UUID `id`
- `GET /books` returns `{ count, data: [...] }`
- `GET /books/:id`, `PUT /books/:id`, `DELETE /books/:id` all work with UUID IDs

---

### ~~T2: Update Input Validation~~ ✅ DONE

**What:** Replace MongoDB ObjectId validation (`mongoose.Types.ObjectId.isValid`) with UUID format validation. Update `sanitizeBook` to include all new fields: `isbn`, `publisher`, `publish_year`, `genre`, `description`, `price`, `stock`.

**Files:**
- `book-store/backend/routes/booksRoute.js`
- `book-store/backend/middleware/validate.js` *(new)*

**Verify:**
- `GET /books/not-a-uuid` returns `400 { msg: 'Invalid book ID' }`
- `POST /books` without required fields returns `400` with a descriptive message
- `price` with a negative value returns `400`

---

### ~~T3: Add Elasticsearch Service and Indexing~~ ✅ DONE

**What:** Add Elasticsearch 8 to Docker Compose. Create a `searchService.js` that indexes books on create/update and removes entries on delete. Wire the service into the books route.

**Files:**
- `book-store/docker-compose.yml`
- `book-store/backend/services/searchService.js` *(new)*
- `book-store/backend/routes/booksRoute.js`
- `book-store/.env.example`

**Index config:**
```json
{
  "index": "books",
  "fields": ["title", "author", "isbn", "genre", "description", "publish_year"],
  "query": { "multi_match": { "fuzziness": "AUTO" } }
}
```

**Verify:**
- `docker compose up` includes `elastic` service and it passes its health check
- After `POST /books`, the book appears in `GET /books?q=<title>`
- After `DELETE /books/:id`, the book no longer appears in search results

---

### ~~T4: Search Endpoint~~ ✅ DONE

**What:** Add `?q=` query parameter support to `GET /books`. When `q` is present, delegate to Elasticsearch; otherwise fall back to a full `SELECT` from PostgreSQL.

**Files:**
- `book-store/backend/routes/booksRoute.js`
- `book-store/backend/services/searchService.js`

**Verify:**
- `GET /books?q=tolkien` returns books matching "tolkien" in title or author (fuzzy)
- `GET /books?q=xyz_not_a_book` returns `{ count: 0, data: [] }`
- `GET /books` (no query) returns all books from PostgreSQL

---

### ~~T5: AI Photo Recognition Endpoint~~ ✅ DONE

**What:** Expose `POST /books/recognize` that accepts one or more book photos (`multipart/form-data`, field name `photos`), forwards them to a dedicated Python **ai-api** sidecar service, which sends the images to **OpenAI GPT-4o vision** and returns extracted book metadata as JSON.

**Architecture:**
```
CreateBooks.jsx
  → POST /books/recognize  (Express backend, multer)
  → POST /recognize        (FastAPI ai-api sidecar, port 8000)
  → OpenAI GPT-4o vision   (BOOK_METADATA_EXTRACTION_PROMPT)
  → { data: { title, author, isbn, publisher, year, genre, description } }
```

**ai-api sidecar** (`app/ai-api/`):
- Python 3.11 / FastAPI / uvicorn
- `POST /recognize` — accepts multipart images, encodes to base64, calls `openai.chat.completions.create` with all images as `image_url` parts
- `GET /health` — used by Docker health check
- Config: `config.yaml` (model `gpt-4o`, `image_detail: high`, `max_tokens: 1024`)
- API key read from `credentials/openai_key.txt` (volume-mounted read-only)
- Prompt: `BOOK_METADATA_EXTRACTION_PROMPT` in `prompts/extraction.py` — instructs GPT-4o to return strict JSON, `null` for unknown fields; may infer genre from cover art and generate a short description

**Files:**
- `app/ai-api/api.py` — FastAPI app with `/recognize` + `/health`
- `app/ai-api/src/openai_client.py` — `create_client()`, `analyze_multiple_images()`
- `app/ai-api/src/config.py` — YAML config loader, `get_openai_config()`
- `app/ai-api/config.yaml` — API + OpenAI settings
- `app/ai-api/prompts/extraction.py` — `BOOK_METADATA_EXTRACTION_PROMPT`
- `app/ai-api/requirements.txt` — `openai`, `fastapi`, `uvicorn`, `python-multipart`, `PyYAML`
- `app/ai-api/Dockerfile` — Python 3.11 image, `CMD ["python", "api.py"]`
- `app/docker-compose.yml` — added `ai-api` service; `backend` depends on it (health condition); `AI_API_URL=http://ai-api:8000` env var passed to backend
- `app/backend/routes/booksRoute.js` — `POST /books/recognize` (declared before `/:id`); uses `multer` memoryStorage (10 MB, images only); rate-limited to 10 req/min per IP; forwards files to ai-api via native `fetch` + `FormData`
- `app/.env.example` — documents `OPENAI_API_KEY` and `AI_API_URL`

**Response shape:**
```json
{
  "data": {
    "title": "The Hobbit",
    "author": "J.R.R. Tolkien",
    "isbn": "978-0-261-10221-7",
    "publisher": "George Allen & Unwin",
    "year": 1937,
    "genre": "Fantasy",
    "description": "A fantasy novel and the prelude to The Lord of the Rings."
  }
}
```
On AI failure the endpoint still returns `200` with all fields `null` plus an `"error"` key (never a 5xx for unrecognized images).

**Rate limit:** 10 requests / minute per IP on `/books/recognize` only (separate `express-rate-limit` instance).

**Verify:**
- Upload a JPEG of a book cover → response contains populated `title` and `author`
- Upload a blank/unreadable image → fields return `null` but endpoint responds `200` (not an error)
- Exceeding 10 requests/minute returns `429`
- `docker compose up` starts the `ai-api` container and it passes its health check before `backend` starts

---

### ~~T6: Extend Frontend Create/Edit Forms~~ ✅ DONE

**What:** Update `CreateBooks.jsx` and `EditBook.jsx` to include fields for `isbn`, `publisher`, `publish_year`, `genre`, `description`, `price`, `stock`. Add a photo upload button on `CreateBooks.jsx` that calls `/books/recognize` and pre-fills the form fields.

**Files:**
- `book-store/frontend/src/pages/CreateBooks.jsx`
- `book-store/frontend/src/pages/EditBook.jsx`

**Verify:**
- Admin can upload a photo → form fields are pre-filled with recognized metadata
- Admin can edit any pre-filled field before saving
- All new fields are submitted to `POST /books` / `PUT /books/:id` and persisted

---

### ~~T7: Update Docker Compose~~ ✅ DONE

**What:** Replace `mongo` service with `postgres` and add `elastic`. Update `backend` environment variables. Add health checks for all services. Ensure correct startup order: `postgres` → `backend` → `frontend`, `elastic` starts in parallel with `postgres`.

**Files:**
- `book-store/docker-compose.yml`
- `book-store/.env.example`

**Target service map:**
```
postgres    → PostgreSQL 16  (backend_net; port not exposed to host)
elastic     → Elasticsearch 8 (backend_net; port not exposed to host)
backend     → Node.js/Express :5555 (backend_net + frontend_net)
frontend    → Nginx :${FRONTEND_PORT:-8080}→:80 (frontend_net)
```

**Verify:**
- `docker compose up` starts all 4 services without errors
- `docker compose ps` shows all services as `healthy`
- Removing the `elastic` container causes `GET /books?q=x` to fail gracefully (returns error, does not crash backend)

---

### ~~T8: Update Book Detail Page~~ ✅ DONE

**What:** Update `ShowBook.jsx` to display all new fields: `isbn`, `publisher`, `publish_year`, `genre`, `description`, `price`, and stock availability status.

**Files:**
- `book-store/frontend/src/pages/ShowBook.jsx`
- `book-store/frontend/src/components/home/BookModal.jsx`
- `book-store/frontend/src/components/home/BookSingleCard.jsx`

**Verify:**
- Book detail page renders all stored fields
- Books with `stock: 0` display an "Out of stock" label
- Books with `stock > 0` display the available quantity

---

### ~~T9: Integration Test~~ *(pending — no test file yet)*

**What:** End-to-end smoke test covering the full happy path: create via AI recognition → search → retrieve → update stock → delete.

**Files:**
- `book-store/backend/tests/integration.test.js` *(new)*

**Verify:**
```
Upload photo → POST /books/recognize → POST /books → GET /books?q=<title> finds it
→ GET /books/:id returns full record → PUT /books/:id updates stock
→ DELETE /books/:id removes it → GET /books?q=<title> returns empty
```

---

### ~~T10: Login Page~~ ✅ DONE

**What:** Add a login page as the app entry point. Users choose a role from a dropdown: **Admin** or **User (Buyer)**.

- **Admin** path: password field appears; credentials are validated against a `users` table in PostgreSQL (columns: `id`, `name`, `email`, `pwd_hash`). On success, the session is stored in `localStorage` and the user is redirected to the Home (inventory management) page.
- **User / Buyer** path: no password required; clicking "Continue" immediately redirects to the Search page.

**Backend:**

Add a `users` table and a `POST /auth/login` endpoint:

```sql
CREATE TABLE IF NOT EXISTS users (
    id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name      VARCHAR(255) NOT NULL,
    email     VARCHAR(255) NOT NULL UNIQUE,
    pwd_hash  TEXT         NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

- Passwords are hashed with **bcrypt** (cost factor 12).
- A default admin is seeded on startup: `email = "admin@bookstore.com"`, `password = "admin123"`.
- `POST /auth/login` request body: `{ email, password }`. Returns `200 { token, user: { id, name, email } }` on success, `401 { msg }` on failure. *(JWT token is a stub — can be a signed random string for Phase 1.)*
- The endpoint is rate-limited to **10 requests / 15 minutes per IP** to prevent brute-force attacks.

**Frontend:**

- New page: `src/pages/LoginPage.jsx`
- Route `/` redirects to `/login`; original home moves to `/home`
- Login form:
  - Dropdown: `Admin` / `User (Buyer)`
  - When **Admin** is selected: show `Email` input + `Password` input
  - When **User** is selected: only a "Continue as Buyer" button — no credentials needed
  - On Admin login success: save `{ role: 'admin', token }` to `localStorage`; navigate to `/home`
  - On User: save `{ role: 'user' }` to `localStorage`; navigate to `/search`
- A `ProtectedRoute` wrapper redirects unauthenticated users (no `localStorage` entry) back to `/login`

**Files:**
- `book-store/backend/models/userModel.js` *(new)*
- `book-store/backend/routes/authRoute.js` *(new)*
- `book-store/backend/index.js` (mount `/auth` router)
- `book-store/frontend/src/pages/LoginPage.jsx` *(new)*
- `book-store/frontend/src/components/ProtectedRoute.jsx` *(new)*
- `book-store/frontend/src/App.jsx` (add `/login`, `/home`, protect existing routes)

**Verify:**
- Visiting `/` shows the login page
- Selecting "User" and clicking Continue navigates to `/search` without any credential check
- Selecting "Admin" without entering a password shows a validation error
- Entering wrong admin credentials returns `401` and shows an error message
- Entering correct admin credentials (`admin@bookstore.com` / `admin123`) navigates to `/home`
- Refreshing `/home` with no session redirects to `/login`

---

### ~~T11: Search Page (Buyer View)~~ ✅ DONE

**What:** Create a standalone search page accessible to unauthenticated users (role = "user"). The page presents a single centered search bar styled after Google Search.

**UX spec:**
- Large centered logo / app name at the top
- A wide, rounded search input with a search icon button
- On submit: calls `GET /books?q=<term>` and displays results below the search bar as cards (reusing `BookSingleCard` with action buttons hidden for non-admins)
- Empty query shows a placeholder message: "Search for a book by title, author or genre"
- No results shows: "No books found for '<term>'"
- Loading state shows a spinner

**Files:**
- `book-store/frontend/src/pages/SearchPage.jsx` *(new)*
- `book-store/frontend/src/App.jsx` (add `/search` route)

**Verify:**
- Navigating to `/search` shows the Google-like search bar
- Typing "tolkien" and submitting returns matching books
- Non-admin users do not see Edit / Delete action icons on result cards
- Admin users navigating to `/search` still see the full card actions

---

### ~~T12: Frontend Tailwind CSS Refactor (Consistent Design System)~~ ✅ DONE

**What:** Refactor all frontend pages and components to use Tailwind CSS exclusively, establishing a consistent visual language across the entire app. Remove any inline styles and ad-hoc class combinations that deviate from the design system.

**Design Tokens (Tailwind config):**

| Token | Value | Usage |
|-------|-------|-------|
| Primary | `sky-600` / `sky-500` | Buttons, links, headings |
| Danger | `red-500` / `red-600` | Delete actions, out-of-stock |
| Success | `green-500` / `green-600` | In-stock badges, confirm actions |
| Warning | `yellow-500` / `yellow-600` | Edit actions |
| Surface | `white` / `gray-50` | Page backgrounds, cards |
| Border | `gray-200` | Card borders, dividers |
| Text primary | `gray-900` | Headings |
| Text muted | `gray-500` | Labels, meta text |

**Component conventions:**

- **Page wrapper:** `min-h-screen bg-gray-50 p-6`
- **Section heading:** `text-3xl font-bold text-gray-900 my-6`
- **Card:** `bg-white rounded-2xl shadow-sm border border-gray-200 p-6`
- **Primary button:** `bg-sky-500 hover:bg-sky-600 text-white font-semibold px-5 py-2 rounded-lg transition`
- **Danger button:** `bg-red-500 hover:bg-red-600 text-white font-semibold px-5 py-2 rounded-lg transition`
- **Input field:** `w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-sky-400`
- **Label:** `block text-sm font-medium text-gray-700 mb-1`
- **Back button:** `inline-flex items-center gap-2 text-sky-600 hover:text-sky-800 font-medium`
- **In-stock badge:** `text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full`
- **Out-of-stock badge:** `text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full`
- **Spinner:** centered, `text-sky-500`

**Pages to refactor:**

| Page | Key changes |
|------|------------|
| `Home.jsx` | Consistent page padding, heading style, Table/Card toggle buttons use primary/secondary variants, add "Sign out" button in top-right |
| `CreateBooks.jsx` | Two-column form grid on desktop, consistent field labels and inputs, primary submit button, cancel (back) link |
| `EditBook.jsx` | Same as CreateBooks — two-column grid, consistent labelling |
| `ShowBook.jsx` | Card layout with two columns (metadata left, price/stock right), genre badge, consistent back button |
| `DeleteBook.jsx` | Centered confirmation card, large danger button, ghost cancel button |
| `LoginPage.jsx` | Already consistent — verify matches design tokens |
| `SearchPage.jsx` | Already consistent — verify matches design tokens |

**Components to refactor:**

| Component | Key changes |
|-----------|------------|
| `BackButton.jsx` | Replace icon-only button with text + icon link styled per design token |
| `Spinner.jsx` | Ensure uses `text-sky-500` |
| `BooksTable.jsx` | Consistent table: `thead` with `bg-gray-50`, alternating row hover, action icon colors match design tokens |
| `BookSingleCard.jsx` | Card corners `rounded-2xl`, consistent badge colors, icon action colors |
| `BookModal.jsx` | Full-width card, consistent field display |
| `BooksCard.jsx` | Grid wrapper consistent spacing |

**Files:**
- `book-store/frontend/src/pages/Home.jsx`
- `book-store/frontend/src/pages/CreateBooks.jsx`
- `book-store/frontend/src/pages/EditBook.jsx`
- `book-store/frontend/src/pages/ShowBook.jsx`
- `book-store/frontend/src/pages/DeleteBook.jsx`
- `book-store/frontend/src/components/BackButton.jsx`
- `book-store/frontend/src/components/Spinner.jsx`
- `book-store/frontend/src/components/home/BooksTable.jsx`
- `book-store/frontend/src/components/home/BookSingleCard.jsx`
- `book-store/frontend/src/components/home/BookModal.jsx`
- `book-store/frontend/src/components/home/BooksCard.jsx`

**Verify:**
- All pages use only Tailwind utility classes — no inline `style=` attributes
- Visual language is consistent: same button styles, same input styles, same card styles on every page
- Dark text on white cards everywhere; `sky-500` as the primary accent colour
- Table rows have hover highlights; action icons use the correct colour per role (view = green, edit = yellow, delete = red)
- Responsive: pages are usable on mobile (≥375 px) and desktop (≥1280 px)

---

---

### T13: SaaS Multi-Tenancy

**What:** Transform the app into a multi-tenant SaaS platform where each tenant (book store) operates in complete isolation — its own database, its own admin user, its own branding, and its own buyer-facing QR/barcode URL.

**Motivation:** Multiple independent book stores should be able to use the same hosted instance of the software without any data bleed between tenants.

---

#### T13.1 — Tenant Registration (Admin Self-Sign-Up)

**What:** Add a public tenant registration page (`/register`) where a new book store owner can create an account. On successful registration a new tenant record is created and the registrant becomes the first admin of that tenant.

**Backend:**

Add a `tenants` table to the shared (control-plane) PostgreSQL database:

```sql
CREATE TABLE IF NOT EXISTS tenants (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug            VARCHAR(100) NOT NULL UNIQUE,   -- URL-safe identifier, e.g. "greenleaf-books"
    name            VARCHAR(255) NOT NULL,
    logo_url        TEXT,                            -- path or URL to uploaded logo
    db_name         VARCHAR(100) NOT NULL UNIQUE,   -- isolated database name for this tenant
    openai_key_enc  TEXT         NOT NULL,           -- AES-256 encrypted OpenAI API key
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);
```

Extend the `users` table with a `tenant_id` foreign key:

```sql
ALTER TABLE users ADD COLUMN tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
```

New endpoint — `POST /tenants/register`:
- Request body: `{ tenantName, slug, adminName, adminEmail, adminPassword, openaiApiKey }`
- Validates `slug` is URL-safe and unique
- Validates `openaiApiKey` is non-empty and matches the `sk-` prefix pattern
- Stores `openaiApiKey` encrypted at rest in the `tenants` table (AES-256; encryption key from `TENANT_SECRET` env var)
- Provisions a new PostgreSQL database for the tenant (see T13.3)
- Creates a tenant row
- Creates an admin user (bcrypt, cost 12) linked to the new tenant
- Returns `201 { tenant: { id, slug, name }, token }` (JWT or signed token for auto-login)
- Rate-limited to **5 requests / hour per IP**

**Frontend:**

- New page: `src/pages/RegisterPage.jsx`
- Route `/register` — publicly accessible
- Registration form fields:
  - Store name (maps to `tenantName`)
  - URL slug (auto-suggested from store name, editable; validated to `[a-z0-9-]+`)
  - Admin full name
  - Admin email
  - Admin password + confirm password
  - OpenAI API key (masked input; tooltip explains it is used for AI book recognition and stored encrypted)
- On success: auto-login and redirect to `/home`
- On slug conflict: inline error "That store URL is already taken"

**Files:**
- `app/backend/models/tenantModel.js` *(new)*
- `app/backend/routes/tenantRoute.js` *(new)*
- `app/backend/src/crypto.js` *(new)* — `encryptKey(plaintext)`, `decryptKey(ciphertext)` using Node.js `crypto` AES-256-GCM
- `app/backend/index.js` (mount `/tenants` router)
- `app/frontend/src/pages/RegisterPage.jsx` *(new)*
- `app/frontend/src/App.jsx` (add `/register` route)
- `app/.env.example` (add `TENANT_SECRET` — 32-byte hex key for AES-256 encryption)

**Verify:**
- `POST /tenants/register` with valid body creates a tenant and admin user; returns `201`
- `POST /tenants/register` without `openaiApiKey` returns `400 { msg: "OpenAI API key is required" }`
- The stored `openai_key_enc` column contains ciphertext (not the raw key)
- The `ai-api` sidecar uses the decrypted per-tenant key when processing recognition requests for that tenant (passed via an internal header `X-OpenAI-Key`)
- Submitting the same `slug` twice returns `409 { msg: "Slug already taken" }`
- Visiting `/register`, filling the form, and submitting redirects the user to `/home`
- Exceeding 5 registrations/hour from the same IP returns `429`

---

#### T13.2 — Per-Tenant Logo Upload

**What:** Allow the tenant admin to upload a custom logo for their store. The logo is displayed on the Search page (buyer-facing) and the Login page in place of the generic app name.

**Backend:**

New endpoint — `POST /tenants/:tenantId/logo`:
- Accepts `multipart/form-data`, field name `logo`
- Validates: image only (PNG/JPEG/WebP/SVG), max 2 MB
- Stores the file on disk under `uploads/logos/<tenantId>.<ext>` (or in object storage — S3/GCS in production)
- Updates `tenants.logo_url` in the database
- Returns `200 { logoUrl }`

New endpoint — `GET /tenants/:tenantId/logo`:
- Returns the logo file (or redirects to the object storage URL)

**Frontend:**

- Add a **"Store Settings"** section to the Admin home page (`Home.jsx`) or a new `Settings.jsx` page
- Logo upload widget: drag-and-drop or file picker; shows current logo preview
- After upload, the new logo is reflected immediately in the header / search page branding

**Files:**
- `app/backend/routes/tenantRoute.js` (add logo endpoints)
- `app/backend/index.js` (serve `uploads/logos/` as static)
- `app/frontend/src/pages/Settings.jsx` *(new)*
- `app/frontend/src/App.jsx` (add `/settings` route, admin-only)
- `app/frontend/src/components/TenantLogo.jsx` *(new — displays logo or fallback app name)*

**Verify:**
- Admin uploads a PNG logo → `GET /tenants/:id/logo` returns the image
- Logo appears on the Search page header after upload
- Uploading a file > 2 MB returns `400 { msg: "File too large" }`
- Non-admin users cannot call `POST /tenants/:id/logo` (returns `403`)

---

#### T13.3 — Isolated Tenant Database

**What:** Each tenant's book catalog (books, users) lives in its own PostgreSQL database, completely isolated from other tenants. The backend selects the correct connection pool based on the tenant derived from the request.

**Design:**

- A **control-plane** database (`bookstore_control`) holds the `tenants` table and global admin records.
- Each tenant gets a dedicated database named after their `db_name` field (e.g., `tenant_greenleaf`).
- On tenant registration (`T13.1`), the backend:
  1. Connects to PostgreSQL as a superuser
  2. Runs `CREATE DATABASE <db_name>`
  3. Runs the `books` and `users` DDL in the new database
  4. Seeds the first admin user
- The backend maintains a **connection pool map** (`Map<tenantId, pg.Pool>`) initialized lazily on first request.
- Tenant resolution: extract the tenant slug from the `Host` header subdomain (`greenleaf-books.example.com`) **or** from a `X-Tenant-ID` request header (for local/dev environments).

**Files:**
- `app/backend/src/tenantDb.js` *(new)* — `getPool(tenantId)`, `provisionTenantDb(tenantSlug, dbName)`
- `app/backend/middleware/resolveTenant.js` *(new)* — middleware that resolves tenant from Host/header and attaches `req.tenantPool` + `req.tenant`
- `app/backend/index.js` (apply `resolveTenant` middleware globally; use `req.tenantPool` in all model queries)
- `app/backend/models/bookModel.js` (accept pool as parameter instead of module-level singleton)
- `app/backend/models/userModel.js` (accept pool as parameter)
- `app/docker-compose.yml` (add `POSTGRES_SUPERUSER` + `POSTGRES_SUPERUSER_PASSWORD` env vars for provisioning)
- `app/.env.example` (document new env vars)

**Verify:**
- Two tenants registered; books created under Tenant A do **not** appear in Tenant B's catalog
- Deleting Tenant A's database does not affect Tenant B
- `resolveTenant` middleware returns `400` if the tenant slug cannot be resolved
- Lazy pool initialization does not cause race conditions under concurrent requests

---

#### T13.4 — Tenant-Specific Buyer URL & Barcode Generation

**What:** Each tenant can generate a QR code (or barcode) that encodes a deep-link URL specific to that tenant's buyer-facing catalog. Scanning the code on a mobile device opens the tenant's search page directly.

**URL format:**

```
https://<slug>.example.com/search
```
or, for single-domain deployments:
```
https://example.com/t/<slug>/search
```

**Backend:**

New endpoint — `GET /tenants/:tenantId/invite-qr`:
- Generates a QR code image (PNG) encoding the tenant's buyer URL
- Uses the `qrcode` npm package (pure JS, no native deps)
- Returns `Content-Type: image/png` (or `200 { qrDataUrl }` for base64 embed)
- Admin-only (requires valid session token for the tenant)

**Frontend:**

- Add a **"Buyer Invite"** card to the Admin home page or Settings page
- Displays the tenant's buyer URL as a copyable link
- Shows the generated QR code image inline
- "Download QR" button triggers browser download of the PNG
- "Regenerate" button re-fetches the QR code (URL is stable — same slug = same URL)

**Files:**
- `app/backend/routes/tenantRoute.js` (add `GET /tenants/:tenantId/invite-qr`)
- `app/backend/package.json` (add `qrcode` dependency)
- `app/frontend/src/pages/Settings.jsx` (add Buyer Invite section)
- `app/frontend/src/components/QRCodeCard.jsx` *(new)*

**Verify:**
- `GET /tenants/:id/invite-qr` returns a valid PNG image
- Scanning the QR code with a phone opens the correct tenant's search page
- Unauthenticated requests to `/tenants/:id/invite-qr` return `401`
- Two different tenants generate different QR codes encoding their respective URLs

---

## Validation

- `docker compose up` starts all services cleanly with no manual steps
- Admin uploads a book photo → metadata auto-fills → record saved → appears in Elasticsearch search within 2 seconds
- Keyword search via `GET /books?q=tolkien` returns relevant results with fuzzy matching
- Admin updates stock/price via `PUT /books/:id` → changes visible in next `GET /books/:id`
- All new fields (isbn, publisher, genre, description, price, stock) persisted to PostgreSQL and returned in API responses
- Login page is the entry point; role selection determines the destination (Home vs Search)
- Admin session persisted in `localStorage`; protected routes redirect to `/login` when session is absent
- **[T13]** Two independently registered tenants operate with fully isolated databases; no data cross-contamination
- **[T13]** Each tenant's admin can upload a custom logo visible to buyers on the search page
- **[T13]** Each tenant can download a QR code that deep-links buyers directly to their catalog
