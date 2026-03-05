import axios from 'axios';
import { useSnackbar } from 'notistack';
import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import BackButton from '../components/BackButton';
import Spinner from '../components/Spinner';

const DeleteBook = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { id } = useParams();
  const { enqueueSnackbar } = useSnackbar();

  const handleDeleteBook = async () => {
    setLoading(true);
    try {
      await axios.delete(`/books/${id}`);
      enqueueSnackbar('Book deleted successfully', { variant: 'success' });
      navigate('/home');
    } catch (error) {
      enqueueSnackbar('Error deleting book', { variant: 'error' });
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='min-h-screen bg-gray-50 p-6'>
      <BackButton />
      <h1 className='text-3xl font-bold text-gray-900 my-6'>Delete Book</h1>

      {loading && <Spinner />}

      <div className='bg-white rounded-2xl shadow-sm border border-gray-200 p-8 max-w-md mx-auto text-center'>
        <div className='text-5xl mb-4'>🗑️</div>
        <h3 className='text-xl font-semibold text-gray-900 mb-2'>
          Are you sure you want to delete this book?
        </h3>
        <p className='text-gray-500 text-sm mb-8'>
          This action cannot be undone.
        </p>
        <div className='flex gap-3 justify-center'>
          <button
            onClick={handleDeleteBook}
            disabled={loading}
            className='bg-red-500 hover:bg-red-600 text-white font-semibold px-6 py-2 rounded-lg transition disabled:opacity-50'
          >
            Yes, Delete
          </button>
          <BackButton destination='/home' />
        </div>
      </div>
    </div>
  );
};

export default DeleteBook;
