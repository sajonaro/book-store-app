import pkg from 'pg';
import crypto from 'crypto';

const { Pool } = pkg;

const pool = new Pool({
  user: process.env.POSTGRES_USER,
  host: process.env.POSTGRES_HOST || 'postgres',
  database: process.env.POSTGRES_DB,
  password: process.env.POSTGRES_PASSWORD,
  port: 5432,
});

export interface TenantRow {
  id: string;
  store_name: string;
  slug: string;
  encryption_key?: Buffer | null;
  openai_api_key_enc?: string | null;
  logo?: Buffer | null;
  logo_mime?: string | null;
  is_active?: boolean;
  created_at?: Date;
}

export interface TenantPublic {
  id: string;
  store_name: string;
  slug: string;
  logo_url?: string | null;
  has_openai_key: boolean;
  created_at?: Date;
}

// AES-256-CBC encryption using the per-tenant key (32-byte BYTEA from DB).
// Stored format:  iv_hex:ciphertext_hex
// Compatible with the PostgreSQL encrypt_iv / decrypt_iv functions used in
// the rotate_tenant_key() stored procedure.

async function getTenantEncryptionKey(tenantId: string): Promise<Buffer> {
  const result = await pool.query(
    'SELECT encryption_key FROM tenants WHERE id = $1',
    [tenantId],
  );
  const row = result.rows[0];
  if (!row?.encryption_key) {
    throw new Error(`No encryption key found for tenant ${tenantId}`);
  }
  // pg returns BYTEA columns as Node.js Buffer
  return Buffer.isBuffer(row.encryption_key)
    ? row.encryption_key
    : Buffer.from(row.encryption_key);
}

/** Encrypt the OpenAI API key using the tenant's per-tenant AES-256-CBC key. */
export async function encryptApiKey(tenantId: string, plaintext: string): Promise<string> {
  const key = await getTenantEncryptionKey(tenantId);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
}

/** Decrypt the OpenAI API key using the tenant's per-tenant AES-256-CBC key. */
export async function decryptApiKey(tenantId: string, encrypted: string): Promise<string> {
  const key = await getTenantEncryptionKey(tenantId);
  const [ivHex, ciphertextHex] = encrypted.split(':');
  if (!ivHex || !ciphertextHex) throw new Error('Invalid encrypted key format');
  const iv = Buffer.from(ivHex, 'hex');
  const ciphertext = Buffer.from(ciphertextHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted.toString('utf8');
}

/** Convert a store name to a URL-safe slug */
export function toSlug(storeName: string): string {
  return storeName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100);
}

/** Convert logo BYTEA → base64 data-URI, or null */
function logoToDataUri(row: TenantRow): string | null {
  if (!row.logo || !row.logo_mime) return null;
  const b64 = Buffer.isBuffer(row.logo) ? row.logo.toString('base64') : null;
  if (!b64) return null;
  return `data:${row.logo_mime};base64,${b64}`;
}

