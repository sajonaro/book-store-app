import axios from 'axios';
import { useSnackbar } from 'notistack';
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import BackButton from '../components/BackButton';
import Spinner from '../components/Spinner';

const PLACEHOLDER =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="120" height="160" viewBox="0 0 120 160"><rect width="120" height="160" fill="%23e2e8f0"/><text x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-size="40" fill="%2394a3b8">📚</text></svg>';

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
  const [language, setLanguage] = useState('');
  const [shelfName, setShelfName] = useState('');
  const [shelfNumber, setShelfNumber] = useState('');
  const [coverThumb, setCoverThumb] = useState(null); // null = keep existing
  const [loading, setLoading] = useState(false);
  const fileRef = useRef(null);
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
        setLanguage(d.language || '');
        setShelfName(d.shelf_name || '');
        setShelfNumber(d.shelf_number || '');
        if (d.cover_thumbnail) setCoverThumb(d.cover_thumbnail);
      } catch (error) {
        enqueueSnackbar('Failed to load book data', { variant: 'error' });
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const handleCoverChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setCoverThumb(reader.result);
    reader.readAsDataURL(file);
  };

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
      language: language || undefined,
      shelf_name: shelfName || undefined,
      shelf_number: shelfNumber || undefined,
      cover_thumbnail: coverThumb || undefined,
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
        {/* Cover thumbnail preview */}
        <div className='flex items-start gap-4 mb-6'>
          <img
            src={coverThumb || PLACEHOLDER}
            alt='Book cover'
            className='w-24 h-32 object-cover rounded-lg border border-gray-200 flex-shrink-0'
            onError={(e) => { e.currentTarget.src = PLACEHOLDER; }}
          />
          <div className='flex flex-col gap-2 justify-end h-32'>
            <p className='text-sm text-gray-500'>Book Cover</p>
            <button
              type='button'
              onClick={() => fileRef.current?.click()}
              className='text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg transition'
            >
              Change Image
            </button>
            {coverThumb && (
              <button
                type='button'
                onClick={() => setCoverThumb(null)}
                className='text-xs text-red-400 hover:text-red-600 transition'
              >
                Remove
              </button>
            )}
            <input
              ref={fileRef}
              type='file'
              accept='image/*'
              className='hidden'
              onChange={handleCoverChange}
            />
          </div>
        </div>

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
          <Field label='Language'>
            <input type='text' placeholder='e.g. English, Spanish' value={language} onChange={(e) => setLanguage(e.target.value)} className={inputCls} />
          </Field>
          <Field label='Price ($)'>
            <input type='number' min='0' step='0.01' value={price} onChange={(e) => setPrice(e.target.value)} className={inputCls} />
          </Field>
          <Field label='Stock'>
            <input type='number' min='0' step='1' value={stock} onChange={(e) => setStock(e.target.value)} className={inputCls} />
          </Field>
          {/* Location */}
          <Field label='Shelf Name'>
            <input type='text' placeholder='e.g. Fiction A' value={shelfName} onChange={(e) => setShelfName(e.target.value)} className={inputCls} />
          </Field>
          <Field label='Shelf Number'>
            <input type='text' placeholder='e.g. 3' value={shelfNumber} onChange={(e) => setShelfNumber(e.target.value)} className={inputCls} />
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
