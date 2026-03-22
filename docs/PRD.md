# Book Store Inventory App — Product Requirements Document

## What Are We Building?

Independent book stores struggle to catalog their inventory — especially rare or vintage books that lack digital records. Staff spend hours manually entering book data, and buyers have no easy way to search the catalog online.

We are building a **book store inventory and catalog system** that allows admins to photograph a book and have its metadata automatically recognized by AI, manages store operations (stock, pricing), and gives retail buyers a searchable web (and later mobile) catalog to find books by title, author, keyword, or theme.

---

## User Roles

The system has three distinct roles:

| Role | Scope | Privileges |
|------|-------|------------|
| `superuser` | System-wide (above all tenants) | Read all tenants' books; system administration |
| `tenant-admin` | Within one tenant | Full CRUD on books, settings, logo, API key, QR code, password management, user management, catalog export (future) |
| `user` | Within one tenant | Scan books via AI, update book info; **cannot** manage settings, passwords, or other users |

- A new book store owner self-registers as `tenant-admin`.
- `tenant-admin` can create additional `user` accounts for their store staff.
- Only `tenant-admin` can change passwords, manage users, and access Store Settings.
- Login is **slug-free**: users log in with email + password only; the system auto-detects their tenant and role.
- Email addresses are globally unique across the entire system.

---

## Requirements

| ID     | Description                                                                                                                                                  | User           | Acceptance Criteria (ACC)                                                                                       |
|--------|--------------------------------------------------------------------------------------------------------------------------------------------------------------|----------------|-----------------------------------------------------------------------------------------------------------------|
| FR001  | Admin can upload one or more photos of a book (cover, first pages, table of contents) and the system extracts metadata automatically via AI (Anthropic LLM). | Tenant Admin   | Uploading a photo populates title, author, ISBN, publisher, year, genre, and description fields automatically.   |
| FR002  | Admin can review and edit extracted metadata before saving the record.                                                                                        | Tenant Admin   | All extracted fields are editable; saving persists the final values to the database.                            |
| FR003  | Admin can add a new book record manually (without a photo).                                                                                                   | Tenant Admin   | A form allows manual entry of all metadata fields; record is saved to the database on submit.                   |
| FR004  | Admin can update the stock count for any book.                                                                                                                | Tenant Admin / User | Stock count change is saved and immediately reflected in the catalog.                                      |
| FR005  | Admin can update the price of any book.                                                                                                                       | Tenant Admin / User | Price change is saved and immediately reflected in the catalog.                                           |
| FR006  | The system indexes all book records in Elasticsearch for full-text search.                                                                                    | System         | A newly created or updated book record appears in search results within seconds.                                |
| FR007  | Retail buyer can search the catalog by keyword, title, author, or ISBN.                                                                                       | Retail Buyer   | Search returns relevant results ranked by relevance; no results shows an empty-state message.                   |
| FR008  | Retail buyer can browse the catalog filtered by theme / genre.                                                                                                | Retail Buyer   | Selecting a genre filter shows only books in that genre.                                                        |
| FR009  | Retail buyer can view a book detail page showing all metadata (title, author, description, price, stock availability).                                        | Retail Buyer   | Book detail page renders all stored fields; out-of-stock books are labeled accordingly.                         |
| FR010  | The catalog is accessible via a web browser (responsive design).                                                                                              | Retail Buyer   | Site is usable on desktop and mobile browsers without a native app install.                                     |
| FR011  | The catalog is accessible via a native Android and iOS app (Phase 2).                                                                                         | Retail Buyer   | App connects to the same backend API; search and browse work on device (deferred to Phase 2).                  |
| FR012  | A new book store owner can self-register as a tenant admin via a public registration page, providing their own OpenAI API key during registration.            | Tenant Admin   | Submitting the registration form creates an isolated tenant account; the key is stored encrypted and used exclusively for that tenant's AI recognition requests. Admin is logged in automatically. |
| FR013  | Each tenant admin can upload a custom logo for their store.                                                                                                   | Tenant Admin   | Uploading a logo updates the store's branding on the buyer-facing search page and login page immediately.       |
| FR014  | Each tenant's book catalog and user data are fully isolated from other tenants.                                                                               | System         | Books and users created under Tenant A are never visible to Tenant B, and vice versa.                          |
| FR015  | Each tenant admin can generate a QR code that encodes a deep-link URL to their store's buyer catalog.                                                         | Tenant Admin   | The generated QR code, when scanned, opens the correct tenant's search page; admins can download the PNG.      |
| FR016  | Admin can attach searchable keyword tags to a book. Tags are suggested automatically by AI during photo recognition and can be freely added or removed manually. | Tenant Admin / User | Keyword tags are stored on the book record, indexed in Elasticsearch, and used as search tokens so buyers can find books by any matching keyword. |
| FR017  | Tenant admin can change their login password from Store Settings → Password Management. | Tenant Admin | Password change requires current password verification. New password must be confirmed by retyping. Show/hide toggle on all password fields. |
| FR018  | Tenant admin can create ordinary user accounts for store staff from Store Settings → User Management. | Tenant Admin | New users get role `user`; they can scan books and update book info but cannot access Store Settings, change passwords, or manage other users. |
| FR019  | Tenant admin can delete ordinary user accounts from Store Settings → User Management. | Tenant Admin | Deleted user is immediately unable to log in. Admin cannot delete their own account. |
| FR020  | Login is slug-free: users sign in with email + password only, without entering a store identifier. | All Users | Backend auto-detects tenant and role from the globally unique email; session token encodes role. |
| FR021  | Tenant admin can export the entire book catalog as CSV/JSON (Phase 2). | Tenant Admin | Export includes all book fields; only `tenant-admin` role can trigger export. |
| FR022  | Superuser has a dedicated System Admin Dashboard (not the regular store home). | Superuser | After login, superuser lands on `/superuser` dashboard. Dashboard lists all registered tenants with their status (Active/Suspended) and their admin users. |
| FR023  | Superuser can suspend a tenant, blocking all their users from logging in. | Superuser | Suspending a tenant sets `is_active = false`; subsequent login attempts by any user of that tenant are rejected with a clear error message. The tenant's public catalog remains browsable. |
| FR024  | Superuser can re-activate a suspended tenant. | Superuser | Setting `is_active = true` immediately allows users of that tenant to log in again. |
| FR025  | Superuser can reset the password of any tenant-admin. | Superuser | Password reset form (with show/hide toggle + confirm field) is available inline for each admin on the dashboard. No current-password verification required for superuser. New password must be at least 8 characters. |
| FR026  | Each tenant receives a unique, database-generated AES-256 encryption key at the time of account creation. This key is stored in the `tenants` table and used exclusively to encrypt/decrypt that tenant's OpenAI API key. The key is generated by a PostgreSQL stored procedure (`generate_tenant_key()`) so that key generation is deterministic, auditable, and rotation can later be orchestrated via a stored procedure call (`rotate_tenant_key(tenant_id)`). No global `TENANT_ENCRYPTION_KEY` env var is required. | System | 1. Calling the `create_tenant` stored procedure inserts a new row into `tenants` with a freshly generated AES-256 key in the `encryption_key` column. 2. The key is never returned to the application layer in plaintext beyond the moment it is used to encrypt the OpenAI API key. 3. Key rotation can be performed by calling `rotate_tenant_key(tenant_id UUID)` which re-generates the key and re-encrypts the stored OpenAI API key atomically inside the database. |
| FR027  | The tenant's OpenAI API key must be encrypted both at rest and in transit between the backend and the AI recognition service. At rest: stored AES-256-CBC encrypted in `tenants.openai_api_key_enc`, encrypted using the per-tenant key from FR026. In transit: the backend retrieves the encrypted ciphertext from the DB and forwards it as-is in the `X-OpenAI-Api-Key-Enc` HTTP header to the AI API service. The AI API service decrypts it using the same per-tenant key (retrieved from the DB via a secure internal call), so the plaintext key is never transmitted over any network link. | System | 1. The `X-OpenAI-Api-Key-Enc` header value between backend and AI service is always the AES-256-CBC ciphertext — never plaintext. 2. The AI service fetches the tenant's encryption key directly from the database (internal network only) using the `tenant_id` passed alongside the ciphertext. 3. Decryption happens inside the AI service process memory only, and only for the duration of a single recognize request. 4. No plaintext API key ever appears in logs, HTTP traces, or environment variables. |
| FR028  | Tenant admin can configure which book fields and tags are indexed in Elasticsearch for search. By default ALL book properties (title, author, isbn, publisher, genre, description, publish_year, language) and keyword tags are searchable. Admin may opt out of individual fields to reduce noise or improve search relevance. | Tenant Admin | 1. A "Search Index Settings" panel in Store Settings lists all indexable fields with toggle switches, all enabled by default. 2. Saving the config persists it to `tenant_search_config` DB table. 3. Changes take effect immediately on new indexing operations. 4. Admin can trigger a full re-index of all tenant books ("Rebuild Search Index" button) which re-indexes all books using the current config. 5. Only `tenant-admin` role can access or modify search config and trigger reindex. 6. Re-index operation returns a count of indexed documents. |

