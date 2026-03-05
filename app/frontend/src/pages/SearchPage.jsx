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

  // Detect admin session for showing action buttons
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
    <div className='min-h-screen bg-gray-50'>
      {/* Header */}
      <div className='flex flex-col items-center pt-20 pb-10 px-4'>
        <h1 className='text-5xl font-bold text-sky-600 mb-2'>📚 BookStore</h1>
        <p className='text-gray-400 mb-10 text-lg'>Find your next great read</p>

        {/* Google-like search bar */}
        <form
          onSubmit={handleSearch}
          className='w-full max-w-2xl flex items-center gap-2'
        >
          <input
            type='text'
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder='Search by title, author or genre…'
            className='flex-1 border border-gray-300 rounded-full px-6 py-3 text-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-400'
          />
          <button
            type='submit'
            className='bg-sky-500 hover:bg-sky-600 text-white px-6 py-3 rounded-full font-semibold shadow-sm transition'
          >
            Search
          </button>
        </form>
      </div>

      {/* Results */}
      <div className='max-w-4xl mx-auto px-4 pb-20'>
        {loading && (
          <div className='flex justify-center'>
            <Spinner />
          </div>
        )}

        {!loading && !searched && (
          <p className='text-center text-gray-400'>
            Search for a book by title, author or genre
          </p>
        )}

        {!loading && searched && books.length === 0 && (
          <p className='text-center text-gray-500'>
            No books found for &ldquo;<strong>{query}</strong>&rdquo;
          </p>
        )}

        {!loading && books.length > 0 && (
          <>
            <p className='text-sm text-gray-500 mb-4'>
              {books.length} result{books.length !== 1 ? 's' : ''} for &ldquo;
              <strong>{query}</strong>&rdquo;
            </p>
            <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'>
              {books.map((book) => (
                <div
                  key={book.id || book._id}
                  className='border border-gray-200 rounded-xl bg-white p-4 shadow-sm hover:shadow-md transition'
                >
                  <div className='flex items-center gap-2 mb-1'>
                    <PiBookOpenTextLight className='text-red-300 text-xl flex-shrink-0' />
                    <h2 className='font-semibold text-gray-800 truncate'>{book.title}</h2>
                  </div>
                  <div className='flex items-center gap-2 mb-2'>
                    <BiUserCircle className='text-red-300 text-xl flex-shrink-0' />
                    <span className='text-gray-600 text-sm'>{book.author}</span>
                  </div>
                  {book.genre && (
                    <span className='text-xs bg-sky-100 text-sky-700 px-2 py-0.5 rounded-full'>
                      {book.genre}
                    </span>
                  )}
                  <div className='flex justify-between items-center mt-3'>
                    <span className='font-bold text-gray-800'>
                      ${parseFloat(book.price || 0).toFixed(2)}
                    </span>
                    {book.stock > 0 ? (
                      <span className='text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full'>
                        {book.stock} in stock
                      </span>
                    ) : (
                      <span className='text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded-full'>
                        Out of stock
                      </span>
                    )}
                  </div>
                  <div className='flex justify-end gap-3 mt-3 pt-3 border-t border-gray-100'>
                    <Link to={`/books/details/${book.id || book._id}`}>
                      <BsInfoCircle className='text-xl text-green-700 hover:text-black' />
                    </Link>
                    {isAdmin && (
                      <>
                        <Link to={`/books/edit/${book.id || book._id}`}>
                          <AiOutlineEdit className='text-xl text-yellow-600 hover:text-black' />
                        </Link>
                        <Link to={`/books/delete/${book.id || book._id}`}>
                          <MdOutlineDelete className='text-xl text-red-600 hover:text-black' />
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
