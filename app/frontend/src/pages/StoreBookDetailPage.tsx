import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import Spinner from '../components/Spinner';
import BookDetailHero from '../components/shared/BookDetailHero';
import InfoRow from '../components/shared/InfoRow';
import { formatPrice } from '../utils/formatters';
import type { Book } from '../types/book';

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
          <BookDetailHero book={book} />

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
              <InfoRow label='Genre' value={book.genre} />
              <InfoRow label='Shelf Name' value={book.shelf_name} />
              <InfoRow label='Shelf Number' value={book.shelf_number} />
              <InfoRow label='Price' value={book.price != null ? formatPrice(book.price) : null} />
              <InfoRow label='Stock' value={book.stock != null ? `${book.stock} in stock` : null} />
            </div>

            {/* Keyword tags */}
            {book.keywords && book.keywords.length > 0 && (
              <div className='mt-4'>
                <p
                  className='text-xs font-medium uppercase tracking-wider mb-2'
                  style={{ color: 'var(--oai-muted)' }}
                >
                  Tags
                </p>
                <div className='flex flex-wrap gap-2'>
                  {book.keywords.map((tag) => (
                    <span
                      key={tag}
                      className='text-xs px-2 py-1 rounded-full'
                      style={{
                        backgroundColor: 'rgba(99,102,241,0.12)',
                        color: '#818cf8',
                        border: '1px solid rgba(99,102,241,0.3)',
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StoreBookDetailPage;
