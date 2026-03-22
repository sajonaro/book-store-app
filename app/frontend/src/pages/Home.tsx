import React, { useEffect, useState, useCallback, useRef } from 'react';
import Spinner from '../components/Spinner';
import { Link } from 'react-router-dom';
import { MdOutlineAddBox } from 'react-icons/md';
import BooksCard from '../components/home/BooksCard';
import BooksTable from '../components/home/BooksTable';
import type { SortKey, SortDir } from '../components/home/BooksTable';
import Pagination from '../components/shared/Pagination';
import type { Book } from '../types/book';
import api from '../utils/api';
import DashboardLayout from '../components/DashboardLayout';

const PAGE_LIMIT = 25;

interface PagedResponse {
  count: number;
  page: number;
  limit: number;
  pages: number;
  data: Book[];
}

const Home: React.FC = () => {
  const [books, setBooks] = useState<Book[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showType, setShowType] = useState<'table' | 'card'>('table');
  const [filterQuery, setFilterQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('created_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  // Debounce filter input so we don't fire a request on every keystroke
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchBooks = useCallback(
    async (p: number, q: string, sk: SortKey, sd: SortDir) => {
      setLoading(true);
      try {
        const params: Record<string, string | number> = {
          page: p,
          limit: PAGE_LIMIT,
          sort: sk,
          order: sd,
        };
        if (q.trim()) params.q = q.trim();
        const res = await api.get<PagedResponse>('/books', { params });
        setBooks(res.data.data);
        setTotal(res.data.count);
        setPage(res.data.page);
        setPages(res.data.pages);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  // Initial load
  useEffect(() => {
    fetchBooks(1, '', sortKey, sortDir);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-fetch when sort changes (reset to page 1)
  const handleSort = (key: SortKey) => {
    const newDir: SortDir =
      key === sortKey ? (sortDir === 'asc' ? 'desc' : 'asc') : 'asc';
    setSortKey(key);
    setSortDir(newDir);
    setPage(1);
    fetchBooks(1, filterQuery, key, newDir);
  };

  // Re-fetch when page changes
  const handlePage = (p: number) => {
    setPage(p);
    fetchBooks(p, filterQuery, sortKey, sortDir);
  };

  // Debounced filter input
  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value;
    setFilterQuery(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
      fetchBooks(1, q, sortKey, sortDir);
    }, 350);
  };

  return (
    <DashboardLayout>
      <div className='px-6 py-8'>
        {/* Page title + actions row */}
        <div className='flex items-center justify-between mb-6'>
          <div>
            <h2 className='text-2xl font-semibold' style={{ color: 'var(--oai-text)' }}>
              Inventory
            </h2>
            <p className='text-sm mt-0.5' style={{ color: 'var(--oai-muted)' }}>
              {filterQuery.trim()
                ? `${total} book${total !== 1 ? 's' : ''} match`
                : `${total} book${total !== 1 ? 's' : ''} in catalog`}
            </p>
          </div>

          <div className='flex items-center gap-3'>
            {/* Inline filter */}
            <input
              type='text'
              value={filterQuery}
              onChange={handleFilterChange}
              placeholder='Filter by title, author, genre…'
              className='oai-input text-xs'
              style={{ width: '220px', padding: '0.375rem 0.75rem', borderRadius: '9999px' }}
            />

            {/* Add book button */}
            <Link to='/books/create' className='btn-primary text-xs px-3 py-1.5'>
              <MdOutlineAddBox className='text-base' />
              Add Book
            </Link>

            {/* View toggle */}
            <div
              className='flex items-center gap-1 p-1 rounded-lg'
              style={{ backgroundColor: 'var(--oai-surface)', border: '1px solid var(--oai-border)' }}
            >
              {(['table', 'card'] as const).map((type) => (
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
        </div>

        {loading ? (
          <Spinner />
        ) : showType === 'table' ? (
          <BooksTable
            books={books}
            sortKey={sortKey}
            sortDir={sortDir}
            onSort={handleSort}
          />
        ) : (
          <BooksCard books={books} />
        )}

        <Pagination
          page={page}
          pages={pages}
          total={total}
          limit={PAGE_LIMIT}
          onPage={handlePage}
        />
      </div>
    </DashboardLayout>
  );
};

export default Home;
