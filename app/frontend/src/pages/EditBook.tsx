import axios from 'axios';
import { useSnackbar } from 'notistack';
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import BackButton from '../components/BackButton';
import Spinner from '../components/Spinner';
import type { Book } from '../types/book';

const PLACEHOLDER =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="120" height="160" viewBox="0 0 120 160"><rect width="120" height="160" fill="%231c1c1c"/><text x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-size="40" fill="%23666680">📚</text></svg>';

interface FieldProps {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}

const Field: React.FC<FieldProps> = ({ label, required, children }) => (
  <div>
    <label className='oai-label'>
      {label} {required && <span style={{ color: 'var(--oai-red)' }}>*</span>}
    </label>
    {children}
  </div>
);

const EditBook: React.FC = () => {
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
  const [coverThumb, setCoverThumb] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const response = await axios.get<{ data: Book }>(`/books/${id}`);
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

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setCoverThumb(reader.result as string);
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
    <div className='min-h-screen' style={{ backgroundColor: 'var(--oai-bg)' }}>
      <div className='max-w-2xl mx-auto px-6 py-8'>
        <BackButton />
        <h1 className='text-2xl font-semibold mt-6 mb-6' style={{ color: 'var(--oai-text)' }}>
          Edit Book
        </h1>

        {loading && <Spinner />}

        <div
          className='rounded-xl p-6'
          style={{
            backgroundColor: 'var(--oai-surface)',
            border: '1px solid var(--oai-border)',
          }}
        >
          {/* Cover thumbnail preview */}
          <div className='flex items-start gap-4 mb-6'>
            <img
              src={coverThumb || PLACEHOLDER}
              alt='Book cover'
              className='w-24 h-32 object-cover rounded-lg flex-shrink-0'
              style={{ border: '1px solid var(--oai-border)' }}
              onError={(e) => { e.currentTarget.src = PLACEHOLDER; }}
            />
            <div className='flex flex-col gap-2 justify-end h-32'>
              <p className='text-xs' style={{ color: 'var(--oai-muted)' }}>Book Cover</p>
              <button
                type='button'
                onClick={() => fileRef.current?.click()}
                className='btn-secondary text-xs px-3 py-1.5'
              >
                Change Image
              </button>
              {coverThumb && (
                <button
                  type='button'
                  onClick={() => setCoverThumb(null)}
                  className='text-xs transition-colors'
                  style={{ color: 'var(--oai-subtle)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--oai-red)')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--oai-subtle)')}
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
              <input type='text' value={title} onChange={(e) => setTitle(e.target.value)} className='oai-input' />
            </Field>
            <Field label='Author' required>
              <input type='text' value={author} onChange={(e) => setAuthor(e.target.value)} className='oai-input' />
            </Field>
            <Field label='ISBN'>
              <input type='text' value={isbn} onChange={(e) => setIsbn(e.target.value)} className='oai-input' />
            </Field>
            <Field label='Publisher'>
              <input type='text' value={publisher} onChange={(e) => setPublisher(e.target.value)} className='oai-input' />
            </Field>
            <Field label='Publish Year'>
              <input type='number' value={publishYear} onChange={(e) => setPublishYear(e.target.value)} className='oai-input' />
            </Field>
            <Field label='Genre'>
              <input type='text' value={genre} onChange={(e) => setGenre(e.target.value)} className='oai-input' />
            </Field>
            <Field label='Language'>
              <input type='text' placeholder='e.g. English, Spanish' value={language} onChange={(e) => setLanguage(e.target.value)} className='oai-input' />
            </Field>
            <Field label='Price ($)'>
              <input type='number' min='0' step='0.01' value={price} onChange={(e) => setPrice(e.target.value)} className='oai-input' />
            </Field>
            <Field label='Stock'>
              <input type='number' min='0' step='1' value={stock} onChange={(e) => setStock(e.target.value)} className='oai-input' />
            </Field>
            <Field label='Shelf Name'>
              <input type='text' placeholder='e.g. Fiction A' value={shelfName} onChange={(e) => setShelfName(e.target.value)} className='oai-input' />
            </Field>
            <Field label='Shelf Number'>
              <input type='text' placeholder='e.g. 3' value={shelfNumber} onChange={(e) => setShelfNumber(e.target.value)} className='oai-input' />
            </Field>
            <div className='sm:col-span-2'>
              <Field label='Description'>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className='oai-input'
                  style={{ resize: 'vertical' }}
                />
              </Field>
            </div>
          </div>

          <div className='flex gap-3 mt-6'>
            <button
              onClick={handleEditBook}
              disabled={loading}
              className='btn-primary'
            >
              Save Changes
            </button>
            <BackButton destination='/home' />
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditBook;