---

## Roles Table (Database)

The `roles` table defines the allowed role names:

| name | description |
|------|-------------|
| `tenant-admin` | Full access within a tenant: manage books, settings, users, exports |
| `user` | Read-only access within a tenant (can update book info) |
| `superuser` | System administrator — access above all tenants |

The `users.role` column references this table via a foreign key. Default is `tenant-admin`.

---

## Success Criteria

- An admin can photograph an unknown book and have a complete, accurate catalog record created in **under 2 minutes** with no manual typing.
- Search returns relevant results for **90%+ of queries** tested against the book catalog.
- A retail buyer can locate a specific book by title or author in **3 clicks or fewer** from the home page.
- Stock and price updates made by an admin are visible to buyers **within 5 seconds**.
- The system handles books from any era (pre-ISBN vintage prints through modern releases) without failing the metadata extraction step.
- All core services (backend API, PostgreSQL, Elasticsearch) start cleanly with a single `docker compose up` command.
- A new book store owner can register, upload a logo, and share a buyer QR code in **under 5 minutes** with no technical assistance.
- Two independently registered tenants see completely separate book catalogs with zero data cross-contamination.
- A `user` account holder cannot access Store Settings, change passwords, or manage other users — enforced at both frontend (redirects) and backend (403 responses).
- Superuser login redirects to the System Admin Dashboard; they do not see or interact with the regular store inventory UI.
- A suspended tenant's users receive a clear error message on login; the superuser can re-activate at any time.
