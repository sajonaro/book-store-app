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

// Create the books table if it doesn't exist
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
    console.log('Database initialized: books table ready');
}

// Query helpers
export const BookModel = {
    async findAll() {
        const result = await pool.query(
            'SELECT * FROM books ORDER BY created_at DESC'
        );
        return result.rows;
    },

    async findById(id) {
        const result = await pool.query(
            'SELECT * FROM books WHERE id = $1',
            [id]
        );
        return result.rows[0] || null;
    },

    async create(fields) {
        const {
            title, author, isbn, publisher, publish_year,
            genre, description, price, stock
        } = fields;
        const result = await pool.query(
            `INSERT INTO books
                (title, author, isbn, publisher, publish_year, genre, description, price, stock)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             RETURNING *`,
            [title, author, isbn ?? null, publisher ?? null, publish_year ?? null,
             genre ?? null, description ?? null, price ?? 0.00, stock ?? 0]
        );
        return result.rows[0];
    },

    async update(id, fields) {
        const {
            title, author, isbn, publisher, publish_year,
            genre, description, price, stock
        } = fields;
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
                updated_at   = now()
             WHERE id = $10
             RETURNING *`,
            [title, author, isbn ?? null, publisher ?? null, publish_year ?? null,
             genre ?? null, description ?? null, price ?? 0.00, stock ?? 0, id]
        );
        return result.rows[0] || null;
    },

    async remove(id) {
        const result = await pool.query(
            'DELETE FROM books WHERE id = $1 RETURNING *',
            [id]
        );
        return result.rows[0] || null;
    },
};
