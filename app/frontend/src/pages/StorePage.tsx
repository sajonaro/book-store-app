import React, { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
import { useParams, Link } from 'react-router-dom';
import Spinner from '../components/Spinner';
import BookCard from '../components/shared/BookCard';
import StockBadge from '../components/shared/StockBadge';
import { formatPrice } from '../utils/formatters';
import { PLACEHOLDER_TABLE } from '../utils/constants';
import type { Book } from '../types/book';

interface TenantInfo {
  id: string;
  store_name: string;
  slug: string;
  logo_url?: string | null;
}

// ── chip helpers ──────────────────────────────────────────────────────────────

type ChipType = 'genre' | 'language' | 'author' | 'keyword';

interface ChipGroup {
  type: ChipType;
  label: string;
  badgeClass: string;
  values: string[];
}

function extractChips(books: Book[]): ChipGroup[] {
  const genres   = [...new Set(books.map((b) => b.genre).filter(Boolean) as string[])];
  const langs    = [...new Set(books.map((b) => b.language).filter(Boolean) as string[])];
  const authors  = [...new Set(books.map((b) => b.author).filter(Boolean) as string[])];
  const keywords = [...new Set(books.flatMap((b) => b.keywords ?? []).filter(Boolean) as string[])].slice(0, 20);

  const groups: ChipGroup[] = [];
  if (genres.length)   groups.push({ type: 'genre',   label: 'Genre',    badgeClass: 'badge-blue',   values: genres });
  if (langs.length)    groups.push({ type: 'language', label: 'Language', badgeClass: 'badge-purple', values: langs });
  if (authors.length)  groups.push({ type: 'author',   label: 'Author',   badgeClass: 'badge-gray',   values: authors.slice(0, 10) });
  if (keywords.length) groups.push({ type: 'keyword',  label: 'Tags',     badgeClass: 'badge-green',  values: keywords });
  return groups;
}

// ── Public list view (no admin icons, sortable columns) ───────────────────────

type StoreSortKey = 'title' | 'author' | 'publish_year' | 'genre' | 'price' | 'stock';
type StoreSortDir = 'asc' | 'desc';

interface StoreListCol {
  label: string;
  sortKey?: StoreSortKey;
  align?: 'right' | 'center';
  hideMd?: boolean;
}

const LIST_COLS: StoreListCol[] = [
  { label: '#' },
  { label: 'Cover' },
  { label: 'Title',  sortKey: 'title' },
  { label: 'Author', sortKey: 'author',       hideMd: true },
  { label: 'Year',   sortKey: 'publish_year', hideMd: true },
  { label: 'Genre',  sortKey: 'genre',        hideMd: true },
  { label: 'Price',  sortKey: 'price',        hideMd: true, align: 'right' },
  { label: 'Stock',  sortKey: 'stock',        hideMd: true, align: 'center' },
  { label: '' },
];

function sortStoreBooks(books: Book[], key: StoreSortKey, dir: StoreSortDir): Book[] {
  return [...books].sort((a, b) => {
    const av = a[key as keyof Book];
    const bv = b[key as keyof Book];
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    const cmp =
      typeof av === 'number' && typeof bv === 'number'
        ? av - bv
        : String(av).localeCompare(String(bv), undefined, { sensitivity: 'base' });
    return dir === 'asc' ? cmp : -cmp;
  });
}

const StoreBooksList: React.FC<{ books: Book[]; slug: string }> = ({ books, slug }) => {
  const [sortKey, setSortKey] = React.useState<StoreSortKey>('title');
  const [sortDir, setSortDir] = React.useState<StoreSortDir>('asc');

  const handleSort = (key: StoreSortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const sorted = React.useMemo(() => sortStoreBooks(books, sortKey, sortDir), [books, sortKey, sortDir]);

  return (
    <div className='overflow-x-auto rounded-xl' style={{ border: '1px solid var(--oai-border)' }}>
      <table className='min-w-full text-sm' style={{ backgroundColor: 'var(--oai-surface)' }}>
        <thead style={{ backgroundColor: 'var(--oai-surface-2)', borderBottom: '1px solid var(--oai-border)' }}>
          <tr>
            {LIST_COLS.map((col) => {
              const active = col.sortKey === sortKey;
              const sortable = !!col.sortKey;
              return (
                <th
                  key={col.label || '_actions'}
                  className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider${col.hideMd ? ' max-md:hidden' : ''}${col.align === 'right' ? ' text-right' : col.align === 'center' ? ' text-center' : ''}${sortable ? ' select-none' : ''}`}
                  style={{
                    color: active ? 'var(--oai-green)' : 'var(--oai-muted)',
                    cursor: sortable ? 'pointer' : 'default',
                    whiteSpace: 'nowrap',
                  }}
                  onClick={sortable ? () => handleSort(col.sortKey!) : undefined}
                  title={sortable ? `Sort by ${col.label}` : undefined}
                >
                  {col.label}
                  {sortable && (
                    <span className='ml-1 inline-block w-3 text-center'>
                      {active ? (sortDir === 'asc' ? '↑' : '↓') : (
                        <span style={{ opacity: 0.3 }}>↕</span>
                      )}
                    </span>
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sorted.map((book, idx) => (
            <tr
              key={book.id}
              style={{ borderBottom: '1px solid var(--oai-border)' }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--oai-surface-2)')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <td className='px-4 py-3 text-xs' style={{ color: 'var(--oai-subtle)' }}>{idx + 1}</td>
              <td className='px-4 py-3'>
                <img
                  src={book.cover_thumbnail || PLACEHOLDER_TABLE}
                  alt=''
                  className='w-9 h-12 object-cover rounded'
                  style={{ border: '1px solid var(--oai-border)' }}
                  onError={(e) => { e.currentTarget.src = PLACEHOLDER_TABLE; }}
                />
              </td>
              <td className='px-4 py-3 font-medium' style={{ color: 'var(--oai-text)' }}>{book.title}</td>
              <td className='px-4 py-3 max-md:hidden' style={{ color: 'var(--oai-muted)' }}>{book.author}</td>
              <td className='px-4 py-3 max-md:hidden' style={{ color: 'var(--oai-muted)' }}>{book.publish_year || '—'}</td>
              <td className='px-4 py-3 max-md:hidden'>
                {book.genre ? <span className='badge-blue'>{book.genre}</span> : <span style={{ color: 'var(--oai-subtle)' }}>—</span>}
              </td>
              <td className='px-4 py-3 text-right font-semibold max-md:hidden' style={{ color: 'var(--oai-text)' }}>
                {formatPrice(book.price)}
              </td>
              <td className='px-4 py-3 text-center max-md:hidden'>
                <StockBadge stock={book.stock} />
              </td>
              <td className='px-4 py-3 text-right'>
                <Link
                  to={`/store/${slug}/books/${book.id}`}
                  className='text-xs font-medium transition-colors'
                  style={{ color: 'var(--oai-green)' }}
                >
                  View →
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// ── Main component ─────────────────────────────────────────────────────────────

const StorePage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [query, setQuery]       = useState('');
  const [books, setBooks]       = useState<Book[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [tenant, setTenant]     = useState<TenantInfo | null>(null);
  const [tenantLoading, setTenantLoading] = useState(true);

  // view toggle
  const [showType, setShowType] = useState<'card' | 'list'>('card');

  // similar books
  const [similarFilter, setSimilarFilter] = useState<{ type: ChipType; value: string } | null>(null);
  const [similarBooks, setSimilarBooks]   = useState<Book[]>([]);
  const [similarLoading, setSimilarLoading] = useState(false);
  const similarRef = useRef<HTMLDivElement>(null);

  // ── tenant load ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!slug) return;
    const fetchTenant = async () => {
      try {
        const res = await axios.get<{ data: TenantInfo }>(`/tenant/${slug}/info`);
        setTenant(res.data.data);
      } catch {
        setTenant(null);
      } finally {
        setTenantLoading(false);
      }
    };
    fetchTenant();
  }, [slug]);

  // ── search ─────────────────────────────────────────────────────────────────

  const doSearch = async (q: string) => {
    if (!slug) return;
    setLoading(true);
    setSearched(false);
    setSimilarFilter(null);
    setSimilarBooks([]);
    try {
      const params = q.trim() ? { q: q.trim() } : {};
      const res = await axios.get<{ data: Book[] }>(`/tenant/${slug}/books`, { params });
      setBooks(res.data.data || []);
    } catch {
      setBooks([]);
    } finally {
      setLoading(false);
      setSearched(true);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    await doSearch(query);
  };

  // ── chip extraction ────────────────────────────────────────────────────────

  const chipGroups = useMemo(() => extractChips(books), [books]);

  // ── similar search ─────────────────────────────────────────────────────────

  const handleChipClick = async (type: ChipType, value: string) => {
    if (!slug) return;
    if (similarFilter?.type === type && similarFilter?.value === value) {
      setSimilarFilter(null);
      setSimilarBooks([]);
      return;
    }
    setSimilarFilter({ type, value });
    setSimilarLoading(true);
    setSimilarBooks([]);
    try {
      const res = await axios.get<{ data: Book[] }>(`/tenant/${slug}/books`, { params: { q: value } });
      setSimilarBooks(res.data.data || []);
    } catch {
      setSimilarBooks([]);
    } finally {
      setSimilarLoading(false);
      setTimeout(() => similarRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    }
  };

  // ── error / loading states ─────────────────────────────────────────────────

  if (tenantLoading) {
    return (
      <div className='min-h-screen flex items-center justify-center' style={{ backgroundColor: 'var(--oai-bg)' }}>
        <Spinner />
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className='min-h-screen flex flex-col items-center justify-center' style={{ backgroundColor: 'var(--oai-bg)' }}>
        <div className='text-5xl mb-4'>🔍</div>
        <h1 className='text-2xl font-semibold mb-2' style={{ color: 'var(--oai-text)' }}>Store not found</h1>
        <p style={{ color: 'var(--oai-muted)' }}>The store &ldquo;{slug}&rdquo; does not exist.</p>
      </div>
    );
  }

  // ── render ─────────────────────────────────────────────────────────────────

  return (
    <div className='min-h-screen' style={{ backgroundColor: 'var(--oai-bg)' }}>
      {/* Store hero */}
      <div className='flex flex-col items-center pt-24 pb-12 px-4'>
        {tenant.logo_url ? (
          <img
            src={tenant.logo_url}
            alt={`${tenant.store_name} logo`}
            className='mb-4 rounded-lg'
            style={{ maxHeight: '80px', maxWidth: '200px', objectFit: 'contain' }}
          />
        ) : (
          <div className='text-5xl mb-4'>📚</div>
        )}
        <h1 className='text-4xl font-semibold mb-2 tracking-tight' style={{ color: 'var(--oai-text)' }}>
          {tenant.store_name}
        </h1>
        <p className='text-base mb-10' style={{ color: 'var(--oai-muted)' }}>
          Find your next great read
        </p>

        <form onSubmit={handleSearch} className='w-full max-w-2xl flex items-center gap-2'>
          <input
            type='text'
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder='Search by title, author or genre…'
            className='oai-input flex-1 text-base'
            style={{ borderRadius: '9999px', padding: '0.75rem 1.5rem' }}
          />
          <button
            type='submit'
            className='btn-primary'
            style={{ borderRadius: '9999px', padding: '0.75rem 1.5rem', fontSize: '0.9rem' }}
          >
            Search
          </button>
        </form>
      </div>

      {/* Results */}
      <div className='max-w-6xl mx-auto px-4 pb-24'>
        {loading && (
          <div className='flex justify-center'>
            <Spinner />
          </div>
        )}

        {!loading && !searched && (
          <div className='text-center'>
            <p className='text-sm mb-4' style={{ color: 'var(--oai-subtle)' }}>
              Enter a title, author, or genre above — or browse the full catalog
            </p>
            <button
              onClick={() => doSearch('')}
              className='btn-primary'
              style={{ padding: '0.5rem 1.25rem', fontSize: '0.875rem', borderRadius: '9999px' }}
            >
              Browse All Books
            </button>
          </div>
        )}

        {!loading && searched && books.length === 0 && (
          <p className='text-center' style={{ color: 'var(--oai-muted)' }}>
            No books found{query ? <> for &ldquo;<strong style={{ color: 'var(--oai-text)' }}>{query}</strong>&rdquo;</> : null}
          </p>
        )}

        {!loading && books.length > 0 && (
          <>
            {/* Header + view toggle */}
            <div className='flex items-center justify-between mb-5'>
              <p className='text-sm' style={{ color: 'var(--oai-muted)' }}>
                {books.length} book{books.length !== 1 ? 's' : ''}
                {query ? <> for &ldquo;<span style={{ color: 'var(--oai-text)' }}>{query}</span>&rdquo;</> : ' in catalog'}
              </p>

              {/* View toggle */}
              <div
                className='flex items-center gap-1 p-1 rounded-lg'
                style={{ backgroundColor: 'var(--oai-surface)', border: '1px solid var(--oai-border)' }}
              >
                {(['card', 'list'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setShowType(type)}
                    className='px-3 py-1.5 text-sm font-medium rounded-md capitalize transition-all duration-150'
                    style={
                      showType === type
                        ? { backgroundColor: 'var(--oai-hover)', color: 'var(--oai-text)' }
                        : { backgroundColor: 'transparent', color: 'var(--oai-muted)' }
                    }
                  >
                    {type === 'list' ? '⊞ List' : '⊟ Cards'}
                  </button>
                ))}
              </div>
            </div>

            {/* Main results */}
            {showType === 'card' ? (
              <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'>
                {books.map((book) => (
                  <BookCard
                    key={book.id}
                    book={book}
                    actions={
                      <Link to={`/store/${slug}/books/${book.id}`}>
                        <span className='text-xs transition-colors' style={{ color: 'var(--oai-green)' }}>
                          View Details
                        </span>
                      </Link>
                    }
                  />
                ))}
              </div>
            ) : (
              <StoreBooksList books={books} slug={slug!} />
            )}

            {/* Explore Similar section */}
            {chipGroups.length > 0 && (
              <div className='mt-10'>
                <div
                  className='rounded-xl p-5 mb-6'
                  style={{ backgroundColor: 'var(--oai-surface)', border: '1px solid var(--oai-border)' }}
                >
                  <h3
                    className='text-sm font-semibold mb-4 uppercase tracking-wider'
                    style={{ color: 'var(--oai-muted)' }}
                  >
                    Explore Similar
                  </h3>
                  <div className='flex flex-col gap-3'>
                    {chipGroups.map((group) => (
                      <div key={group.type} className='flex flex-wrap items-center gap-2'>
                        <span
                          className='text-xs font-medium shrink-0 w-20'
                          style={{ color: 'var(--oai-subtle)' }}
                        >
                          {group.label}
                        </span>
                        {group.values.map((val) => {
                          const active = similarFilter?.type === group.type && similarFilter?.value === val;
                          return (
                            <button
                              key={val}
                              onClick={() => handleChipClick(group.type, val)}
                              className={`${group.badgeClass} cursor-pointer transition-all`}
                              style={{
                                opacity: active ? 1 : 0.75,
                                outline: active ? '2px solid var(--oai-green)' : 'none',
                                outlineOffset: '2px',
                                fontSize: '0.75rem',
                                padding: '0.2rem 0.55rem',
                              }}
                              title={`Find books with ${group.label.toLowerCase()}: ${val}`}
                            >
                              {val}
                            </button>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Similar results */}
                {(similarFilter || similarLoading) && (
                  <div ref={similarRef}>
                    <div className='flex items-center gap-3 mb-4'>
                      <h3 className='text-base font-semibold' style={{ color: 'var(--oai-text)' }}>
                        {similarFilter
                          ? `Books with ${similarFilter.type}: "${similarFilter.value}"`
                          : 'Loading…'}
                      </h3>
                      {similarFilter && (
                        <button
                          onClick={() => { setSimilarFilter(null); setSimilarBooks([]); }}
                          className='text-xs px-2 py-0.5 rounded'
                          style={{ color: 'var(--oai-muted)', border: '1px solid var(--oai-border)', backgroundColor: 'transparent' }}
                        >
                          ✕ clear
                        </button>
                      )}
                    </div>

                    {similarLoading ? (
                      <div className='flex justify-center py-6'><Spinner /></div>
                    ) : similarBooks.length === 0 ? (
                      <p className='text-sm' style={{ color: 'var(--oai-muted)' }}>No similar books found.</p>
                    ) : (
                      <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'>
                        {similarBooks.map((book) => (
                          <BookCard
                            key={book.id}
                            book={book}
                            actions={
                              <Link to={`/store/${slug}/books/${book.id}`}>
                                <span className='text-xs transition-colors' style={{ color: 'var(--oai-green)' }}>
                                  View Details
                                </span>
                              </Link>
                            }
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default StorePage;
