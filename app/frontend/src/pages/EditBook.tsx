import axios from 'axios';
import { useSnackbar } from 'notistack';
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import BackButton from '../components/BackButton';
import Spinner from '../components/Spinner';
import CoverUpload from '../components/shared/CoverUpload';
import BookFormFields from '../components/shared/BookFormFields';
import { useBookForm } from '../hooks/useBookForm';
import type { Book } from '../types/book';

const EditBook: React.FC = () => {
  const { form, set, populateFromBook, toApiPayload, handleCoverChange, coverFileRef } = useBookForm();
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const response = await axios.get<{ data: Book }>(`/books/${id}`);
        populateFromBook(response.data.data);
      } catch (error) {
        enqueueSnackbar('Failed to load book data', { variant: 'error' });
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const handleEditBook = async () => {
    setLoading(true);
    try {
      await axios.put(`/books/${id}`, toApiPayload());
      enqueueSnackbar('Book updated successfully', { variant: 'success' });
      navigate('/home');
    } catch (error) {
      enqueueSnackbar('Error updating book', { variant: 'error' });
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='min-h-screen' style={{ backgroundColor: 'var(--oai-bg)' }}>
      <div className='max-w-2xl mx-auto px-6 py-8'>
        <BackButton />
        <h1 className='text-2xl font-semibold mt-6 mb-6' style={{ color: 'var(--oai-text)' }}>Edit Book</h1>
        {loading && <Spinner />}

        <div className='rounded-xl p-6' style={{ backgroundColor: 'var(--oai-surface)', border: '1px solid var(--oai-border)' }}>
          <CoverUpload coverThumb={form.coverThumb} fileRef={coverFileRef} onFileChange={handleCoverChange} onRemove={() => set('coverThumb', null)} />
          <BookFormFields form={form} set={set} />

          <div className='flex gap-3 mt-6'>
            <button onClick={handleEditBook} disabled={loading} className='btn-primary'>Save Changes</button>
            <BackButton destination='/home' />
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditBook;
