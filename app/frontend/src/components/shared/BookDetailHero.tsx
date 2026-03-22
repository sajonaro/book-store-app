import React from 'react';
import { PLACEHOLDER_DETAIL } from '../../utils/constants';
import { formatPrice } from '../../utils/formatters';
import type { Book } from '../../types/book';

interface BookDetailHeroProps {
  book: Partial<Book>;
}

/**
 * Shared "hero" section for book detail pages — cover image on the left, title /
 * author / genre+language badges / price / stock badge on the right.
 *
 * Used by both the authenticated ShowBook page and the public StoreBookDetailPage.
 */
const BookDetailHero: React.FC<BookDetailHeroProps> = ({ book }) => {
  const thumb = book.cover_thumbnail || PLACEHOLDER_DETAIL;

  return (
    <div className='flex gap-0'>
      {/* Cover */}
      <div className='w-36 flex-shrink-0' style={{ backgroundColor: 'var(--oai-surface-2)' }}>
        <img
          src={thumb}
          alt={`Cover of ${book.title}`}
          className='w-full h-full object-cover min-h-48'
          onError={(e) => {
            e.currentTarget.src = PLACEHOLDER_DETAIL;
          }}
        />
      </div>

      {/* Header info */}
      <div className='p-6 flex-1 flex flex-col justify-between min-w-0'>
        <div>
          <h2 className='text-xl font-semibold truncate' style={{ color: 'var(--oai-text)' }}>
            {book.title}
          </h2>
          <p className='text-sm mt-1' style={{ color: 'var(--oai-muted)' }}>
            {book.author}
          </p>
          <div className='flex flex-wrap gap-2 mt-3'>
            {book.genre && <span className='badge-blue'>{book.genre}</span>}
            {book.language && <span className='badge-purple'>🌐 {book.language}</span>}
          </div>
        </div>

        <div className='mt-4'>
          <p className='text-2xl font-semibold' style={{ color: 'var(--oai-green)' }}>
            {formatPrice(book.price)}
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
  );
};

export default BookDetailHero;
