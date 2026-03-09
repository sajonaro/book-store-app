-- =============================================================================
-- Book Store App — Database Schema Initialization
-- Executed automatically by PostgreSQL on first container start via
-- /docker-entrypoint-initdb.d/
-- =============================================================================

-- Enable pgcrypto for gen_random_uuid() and digest()
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
-- books
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS books (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
    -- Pre-computed via book_identity_hash(title, author).
    -- Used as a fallback identity key when ISBN is absent.
    title_author_hash VARCHAR(64),
    created_at       TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- Unique index on ISBN (sparse — NULL values are not considered equal in PG)
CREATE UNIQUE INDEX IF NOT EXISTS books_isbn_idx
    ON books (isbn)
    WHERE isbn IS NOT NULL;

-- Unique index on title_author_hash (sparse — same rationale)
CREATE UNIQUE INDEX IF NOT EXISTS books_title_author_hash_idx
    ON books (title_author_hash)
    WHERE title_author_hash IS NOT NULL;

-- -----------------------------------------------------------------------------
-- users
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name       VARCHAR(255) NOT NULL,
    email      VARCHAR(255) NOT NULL UNIQUE,
    pwd_hash   TEXT         NOT NULL,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT now()
);
