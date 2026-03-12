import React, { useState } from 'react';
import { PiBookOpenTextLight } from 'react-icons/pi';
import { BiUserCircle, BiShow } from 'react-icons/bi';
import BookModal from './BookModal';
import BookActionIcons from '../shared/BookActionIcons';
import StockBadge from '../shared/StockBadge';
import { PLACEHOLDER_CARD } from '../../utils/constants';
import { formatPrice, getBookLocation } from '../../utils/formatters';
import type { Book } from '../../types/book';

interface BookSingleCardProps {
  book: Book;
}

const BookSingleCard: React.FC<BookSingleCardProps> = ({ book }) => {
  const [showModal, setShowModal] = useState(false);
  const thumb = book.cover_thumbnail || PLACEHOLDER_CARD;
  const location = getBookLocation(book);

  return (
    <div
      className='oai-card flex flex-col overflow-hidden transition-all duration-150 animate-fade-in'
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--oai-border-2)')}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--oai-border)')}
    >
      <div className='h-44 overflow-hidden flex-shrink-0' style={{ backgroundColor: 'var(--oai-surface-2)' }}>
        <img
          src={thumb}
          alt={`Cover of ${book.title}`}
          className='w-full h-full object-cover'
          onError={(e) => { e.currentTarget.src = PLACEHOLDER_CARD; }}
        />
      </div>

      <div className='p-4 flex flex-col flex-1'>
        <div className='flex items-start justify-between mb-1'>
          <div className='flex items-center gap-1.5 min-w-0'>
            <PiBookOpenTextLight className='text-xl flex-shrink-0' style={{ color: 'var(--oai-green)' }} />
            <h2 className='font-medium truncate text-sm' style={{ color: 'var(--oai-text)' }}>{book.title}</h2>
          </div>
          {book.publish_year && (
            <span className='badge-gray ml-2 flex-shrink-0'>{book.publish_year}</span>
          )}
        </div>

        <div className='flex items-center gap-1.5 mb-3'>
          <BiUserCircle className='text-base flex-shrink-0' style={{ color: 'var(--oai-muted)' }} />
          <span className='text-xs truncate' style={{ color: 'var(--oai-muted)' }}>{book.author}</span>
        </div>

        <div className='flex flex-wrap gap-1 mb-2'>
          {book.genre && <span className='badge-blue'>{book.genre}</span>}
          {book.language && <span className='badge-purple'>{book.language}</span>}
        </div>

        {location && (
          <p className='text-xs mb-2' style={{ color: 'var(--oai-subtle)' }}>📍 {location}</p>
        )}

        <div className='flex justify-between items-center mt-auto pt-3' style={{ borderTop: '1px solid var(--oai-border)' }}>
          <span className='font-semibold text-sm' style={{ color: 'var(--oai-text)' }}>{formatPrice(book.price)}</span>
          <StockBadge stock={book.stock} />
        </div>

        <div className='flex justify-end gap-3 mt-3 pt-3' style={{ borderTop: '1px solid var(--oai-border)' }}>
          <BiShow
            className='text-xl cursor-pointer transition-colors'
            style={{ color: 'var(--oai-muted)' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--oai-text)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--oai-muted)')}
            onClick={() => setShowModal(true)}
          />
          <BookActionIcons bookId={book.id} />
        </div>
      </div>

      {showModal && <BookModal book={book} onClose={() => setShowModal(false)} />}
    </div>
  );
};

export default BookSingleCard;
