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

    /**
     * Find a book by identity:
     *   - If isbn is provided, look up by ISBN first.
     *   - Otherwise, call book_identity_hash(title, author) in the DB and
     *     look up by title_author_hash.
     * Returns the book row (normalized) or null if not found.
     */
    async findByIdentity({ isbn, title, author }) {
        if (isbn) {
            const result = await pool.query(
                'SELECT * FROM books WHERE isbn = $1',
                [isbn]
            );
            if (result.rows[0]) return normalizeBook(result.rows[0]);
        }

        // Fallback: delegate hash computation to the DB function.
        // $1 and $2 are used ONLY as function args here — no type conflict.
        if (title && author) {
            const result = await pool.query(
                `SELECT * FROM books
                 WHERE title_author_hash = book_identity_hash($1, $2)`,
                [title, author]
            );
            if (result.rows[0]) return normalizeBook(result.rows[0]);
        }

        return null;
    },

    /**
     * Increment stock by 1 and optionally patch missing fields (e.g. isbn).
     * Only patches a field when the existing value is NULL and a new value is provided.
     * Returns the updated book.
     */
    async incrementStockAndPatch(id, patch = {}) {
        // Build SET clauses for fields that are currently NULL on the row
        // and have a non-null value in the patch. Supported: isbn.
        const setClauses = ['stock = stock + 1', 'updated_at = now()'];
        const params = [id];

        if (patch.isbn) {
            // Only update isbn if it's currently NULL on this row
            setClauses.push(`isbn = CASE WHEN isbn IS NULL THEN $${params.length + 1} ELSE isbn END`);
            params.push(patch.isbn);
        }

        const result = await pool.query(
            `UPDATE books SET ${setClauses.join(', ')} WHERE id = $1 RETURNING *`,
            params
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

        // title_author_hash is computed in the DB via book_identity_hash().
        // To avoid "inconsistent types deduced for parameter $N" we pass title
        // and author as dedicated extra parameters ($14, $15) for the function
        // call instead of reusing $1/$2 (which PG already bound to VARCHAR).
        const result = await pool.query(
            `INSERT INTO books
                (title, author, isbn, publisher, publish_year, genre, description,
                 price, stock, language, shelf_name, shelf_number, cover_thumbnail,
                 title_author_hash)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
                     book_identity_hash($14, $15))
             RETURNING *`,
            [
                title, author,
                isbn ?? null, publisher ?? null, publish_year ?? null,
                genre ?? null, description ?? null,
                price ?? 0.00, stock ?? 0,
                language ?? null, shelf_name ?? null, shelf_number ?? null,
                thumbBuf ?? null,
                // Extra params for book_identity_hash — same values, no type conflict
                title, author,
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

        // title and author appear twice: once as column values ($1, $2) and
        // once as book_identity_hash arguments ($13, $14) to avoid type conflicts.
        let thumbClause = '';
        const params = [
            title, author,
            isbn ?? null, publisher ?? null, publish_year ?? null,
            genre ?? null, description ?? null,
            price ?? 0.00, stock ?? 0,
            language ?? null, shelf_name ?? null, shelf_number ?? null,
            // $13 = title (for hash), $14 = author (for hash)
            title, author,
        ];

        if (cover_thumbnail !== undefined) {
            const thumbBuf = dataUriToBuffer(cover_thumbnail);
            thumbClause = ', cover_thumbnail = $15';
            params.push(thumbBuf ?? null); // $15
            params.push(id);              // $16
        } else {
            params.push(id); // $15
        }

        const idParam = cover_thumbnail !== undefined ? '$16' : '$15';

        const result = await pool.query(
            `UPDATE books SET
                title             = $1,
                author            = $2,
                isbn              = $3,
                publisher         = $4,
                publish_year      = $5,
                genre             = $6,
                description       = $7,
                price             = $8,
                stock             = $9,
                language          = $10,
                shelf_name        = $11,
                shelf_number      = $12,
                title_author_hash = book_identity_hash($13, $14)
                ${thumbClause},
                updated_at        = now()
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
