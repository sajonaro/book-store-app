/**
 * RecognizePage — dedicated screen for AI-powered book photo scanning.
 *
 * Flow:
 *  1. User drops / selects 1+ photos of a single book
 *  2. Clicks "Scan"
 *  3. Results appear in a review panel (✓/✗ per field, editable inline)
 *     with a cover thumbnail preview from the AI response
 *  4. "Accept & Create Book" → navigate to /books/create with pre-filled data
 *     "Reject"              → clear results, start over
 *     "Enter manually"      → navigate to /books/create with no data
 */

import axios from 'axios';
import { useSnackbar } from 'notistack';
import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BackButton from '../components/BackButton';
import Spinner from '../components/Spinner';

const inputCls =
  'w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-sky-400 text-sm';

const FIELDS = [
  { key: 'title',       label: 'Title' },
  { key: 'author',      label: 'Author' },
  { key: 'isbn',        label: 'ISBN' },
  { key: 'publisher',   label: 'Publisher' },
  { key: 'year',        label: 'Year', type: 'number' },
  { key: 'genre',       label: 'Genre' },
  { key: 'language',    label: 'Language' },
  { key: 'description', label: 'Description', multiline: true },
];

const SOURCE_BADGE = {
  openlibrary: { label: 'OpenLibrary',   cls: 'bg-green-100 text-green-700' },
  gpt4o:       { label: 'GPT-4o Vision', cls: 'bg-sky-100 text-sky-700' },
  merged:      { label: 'Merged',        cls: 'bg-purple-100 text-purple-700' },
};

// ── Drop-zone ─────────────────────────────────────────────────────────────────
const DropZone = ({ files, onChange }) => {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const dropped = Array.from(e.dataTransfer.files).filter((f) =>
      f.type.startsWith('image/')
    );
    if (dropped.length) onChange(dropped);
  };

  const previews = files.map((f) => URL.createObjectURL(f));

  return (
    <div className='space-y-4'>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`cursor-pointer rounded-2xl border-2 border-dashed p-10 text-center transition
          ${dragging ? 'border-sky-400 bg-sky-50' : 'border-gray-300 hover:border-sky-400 hover:bg-gray-50'}`}
      >
        <input
          ref={inputRef}
          type='file'
          accept='image/jpeg,image/png,image/webp'
          multiple
          className='hidden'
          onChange={(e) => onChange(Array.from(e.target.files))}
        />
        <p className='text-4xl mb-3'>📷</p>
        <p className='text-gray-600 font-medium'>
          Drag & drop book photos here, or click to browse
        </p>
        <p className='text-sm text-gray-400 mt-1'>
          Upload multiple photos of the same book — cover, spine, title page, back cover
        </p>
      </div>

      {/* Preview thumbnails */}
      {previews.length > 0 && (
        <div className='flex flex-wrap gap-3'>
          {previews.map((src, i) => (
            <img
              key={i}
              src={src}
              alt={`preview ${i + 1}`}
              className='h-28 w-28 object-cover rounded-xl border border-gray-200 shadow-sm'
            />
          ))}
          <button
            type='button'
            onClick={(e) => { e.stopPropagation(); onChange([]); }}
            className='h-28 w-28 flex items-center justify-center rounded-xl border border-dashed border-gray-300 text-gray-400 hover:border-red-400 hover:text-red-400 transition text-xs'
          >
            ✕ Clear
          </button>
        </div>
      )}
    </div>
  );
};

