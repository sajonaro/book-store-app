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

export interface UserRow {
  id: string;
  name: string;
  email: string;
  pwd_hash: string;
  created_at?: Date;
}

// Seed default admin user if not already present.
async function seedDefaultAdmin(): Promise<void> {
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

async function findByEmail(email: string): Promise<UserRow | null> {
  const result = await pool.query(
    'SELECT * FROM users WHERE email = $1',
    [email],
  );
  return result.rows[0] || null;
}

export const UserModel = { seedDefaultAdmin, findByEmail };
