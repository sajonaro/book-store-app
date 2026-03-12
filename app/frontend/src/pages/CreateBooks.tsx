import axios from 'axios';
import { useSnackbar } from 'notistack';
import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import BackButton from '../components/BackButton';
import Spinner from '../components/Spinner';
import CoverUpload from '../components/shared/CoverUpload';
import BookFormFields from '../components/shared/BookFormFields';
import { useBookForm } from '../hooks/useBookForm';
import { getErrorMessage } from '../utils/formatters';

interface LocationState {
  prefill?: Record<string, unknown>;
  cover_thumbnail?: string;
}

const CreateBooks: React.FC = () => {
  const { form, set, populateFromMeta, toApiPayload, handleCoverChange, coverFileRef } = useBookForm();
  const [loading, setLoading] = useState(false);
  const [recognizing, setRecognizing] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => {
    const state = location.state as LocationState | null;
    if (!state?.prefill) return;
    populateFromMeta(state.prefill, state.cover_thumbnail);
    enqueueSnackbar('Scan results loaded — review the form and save.', { variant: 'success' });
    window.history.replaceState({}, '');
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

      if (res.data?.duplicate) {
        const book = res.data.existing_book;
        enqueueSnackbar(
          `"${book?.title ?? 'this book'}" already exists — stock incremented to ${book?.stock ?? '?'}.`,
          { variant: 'info' },
        );
        navigate('/home');
        return;
      }

      populateFromMeta(res.data?.data ?? {}, res.data?.cover_thumbnail);
      setSelectedFiles([]);
      enqueueSnackbar('Fields populated from scan — review and save.', { variant: 'success' });
    } catch (err) {
      enqueueSnackbar(getErrorMessage(err, 'Recognition failed — please fill in the fields manually.'), { variant: 'error' });
    } finally {
      setRecognizing(false);
    }
  };

  const handleSaveBook = async () => {
    setLoading(true);
    try {
      await axios.post('/books', toApiPayload());
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
        <h1 className='text-2xl font-semibold mt-6 mb-6' style={{ color: 'var(--oai-text)' }}>Create Book</h1>
        {(loading || recognizing) && <Spinner />}

        <div className='rounded-xl p-6' style={{ backgroundColor: 'var(--oai-surface)', border: '1px solid var(--oai-border)' }}>
          {/* Scan section */}
          <div className='rounded-lg p-4 mb-6' style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid var(--oai-border-2)' }}>
            <p className='text-xs font-medium mb-3' style={{ color: 'var(--oai-muted)' }}>📷 Auto-fill from photo (optional)</p>
            <div className='flex flex-col sm:flex-row gap-2'>
              <div className='flex-1'>
                <input ref={fileInputRef} type='file' accept='image/jpeg,image/png,image/webp' multiple onChange={(e) => setSelectedFiles(Array.from(e.target.files || []))} className='hidden' />
                <button type='button' onClick={() => fileInputRef.current?.click()} className='w-full text-xs px-3 py-2 rounded-lg transition-all' style={{ backgroundColor: 'transparent', border: '1px dashed var(--oai-border-2)', color: 'var(--oai-muted)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--oai-green)')}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--oai-border-2)')}>
                  {selectedFiles.length > 0 ? `${selectedFiles.length} file(s) selected` : 'Choose photo(s)…'}
                </button>
              </div>
              <button type='button' onClick={handleRecognize} disabled={recognizing || selectedFiles.length === 0} className='btn-secondary text-xs whitespace-nowrap'>
                {recognizing ? 'Scanning…' : '🤖 Extract Metadata'}
              </button>
            </div>
          </div>

          <CoverUpload coverThumb={form.coverThumb} fileRef={coverFileRef} onFileChange={handleCoverChange} onRemove={() => set('coverThumb', null)} />
          <BookFormFields form={form} set={set} />

          <div className='flex gap-3 mt-6'>
            <button onClick={handleSaveBook} disabled={loading} className='btn-primary'>Save Book</button>
            <BackButton destination='/home' />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateBooks;