// ── Review Panel ──────────────────────────────────────────────────────────────
const ReviewPanel = ({ result, coverThumb, source, onAccept, onReject }) => {
  const [edited, setEdited] = useState({ ...result });
  const badge = SOURCE_BADGE[source] ?? { label: source ?? 'AI', cls: 'bg-gray-100 text-gray-600' };

  const filledCount = FIELDS.filter(({ key }) => {
    const v = edited[key];
    return v !== null && v !== undefined && v !== '';
  }).length;

  return (
    <div className='bg-white rounded-2xl shadow-sm border border-amber-300 p-6 mt-6'>
      {/* Header */}
      <div className='flex items-center justify-between mb-1'>
        <h2 className='text-lg font-semibold text-gray-800'>🔍 Review Scan Results</h2>
        <span className={`text-xs font-medium px-2 py-1 rounded-full ${badge.cls}`}>
          {badge.label}
        </span>
      </div>
      <p className='text-sm text-gray-400 mb-4'>
        {filledCount}/{FIELDS.length} fields detected &mdash; edit any value before accepting.
      </p>

      {/* Cover thumbnail from AI */}
      {coverThumb && (
        <div className='flex items-start gap-4 mb-5 p-3 bg-gray-50 rounded-xl'>
          <div className='flex-shrink-0'>
            <p className='text-xs text-gray-500 mb-1 font-medium'>Detected Cover</p>
            <img
              src={coverThumb}
              alt='Scanned book cover'
              className='w-20 h-28 object-cover rounded-lg border border-gray-200 shadow-sm'
            />
          </div>
          <p className='text-sm text-gray-500 mt-5 leading-relaxed'>
            This thumbnail was automatically captured from your first uploaded photo and will be
            stored as the book's cover image when you accept.
          </p>
        </div>
      )}

      {/* Fields */}
      <div className='space-y-3'>
        {FIELDS.map(({ key, label, type, multiline }) => {
          const val = edited[key];
          const empty = val === null || val === undefined || val === '';
          return (
            <div key={key} className='flex items-start gap-3'>
              <span
                className={`mt-[9px] w-5 h-5 flex-shrink-0 rounded-full flex items-center justify-center text-xs font-bold
                  ${empty ? 'bg-red-100 text-red-500' : 'bg-green-100 text-green-600'}`}
              >
                {empty ? '✗' : '✓'}
              </span>
              <div className='flex-1'>
                <label className='block text-xs font-medium text-gray-500 mb-0.5'>{label}</label>
                {multiline ? (
                  <textarea
                    rows={2}
                    value={val ?? ''}
                    placeholder={`No ${label.toLowerCase()} detected`}
                    onChange={(e) => setEdited((p) => ({ ...p, [key]: e.target.value }))}
                    className={inputCls}
                  />
                ) : (
                  <input
                    type={type ?? 'text'}
                    value={val ?? ''}
                    placeholder={`No ${label.toLowerCase()} detected`}
                    onChange={(e) =>
                      setEdited((p) => ({
                        ...p,
                        [key]:
                          type === 'number'
                            ? e.target.value === ''
                              ? null
                              : Number(e.target.value)
                            : e.target.value,
                      }))
                    }
                    className={inputCls}
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
          onClick={() => onAccept(edited, coverThumb)}
          className='flex-1 bg-green-500 hover:bg-green-600 text-white font-semibold px-5 py-2.5 rounded-lg transition'
        >
          ✓ Accept & Create Book
        </button>
        <button
          onClick={onReject}
          className='flex-1 bg-red-100 hover:bg-red-200 text-red-700 font-semibold px-5 py-2.5 rounded-lg transition'
        >
          ✗ Reject & Retry
        </button>
      </div>
    </div>
  );
};

// ── Page ──────────────────────────────────────────────────────────────────────
const RecognizePage = () => {
  const [files, setFiles] = useState([]);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [scanSource, setScanSource] = useState(null);
  const [scanCoverThumb, setScanCoverThumb] = useState(null);
  const { enqueueSnackbar } = useSnackbar();
  const navigate = useNavigate();

  const handleScan = async () => {
    if (!files.length) {
      enqueueSnackbar('Please select at least one photo first', { variant: 'warning' });
      return;
    }
    setScanning(true);
    setScanResult(null);
    setScanSource(null);
    setScanCoverThumb(null);
    try {
      const form = new FormData();
      files.forEach((f) => form.append('photos', f));
      const res = await axios.post('/books/recognize', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setScanResult(res.data?.data ?? {});
      setScanSource(res.data?.source ?? null);
      setScanCoverThumb(res.data?.cover_thumbnail ?? null);
      enqueueSnackbar('Scan complete — review and accept or reject the results.', {
        variant: 'info',
      });
    } catch (err) {
      const msg = err.response?.data?.msg ?? 'Recognition failed.';
      enqueueSnackbar(msg, { variant: 'error' });
    } finally {
      setScanning(false);
    }
  };

  const handleAccept = (edited, coverThumb) => {
    // Pass the pre-filled data AND cover thumbnail to CreateBooks via router state
    navigate('/books/create', {
      state: { prefill: edited, cover_thumbnail: coverThumb },
    });
  };

  const handleReject = () => {
    setScanResult(null);
    setScanSource(null);
    setScanCoverThumb(null);
    setFiles([]);
    enqueueSnackbar('Results discarded — upload new photos and try again.', {
      variant: 'default',
    });
  };

  return (
    <div className='min-h-screen bg-gray-50 p-6'>
      <BackButton />
      <div className='max-w-2xl mx-auto'>
        <h1 className='text-3xl font-bold text-gray-900 my-6'>📷 Scan a Book</h1>
        <p className='text-gray-500 mb-6'>
          Upload one or more photos of the same book (cover, spine, back cover, title page). The AI
          will extract the metadata and let you review it before creating the book record.
        </p>

        {scanning && <Spinner />}

        {/* Upload zone */}
        <div className='bg-white rounded-2xl shadow-sm border border-gray-200 p-6'>
          <DropZone files={files} onChange={setFiles} />

          <div className='flex gap-3 mt-5'>
            <button
              onClick={handleScan}
              disabled={scanning || files.length === 0}
              className='flex-1 bg-sky-500 hover:bg-sky-600 text-white font-semibold px-6 py-2.5 rounded-lg transition disabled:opacity-50'
            >
              {scanning ? 'Scanning…' : `🤖 Scan ${files.length > 0 ? `(${files.length} photo${files.length > 1 ? 's' : ''})` : ''}`}
            </button>
            <button
              onClick={() => navigate('/books/create')}
              className='px-6 py-2.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition text-sm font-medium'
            >
              Enter manually
            </button>
          </div>
        </div>

        {/* Review panel */}
        {scanResult && (
          <ReviewPanel
            result={scanResult}
            coverThumb={scanCoverThumb}
            source={scanSource}
            onAccept={handleAccept}
            onReject={handleReject}
          />
        )}
      </div>
    </div>
  );
};

export default RecognizePage;
