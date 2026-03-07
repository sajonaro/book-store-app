import pg from 'pg';

const { Pool } = pg;

// Create a connection pool using environment variables
export const pool = new Pool({
    host: process.env.POSTGRES_HOST || 'postgres',
    port: parseInt(process.env.POSTGRES_PORT || '5432'),
    database: process.env.POSTGRES_DB || 'bookstore',
    user: process.env.POSTGRES_USER || 'bookstore',
    password: process.env.POSTGRES_PASSWORD,
});

/** Convert a pg BYTEA result (Buffer) → base64 data-URI string, or null. */
function bufferToDataUri(buf) {
    if (!buf) return null;
    if (Buffer.isBuffer(buf)) return `data:image/jpeg;base64,${buf.toString('base64')}`;
    return null;
}

/** Convert a base64 data-URI string → raw Buffer for BYTEA storage, or null. */
function dataUriToBuffer(dataUri) {
    if (!dataUri || typeof dataUri !== 'string') return null;
    // Accept "data:image/...;base64,<data>" or plain base64
    const b64 = dataUri.startsWith('data:') ? dataUri.split(',')[1] : dataUri;
    if (!b64) return null;
    return Buffer.from(b64, 'base64');
}

/** Post-process a book row: convert cover_thumbnail BYTEA → data-URI string. */
function normalizeBook(row) {
    if (!row) return null;
    return {
        ...row,
        cover_thumbnail: bufferToDataUri(row.cover_thumbnail),
    };
}

// Create the books table if it doesn't exist, then add new columns if missing
export async function initDB() {
    await pool.query(`
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
    `);

    // Add new columns to existing tables (idempotent — safe to run every boot)
    await pool.query(`ALTER TABLE books ADD COLUMN IF NOT EXISTS language         VARCHAR(100)`);
    await pool.query(`ALTER TABLE books ADD COLUMN IF NOT EXISTS shelf_name       VARCHAR(100)`);
    await pool.query(`ALTER TABLE books ADD COLUMN IF NOT EXISTS shelf_number     VARCHAR(50)`);
    await pool.query(`ALTER TABLE books ADD COLUMN IF NOT EXISTS cover_thumbnail  BYTEA`);

    console.log('Database initialized: books table ready');
}

// Query helpers
export const BookModel = {
    async findAll() {
        const result = await pool.query(
            'SELECT * FROM books ORDER BY created_at DESC'
        );
        return result.rows.map(normalizeBook);
    },

    async findById(id) {
        const result = await pool.query(
            'SELECT * FROM books WHERE id = $1',
            [id]
        );
        return normalizeBook(result.rows[0]) || null;
    },

    async create(fields) {
        const {
            title, author, isbn, publisher, publish_year,
            genre, description, price, stock,
            language, shelf_name, shelf_number, cover_thumbnail,
        } = fields;

        const thumbBuf = dataUriToBuffer(cover_thumbnail);

        const result = await pool.query(
            `INSERT INTO books
                (title, author, isbn, publisher, publish_year, genre, description,
                 price, stock, language, shelf_name, shelf_number, cover_thumbnail)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
             RETURNING *`,
            [
                title, author,
                isbn ?? null, publisher ?? null, publish_year ?? null,
                genre ?? null, description ?? null,
                price ?? 0.00, stock ?? 0,
                language ?? null, shelf_name ?? null, shelf_number ?? null,
                thumbBuf ?? null,
            ]
        );
        return normalizeBook(result.rows[0]);
    },

    async update(id, fields) {
        const {
            title, author, isbn, publisher, publish_year,
            genre, description, price, stock,
            language, shelf_name, shelf_number, cover_thumbnail,
        } = fields;

        // Only update cover_thumbnail if a new value is provided; otherwise keep existing
        let thumbClause = '';
        const params = [
            title, author,
            isbn ?? null, publisher ?? null, publish_year ?? null,
            genre ?? null, description ?? null,
            price ?? 0.00, stock ?? 0,
            language ?? null, shelf_name ?? null, shelf_number ?? null,
        ];

        if (cover_thumbnail !== undefined) {
            const thumbBuf = dataUriToBuffer(cover_thumbnail);
            thumbClause = ', cover_thumbnail = $13';
            params.push(thumbBuf ?? null);
            params.push(id); // $14
        } else {
            params.push(id); // $13
        }

        const idParam = cover_thumbnail !== undefined ? '$14' : '$13';

        const result = await pool.query(
            `UPDATE books SET
                title        = $1,
                author       = $2,
                isbn         = $3,
                publisher    = $4,
                publish_year = $5,
                genre        = $6,
                description  = $7,
                price        = $8,
                stock        = $9,
                language     = $10,
                shelf_name   = $11,
                shelf_number = $12
                ${thumbClause},
                updated_at   = now()
             WHERE id = ${idParam}
             RETURNING *`,
            params
        );
        return normalizeBook(result.rows[0]) || null;
    },

    async remove(id) {
        const result = await pool.query(
            'DELETE FROM books WHERE id = $1 RETURNING *',
            [id]
        );
        return normalizeBook(result.rows[0]) || null;
    },
};
