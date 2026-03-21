import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import Spinner from '../components/Spinner';
import type { Book } from '../types/book';

const PLACEHOLDER =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="280" viewBox="0 0 200 280"><rect width="200" height="280" fill="%231c1c1c"/><text x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-size="60" fill="%23666680">📚</text></svg>';

interface InfoRowProps {
  label: string;
  value?: string | number | null;
}

const InfoRow: React.FC<InfoRowProps> = ({ label, value }) =>
  value != null && value !== '' ? (
    <div
      className='flex flex-col sm:flex-row sm:gap-4 py-3'
      style={{ borderBottom: '1px solid var(--oai-border)' }}
    >
      <span
        className='text-xs font-medium uppercase tracking-wider sm:w-36 flex-shrink-0'
        style={{ color: 'var(--oai-muted)' }}
      >
        {label}
      </span>
      <span className='text-sm mt-0.5 sm:mt-0' style={{ color: 'var(--oai-text)' }}>
        {value}
      </span>
    </div>
  ) : null;

/**
 * Public book detail page for buyer-facing store catalog.
 * Uses the unauthenticated /tenant/:slug/books/:id endpoint.
 */
const StoreBookDetailPage: React.FC = () => {
  const { slug, id } = useParams<{ slug: string; id: string }>();
  const [book, setBook] = useState<Partial<Book>>({});
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug || !id) return;
    const fetchData = async () => {
      setLoading(true);
      try {
        const response = await axios.get<{ data: Book }>(`/tenant/${slug}/books/${id}`);
        setBook(response.data.data);
      } catch (err: unknown) {
        const status = (err as { response?: { status?: number } }).response?.status;
        if (status === 404) setNotFound(true);
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [slug, id]);

  const thumb = book.cover_thumbnail || PLACEHOLDER;

  if (loading) {
    return (
      <div
        className='min-h-screen flex items-center justify-center'
        style={{ backgroundColor: 'var(--oai-bg)' }}
      >
        <Spinner />
      </div>
    );
  }

  if (notFound) {
    return (
      <div
        className='min-h-screen flex flex-col items-center justify-center'
        style={{ backgroundColor: 'var(--oai-bg)' }}
      >
        <div className='text-5xl mb-4'>🔍</div>
        <h1 className='text-2xl font-semibold mb-2' style={{ color: 'var(--oai-text)' }}>
          Book not found
        </h1>
        <Link to={`/store/${slug}`} style={{ color: 'var(--oai-green)' }}>
          ← Back to store
        </Link>
      </div>
    );
  }

  return (
    <div className='min-h-screen' style={{ backgroundColor: 'var(--oai-bg)' }}>
      <div className='max-w-3xl mx-auto px-6 py-8'>
        <Link
          to={`/store/${slug}`}
          className='text-sm font-medium'
          style={{ color: 'var(--oai-muted)' }}
        >
          ← Back to store
        </Link>

        <h1
          className='text-2xl font-semibold mt-6 mb-6'
          style={{ color: 'var(--oai-text)' }}
        >
          Book Details
        </h1>

        <div
          className='rounded-xl overflow-hidden animate-fade-in'
          style={{
            backgroundColor: 'var(--oai-surface)',
            border: '1px solid var(--oai-border)',
          }}
        >
          {/* Cover + header info */}
          <div className='flex gap-0'>
            <div
              className='w-36 flex-shrink-0'
              style={{ backgroundColor: 'var(--oai-surface-2)' }}
            >
              <img
                src={thumb}
                alt={`Cover of ${book.title}`}
                className='w-full h-full object-cover min-h-48'
                onError={(e) => {
                  e.currentTarget.src = PLACEHOLDER;
                }}
              />
            </div>
            <div className='p-6 flex-1 flex flex-col justify-between min-w-0'>
              <div>
                <h2
                  className='text-xl font-semibold truncate'
                  style={{ color: 'var(--oai-text)' }}
                >
                  {book.title}
                </h2>
                <p className='text-sm mt-1' style={{ color: 'var(--oai-muted)' }}>
                  {book.author}
                </p>
                <div className='flex flex-wrap gap-2 mt-3'>
                  {book.genre && <span className='badge-blue'>{book.genre}</span>}
                  {book.language && (
                    <span className='badge-purple'>🌐 {book.language}</span>
                  )}
                </div>
              </div>
              <div className='mt-4'>
                <p
                  className='text-2xl font-semibold'
                  style={{ color: 'var(--oai-green)' }}
                >
                  ${parseFloat(String(book.price || 0)).toFixed(2)}
                </p>
                <div className='mt-1'>
                  {(book.stock ?? 0) > 0 ? (
                    <span className='badge-green'>{book.stock} in stock</span>
                  ) : (
                    <span className='badge-red'>Out of stock</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Details */}
          <div className='px-6 pb-6'>
            {book.description && (
              <p
                className='text-sm leading-relaxed mt-5 mb-4'
                style={{ color: 'var(--oai-muted)' }}
              >
                {book.description}
              </p>
            )}
            <div style={{ borderTop: '1px solid var(--oai-border)', paddingTop: '1rem' }}>
              <InfoRow label='ISBN' value={book.isbn} />
              <InfoRow label='Publisher' value={book.publisher} />
              <InfoRow label='Publish Year' value={book.publish_year} />
              <InfoRow label='Language' value={book.language} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StoreBookDetailPage;
