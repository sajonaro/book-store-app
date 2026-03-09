import axios from 'axios';
import { useSnackbar } from 'notistack';
import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import BackButton from '../components/BackButton';
import Spinner from '../components/Spinner';

const PLACEHOLDER =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="120" height="160" viewBox="0 0 120 160"><rect width="120" height="160" fill="%231c1c1c"/><text x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-size="40" fill="%23666680">📚</text></svg>';

const Field = ({ label, required, children }) => (
  <div>
    <label className='oai-label'>
      {label} {required && <span style={{ color: 'var(--oai-red)' }}>*</span>}
    </label>
    {children}
  </div>
);

// ── Main Page ────────────────────────────────────────────────────────────────
const CreateBooks = () => {
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
  const [coverThumb, setCoverThumb] = useState(null);
  const [loading, setLoading] = useState(false);
  const [recognizing, setRecognizing] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);

  const fileInputRef = useRef(null);
  const coverFileRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { enqueueSnackbar } = useSnackbar();

  // Pre-fill from navigation state (e.g. legacy RecognizePage flow)
  useEffect(() => {
    const prefill = location.state?.prefill;
    if (!prefill) return;
    if (prefill.title) setTitle(prefill.title);
    if (prefill.author) setAuthor(prefill.author);
    if (prefill.isbn) setIsbn(prefill.isbn);
    if (prefill.publisher) setPublisher(prefill.publisher);
    if (prefill.year) setPublishYear(String(prefill.year));
    if (prefill.genre) setGenre(prefill.genre);
    if (prefill.language) setLanguage(prefill.language);
    if (prefill.description) setDescription(prefill.description);
    if (location.state?.cover_thumbnail) setCoverThumb(location.state.cover_thumbnail);
    enqueueSnackbar('Scan results loaded — review the form and save.', { variant: 'success' });
    window.history.replaceState({}, '');
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFileChange = (e) => {
    setSelectedFiles(Array.from(e.target.files));
  };

  // Scan photos and populate form fields directly — no separate review panel.
  // If the book already exists in the catalogue (duplicate detection), the
  // backend increments its stock by 1 and returns { duplicate: true }.
  const handleRecognize = async () => {
    if (selectedFiles.length === 0) {
      enqueueSnackbar('Please select at least one book photo first', { variant: 'warning' });
      return;
    }
    setRecognizing(true);
    try {
      const formData = new FormData();
      selectedFiles.forEach((file) => formData.append('photos', file));
      const res = await axios.post('/books/recognize', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      // Duplicate detected — stock already incremented by the backend
      if (res.data?.duplicate) {
        const book = res.data.existing_book;
        const name = book?.title ?? 'this book';
        enqueueSnackbar(
          `"${name}" already exists — stock incremented to ${book?.stock ?? '?'}.`,
          { variant: 'info' }
        );
        navigate('/home');
        return;
      }

      const meta = res.data?.data ?? {};
      const thumb = res.data?.cover_thumbnail ?? null;

      // Populate fields directly — user edits in-place before saving
      if (meta.title) setTitle(meta.title);
      if (meta.author) setAuthor(meta.author);
      if (meta.isbn) setIsbn(meta.isbn);
      if (meta.publisher) setPublisher(meta.publisher);
      if (meta.year) setPublishYear(String(meta.year));
      if (meta.genre) setGenre(meta.genre);
      if (meta.language) setLanguage(meta.language);
      if (meta.description) setDescription(meta.description);
      if (thumb) setCoverThumb(thumb);

      setSelectedFiles([]);
      enqueueSnackbar('Fields populated from scan — review and save.', { variant: 'success' });
    } catch (err) {
      const msg = err.response?.data?.msg || 'Recognition failed — please fill in the fields manually.';
      enqueueSnackbar(msg, { variant: 'error' });
    } finally {
      setRecognizing(false);
    }
  };

  const handleCoverChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setCoverThumb(reader.result);
    reader.readAsDataURL(file);
  };

  const handleSaveBook = async () => {
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
      await axios.post('/books', data);
      enqueueSnackbar('Book created successfully', { variant: 'success' });
      navigate('/home');
    } catch (error) {
      enqueueSnackbar('Error creating book', { variant: 'error' });
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
          Create Book
        </h1>

        {(loading || recognizing) && <Spinner />}

        {/* ── Single unified pane ── */}
        <div
          className='rounded-xl p-6'
          style={{
            backgroundColor: 'var(--oai-surface)',
            border: '1px solid var(--oai-border)',
          }}
        >
          {/* ── Compact scan section at top of pane ── */}
          <div
            className='rounded-lg p-4 mb-6'
            style={{
              backgroundColor: 'rgba(255,255,255,0.03)',
              border: '1px solid var(--oai-border-2)',
            }}
          >
            <p className='text-xs font-medium mb-3' style={{ color: 'var(--oai-muted)' }}>
              📷 Auto-fill from photo (optional)
            </p>
            <div className='flex flex-col sm:flex-row gap-2'>
              <div className='flex-1'>
                <input
                  ref={fileInputRef}
                  type='file'
                  accept='image/jpeg,image/png,image/webp'
                  multiple
                  onChange={handleFileChange}
                  className='hidden'
                />
                <button
                  type='button'
                  onClick={() => fileInputRef.current?.click()}
                  className='w-full text-xs px-3 py-2 rounded-lg transition-all'
                  style={{
                    backgroundColor: 'transparent',
                    border: '1px dashed var(--oai-border-2)',
                    color: 'var(--oai-muted)',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--oai-green)')}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--oai-border-2)')}
                >
                  {selectedFiles.length > 0
                    ? `${selectedFiles.length} file(s) selected`
                    : 'Choose photo(s)…'}
                </button>
              </div>
              <button
                type='button'
                onClick={handleRecognize}
                disabled={recognizing || selectedFiles.length === 0}
                className='btn-secondary text-xs whitespace-nowrap'
              >
                {recognizing ? 'Scanning…' : '🤖 Extract Metadata'}
              </button>
            </div>
          </div>

          {/* ── Cover thumbnail ── */}
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
                onClick={() => coverFileRef.current?.click()}
                className='btn-secondary text-xs px-3 py-1.5'
              >
                {coverThumb ? 'Change Image' : 'Upload Image'}
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
                ref={coverFileRef}
                type='file'
                accept='image/*'
                className='hidden'
                onChange={handleCoverChange}
              />
            </div>
          </div>

          {/* ── Form fields ── */}
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
              onClick={handleSaveBook}
              disabled={loading}
              className='btn-primary'
            >
              Save Book
            </button>
            <BackButton destination='/home' />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateBooks;
