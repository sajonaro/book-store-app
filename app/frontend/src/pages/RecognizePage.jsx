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
  openlibrary: { label: 'OpenLibrary',   cls: 'badge-green' },
  gpt4o:       { label: 'GPT-4o Vision', cls: 'badge-blue' },
  merged:      { label: 'Merged',        cls: 'badge-purple' },
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
        className='cursor-pointer rounded-xl p-10 text-center transition-all'
        style={{
          border: `2px dashed ${dragging ? 'var(--oai-green)' : 'var(--oai-border-2)'}`,
          backgroundColor: dragging ? 'rgba(16,163,127,0.05)' : 'transparent',
        }}
        onMouseEnter={(e) => {
          if (!dragging) e.currentTarget.style.borderColor = 'var(--oai-muted)';
        }}
        onMouseLeave={(e) => {
          if (!dragging) e.currentTarget.style.borderColor = 'var(--oai-border-2)';
        }}
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
        <p className='text-sm font-medium' style={{ color: 'var(--oai-text)' }}>
          Drag & drop book photos here, or click to browse
        </p>
        <p className='text-xs mt-1' style={{ color: 'var(--oai-subtle)' }}>
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
              className='h-28 w-28 object-cover rounded-lg'
              style={{ border: '1px solid var(--oai-border)' }}
            />
          ))}
          <button
            type='button'
            onClick={(e) => { e.stopPropagation(); onChange([]); }}
            className='h-28 w-28 flex items-center justify-center rounded-lg text-xs transition-colors'
            style={{
              border: '1px dashed var(--oai-border-2)',
              color: 'var(--oai-subtle)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--oai-red)';
              e.currentTarget.style.color = 'var(--oai-red)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--oai-border-2)';
              e.currentTarget.style.color = 'var(--oai-subtle)';
            }}
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
  const badge = SOURCE_BADGE[source] ?? { label: source ?? 'AI', cls: 'badge-gray' };

  const filledCount = FIELDS.filter(({ key }) => {
    const v = edited[key];
    return v !== null && v !== undefined && v !== '';
  }).length;

  return (
    <div
      className='rounded-xl p-6 mt-6 animate-fade-in'
      style={{
        backgroundColor: 'var(--oai-surface)',
        border: '1px solid var(--oai-border-2)',
      }}
    >
      {/* Header */}
      <div className='flex items-center justify-between mb-1'>
        <h2 className='text-base font-semibold' style={{ color: 'var(--oai-text)' }}>
          🔍 Review Scan Results
        </h2>
        <span className={badge.cls}>{badge.label}</span>
      </div>
      <p className='text-sm mb-4' style={{ color: 'var(--oai-muted)' }}>
        {filledCount}/{FIELDS.length} fields detected &mdash; edit any value before accepting.
      </p>

      {/* Cover thumbnail from AI */}
      {coverThumb && (
        <div
          className='flex items-start gap-4 mb-5 p-3 rounded-lg'
          style={{ backgroundColor: 'var(--oai-surface-2)' }}
        >
          <div className='flex-shrink-0'>
            <p className='text-xs font-medium mb-1' style={{ color: 'var(--oai-muted)' }}>
              Detected Cover
            </p>
            <img
              src={coverThumb}
              alt='Scanned book cover'
              className='w-20 h-28 object-cover rounded-lg'
              style={{ border: '1px solid var(--oai-border)' }}
            />
          </div>
          <p className='text-sm mt-5 leading-relaxed' style={{ color: 'var(--oai-muted)' }}>
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
                className='mt-[9px] w-5 h-5 flex-shrink-0 rounded-full flex items-center justify-center text-xs font-bold'
                style={{
                  backgroundColor: empty ? 'rgba(239,68,68,0.15)' : 'rgba(16,163,127,0.15)',
                  color: empty ? 'var(--oai-red)' : 'var(--oai-green)',
                }}
              >
                {empty ? '✗' : '✓'}
              </span>
              <div className='flex-1'>
                <label className='oai-label'>{label}</label>
                {multiline ? (
                  <textarea
                    rows={2}
                    value={val ?? ''}
                    placeholder={`No ${label.toLowerCase()} detected`}
                    onChange={(e) => setEdited((p) => ({ ...p, [key]: e.target.value }))}
                    className='oai-input text-sm'
                    style={{ resize: 'vertical' }}
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
                    className='oai-input text-sm'
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
          className='btn-primary flex-1'
        >
          ✓ Accept & Create Book
        </button>
        <button
          onClick={onReject}
          className='btn-danger flex-1'
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
    <div className='min-h-screen' style={{ backgroundColor: 'var(--oai-bg)' }}>
      <div className='max-w-2xl mx-auto px-6 py-8'>
        <BackButton />
        <h1 className='text-2xl font-semibold mt-6 mb-2' style={{ color: 'var(--oai-text)' }}>
          📷 Scan a Book
        </h1>
        <p className='text-sm mb-6' style={{ color: 'var(--oai-muted)' }}>
          Upload one or more photos of the same book. AI will extract the metadata and let you
          review it before creating the book record.
        </p>

        {scanning && <Spinner />}

        {/* Upload zone */}
        <div
          className='rounded-xl p-6'
          style={{
            backgroundColor: 'var(--oai-surface)',
            border: '1px solid var(--oai-border)',
          }}
        >
          <DropZone files={files} onChange={setFiles} />

          <div className='flex gap-3 mt-5'>
            <button
              onClick={handleScan}
              disabled={scanning || files.length === 0}
              className='btn-primary flex-1'
            >
              {scanning
                ? 'Scanning…'
                : `🤖 Scan${files.length > 0 ? ` (${files.length} photo${files.length > 1 ? 's' : ''})` : ''}`}
            </button>
            <button
              onClick={() => navigate('/books/create')}
              className='btn-secondary'
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
