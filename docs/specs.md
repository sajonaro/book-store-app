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

### T1: Replace MongoDB with PostgreSQL

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

### T2: Update Input Validation

**What:** Replace MongoDB ObjectId validation (`mongoose.Types.ObjectId.isValid`) with UUID format validation. Update `sanitizeBook` to include all new fields: `isbn`, `publisher`, `publish_year`, `genre`, `description`, `price`, `stock`.

**Files:**
- `book-store/backend/routes/booksRoute.js`
- `book-store/backend/middleware/validate.js` *(new)*

**Verify:**
- `GET /books/not-a-uuid` returns `400 { msg: 'Invalid book ID' }`
- `POST /books` without required fields returns `400` with a descriptive message
- `price` with a negative value returns `400`

---

### T3: Add Elasticsearch Service and Indexing

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

### T4: Search Endpoint

**What:** Add `?q=` query parameter support to `GET /books`. When `q` is present, delegate to Elasticsearch; otherwise fall back to a full `SELECT` from PostgreSQL.

**Files:**
- `book-store/backend/routes/booksRoute.js`
- `book-store/backend/services/searchService.js`

**Verify:**
- `GET /books?q=tolkien` returns books matching "tolkien" in title or author (fuzzy)
- `GET /books?q=xyz_not_a_book` returns `{ count: 0, data: [] }`
- `GET /books` (no query) returns all books from PostgreSQL

---

### T5: AI Photo Recognition Endpoint

**What:** Create `POST /books/recognize` that accepts a photo upload (`multipart/form-data`, field name `photo`), sends it to the Anthropic Claude vision API, and returns extracted metadata as JSON.

**Files:**
- `book-store/backend/routes/booksRoute.js`
- `book-store/backend/services/bookRecognition.js` *(new)*
- `book-store/backend/package.json` (add `@anthropic-ai/sdk`, `multer`)
- `book-store/.env.example`

**Prompt strategy:** System prompt instructs Claude to respond ONLY with a JSON object. Unknown fields return `null`.

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
    "description": "A fantasy novel..."
  }
}
```

**Rate limit:** Apply a stricter limiter — 10 requests / minute per IP — on this endpoint only.

**Verify:**
- Upload a JPEG of a book cover → response contains populated `title` and `author`
- Upload a blank image → fields return `null` but endpoint responds `200` (not an error)
- Exceeding rate limit returns `429`

---

### T6: Extend Frontend Create/Edit Forms

**What:** Update `CreateBooks.jsx` and `EditBook.jsx` to include fields for `isbn`, `publisher`, `publish_year`, `genre`, `description`, `price`, `stock`. Add a photo upload button on `CreateBooks.jsx` that calls `/books/recognize` and pre-fills the form fields.

**Files:**
- `book-store/frontend/src/pages/CreateBooks.jsx`
- `book-store/frontend/src/pages/EditBook.jsx`

**Verify:**
- Admin can upload a photo → form fields are pre-filled with recognized metadata
- Admin can edit any pre-filled field before saving
- All new fields are submitted to `POST /books` / `PUT /books/:id` and persisted

---

### T7: Update Docker Compose

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

### T8: Update Book Detail Page

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

### T9: Integration Test

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

### T10: Login Page

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

### T11: Search Page (Buyer View)

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

### T12: Frontend Tailwind CSS Refactor (Consistent Design System)

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

## Validation

- `docker compose up` starts all services cleanly with no manual steps
- Admin uploads a book photo → metadata auto-fills → record saved → appears in Elasticsearch search within 2 seconds
- Keyword search via `GET /books?q=tolkien` returns relevant results with fuzzy matching
- Admin updates stock/price via `PUT /books/:id` → changes visible in next `GET /books/:id`
- All new fields (isbn, publisher, genre, description, price, stock) persisted to PostgreSQL and returned in API responses
- Login page is the entry point; role selection determines the destination (Home vs Search)
- Admin session persisted in `localStorage`; protected routes redirect to `/login` when session is absent
