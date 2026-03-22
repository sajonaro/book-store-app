import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../utils/api';
import BackButton from '../components/BackButton';
import Spinner from '../components/Spinner';
import BookDetailHero from '../components/shared/BookDetailHero';
import InfoRow from '../components/shared/InfoRow';
import { formatPrice } from '../utils/formatters';
import type { Book } from '../types/book';

const ShowBook: React.FC = () => {
  const [book, setBook] = useState<Partial<Book>>({});
  const [loading, setLoading] = useState(false);
  const { id } = useParams<{ id: string }>();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const response = await api.get<{ data: Book }>(`/books/${id}`);
        setBook(response.data.data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  return (
    <div className='min-h-screen' style={{ backgroundColor: 'var(--oai-bg)' }}>
      <div className='max-w-3xl mx-auto px-6 py-8'>
        <BackButton />
        <h1 className='text-2xl font-semibold mt-6 mb-6' style={{ color: 'var(--oai-text)' }}>
          Book Details
        </h1>

        {loading ? (
          <Spinner />
        ) : (
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
                <InfoRow
                  label='Location'
                  value={
                    book.shelf_name || book.shelf_number
                      ? [book.shelf_name, book.shelf_number].filter(Boolean).join(' · ')
                      : null
                  }
                />
                <InfoRow label='Price' value={book.price != null ? formatPrice(book.price) : null} />
                <InfoRow label='Book ID' value={book.id} />
                <InfoRow
                  label='Created'
                  value={book.created_at ? new Date(book.created_at).toLocaleDateString() : null}
                />
                <InfoRow
                  label='Last Updated'
                  value={book.updated_at ? new Date(book.updated_at).toLocaleDateString() : null}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ShowBook;
