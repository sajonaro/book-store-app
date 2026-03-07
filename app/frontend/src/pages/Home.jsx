import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Spinner from '../components/Spinner';
import { Link, useNavigate } from 'react-router-dom';
import { MdOutlineAddBox } from 'react-icons/md';
import BooksCard from '../components/home/BooksCard';
import BooksTable from '../components/home/BooksTable';

const Home = () => {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showType, setShowType] = useState('table');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchBooks = async () => {
      setLoading(true);
      try {
        const response = await axios.get('/books');
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
    <div className='min-h-screen bg-gray-50 p-6'>
      {/* Top bar */}
      <div className='flex items-center justify-between mb-6'>
        <h1 className='text-3xl font-bold text-gray-900'>📚 Books Inventory</h1>
        <div className='flex items-center gap-3'>
          <Link
            to='/books/recognize'
            className='flex items-center gap-1 bg-sky-500 hover:bg-sky-600 text-white text-sm font-medium px-3 py-1.5 rounded-lg transition'
            title='Scan a book with AI'
          >
            📷 Scan Book
          </Link>
          <Link to='/books/create'>
            <MdOutlineAddBox className='text-sky-500 hover:text-sky-700 text-4xl transition' />
          </Link>
          <button
            onClick={handleSignOut}
            className='text-sm text-gray-500 hover:text-red-600 font-medium transition'
          >
            Sign out
          </button>
        </div>
      </div>

      {/* View toggle */}
      <div className='flex gap-2 mb-6'>
        <button
          onClick={() => setShowType('table')}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${
            showType === 'table'
              ? 'bg-sky-500 text-white'
              : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'
          }`}
        >
          Table
        </button>
        <button
          onClick={() => setShowType('card')}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${
            showType === 'card'
              ? 'bg-sky-500 text-white'
              : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'
          }`}
        >
          Cards
        </button>
      </div>

      {loading ? (
        <Spinner />
      ) : showType === 'table' ? (
        <BooksTable books={books} />
      ) : (
        <BooksCard books={books} />
      )}
    </div>
  );
};

export default Home;
