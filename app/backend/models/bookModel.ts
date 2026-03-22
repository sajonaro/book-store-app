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

export interface BookRow {
    id: string;
    tenant_id: string;
    title: string;
    author: string;
    isbn?: string | null;
    publisher?: string | null;
    publish_year?: number | null;
    genre?: string | null;
    description?: string | null;
    price: number;
    stock: number;
    language?: string | null;
    shelf_name?: string | null;
    shelf_number?: string | null;
    cover_thumbnail?: string | null;
    keywords?: string[] | null;
    title_author_hash?: string;
    created_at?: Date;
    updated_at?: Date;
}

export interface BookIdentity {
    isbn?: string | null;
    title?: string | null;
    author?: string | null;
}

export interface BookCreateFields {
    title: string;
    author: string;
    isbn?: string | null;
    publisher?: string | null;
    publish_year?: number | null;
    genre?: string | null;
    description?: string | null;
    price?: number;
    stock?: number;
    language?: string | null;
    shelf_name?: string | null;
    shelf_number?: string | null;
    cover_thumbnail?: string;
    keywords?: string[] | null;
}

/** Convert a pg BYTEA result (Buffer) → base64 data-URI string, or null. */
function bufferToDataUri(buf: Buffer | null | undefined): string | null {
    if (!buf) return null;
    if (Buffer.isBuffer(buf)) return `data:image/jpeg;base64,${buf.toString('base64')}`;
    return null;
}

/** Convert a base64 data-URI string → raw Buffer for BYTEA storage, or null. */
function dataUriToBuffer(dataUri: string | null | undefined): Buffer | null {
    if (!dataUri || typeof dataUri !== 'string') return null;
    // Accept "data:image/...;base64,<data>" or plain base64
    const b64 = dataUri.startsWith('data:') ? dataUri.split(',')[1] : dataUri;
    if (!b64) return null;
    return Buffer.from(b64, 'base64');
}

/** Post-process a book row: convert cover_thumbnail BYTEA → data-URI string. */
function normalizeBook(row: BookRow | null | undefined): BookRow | null {
    if (!row) return null;
    return {
        ...row,
        cover_thumbnail: bufferToDataUri(row.cover_thumbnail as unknown as Buffer),
    };
}

/** Extended book row with tenant store_name — returned for superuser cross-tenant queries */
export interface BookRowWithTenant extends BookRow {
    store_name: string;
    slug: string;
}

