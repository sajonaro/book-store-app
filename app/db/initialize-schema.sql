-- =============================================================================
-- Book Store App — Database Schema Initialization
-- Executed automatically by PostgreSQL on first container start via
-- /docker-entrypoint-initdb.d/
-- =============================================================================

-- Enable pgcrypto for gen_random_uuid(), digest(), and encrypt()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- -----------------------------------------------------------------------------
-- book_identity_hash(title, author) → VARCHAR(64)
--
-- Computes a canonical SHA-256 hex hash for a (title, author) pair.
-- Normalization: trim whitespace, fold to lower-case, join with '|'.
-- Returns NULL when either argument is NULL or empty after trimming.
--
-- Used both to populate the title_author_hash column on insert/update
-- and to look up duplicates at scan time — guaranteeing identical logic
-- in both code paths.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION book_identity_hash(p_title TEXT, p_author TEXT)
RETURNS VARCHAR(64)
LANGUAGE plpgsql
IMMUTABLE STRICT
AS $$
DECLARE
    v_title  TEXT := LOWER(TRIM(p_title));
    v_author TEXT := LOWER(TRIM(p_author));
BEGIN
    IF v_title = '' OR v_author = '' THEN
        RETURN NULL;
    END IF;
    RETURN encode(digest(v_title || '|' || v_author, 'sha256'), 'hex');
END;
$$;

