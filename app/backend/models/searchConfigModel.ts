import pkg from 'pg';

const { Pool } = pkg;

const pool = new Pool({
  user: process.env.POSTGRES_USER,
  host: process.env.POSTGRES_HOST || 'postgres',
  database: process.env.POSTGRES_DB,
  password: process.env.POSTGRES_PASSWORD,
  port: 5432,
});

export interface SearchConfig {
  id?: string;
  tenant_id: string;
  idx_title: boolean;
  idx_author: boolean;
  idx_isbn: boolean;
  idx_publisher: boolean;
  idx_genre: boolean;
  idx_description: boolean;
  idx_publish_year: boolean;
  idx_language: boolean;
  idx_keywords: boolean;
  updated_at?: Date;
}

/** Default config — all fields enabled */
export const DEFAULT_SEARCH_CONFIG: Omit<SearchConfig, 'id' | 'tenant_id' | 'updated_at'> = {
  idx_title: true,
  idx_author: true,
  idx_isbn: true,
  idx_publisher: true,
  idx_genre: true,
  idx_description: true,
  idx_publish_year: true,
  idx_language: true,
  idx_keywords: true,
};

export const SearchConfigModel = {
  /**
   * Get the search config for a tenant.
   * If no config row exists, returns the default config (all enabled) without persisting.
   */
  async getConfig(tenantId: string): Promise<SearchConfig> {
    const result = await pool.query(
      'SELECT * FROM tenant_search_config WHERE tenant_id = $1',
      [tenantId],
    );
    if (result.rows[0]) {
      return result.rows[0] as SearchConfig;
    }
    // Return in-memory default — not yet persisted
    return {
      tenant_id: tenantId,
      ...DEFAULT_SEARCH_CONFIG,
    };
  },

  /**
   * Upsert the search config for a tenant.
   * Creates the row if it doesn't exist; updates it otherwise.
   */
  async upsertConfig(tenantId: string, config: Partial<Omit<SearchConfig, 'id' | 'tenant_id' | 'updated_at'>>): Promise<SearchConfig> {
    const merged = { ...DEFAULT_SEARCH_CONFIG, ...config };
    const result = await pool.query(
      `INSERT INTO tenant_search_config
         (tenant_id, idx_title, idx_author, idx_isbn, idx_publisher,
          idx_genre, idx_description, idx_publish_year, idx_language, idx_keywords, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, now())
       ON CONFLICT (tenant_id) DO UPDATE SET
         idx_title        = EXCLUDED.idx_title,
         idx_author       = EXCLUDED.idx_author,
         idx_isbn         = EXCLUDED.idx_isbn,
         idx_publisher    = EXCLUDED.idx_publisher,
         idx_genre        = EXCLUDED.idx_genre,
         idx_description  = EXCLUDED.idx_description,
         idx_publish_year = EXCLUDED.idx_publish_year,
         idx_language     = EXCLUDED.idx_language,
         idx_keywords     = EXCLUDED.idx_keywords,
         updated_at       = now()
       RETURNING *`,
      [
        tenantId,
        merged.idx_title,
        merged.idx_author,
        merged.idx_isbn,
        merged.idx_publisher,
        merged.idx_genre,
        merged.idx_description,
        merged.idx_publish_year,
        merged.idx_language,
        merged.idx_keywords,
      ],
    );
    return result.rows[0] as SearchConfig;
  },
};
