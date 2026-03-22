/**
 * Elasticsearch search service using native fetch() for Bun compatibility.
 * The @elastic/elasticsearch SDK uses Node.js http internals that break on Bun.
 *
 * Index strategy (FR028 update):
 *   One index per tenant, named:  books-{tenantId}
 *   This gives full data isolation at the index level, allowing per-tenant
 *   index settings / mappings in the future, and natural Kibana multi-index
 *   visibility via the "books-*" wildcard data view.
 *
 * Supports per-tenant search configuration (FR028):
 *   - Only fields enabled in tenant_search_config are indexed/searched.
 *   - By default ALL fields are enabled.
 *   - All searches are case-insensitive.
 */

import type { BookRow } from '../models/bookModel';
import { SearchConfigModel, type SearchConfig } from '../models/searchConfigModel';

const ELASTIC_URL = (process.env.ELASTIC_URL || 'http://elastic:9200').replace(/\/$/, '');

let esAvailable = false;

/** Return the index name for a given tenant */
function tenantIndex(tenantId: string): string {
  return `books-${tenantId}`;
}

/**
 * Ensure the per-tenant index exists with the correct mapping.
 * Called lazily before any indexing operation.
 * Safe to call multiple times — is a no-op if the index already exists.
 */
async function ensureTenantIndex(tenantId: string): Promise<void> {
  const INDEX = tenantIndex(tenantId);
  try {
    const res = await fetch(`${ELASTIC_URL}/${INDEX}`, { method: 'HEAD' });
    if (res.status === 404) {
      await fetch(`${ELASTIC_URL}/${INDEX}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mappings: {
            properties: {
              tenant_id:    { type: 'keyword' },
              title:        { type: 'text' },
              author:       { type: 'text' },
              genre:        { type: 'keyword' },
              description:  { type: 'text' },
              publisher:    { type: 'text' },
              isbn:         { type: 'keyword' },
              publish_year: { type: 'integer' },
              language:     { type: 'keyword' },
              keywords:     { type: 'keyword' },
            },
          },
        }),
      });
    }
  } catch (err: unknown) {
    console.log(`Failed to ensure index for tenant ${tenantId}:`, (err as Error).message);
  }
}

/**
 * One-time startup probe — just checks ES connectivity.
 * Individual tenant indices are created lazily on first indexing operation.
 */
async function ensureIndex(): Promise<void> {
  try {
    const res = await fetch(`${ELASTIC_URL}/_cluster/health`, { method: 'GET' });
    if (res.ok) {
      esAvailable = true;
      console.log('Elasticsearch available — using per-tenant index strategy (books-{tenantId})');
    } else {
      esAvailable = false;
      console.log('Elasticsearch health check returned non-OK status');
    }
  } catch (err: unknown) {
    esAvailable = false;
    console.log('Elasticsearch not available at startup:', (err as Error).message);
  }
}

/**
 * Build the ES document body from a book, filtered by the tenant's search config.
 * Fields disabled in config are set to null/empty so they are not indexed.
 * Keyword-type fields (isbn, genre, language, keywords) are stored as lowercase
 * to enable case-insensitive matching at query time.
 */
function buildDocBody(book: BookRow, config: SearchConfig): Record<string, unknown> {
  return {
    tenant_id:    book.tenant_id,
    // Text fields — ES standard analyzer lowercases at index + query time already
    title:        config.idx_title        ? book.title        : null,
    author:       config.idx_author       ? book.author       : null,
    publisher:    config.idx_publisher    ? book.publisher    : null,
    description:  config.idx_description  ? book.description  : null,
    // Keyword fields — store as lowercase for case-insensitive matching
    isbn:         config.idx_isbn         ? (book.isbn?.toLowerCase() ?? null)      : null,
    genre:        config.idx_genre        ? (book.genre?.toLowerCase() ?? null)     : null,
    language:     config.idx_language     ? (book.language?.toLowerCase() ?? null)  : null,
    keywords:     config.idx_keywords     ? (book.keywords?.map((k) => k.toLowerCase()) ?? []) : [],
    publish_year: config.idx_publish_year ? book.publish_year : null,
  };
}

/**
 * Build the list of search fields for multi_match, respecting the config.
 * Returns only fields that are enabled in the config, with their boost weights.
 */
function buildSearchFields(config: SearchConfig): string[] {
  const fields: string[] = [];
  if (config.idx_title)       fields.push('title^3');
  if (config.idx_author)      fields.push('author^2');
  if (config.idx_keywords)    fields.push('keywords^3');
  if (config.idx_description) fields.push('description');
  if (config.idx_publisher)   fields.push('publisher');
  if (config.idx_genre)       fields.push('genre');
  if (config.idx_language)    fields.push('language^2');
  if (config.idx_isbn)        fields.push('isbn');
  return fields;
}

/** Index or update a single book document in the tenant-scoped index */
async function indexBook(book: BookRow, config?: SearchConfig): Promise<void> {
  if (!esAvailable) return;
  try {
    await ensureTenantIndex(book.tenant_id);
    const cfg = config ?? await SearchConfigModel.getConfig(book.tenant_id);
    const docBody = buildDocBody(book, cfg);
    const INDEX = tenantIndex(book.tenant_id);

    await fetch(`${ELASTIC_URL}/${INDEX}/_doc/${book.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(docBody),
    });
  } catch (err: unknown) {
    console.log('Failed to index book in Elasticsearch:', (err as Error).message);
  }
}

/** Remove a book document from the tenant-scoped index */
async function removeBook(id: string, tenantId: string): Promise<void> {
  if (!esAvailable) return;
  try {
    const INDEX = tenantIndex(tenantId);
    await fetch(`${ELASTIC_URL}/${INDEX}/_doc/${id}`, { method: 'DELETE' });
  } catch (err: unknown) {
    console.log('Failed to remove book from Elasticsearch index:', (err as Error).message);
  }
}

/**
 * Full-text search scoped to a tenant (searches tenant's own index).
 * Returns an array of matching book IDs, or null when ES is unavailable.
 * Respects the tenant's search config (only searches enabled fields).
 * All searches are case-insensitive.
 */
async function searchBooks(query: string, tenantId: string): Promise<string[] | null> {
  if (!esAvailable) return null;
  try {
    const config = await SearchConfigModel.getConfig(tenantId);
    const fields = buildSearchFields(config);

    if (fields.length === 0) return [];

    // Normalize query to lowercase so keyword fields match case-insensitively.
    // Text fields are handled by ES's standard analyzer regardless.
    const normalizedQuery = query.toLowerCase();
    const INDEX = tenantIndex(tenantId);

    const res = await fetch(`${ELASTIC_URL}/${INDEX}/_search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: {
          multi_match: {
            query: normalizedQuery,
            fields,
            fuzziness: 'AUTO',
          },
        },
        size: 100,
      }),
    });
    if (!res.ok) return null;
    const data = await res.json() as { hits?: { hits?: Array<{ _id: string }> } };
    return data.hits?.hits?.map((h) => h._id) ?? [];
  } catch (err: unknown) {
    console.log('Elasticsearch search failed:', (err as Error).message);
    return null;
  }
}

/**
 * Reindex ALL books for a given tenant using the current search config.
 * Creates the tenant index if it doesn't exist.
 * Returns the count of documents successfully indexed.
 */
async function reindexTenant(tenantId: string, books: BookRow[]): Promise<number> {
  if (!esAvailable) return 0;
  await ensureTenantIndex(tenantId);
  const config = await SearchConfigModel.getConfig(tenantId);
  const INDEX = tenantIndex(tenantId);
  let count = 0;
  for (const book of books) {
    try {
      const docBody = buildDocBody(book, config);
      const res = await fetch(`${ELASTIC_URL}/${INDEX}/_doc/${book.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(docBody),
      });
      if (res.ok) count++;
    } catch (err: unknown) {
      console.log(`Failed to reindex book ${book.id}:`, (err as Error).message);
    }
  }
  return count;
}

// Export with both names for backwards compatibility
export { ensureIndex, ensureIndex as initIndex, indexBook, removeBook, searchBooks, reindexTenant };
