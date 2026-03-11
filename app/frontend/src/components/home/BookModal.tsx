import React from 'react';
import { AiOutlineClose } from 'react-icons/ai';
import { BiUserCircle } from 'react-icons/bi';
import { PiBookOpenTextLight } from 'react-icons/pi';
import type { Book } from '../../types/book';

const PLACEHOLDER =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="120" height="160" viewBox="0 0 120 160"><rect width="120" height="160" fill="%231c1c1c"/><text x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-size="40" fill="%23666680">📚</text></svg>';

interface BookModalProps {
  book: Book;
  onClose: () => void;
}

const BookModal: React.FC<BookModalProps> = ({ book, onClose }) => {
  const thumb = book.cover_thumbnail || PLACEHOLDER;

  return (
    <div
      className='fixed inset-0 z-50 flex justify-center items-center p-4'
      style={{ backgroundColor: 'rgba(0,0,0,0.75)' }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className='w-full max-w-lg max-h-[90vh] overflow-y-auto relative animate-fade-in'
        style={{
          backgroundColor: 'var(--oai-surface)',
          border: '1px solid var(--oai-border)',
          borderRadius: 'var(--oai-radius-xl)',
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className='absolute right-4 top-4 z-10 p-1 rounded-md transition-colors'
          style={{ color: 'var(--oai-muted)' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--oai-red)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--oai-muted)')}
        >
          <AiOutlineClose className='text-xl' />
        </button>

        {/* Cover image */}
        <div
          className='h-52 overflow-hidden'
          style={{
            backgroundColor: 'var(--oai-surface-2)',
            borderRadius: 'var(--oai-radius-xl) var(--oai-radius-xl) 0 0',
          }}
        >
          <img
            src={thumb}
            alt={`Cover of ${book.title}`}
            className='w-full h-full object-cover'
            onError={(e) => { e.currentTarget.src = PLACEHOLDER; }}
          />
        </div>

        <div className='p-6'>
          {/* Header */}
          <div className='flex items-start gap-3 mb-4'>
            <PiBookOpenTextLight
              className='text-3xl flex-shrink-0 mt-0.5'
              style={{ color: 'var(--oai-green)' }}
            />
            <div>
              <h2 className='text-lg font-semibold leading-tight' style={{ color: 'var(--oai-text)' }}>
                {book.title}
              </h2>
              <div className='flex items-center gap-1 mt-1'>
                <BiUserCircle style={{ color: 'var(--oai-muted)' }} />
                <span className='text-sm' style={{ color: 'var(--oai-muted)' }}>
                  {book.author}
                </span>
              </div>
            </div>
          </div>

          {/* Badges */}
          <div className='flex flex-wrap gap-2 mb-4'>
            {book.genre && <span className='badge-blue'>{book.genre}</span>}
            {book.language && <span className='badge-purple'>🌐 {book.language}</span>}
            {(book.publish_year || book.publishYear) && (
              <span className='badge-gray'>{book.publish_year || book.publishYear}</span>
            )}
          </div>

          {/* Meta */}
          {book.publisher && (
            <p className='text-sm mb-1' style={{ color: 'var(--oai-muted)' }}>
              <span style={{ color: 'var(--oai-text)' }}>Publisher:</span> {book.publisher}
            </p>
          )}
          {book.isbn && (
            <p className='text-sm mb-1' style={{ color: 'var(--oai-muted)' }}>
              <span style={{ color: 'var(--oai-text)' }}>ISBN:</span> {book.isbn}
            </p>
          )}
          {(book.shelf_name || book.shelf_number) && (
            <p className='text-sm mb-3' style={{ color: 'var(--oai-muted)' }}>
              <span style={{ color: 'var(--oai-text)' }}>Location:</span>{' '}
              {[book.shelf_name, book.shelf_number].filter(Boolean).join(' · ')}
            </p>
          )}

          {/* Description */}
          {book.description && (
            <p className='text-sm leading-relaxed mb-4' style={{ color: 'var(--oai-muted)' }}>
              {book.description}
            </p>
          )}

          {/* Price & stock */}
          <div
            className='flex justify-between items-center pt-4 mt-2'
            style={{ borderTop: '1px solid var(--oai-border)' }}
          >
            <span className='text-xl font-semibold' style={{ color: 'var(--oai-green)' }}>
              ${parseFloat(String(book.price || 0)).toFixed(2)}
            </span>
            {book.stock > 0 ? (
              <span className='badge-green'>{book.stock} in stock</span>
            ) : (
              <span className='badge-red'>Out of stock</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookModal;
