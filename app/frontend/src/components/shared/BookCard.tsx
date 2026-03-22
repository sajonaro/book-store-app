import React from 'react';
import { PiBookOpenTextLight } from 'react-icons/pi';
import { BiUserCircle } from 'react-icons/bi';
import StockBadge from './StockBadge';
import { formatPrice } from '../../utils/formatters';
import type { Book } from '../../types/book';

interface BookCardProps {
  book: Book;
  /** Action row rendered at the bottom of the card (e.g. action icons or a link). */
  actions: React.ReactNode;
}

/**
 * Shared book card used in both the admin SearchPage and the public StorePage.
 * The only difference between the two is the `actions` slot.
 */
const BookCard: React.FC<BookCardProps> = ({ book, actions }) => (
  <div
    className='oai-card p-4 transition-all duration-150 animate-fade-in'
    style={{ cursor: 'default' }}
    onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--oai-border-2)')}
    onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--oai-border)')}
  >
    <div className='flex items-center gap-2 mb-1'>
      <PiBookOpenTextLight
        style={{ color: 'var(--oai-green)', fontSize: '1.2rem', flexShrink: 0 }}
      />
      <h2 className='font-medium truncate text-sm' style={{ color: 'var(--oai-text)' }}>
        {book.title}
      </h2>
    </div>

    <div className='flex items-center gap-2 mb-3'>
      <BiUserCircle
        style={{ color: 'var(--oai-muted)', fontSize: '1.1rem', flexShrink: 0 }}
      />
      <span className='text-sm truncate' style={{ color: 'var(--oai-muted)' }}>
        {book.author}
      </span>
    </div>

    {book.genre && (
      <span className='badge-blue mb-3 inline-block'>{book.genre}</span>
    )}

    <div
      className='flex justify-between items-center mt-3 pt-3'
      style={{ borderTop: '1px solid var(--oai-border)' }}
    >
      <span className='font-semibold text-sm' style={{ color: 'var(--oai-text)' }}>
        {formatPrice(book.price)}
      </span>
      <StockBadge stock={book.stock} />
    </div>

    <div
      className='flex justify-end gap-3 mt-3 pt-3'
      style={{ borderTop: '1px solid var(--oai-border)' }}
    >
      {actions}
    </div>
  </div>
);

export default BookCard;
