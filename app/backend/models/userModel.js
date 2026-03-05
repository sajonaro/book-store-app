import pkg from 'pg';
import bcrypt from 'bcryptjs';

const { Pool } = pkg;

const pool = new Pool({
  user: process.env.POSTGRES_USER,
  host: process.env.POSTGRES_HOST || 'postgres',
  database: process.env.POSTGRES_DB,
  password: process.env.POSTGRES_PASSWORD,
  port: 5432,
});

async function initUsers() {
  // Create users table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name       VARCHAR(255) NOT NULL,
      email      VARCHAR(255) NOT NULL UNIQUE,
      pwd_hash   TEXT         NOT NULL,
      created_at TIMESTAMPTZ  NOT NULL DEFAULT now()
    );
  `);

  // Seed default admin if not present
  const existing = await pool.query(
    'SELECT id FROM users WHERE email = $1',
    ['admin@bookstore.com'],
  );
  if (existing.rowCount === 0) {
    const hash = await bcrypt.hash('admin123', 12);
    await pool.query(
      'INSERT INTO users (name, email, pwd_hash) VALUES ($1, $2, $3)',
      ['Admin', 'admin@bookstore.com', hash],
    );
    console.log('Default admin user seeded');
  }

  console.log('Users table ready');
}

async function findByEmail(email) {
  const result = await pool.query(
    'SELECT * FROM users WHERE email = $1',
    [email],
  );
  return result.rows[0] || null;
}

export const UserModel = { initUsers, findByEmail };
