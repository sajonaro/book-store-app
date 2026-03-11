import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Spinner from '../components/Spinner';
import { Link, useNavigate } from 'react-router-dom';
import { MdOutlineAddBox } from 'react-icons/md';
import BooksCard from '../components/home/BooksCard';
import BooksTable from '../components/home/BooksTable';
import type { Book } from '../types/book';

const Home: React.FC = () => {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(false);
  const [showType, setShowType] = useState<'table' | 'card'>('table');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchBooks = async () => {
      setLoading(true);
      try {
        const response = await axios.get<{ data: Book[] }>('/books');
        setBooks(response.data.data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchBooks();
  }, []);

  const handleSignOut = () => {
    localStorage.removeItem('session');
    navigate('/login');
  };

  return (
    <div className='min-h-screen' style={{ backgroundColor: 'var(--oai-bg)' }}>
      {/* Top nav */}
      <header
        style={{
          backgroundColor: 'var(--oai-surface)',
          borderBottom: '1px solid var(--oai-border)',
          position: 'sticky',
          top: 0,
          zIndex: 50,
        }}
      >
        <div className='max-w-7xl mx-auto px-6 h-14 flex items-center justify-between'>
          <h1 className='text-base font-semibold tracking-tight' style={{ color: 'var(--oai-text)' }}>
            📚 BookStore
          </h1>
          <div className='flex items-center gap-3'>
            <Link
              to='/books/create'
              className='btn-primary text-xs px-3 py-1.5'
            >
              <MdOutlineAddBox className='text-base' />
              Add Book
            </Link>
            <button
              onClick={handleSignOut}
              className='text-xs font-medium transition-colors'
              style={{ color: 'var(--oai-muted)' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--oai-red)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--oai-muted)')}
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className='max-w-7xl mx-auto px-6 py-8'>
        {/* Page title + view toggle */}
        <div className='flex items-center justify-between mb-6'>
          <div>
            <h2 className='text-2xl font-semibold' style={{ color: 'var(--oai-text)' }}>
              Inventory
            </h2>
            <p className='text-sm mt-0.5' style={{ color: 'var(--oai-muted)' }}>
              {books.length} book{books.length !== 1 ? 's' : ''} in catalog
            </p>
          </div>

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
                    ? {
                        backgroundColor: 'var(--oai-hover)',
                        color: 'var(--oai-text)',
                      }
                    : {
                        backgroundColor: 'transparent',
                        color: 'var(--oai-muted)',
                      }
                }
              >
                {type === 'table' ? '⊞ Table' : '⊟ Cards'}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <Spinner />
        ) : showType === 'table' ? (
          <BooksTable books={books} />
        ) : (
          <BooksCard books={books} />
        )}
      </main>
    </div>
  );
};

export default Home;
