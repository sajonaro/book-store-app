import React, { useEffect, useState, useMemo } from 'react';
import Spinner from '../components/Spinner';
import { Link } from 'react-router-dom';
import { MdOutlineAddBox } from 'react-icons/md';
import BooksCard from '../components/home/BooksCard';
import BooksTable from '../components/home/BooksTable';
import type { Book } from '../types/book';
import api from '../utils/api';
import DashboardLayout from '../components/DashboardLayout';

const Home: React.FC = () => {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(false);
  const [showType, setShowType] = useState<'table' | 'card'>('table');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchBooks = async () => {
      setLoading(true);
      try {
        const response = await api.get<{ data: Book[] }>('/books');
        setBooks(response.data.data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchBooks();
  }, []);

  // Client-side filter by title, author, or genre
  const filteredBooks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return books;
    return books.filter(
      (b) =>
        b.title?.toLowerCase().includes(q) ||
        b.author?.toLowerCase().includes(q) ||
        b.genre?.toLowerCase().includes(q),
    );
  }, [books, searchQuery]);

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
              {searchQuery.trim()
                ? `${filteredBooks.length} of ${books.length} book${books.length !== 1 ? 's' : ''} match`
                : `${books.length} book${books.length !== 1 ? 's' : ''} in catalog`}
            </p>
          </div>

          <div className='flex items-center gap-3'>
            {/* Inline filter */}
            <input
              type='text'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
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
          <BooksTable books={filteredBooks} />
        ) : (
          <BooksCard books={filteredBooks} />
        )}
      </div>
    </DashboardLayout>
  );
};

export default Home;