export const TenantModel = {
  async findById(id: string): Promise<TenantRow | null> {
    const result = await pool.query('SELECT * FROM tenants WHERE id = $1', [id]);
    return result.rows[0] || null;
  },

  async findBySlug(slug: string): Promise<TenantRow | null> {
    const result = await pool.query('SELECT * FROM tenants WHERE slug = $1', [slug]);
    return result.rows[0] || null;
  },

  async slugExists(slug: string): Promise<boolean> {
    const result = await pool.query('SELECT id FROM tenants WHERE slug = $1', [slug]);
    return (result.rowCount ?? 0) > 0;
  },

  /** Create a new tenant. The DB auto-generates encryption_key via DEFAULT gen_random_bytes(32). */
  async create(storeName: string, openaiApiKey?: string): Promise<TenantRow> {
    let slug = toSlug(storeName);

    // Make slug unique by appending a random suffix if necessary
    if (await TenantModel.slugExists(slug)) {
      slug = `${slug}-${crypto.randomBytes(3).toString('hex')}`;
    }

    // Insert tenant — DB generates id and encryption_key automatically
    const result = await pool.query(
      `INSERT INTO tenants (store_name, slug)
       VALUES ($1, $2)
       RETURNING *`,
      [storeName, slug],
    );
    const tenant: TenantRow = result.rows[0];

    // Encrypt the OpenAI API key with the newly created per-tenant key (if provided)
    if (openaiApiKey) {
      const encKey = await encryptApiKey(tenant.id, openaiApiKey);
      await pool.query(
        'UPDATE tenants SET openai_api_key_enc = $1 WHERE id = $2',
        [encKey, tenant.id],
      );
      tenant.openai_api_key_enc = encKey;
    }

    return tenant;
  },

  /** Update (or set) the OpenAI API key for a tenant */
  async updateApiKey(tenantId: string, openaiApiKey: string): Promise<void> {
    const encKey = await encryptApiKey(tenantId, openaiApiKey);
    await pool.query(
      'UPDATE tenants SET openai_api_key_enc = $1 WHERE id = $2',
      [encKey, tenantId],
    );
  },

  /** Get the decrypted OpenAI API key for a tenant */
  async getOpenAiKey(tenantId: string): Promise<string | null> {
    const result = await pool.query(
      'SELECT openai_api_key_enc FROM tenants WHERE id = $1',
      [tenantId],
    );
    const row = result.rows[0];
    if (!row?.openai_api_key_enc) return null;
    try {
      return await decryptApiKey(tenantId, row.openai_api_key_enc);
    } catch {
      return null;
    }
  },

  /** Update tenant logo */
  async updateLogo(tenantId: string, logoBuffer: Buffer, mime: string): Promise<void> {
    await pool.query(
      'UPDATE tenants SET logo = $1, logo_mime = $2 WHERE id = $3',
      [logoBuffer, mime, tenantId],
    );
  },

  /** Get public-safe tenant info with logo as data-URI */
  async getPublicInfo(tenantId: string): Promise<TenantPublic | null> {
    const result = await pool.query('SELECT * FROM tenants WHERE id = $1', [tenantId]);
    const row: TenantRow = result.rows[0];
    if (!row) return null;
    return {
      id: row.id,
      store_name: row.store_name,
      slug: row.slug,
      logo_url: logoToDataUri(row),
      has_openai_key: !!row.openai_api_key_enc,
      created_at: row.created_at,
    };
  },

  /** Get public-safe tenant info by slug */
  async getPublicInfoBySlug(slug: string): Promise<TenantPublic | null> {
    const result = await pool.query('SELECT * FROM tenants WHERE slug = $1', [slug]);
    const row: TenantRow = result.rows[0];
    if (!row) return null;
    return {
      id: row.id,
      store_name: row.store_name,
      slug: row.slug,
      logo_url: logoToDataUri(row),
      has_openai_key: !!row.openai_api_key_enc,
      created_at: row.created_at,
    };
  },

  /** List all tenants (superuser only). Excludes logo binary and encryption_key to keep payload small. */
  async findAll(): Promise<Array<TenantRow & { is_active: boolean }>> {
    const result = await pool.query(
      'SELECT id, store_name, slug, is_active, created_at FROM tenants ORDER BY created_at ASC',
    );
    return result.rows;
  },

  /** Update the store display name */
  async updateStoreName(tenantId: string, storeName: string): Promise<void> {
    await pool.query(
      'UPDATE tenants SET store_name = $1 WHERE id = $2',
      [storeName, tenantId],
    );
  },

  /** Suspend or activate a tenant */
  async setActive(tenantId: string, isActive: boolean): Promise<boolean> {
    const result = await pool.query(
      'UPDATE tenants SET is_active = $1 WHERE id = $2',
      [isActive, tenantId],
    );
    return (result.rowCount ?? 0) > 0;
  },
};

export { pool as tenantPool };
