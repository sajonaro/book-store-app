import React, { useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import Spinner from '../components/Spinner';
import { PiBookOpenTextLight } from 'react-icons/pi';
import { BiUserCircle } from 'react-icons/bi';
import { BsInfoCircle } from 'react-icons/bs';
import { AiOutlineEdit } from 'react-icons/ai';
import { MdOutlineDelete } from 'react-icons/md';

const SearchPage = () => {
  const [query, setQuery] = useState('');
  const [books, setBooks] = useState([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);

  let isAdmin = false;
  try {
    const session = JSON.parse(localStorage.getItem('session'));
    isAdmin = session?.role === 'admin';
  } catch {
    // ignore
  }

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setSearched(false);
    try {
      const res = await axios.get('/books', { params: { q: query.trim() } });
      setBooks(res.data.data || []);
    } catch {
      setBooks([]);
    } finally {
      setLoading(false);
      setSearched(true);
    }
  };

  return (
    <div className='min-h-screen' style={{ backgroundColor: 'var(--oai-bg)' }}>
      {/* Header hero */}
      <div className='flex flex-col items-center pt-24 pb-12 px-4'>
        <div className='text-5xl mb-4'>📚</div>
        <h1 className='text-4xl font-semibold mb-2 tracking-tight' style={{ color: 'var(--oai-text)' }}>
          BookStore
        </h1>
        <p className='text-base mb-10' style={{ color: 'var(--oai-muted)' }}>
          Find your next great read
        </p>

        {/* Search bar */}
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
      <div className='max-w-5xl mx-auto px-4 pb-24'>
        {loading && (
          <div className='flex justify-center'>
            <Spinner />
          </div>
        )}

        {!loading && !searched && (
          <p className='text-center text-sm' style={{ color: 'var(--oai-subtle)' }}>
            Enter a title, author, or genre above to search the catalog
          </p>
        )}

        {!loading && searched && books.length === 0 && (
          <p className='text-center' style={{ color: 'var(--oai-muted)' }}>
            No books found for &ldquo;<strong style={{ color: 'var(--oai-text)' }}>{query}</strong>&rdquo;
          </p>
        )}

        {!loading && books.length > 0 && (
          <>
            <p className='text-sm mb-5' style={{ color: 'var(--oai-muted)' }}>
              {books.length} result{books.length !== 1 ? 's' : ''} for &ldquo;
              <span style={{ color: 'var(--oai-text)' }}>{query}</span>&rdquo;
            </p>
            <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'>
              {books.map((book) => (
                <div
                  key={book.id || book._id}
                  className='oai-card p-4 transition-all duration-150 animate-fade-in'
                  style={{ cursor: 'default' }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--oai-border-2)')}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--oai-border)')}
                >
                  <div className='flex items-center gap-2 mb-1'>
                    <PiBookOpenTextLight style={{ color: 'var(--oai-green)', fontSize: '1.2rem', flexShrink: 0 }} />
                    <h2 className='font-medium truncate text-sm' style={{ color: 'var(--oai-text)' }}>
                      {book.title}
                    </h2>
                  </div>
                  <div className='flex items-center gap-2 mb-3'>
                    <BiUserCircle style={{ color: 'var(--oai-muted)', fontSize: '1.1rem', flexShrink: 0 }} />
                    <span className='text-sm truncate' style={{ color: 'var(--oai-muted)' }}>
                      {book.author}
                    </span>
                  </div>
                  {book.genre && (
                    <span className='badge-blue mb-3 inline-block'>{book.genre}</span>
                  )}
                  <div
                    className='flex justify-between items-center mt-3 pt-3'
                    style={{ borderTop: '1px solid var(--oai-border)' }}
                  >
                    <span className='font-semibold text-sm' style={{ color: 'var(--oai-text)' }}>
                      ${parseFloat(book.price || 0).toFixed(2)}
                    </span>
                    {book.stock > 0 ? (
                      <span className='badge-green'>{book.stock} in stock</span>
                    ) : (
                      <span className='badge-red'>Out of stock</span>
                    )}
                  </div>
                  <div
                    className='flex justify-end gap-3 mt-3 pt-3'
                    style={{ borderTop: '1px solid var(--oai-border)' }}
                  >
                    <Link to={`/books/details/${book.id || book._id}`}>
                      <BsInfoCircle
                        className='text-xl transition-colors'
                        style={{ color: 'var(--oai-green)' }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--oai-text)')}
                        onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--oai-green)')}
                      />
                    </Link>
                    {isAdmin && (
                      <>
                        <Link to={`/books/edit/${book.id || book._id}`}>
                          <AiOutlineEdit
                            className='text-xl transition-colors'
                            style={{ color: 'var(--oai-muted)' }}
                            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--oai-text)')}
                            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--oai-muted)')}
                          />
                        </Link>
                        <Link to={`/books/delete/${book.id || book._id}`}>
                          <MdOutlineDelete
                            className='text-xl transition-colors'
                            style={{ color: 'var(--oai-red)' }}
                            onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.7')}
                            onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
                          />
                        </Link>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default SearchPage;
