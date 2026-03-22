import React, { useState } from 'react';
import api from '../utils/api';
import Spinner from '../components/Spinner';
import BookActionIcons from '../components/shared/BookActionIcons';
import BookCard from '../components/shared/BookCard';
import type { Book } from '../types/book';
import DashboardLayout from '../components/DashboardLayout';

const SHOW_ALL_KEYWORDS = ['*', 'all', '.*'];

const SearchPage: React.FC = () => {
  const [query, setQuery] = useState('');
  const [books, setBooks] = useState<Book[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);

  const isShowAll = (q: string) => {
    const t = q.trim().toLowerCase();
    return t === '' || SHOW_ALL_KEYWORDS.includes(t);
  };

  const doSearch = async (q: string) => {
    setLoading(true);
    setSearched(false);
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

  return (
    <DashboardLayout>
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

      <div className='max-w-5xl mx-auto px-4 pb-24'>
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
            <p className='text-sm mb-5' style={{ color: 'var(--oai-muted)' }}>
              {books.length} result{books.length !== 1 ? 's' : ''}
              {query && !isShowAll(query) ? (
                <>
                  {' '}for &ldquo;<span style={{ color: 'var(--oai-text)' }}>{query}</span>&rdquo;
                </>
              ) : (
                ' (all books)'
              )}
            </p>
            <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'>
              {books.map((book) => (
                <BookCard
                  key={book.id}
                  book={book}
                  actions={<BookActionIcons bookId={book.id} />}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default SearchPage;