// Query helpers — all queries are scoped to a tenantId for full data isolation
export const BookModel = {
    /**
     * findAllCrossTenant — superuser only.
     * Returns ALL books from ALL tenants, including the tenant store_name and slug.
     */
    async findAllCrossTenant(): Promise<BookRowWithTenant[]> {
        const result = await pool.query(
            `SELECT b.*, t.store_name, t.slug
             FROM books b
             JOIN tenants t ON t.id = b.tenant_id
             ORDER BY t.store_name, b.created_at DESC`
        );
        return result.rows.map((row) => ({
            ...normalizeBook(row) as BookRow,
            store_name: row.store_name as string,
            slug: row.slug as string,
        }));
    },

    async findAll(tenantId: string): Promise<BookRow[]> {
        const result = await pool.query(
            'SELECT * FROM books WHERE tenant_id = $1 ORDER BY created_at DESC',
            [tenantId]
        );
        return result.rows.map(normalizeBook).filter(Boolean) as BookRow[];
    },

    /**
     * findAllPaginated — scoped to a tenant, supports sort, order, and optional ILIKE filter.
     * Returns both the total row count and the current page of results.
     */
    async findAllPaginated(
        tenantId: string,
        opts: {
            page: number;
            limit: number;
            sort: string;
            order: 'asc' | 'desc';
            q?: string;
        }
    ): Promise<{ total: number; rows: BookRow[] }> {
        const ALLOWED_SORT = new Set([
            'title', 'author', 'publish_year', 'genre', 'language',
            'price', 'stock', 'created_at', 'updated_at',
        ]);
        const sortCol = ALLOWED_SORT.has(opts.sort) ? opts.sort : 'created_at';
        const orderDir = opts.order === 'asc' ? 'ASC' : 'DESC';
        const limit = Math.min(Math.max(1, opts.limit), 200);
        const offset = (Math.max(1, opts.page) - 1) * limit;

        const params: unknown[] = [tenantId];
        let whereExtra = '';
        if (opts.q && opts.q.trim()) {
            const term = `%${opts.q.trim()}%`;
            params.push(term);          // $2
            whereExtra = ` AND (title ILIKE $2 OR author ILIKE $2 OR genre ILIKE $2)`;
        }

        const countResult = await pool.query(
            `SELECT COUNT(*) FROM books WHERE tenant_id = $1${whereExtra}`,
            params
        );
        const total = parseInt(countResult.rows[0].count as string, 10);

        params.push(limit);          // $N-1
        params.push(offset);         // $N
        const lp = params.length;

        const rowsResult = await pool.query(
            `SELECT * FROM books WHERE tenant_id = $1${whereExtra}
             ORDER BY ${sortCol} ${orderDir} NULLS LAST
             LIMIT $${lp - 1} OFFSET $${lp}`,
            params
        );

        return {
            total,
            rows: rowsResult.rows.map(normalizeBook).filter(Boolean) as BookRow[],
        };
    },

    async findById(id: string, tenantId: string): Promise<BookRow | null> {
        const result = await pool.query(
            'SELECT * FROM books WHERE id = $1 AND tenant_id = $2',
            [id, tenantId]
        );
        return normalizeBook(result.rows[0]) || null;
    },

    /**
     * Find a book by identity within a tenant:
     *   - If isbn is provided, look up by ISBN first.
     *   - Otherwise, call book_identity_hash(title, author) in the DB and
     *     look up by title_author_hash.
     * Returns the book row (normalized) or null if not found.
     */
    async findByIdentity(tenantId: string, { isbn, title, author }: BookIdentity): Promise<BookRow | null> {
        if (isbn) {
            const result = await pool.query(
                'SELECT * FROM books WHERE tenant_id = $1 AND isbn = $2',
                [tenantId, isbn]
            );
            if (result.rows[0]) return normalizeBook(result.rows[0]);
        }

        // Fallback: delegate hash computation to the DB function.
        if (title && author) {
            const result = await pool.query(
                `SELECT * FROM books
                 WHERE tenant_id = $1
                   AND title_author_hash = book_identity_hash($2, $3)`,
                [tenantId, title, author]
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
    async incrementStockAndPatch(id: string, tenantId: string, patch: { isbn?: string | null } = {}): Promise<BookRow | null> {
        const setClauses = ['stock = stock + 1', 'updated_at = now()'];
        const params: unknown[] = [id, tenantId];

        if (patch.isbn) {
            setClauses.push(`isbn = CASE WHEN isbn IS NULL THEN $${params.length + 1} ELSE isbn END`);
            params.push(patch.isbn);
        }

        const result = await pool.query(
            `UPDATE books SET ${setClauses.join(', ')} WHERE id = $1 AND tenant_id = $2 RETURNING *`,
            params
        );
        return normalizeBook(result.rows[0]) || null;
    },

    async create(tenantId: string, fields: BookCreateFields): Promise<BookRow> {
        const {
            title, author, isbn, publisher, publish_year,
            genre, description, price, stock,
            language, shelf_name, shelf_number, cover_thumbnail, keywords,
        } = fields;

        const thumbBuf = dataUriToBuffer(cover_thumbnail);
        const kwArr = keywords && keywords.length > 0 ? keywords : null;

        const result = await pool.query(
            `INSERT INTO books
                (tenant_id, title, author, isbn, publisher, publish_year, genre, description,
                 price, stock, language, shelf_name, shelf_number, cover_thumbnail, keywords,
                 title_author_hash)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
                     book_identity_hash($16, $17))
             RETURNING *`,
            [
                tenantId,
                title, author,
                isbn ?? null, publisher ?? null, publish_year ?? null,
                genre ?? null, description ?? null,
                price ?? 0.00, stock ?? 0,
                language ?? null, shelf_name ?? null, shelf_number ?? null,
                thumbBuf ?? null,
                kwArr,
                // Extra params for book_identity_hash — same values, no type conflict
                title, author,
            ]
        );
        return normalizeBook(result.rows[0]) as BookRow;
    },

    async update(id: string, tenantId: string, fields: BookCreateFields): Promise<BookRow | null> {
        const {
            title, author, isbn, publisher, publish_year,
            genre, description, price, stock,
            language, shelf_name, shelf_number, cover_thumbnail, keywords,
        } = fields;

        const kwArr = keywords && keywords.length > 0 ? keywords : null;

        // Build dynamic params: fixed fields first, then optional cover, then keywords, then id+tenantId
        const params: unknown[] = [
            title, author,
            isbn ?? null, publisher ?? null, publish_year ?? null,
            genre ?? null, description ?? null,
            price ?? 0.00, stock ?? 0,
            language ?? null, shelf_name ?? null, shelf_number ?? null,
            // $13 = title (for hash), $14 = author (for hash)
            title, author,
        ];

        let thumbClause = '';
        let kwParam = '$15';
        let idParam: string;
        let tenantParam: string;

        if (cover_thumbnail !== undefined) {
            const thumbBuf = dataUriToBuffer(cover_thumbnail);
            thumbClause = ', cover_thumbnail = $15';
            params.push(thumbBuf ?? null); // $15
            kwParam = '$16';
            params.push(kwArr);            // $16
            params.push(id);               // $17
            params.push(tenantId);         // $18
            idParam = '$17';
            tenantParam = '$18';
        } else {
            params.push(kwArr);    // $15
            params.push(id);       // $16
            params.push(tenantId); // $17
            idParam = '$16';
            tenantParam = '$17';
        }

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
                keywords          = ${kwParam},
                updated_at        = now()
             WHERE id = ${idParam} AND tenant_id = ${tenantParam}
             RETURNING *`,
            params
        );
        return normalizeBook(result.rows[0]) || null;
    },

    async remove(id: string, tenantId: string): Promise<BookRow | null> {
        const result = await pool.query(
            'DELETE FROM books WHERE id = $1 AND tenant_id = $2 RETURNING *',
            [id, tenantId]
        );
        return normalizeBook(result.rows[0]) || null;
    },
};
