import React, { useEffect, useState, useMemo } from 'react';
import Spinner from '../components/Spinner';
import { Link, useNavigate } from 'react-router-dom';
import { MdOutlineAddBox } from 'react-icons/md';
import BooksCard from '../components/home/BooksCard';
import BooksTable from '../components/home/BooksTable';
import type { Book } from '../types/book';
import api from '../utils/api';
import axios from 'axios';
import { useSession } from '../hooks/useSession';

const Home: React.FC = () => {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(false);
  const [showType, setShowType] = useState<'table' | 'card'>('table');
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  const session = useSession();

  // Fresh tenant branding — overrides stale localStorage values for all users
  const [tenantName, setTenantName] = useState(session?.tenant?.store_name || 'Planet of Books');
  const [tenantLogo, setTenantLogo] = useState<string | null>(session?.tenant?.logo_url || null);

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

  // Refresh tenant branding (name + logo) from the public endpoint so all users
  // always see the latest values even if the admin updated them after login.
  useEffect(() => {
    const slug = session?.tenant?.slug;
    if (!slug) return;
    axios
      .get<{ data: { store_name: string; logo_url: string | null } }>(`/tenant/${slug}/info`)
      .then((res) => {
        const fresh = res.data.data;
        setTenantName(fresh.store_name || 'Planet of Books');
        setTenantLogo(fresh.logo_url || null);
        // Persist fresh values to localStorage so next page load is up-to-date
        const stored = JSON.parse(localStorage.getItem('session') || 'null');
        if (stored?.tenant) {
          stored.tenant.store_name = fresh.store_name;
          stored.tenant.logo_url = fresh.logo_url;
          localStorage.setItem('session', JSON.stringify(stored));
        }
      })
      .catch(() => {/* silently ignore — stale values remain */});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSignOut = () => {
    localStorage.removeItem('session');
    navigate('/login');
  };

  const storeName = tenantName;

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
          <div className='flex items-center gap-3'>
            {tenantLogo ? (
              <img
                src={tenantLogo}
                alt='logo'
                style={{ height: '28px', objectFit: 'contain' }}
              />
            ) : (
              <img src='/logo.svg' alt='BookStore' style={{ height: '28px', width: 'auto' }} />
            )}
            <h1 className='store-brand-name text-base tracking-tight' style={{ color: 'var(--oai-text)', fontSize: '1.1rem' }}>
              {storeName}
            </h1>
          </div>
          <div className='flex items-center gap-3'>
            {/* Inline search */}
            <input
              type='text'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder='Filter by title, author, genre…'
              className='oai-input text-xs'
              style={{ width: '220px', padding: '0.375rem 0.75rem', borderRadius: '9999px' }}
            />
            <Link
              to='/settings'
              className='text-xs font-medium transition-colors'
              style={{ color: 'var(--oai-muted)' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--oai-text)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--oai-muted)')}
            >
              ⚙ Settings
            </Link>
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
              style={{ color: 'var(--oai-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
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
              {searchQuery.trim()
                ? `${filteredBooks.length} of ${books.length} book${books.length !== 1 ? 's' : ''} match`
                : `${books.length} book${books.length !== 1 ? 's' : ''} in catalog`}
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
          <BooksTable books={filteredBooks} />
        ) : (
          <BooksCard books={filteredBooks} />
        )}
      </main>
    </div>
  );
};

export default Home;