-- -----------------------------------------------------------------------------
-- roles
-- Three built-in roles:
--   tenant-admin   most privileged within a tenant (full CRUD, catalog export, settings)
--   user           least privileged within a tenant (read-only / limited)
--   superuser      above all tenants — system administrator (GOAT)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS roles (
    name        VARCHAR(50)  PRIMARY KEY,
    description TEXT         NOT NULL,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

INSERT INTO roles (name, description) VALUES
  ('tenant-admin', 'Full access within a tenant: manage books, settings, users, exports'),
  ('user',         'Read-only access within a tenant'),
  ('superuser',    'System administrator — access above all tenants')
ON CONFLICT (name) DO NOTHING;

-- -----------------------------------------------------------------------------
-- tenants
-- Each tenant represents one independent book store.
-- encryption_key  is a per-tenant 32-byte AES-256 key generated automatically
--                 by gen_random_bytes(32) on INSERT.  It is used to encrypt the
--                 tenant's OpenAI API key (openai_api_key_enc) and can be
--                 rotated atomically via rotate_tenant_key(tenant_id).
-- openai_api_key_enc stores the tenant's OpenAI key encrypted (AES-256-CBC)
--                 with the per-tenant encryption_key.  Format: iv_hex:ct_hex.
-- logo stores the store logo as BYTEA.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tenants (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_name       VARCHAR(255)  NOT NULL,
    slug             VARCHAR(100)  NOT NULL UNIQUE,   -- URL-safe identifier for buyer catalog
    encryption_key   BYTEA         NOT NULL DEFAULT gen_random_bytes(32), -- per-tenant AES-256 key
    openai_api_key_enc TEXT,                          -- AES-256-CBC encrypted OpenAI key (iv_hex:ct_hex)
    logo             BYTEA,                           -- store logo image
    logo_mime        VARCHAR(50),                     -- MIME type of logo (e.g. image/png)
    is_active        BOOLEAN       NOT NULL DEFAULT true,  -- false = tenant suspended by superuser
    created_at       TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- rotate_tenant_key(p_tenant_id UUID)
--
-- Atomically rotates the per-tenant AES-256 encryption key:
--   1. Decrypts the stored openai_api_key_enc with the current encryption_key.
--   2. Generates a fresh 32-byte key with gen_random_bytes(32).
--   3. Re-encrypts the plaintext API key with the new key + a fresh IV.
--   4. Writes new encryption_key + new openai_api_key_enc in a single UPDATE.
--
-- Uses pgcrypto's encrypt_iv / decrypt_iv for raw AES-CBC (PKCS5 padded).
-- The stored ciphertext format is:  encode(iv,'hex') || ':' || encode(ct,'hex')
-- which matches the Node.js / Python AES-256-CBC implementation in the app.
--
-- Safe to call while the application is running — the UPDATE is atomic.
-- If the tenant has no API key set yet, the procedure is a no-op (key rotates,
-- openai_api_key_enc remains NULL).
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION rotate_tenant_key(p_tenant_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
    v_old_key       BYTEA;
    v_enc_text      TEXT;
    v_iv_hex        TEXT;
    v_ct_hex        TEXT;
    v_plaintext     BYTEA;
    v_new_key       BYTEA;
    v_new_iv        BYTEA;
    v_new_ct        BYTEA;
    v_new_enc_text  TEXT;
BEGIN
    -- Lock the tenant row for update
    SELECT encryption_key, openai_api_key_enc
      INTO v_old_key, v_enc_text
      FROM tenants
     WHERE id = p_tenant_id
       FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Tenant % not found', p_tenant_id;
    END IF;

    -- Generate fresh key
    v_new_key := gen_random_bytes(32);

    IF v_enc_text IS NOT NULL AND v_enc_text <> '' THEN
        -- Parse stored format:  iv_hex:ciphertext_hex
        v_iv_hex := split_part(v_enc_text, ':', 1);
        v_ct_hex := split_part(v_enc_text, ':', 2);

        -- Decrypt with old key using AES-256-CBC (PKCS5 padding)
        v_plaintext := decrypt_iv(
            decode(v_ct_hex,  'hex'),
            v_old_key,
            decode(v_iv_hex,  'hex'),
            'aes'
        );

        -- Re-encrypt with new key + fresh IV
        v_new_iv     := gen_random_bytes(16);
        v_new_ct     := encrypt_iv(v_plaintext, v_new_key, v_new_iv, 'aes');
        v_new_enc_text := encode(v_new_iv, 'hex') || ':' || encode(v_new_ct, 'hex');
    ELSE
        v_new_enc_text := NULL;
    END IF;

    UPDATE tenants
       SET encryption_key        = v_new_key,
           openai_api_key_enc    = v_new_enc_text
     WHERE id = p_tenant_id;
END;
$$;

-- -----------------------------------------------------------------------------
-- users
-- Tenant admins:  tenant_id IS NOT NULL, role = 'tenant-admin'
-- Tenant users:   tenant_id IS NOT NULL, role = 'user'
-- Superusers:     tenant_id IS NULL,     role = 'superuser'
--   A superuser exists above all tenants and can read ALL books.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id  UUID         REFERENCES tenants(id) ON DELETE CASCADE,  -- NULL for superusers
    name       VARCHAR(255) NOT NULL,
    email      VARCHAR(255) NOT NULL,
    pwd_hash   TEXT         NOT NULL,
    role       VARCHAR(50)  NOT NULL DEFAULT 'tenant-admin' REFERENCES roles(name),
    created_at TIMESTAMPTZ  NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, email)   -- email unique within a tenant; NULLs treated as distinct
);

-- Index for fast email lookup within a tenant
CREATE INDEX IF NOT EXISTS users_tenant_email_idx ON users (tenant_id, email);

-- Global unique email constraint — enforces that no two users (across all tenants) share an email.
-- This allows slug-free login: the backend looks up a user by email globally.
CREATE UNIQUE INDEX IF NOT EXISTS users_email_global_unique ON users (email);

-- -----------------------------------------------------------------------------
-- books
-- Each book belongs to exactly one tenant.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS books (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id        UUID          NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    title            VARCHAR(500)  NOT NULL,
    author           VARCHAR(500)  NOT NULL,
    isbn             VARCHAR(20),
    publisher        VARCHAR(255),
    publish_year     INTEGER,
    genre            VARCHAR(100),
    description      TEXT,
    price            NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    stock            INTEGER       NOT NULL DEFAULT 0,
    language         VARCHAR(100),
    shelf_name       VARCHAR(100),
    shelf_number     VARCHAR(50),
    cover_thumbnail  BYTEA,
    keywords         TEXT[],                              -- searchable keyword tags (e.g. {'math','français'})
    -- Pre-computed via book_identity_hash(title, author).
    -- Used as a fallback identity key when ISBN is absent.
    title_author_hash VARCHAR(64),
    created_at       TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- Unique index on ISBN per tenant (sparse — NULL values are not considered equal in PG)
CREATE UNIQUE INDEX IF NOT EXISTS books_tenant_isbn_idx
    ON books (tenant_id, isbn)
    WHERE isbn IS NOT NULL;

-- Unique index on title_author_hash per tenant (sparse — same rationale)
CREATE UNIQUE INDEX IF NOT EXISTS books_tenant_title_author_hash_idx
    ON books (tenant_id, title_author_hash)
    WHERE title_author_hash IS NOT NULL;

-- Index for fast tenant-scoped listing
CREATE INDEX IF NOT EXISTS books_tenant_id_idx ON books (tenant_id);

-- -----------------------------------------------------------------------------
-- Seed superuser
-- zed@zed.com / zed  (bcrypt cost 12)
-- This is the default system-admin account seeded on first DB initialisation.
-- Change or remove this record in production.
-- -----------------------------------------------------------------------------
INSERT INTO users (tenant_id, name, email, pwd_hash, role)
SELECT NULL, 'Zed', 'z@zed.com',
       '$2b$12$3q.sIkWVxN5ID8qRRaiDeOHaWZcqqXVZsd6hWWLGEc4ryqrZh1vhe',
       'superuser'
WHERE NOT EXISTS (
    SELECT 1 FROM users WHERE email = 'z@zed.com'
);
