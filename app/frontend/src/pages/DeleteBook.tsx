import axios from 'axios';
import { useSnackbar } from 'notistack';
import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import BackButton from '../components/BackButton';
import Spinner from '../components/Spinner';

const DeleteBook: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
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
    <div className='min-h-screen' style={{ backgroundColor: 'var(--oai-bg)' }}>
      <div className='max-w-md mx-auto px-6 py-8'>
        <BackButton />
        <h1 className='text-2xl font-semibold mt-6 mb-6' style={{ color: 'var(--oai-text)' }}>
          Delete Book
        </h1>

        {loading && <Spinner />}

        <div
          className='rounded-xl p-8 text-center animate-fade-in'
          style={{
            backgroundColor: 'var(--oai-surface)',
            border: '1px solid var(--oai-border)',
          }}
        >
          <div className='text-5xl mb-4'>🗑️</div>
          <h3 className='text-lg font-semibold mb-2' style={{ color: 'var(--oai-text)' }}>
            Are you sure you want to delete this book?
          </h3>
          <p className='text-sm mb-8' style={{ color: 'var(--oai-muted)' }}>
            This action cannot be undone.
          </p>
          <div className='flex gap-3 justify-center'>
            <button
              onClick={handleDeleteBook}
              disabled={loading}
              className='btn-danger px-6 py-2'
            >
              Yes, Delete
            </button>
            <BackButton destination='/home' />
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeleteBook;
