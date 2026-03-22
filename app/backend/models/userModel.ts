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
  tenant_id: string | null;  // null for superusers
  name: string;
  email: string;
  pwd_hash: string;
  role: string;  // 'tenant-admin' | 'user' | 'superuser'
  created_at?: Date;
}

/**
 * Find any user (tenant admin or superuser) by email globally.
 * Used for slug-free login: one email is unique across the entire system.
 */
async function findByEmailGlobal(email: string): Promise<UserRow | null> {
  const result = await pool.query(
    'SELECT * FROM users WHERE email = $1',
    [email],
  );
  return result.rows[0] || null;
}

/**
 * Check whether an email is already taken by any user in the system.
 * Used to enforce global email uniqueness on registration.
 */
async function emailExists(email: string): Promise<boolean> {
  const result = await pool.query(
    'SELECT 1 FROM users WHERE email = $1 LIMIT 1',
    [email],
  );
  return (result.rowCount ?? 0) > 0;
}

/** Create a tenant user. Default role is 'tenant-admin'. */
async function create(tenantId: string, name: string, email: string, password: string, role = 'tenant-admin'): Promise<UserRow> {
  const hash = await bcrypt.hash(password, 12);
  const result = await pool.query(
    'INSERT INTO users (tenant_id, name, email, pwd_hash, role) VALUES ($1, $2, $3, $4, $5) RETURNING *',
    [tenantId, name, email, hash, role],
  );
  return result.rows[0];
}

/** Create a superuser (tenant_id = NULL, role = 'superuser') */
async function createSuperuser(name: string, email: string, password: string): Promise<UserRow> {
  const hash = await bcrypt.hash(password, 12);
  const result = await pool.query(
    'INSERT INTO users (tenant_id, name, email, pwd_hash, role) VALUES (NULL, $1, $2, $3, $4) RETURNING *',
    [name, email, hash, 'superuser'],
  );
  return result.rows[0];
}

/** Check whether any superuser exists (used to seed on first start) */
async function superuserExists(): Promise<boolean> {
  const result = await pool.query(
    'SELECT 1 FROM users WHERE tenant_id IS NULL AND role = $1 LIMIT 1',
    ['superuser'],
  );
  return (result.rowCount ?? 0) > 0;
}

/**
 * List all users for a given tenant (excluding password hash).
 */
async function findByTenantId(tenantId: string): Promise<UserRow[]> {
  const result = await pool.query(
    'SELECT id, tenant_id, name, email, role, created_at FROM users WHERE tenant_id = $1 ORDER BY created_at ASC',
    [tenantId],
  );
  return result.rows;
}

/**
 * Delete a user by ID, scoped to a tenant (safety: can't delete cross-tenant).
 */
async function deleteById(userId: string, tenantId: string): Promise<boolean> {
  const result = await pool.query(
    'DELETE FROM users WHERE id = $1 AND tenant_id = $2',
    [userId, tenantId],
  );
  return (result.rowCount ?? 0) > 0;
}

/**
 * Update a user's email and/or password.
 * Pass only the fields to change (undefined = leave unchanged).
 * Returns the updated user row.
 */
async function updateProfile(
  userId: string,
  opts: { email?: string; password?: string },
): Promise<UserRow | null> {
  const sets: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (opts.email !== undefined) {
    sets.push(`email = $${idx++}`);
    values.push(opts.email);
  }
  if (opts.password !== undefined) {
    const hash = await bcrypt.hash(opts.password, 12);
    sets.push(`pwd_hash = $${idx++}`);
    values.push(hash);
  }
  if (!sets.length) return null;

  values.push(userId);
  const result = await pool.query(
    `UPDATE users SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
    values,
  );
  return result.rows[0] || null;
}

/**
 * Find all tenant-admin users for a given tenant (for superuser dashboard).
 */
async function findAdminsByTenantId(tenantId: string): Promise<UserRow[]> {
  const result = await pool.query(
    "SELECT id, tenant_id, name, email, role, created_at FROM users WHERE tenant_id = $1 AND role = 'tenant-admin' ORDER BY created_at ASC",
    [tenantId],
  );
  return result.rows;
}

export const UserModel = {
  findByEmailGlobal,
  emailExists,
  create,
  createSuperuser,
  superuserExists,
  updateProfile,
  findByTenantId,
  deleteById,
  findAdminsByTenantId,
};
