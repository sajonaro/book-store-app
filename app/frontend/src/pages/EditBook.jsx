import axios from 'axios';
import { useSnackbar } from 'notistack';
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import BackButton from '../components/BackButton';
import Spinner from '../components/Spinner';

const Field = ({ label, required, children }) => (
  <div>
    <label className='block text-sm font-medium text-gray-700 mb-1'>
      {label} {required && <span className='text-red-500'>*</span>}
    </label>
    {children}
  </div>
);

const inputCls =
  'w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-sky-400';

const EditBook = () => {
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [isbn, setIsbn] = useState('');
  const [publisher, setPublisher] = useState('');
  const [publishYear, setPublishYear] = useState('');
  const [genre, setGenre] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { id } = useParams();
  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const response = await axios.get(`/books/${id}`);
        const d = response.data.data;
        setTitle(d.title || '');
        setAuthor(d.author || '');
        setIsbn(d.isbn || '');
        setPublisher(d.publisher || '');
        setPublishYear(d.publish_year != null ? String(d.publish_year) : '');
        setGenre(d.genre || '');
        setDescription(d.description || '');
        setPrice(d.price != null ? String(d.price) : '');
        setStock(d.stock != null ? String(d.stock) : '');
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
    const data = {
      title,
      author,
      isbn: isbn || undefined,
      publisher: publisher || undefined,
      publish_year: publishYear ? Number(publishYear) : undefined,
      genre: genre || undefined,
      description: description || undefined,
      price: price !== '' ? Number(price) : 0,
      stock: stock !== '' ? Number(stock) : 0,
    };
    setLoading(true);
    try {
      await axios.put(`/books/${id}`, data);
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
    <div className='min-h-screen bg-gray-50 p-6'>
      <BackButton />
      <h1 className='text-3xl font-bold text-gray-900 my-6'>Edit Book</h1>

      {loading && <Spinner />}

      <div className='bg-white rounded-2xl shadow-sm border border-gray-200 p-6 max-w-2xl mx-auto'>
        <div className='grid grid-cols-1 sm:grid-cols-2 gap-5'>
          <Field label='Title' required>
            <input type='text' value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} />
          </Field>
          <Field label='Author' required>
            <input type='text' value={author} onChange={(e) => setAuthor(e.target.value)} className={inputCls} />
          </Field>
          <Field label='ISBN'>
            <input type='text' value={isbn} onChange={(e) => setIsbn(e.target.value)} className={inputCls} />
          </Field>
          <Field label='Publisher'>
            <input type='text' value={publisher} onChange={(e) => setPublisher(e.target.value)} className={inputCls} />
          </Field>
          <Field label='Publish Year'>
            <input type='number' value={publishYear} onChange={(e) => setPublishYear(e.target.value)} className={inputCls} />
          </Field>
          <Field label='Genre'>
            <input type='text' value={genre} onChange={(e) => setGenre(e.target.value)} className={inputCls} />
          </Field>
          <Field label='Price ($)'>
            <input type='number' min='0' step='0.01' value={price} onChange={(e) => setPrice(e.target.value)} className={inputCls} />
          </Field>
          <Field label='Stock'>
            <input type='number' min='0' step='1' value={stock} onChange={(e) => setStock(e.target.value)} className={inputCls} />
          </Field>
          <div className='sm:col-span-2'>
            <Field label='Description'>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className={inputCls} />
            </Field>
          </div>
        </div>

        <div className='flex gap-3 mt-6'>
          <button
            onClick={handleEditBook}
            disabled={loading}
            className='bg-sky-500 hover:bg-sky-600 text-white font-semibold px-6 py-2 rounded-lg transition disabled:opacity-50'
          >
            Save Changes
          </button>
          <BackButton destination='/home' />
        </div>
      </div>
    </div>
  );
};

export default EditBook;
