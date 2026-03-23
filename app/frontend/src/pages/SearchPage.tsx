import React, { useState, useMemo, useRef } from 'react';
import api from '../utils/api';
import Spinner from '../components/Spinner';
import BookActionIcons from '../components/shared/BookActionIcons';
import BookCard from '../components/shared/BookCard';
import BooksTable from '../components/home/BooksTable';
import type { SortKey, SortDir } from '../components/home/BooksTable';
import type { Book } from '../types/book';
import DashboardLayout from '../components/DashboardLayout';

const SHOW_ALL_KEYWORDS = ['*', 'all', '.*'];

// ── helpers ──────────────────────────────────────────────────────────────────

const isShowAll = (q: string) => {
  const t = q.trim().toLowerCase();
  return t === '' || SHOW_ALL_KEYWORDS.includes(t);
};

/** Sort a copy of books array by key/dir — used only in table view */
function sortBooks(books: Book[], key: SortKey, dir: SortDir): Book[] {
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

// ── chip categories ───────────────────────────────────────────────────────────

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

// ── component ─────────────────────────────────────────────────────────────────

const SearchPage: React.FC = () => {
  const [query, setQuery]     = useState('');
  const [books, setBooks]     = useState<Book[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);

  // view toggle
  const [showType, setShowType] = useState<'table' | 'card'>('card');

  // table sort (client-side within the ES result set)
  const [sortKey, setSortKey] = useState<SortKey>('title');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  // similar books
  const [similarFilter, setSimilarFilter] = useState<{ type: ChipType; value: string } | null>(null);
  const [similarBooks, setSimilarBooks]   = useState<Book[]>([]);
  const [similarLoading, setSimilarLoading] = useState(false);
  const similarRef = useRef<HTMLDivElement>(null);

  // ── search ──────────────────────────────────────────────────────────────────

  const doSearch = async (q: string) => {
    setLoading(true);
    setSearched(false);
    setSimilarFilter(null);
    setSimilarBooks([]);
    try {
      const params = isShowAll(q) ? {} : { q: q.trim() };
      const res = await api.get<{ data: Book[] }>('/books', { params });
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

  // ── table sort (client-side) ─────────────────────────────────────────────────

  const handleSort = (key: SortKey) => {
    const newDir: SortDir = key === sortKey ? (sortDir === 'asc' ? 'desc' : 'asc') : 'asc';
    setSortKey(key);
    setSortDir(newDir);
  };

  const displayedBooks = useMemo(
    () => (showType === 'table' ? sortBooks(books, sortKey, sortDir) : books),
    [books, showType, sortKey, sortDir],
  );

  // ── chip extraction ───────────────────────────────────────────────────────────

  const chipGroups = useMemo(() => extractChips(books), [books]);

  // ── similar search ────────────────────────────────────────────────────────────

  const handleChipClick = async (type: ChipType, value: string) => {
    // Toggle off if same chip clicked again
    if (similarFilter?.type === type && similarFilter?.value === value) {
      setSimilarFilter(null);
      setSimilarBooks([]);
      return;
    }
    setSimilarFilter({ type, value });
    setSimilarLoading(true);
    setSimilarBooks([]);
    try {
      const res = await api.get<{ data: Book[] }>('/books', { params: { q: value } });
      setSimilarBooks(res.data.data || []);
    } catch {
      setSimilarBooks([]);
    } finally {
      setSimilarLoading(false);
      // Scroll to similar section after load
      setTimeout(() => similarRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    }
  };

  // ── render ───────────────────────────────────────────────────────────────────

  return (
    <DashboardLayout>
      {/* ── Search hero ────────────────────────────────────────────────────── */}
      <div className='flex flex-col items-center pt-16 pb-12 px-4'>
        <h1
          className='store-brand-name mb-2 tracking-tight'
          style={{ color: 'var(--oai-text)', fontSize: '2.5rem', lineHeight: 1.1 }}
        >
          Search
        </h1>
        <p className='text-base mb-10' style={{ color: 'var(--oai-muted)' }}>
          Search across your inventory
        </p>

        <form onSubmit={handleSearch} className='w-full max-w-2xl flex items-center gap-2'>
          <input
            type='text'
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder='Search by title, author, genre… or * to show all'
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
        <p className='text-xs mt-3' style={{ color: 'var(--oai-subtle)' }}>
          Tip: use <code style={{ color: 'var(--oai-green)' }}>*</code> or{' '}
          <code style={{ color: 'var(--oai-green)' }}>all</code> to show everything
        </p>
      </div>

      {/* ── Results ──────────────────────────────────────────────────────────── */}
      <div className='max-w-6xl mx-auto px-4 pb-24'>
        {loading && (
          <div className='flex justify-center'>
            <Spinner />
          </div>
        )}

        {!loading && !searched && (
          <div className='text-center'>
            <p className='text-sm mb-4' style={{ color: 'var(--oai-subtle)' }}>
              Enter a title, author, or genre above to search the catalog
            </p>
            <button
              onClick={() => doSearch('*')}
              className='btn-primary'
              style={{ padding: '0.5rem 1.25rem', fontSize: '0.875rem', borderRadius: '9999px' }}
            >
              Show All Books
            </button>
          </div>
        )}

        {!loading && searched && books.length === 0 && (
          <p className='text-center' style={{ color: 'var(--oai-muted)' }}>
            No books found
            {query && !isShowAll(query) ? (
              <>
                {' '}for &ldquo;
                <strong style={{ color: 'var(--oai-text)' }}>{query}</strong>&rdquo;
              </>
            ) : null}
          </p>
        )}

        {!loading && books.length > 0 && (
          <>
            {/* Results header + view toggle */}
            <div className='flex items-center justify-between mb-5'>
              <p className='text-sm' style={{ color: 'var(--oai-muted)' }}>
                {books.length} result{books.length !== 1 ? 's' : ''}
                {query && !isShowAll(query) ? (
                  <>
                    {' '}for &ldquo;<span style={{ color: 'var(--oai-text)' }}>{query}</span>&rdquo;
                  </>
                ) : (
                  ' (all books)'
                )}
              </p>

              {/* View toggle */}
              <div
                className='flex items-center gap-1 p-1 rounded-lg'
                style={{ backgroundColor: 'var(--oai-surface)', border: '1px solid var(--oai-border)' }}
              >
                {(['card', 'table'] as const).map((type) => (
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
                    {type === 'table' ? '⊞ Table' : '⊟ Cards'}
                  </button>
                ))}
              </div>
            </div>

            {/* Main results */}
            {showType === 'card' ? (
              <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'>
                {displayedBooks.map((book) => (
                  <BookCard
                    key={book.id}
                    book={book}
                    actions={<BookActionIcons bookId={book.id} />}
                  />
                ))}
              </div>
            ) : (
              <BooksTable
                books={displayedBooks}
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={handleSort}
              />
            )}

            {/* ── Explore / Similar section ──────────────────────────────────── */}
            {chipGroups.length > 0 && (
              <div className='mt-10'>
                <div
                  className='rounded-xl p-5 mb-6'
                  style={{
                    backgroundColor: 'var(--oai-surface)',
                    border: '1px solid var(--oai-border)',
                  }}
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
                          const active =
                            similarFilter?.type === group.type && similarFilter?.value === val;
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
                      <h3
                        className='text-base font-semibold'
                        style={{ color: 'var(--oai-text)' }}
                      >
                        {similarFilter
                          ? `Books with ${similarFilter.type}: "${similarFilter.value}"`
                          : 'Loading…'}
                      </h3>
                      {similarFilter && (
                        <button
                          onClick={() => { setSimilarFilter(null); setSimilarBooks([]); }}
                          className='text-xs px-2 py-0.5 rounded'
                          style={{
                            color: 'var(--oai-muted)',
                            border: '1px solid var(--oai-border)',
                            backgroundColor: 'transparent',
                          }}
                        >
                          ✕ clear
                        </button>
                      )}
                    </div>

                    {similarLoading ? (
                      <div className='flex justify-center py-6'>
                        <Spinner />
                      </div>
                    ) : similarBooks.length === 0 ? (
                      <p className='text-sm' style={{ color: 'var(--oai-muted)' }}>
                        No similar books found.
                      </p>
                    ) : (
                      <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'>
                        {similarBooks.map((book) => (
                          <BookCard
                            key={book.id}
                            book={book}
                            actions={<BookActionIcons bookId={book.id} />}
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
    </DashboardLayout>
  );
};

export default SearchPage;
