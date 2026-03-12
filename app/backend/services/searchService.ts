/**
 * Elasticsearch search service using native fetch() for Bun compatibility.
 * The @elastic/elasticsearch SDK uses Node.js http internals that break on Bun.
 */

import type { BookRow } from '../models/bookModel';

const ELASTIC_URL = (process.env.ELASTIC_URL || 'http://elastic:9200').replace(/\/$/, '');
const INDEX = 'books';

let esAvailable = false;

/** Create / ensure the books index exists */
async function ensureIndex(): Promise<void> {
  try {
    const res = await fetch(`${ELASTIC_URL}/${INDEX}`, { method: 'HEAD' });
    if (res.status === 404) {
      await fetch(`${ELASTIC_URL}/${INDEX}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mappings: {
            properties: {
              title:        { type: 'text' },
              author:       { type: 'text' },
              genre:        { type: 'keyword' },
              description:  { type: 'text' },
              publisher:    { type: 'text' },
              isbn:         { type: 'keyword' },
              publish_year: { type: 'integer' },
              language:     { type: 'keyword' },
            },
          },
        }),
      });
    }
    esAvailable = true;
    console.log('Elasticsearch index ready');
  } catch (err: unknown) {
    esAvailable = false;
    console.log('Elasticsearch not available at startup:', (err as Error).message);
  }
}

/** Index or update a single book document */
async function indexBook(book: BookRow): Promise<void> {
  if (!esAvailable) return;
  try {
    await fetch(`${ELASTIC_URL}/${INDEX}/_doc/${book.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title:        book.title,
        author:       book.author,
        isbn:         book.isbn,
        publisher:    book.publisher,
        genre:        book.genre,
        description:  book.description,
        publish_year: book.publish_year,
        language:     book.language,
      }),
    });
  } catch (err: unknown) {
    console.log('Failed to index book in Elasticsearch:', (err as Error).message);
  }
}

/** Remove a book document from the index */
async function removeBook(id: string): Promise<void> {
  if (!esAvailable) return;
  try {
    await fetch(`${ELASTIC_URL}/${INDEX}/_doc/${id}`, { method: 'DELETE' });
  } catch (err: unknown) {
    console.log('Failed to remove book from Elasticsearch index:', (err as Error).message);
  }
}

/**
 * Full-text search across title, author, description, publisher.
 * Returns an array of matching book IDs, or null when ES is unavailable.
 */
async function searchBooks(query: string): Promise<string[] | null> {
  if (!esAvailable) return null;
  try {
    const res = await fetch(`${ELASTIC_URL}/${INDEX}/_search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: {
          multi_match: {
            query,
            fields: ['title^3', 'author^2', 'description', 'publisher', 'genre', 'language^2'],
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

// Export with both names for backwards compatibility
export { ensureIndex, ensureIndex as initIndex, indexBook, removeBook, searchBooks };
