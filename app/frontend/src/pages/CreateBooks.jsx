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

// ── Scan Result Review Panel ─────────────────────────────────────────────────
const ScanReviewPanel = ({ scanResult, scanThumb, source, onAccept, onReject }) => {
  const [edited, setEdited] = useState({ ...scanResult });

  const FIELDS = [
    { key: 'title', label: 'Title' },
    { key: 'author', label: 'Author' },
    { key: 'isbn', label: 'ISBN' },
    { key: 'publisher', label: 'Publisher' },
    { key: 'year', label: 'Year', type: 'number' },
    { key: 'genre', label: 'Genre' },
    { key: 'language', label: 'Language' },
    { key: 'description', label: 'Description', multiline: true },
  ];

  const sourceBadge = {
    openlibrary: { label: 'OpenLibrary', cls: 'badge-green' },
    gpt4o: { label: 'GPT-4o Vision', cls: 'badge-blue' },
    merged: { label: 'Merged', cls: 'badge-purple' },
  }[source] ?? { label: source ?? 'AI', cls: 'badge-gray' };

  return (
    <div
      className='rounded-xl p-6 max-w-2xl mx-auto mb-6'
      style={{
        backgroundColor: 'var(--oai-surface)',
        border: '1px solid var(--oai-border-2)',
      }}
    >
      {/* Header */}
      <div className='flex items-center justify-between mb-4'>
        <h2 className='text-base font-semibold' style={{ color: 'var(--oai-text)' }}>
          🔍 Review Scan Results
        </h2>
        <span className={sourceBadge.cls}>{sourceBadge.label}</span>
      </div>

      {/* Cover thumbnail preview */}
      {scanThumb && (
        <div className='flex items-start gap-4 mb-4'>
          <div className='flex-shrink-0'>
            <p className='text-xs mb-1' style={{ color: 'var(--oai-muted)' }}>Detected Cover</p>
            <img
              src={scanThumb}
              alt='Scanned book cover'
              className='w-20 h-28 object-cover rounded-lg'
              style={{ border: '1px solid var(--oai-border)' }}
            />
          </div>
          <p className='text-sm mt-6' style={{ color: 'var(--oai-muted)' }}>
            This thumbnail was captured from the first photo you uploaded. It will be stored as the
            book cover if you accept the scan results.
          </p>
        </div>
      )}

      <p className='text-sm mb-4' style={{ color: 'var(--oai-muted)' }}>
        Review and edit the extracted fields below. Click{' '}
        <strong style={{ color: 'var(--oai-green)' }}>Accept</strong> to populate the form,
        or <strong style={{ color: 'var(--oai-red)' }}>Reject</strong> to discard and start fresh.
      </p>

      {/* Fields */}
      <div className='space-y-3'>
        {FIELDS.map(({ key, label, type, multiline }) => {
          const val = edited[key];
          const isEmpty = val === null || val === undefined || val === '';

          return (
            <div key={key} className='flex items-start gap-3'>
              <span
                className='mt-2 w-5 h-5 flex-shrink-0 rounded-full flex items-center justify-center text-xs font-bold'
                style={{
                  backgroundColor: isEmpty ? 'rgba(239,68,68,0.15)' : 'rgba(16,163,127,0.15)',
                  color: isEmpty ? 'var(--oai-red)' : 'var(--oai-green)',
                }}
              >
                {isEmpty ? '✗' : '✓'}
              </span>
              <div className='flex-1'>
                <label className='oai-label'>{label}</label>
                {multiline ? (
                  <textarea
                    rows={2}
                    value={val ?? ''}
                    onChange={(e) => setEdited((prev) => ({ ...prev, [key]: e.target.value }))}
                    className='oai-input text-sm'
                    style={{ resize: 'vertical' }}
                    placeholder={`No ${label.toLowerCase()} detected`}
                  />
                ) : (
                  <input
                    type={type ?? 'text'}
                    value={val ?? ''}
                    onChange={(e) =>
                      setEdited((prev) => ({
                        ...prev,
                        [key]:
                          type === 'number'
                            ? e.target.value === ''
                              ? null
                              : Number(e.target.value)
                            : e.target.value,
                      }))
                    }
                    className='oai-input text-sm'
                    placeholder={`No ${label.toLowerCase()} detected`}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Actions */}
      <div className='flex gap-3 mt-5'>
        <button
          onClick={() => onAccept(edited, scanThumb)}
          className='btn-primary flex-1'
        >
          ✓ Accept & Fill Form
        </button>
        <button
          onClick={onReject}
          className='btn-danger flex-1'
        >
          ✗ Reject
        </button>
      </div>
    </div>
  );
};

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

  const [scanResult, setScanResult] = useState(null);
  const [scanSource, setScanSource] = useState(null);
  const [scanThumb, setScanThumb] = useState(null);

  const fileInputRef = useRef(null);
  const coverFileRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { enqueueSnackbar } = useSnackbar();

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

  const handleRecognize = async () => {
    if (selectedFiles.length === 0) {
      enqueueSnackbar('Please select at least one book photo first', { variant: 'warning' });
      return;
    }
    setRecognizing(true);
    setScanResult(null);
    setScanSource(null);
    setScanThumb(null);
    try {
      const formData = new FormData();
      selectedFiles.forEach((file) => formData.append('photos', file));
      const res = await axios.post('/books/recognize', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const meta = res.data?.data ?? {};
      const src = res.data?.source ?? null;
      const thumb = res.data?.cover_thumbnail ?? null;
      setScanResult(meta);
      setScanSource(src);
      setScanThumb(thumb);
      enqueueSnackbar('Scan complete! Review the results below before accepting.', { variant: 'info' });
    } catch (err) {
      const msg = err.response?.data?.msg || 'Recognition failed — please fill in the fields manually.';
      enqueueSnackbar(msg, { variant: 'error' });
    } finally {
      setRecognizing(false);
    }
  };

  const handleAcceptScan = (edited, thumb) => {
    if (edited.title) setTitle(edited.title);
    if (edited.author) setAuthor(edited.author);
    if (edited.isbn) setIsbn(edited.isbn);
    if (edited.publisher) setPublisher(edited.publisher);
    if (edited.year) setPublishYear(String(edited.year));
    if (edited.genre) setGenre(edited.genre);
    if (edited.language) setLanguage(edited.language);
    if (edited.description) setDescription(edited.description);
    if (thumb) setCoverThumb(thumb);
    setScanResult(null);
    setScanSource(null);
    setScanThumb(null);
    enqueueSnackbar('Scan results accepted — review the form and save.', { variant: 'success' });
  };

  const handleRejectScan = () => {
    setScanResult(null);
    setScanSource(null);
    setScanThumb(null);
    enqueueSnackbar('Scan results discarded.', { variant: 'default' });
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

        {/* ── AI Photo Recognition Card ── */}
        <div
          className='rounded-xl p-6 mb-6'
          style={{
            backgroundColor: 'var(--oai-surface)',
            border: '1px solid var(--oai-border)',
          }}
        >
          <h2 className='text-base font-semibold mb-2' style={{ color: 'var(--oai-text)' }}>
            📷 Auto-fill from Photo
          </h2>
          <p className='text-sm mb-4' style={{ color: 'var(--oai-muted)' }}>
            Upload one or more photos of the book and AI will extract the metadata.
          </p>
          <div className='flex flex-col sm:flex-row gap-3'>
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
                className='w-full text-sm px-4 py-2 rounded-lg transition-all'
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
              className='btn-secondary whitespace-nowrap'
            >
              {recognizing ? 'Recognizing…' : '🤖 Extract Metadata'}
            </button>
          </div>
        </div>

        {/* ── Scan Review Panel ── */}
        {scanResult && (
          <ScanReviewPanel
            scanResult={scanResult}
            scanThumb={scanThumb}
            source={scanSource}
            onAccept={handleAcceptScan}
            onReject={handleRejectScan}
          />
        )}

        {/* ── Manual / Reviewed Fields ── */}
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
              disabled={loading || !!scanResult}
              title={scanResult ? 'Accept or reject the scan results first' : ''}
              className='btn-primary'
            >
              {scanResult ? '⚠ Review scan first' : 'Save Book'}
            </button>
            <BackButton destination='/home' />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateBooks;
