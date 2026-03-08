import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { PiBookOpenTextLight } from 'react-icons/pi';
import { BiUserCircle, BiShow } from 'react-icons/bi';
import { AiOutlineEdit } from 'react-icons/ai';
import { BsInfoCircle } from 'react-icons/bs';
import { MdOutlineDelete } from 'react-icons/md';
import BookModal from './BookModal';

const PLACEHOLDER =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="120" height="160" viewBox="0 0 120 160"><rect width="120" height="160" fill="%231c1c1c"/><text x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-size="40" fill="%23666680">📚</text></svg>';

const BookSingleCard = ({ book }) => {
  const [showModal, setShowModal] = useState(false);
  const thumb = book.cover_thumbnail || PLACEHOLDER;

  return (
    <div
      className='oai-card flex flex-col overflow-hidden transition-all duration-150 animate-fade-in'
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--oai-border-2)')}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--oai-border)')}
    >
      {/* Cover thumbnail */}
      <div className='h-44 overflow-hidden flex-shrink-0' style={{ backgroundColor: 'var(--oai-surface-2)' }}>
        <img
          src={thumb}
          alt={`Cover of ${book.title}`}
          className='w-full h-full object-cover'
          onError={(e) => { e.currentTarget.src = PLACEHOLDER; }}
        />
      </div>

      <div className='p-4 flex flex-col flex-1'>
        {/* Title + year */}
        <div className='flex items-start justify-between mb-1'>
          <div className='flex items-center gap-1.5 min-w-0'>
            <PiBookOpenTextLight
              className='text-xl flex-shrink-0'
              style={{ color: 'var(--oai-green)' }}
            />
            <h2 className='font-medium truncate text-sm' style={{ color: 'var(--oai-text)' }}>
              {book.title}
            </h2>
          </div>
          {(book.publish_year || book.publishYear) && (
            <span className='badge-gray ml-2 flex-shrink-0'>
              {book.publish_year || book.publishYear}
            </span>
          )}
        </div>

        {/* Author */}
        <div className='flex items-center gap-1.5 mb-3'>
          <BiUserCircle
            className='text-base flex-shrink-0'
            style={{ color: 'var(--oai-muted)' }}
          />
          <span className='text-xs truncate' style={{ color: 'var(--oai-muted)' }}>
            {book.author}
          </span>
        </div>

        {/* Badges: genre + language */}
        <div className='flex flex-wrap gap-1 mb-2'>
          {book.genre && <span className='badge-blue'>{book.genre}</span>}
          {book.language && <span className='badge-purple'>{book.language}</span>}
        </div>

        {/* Location */}
        {(book.shelf_name || book.shelf_number) && (
          <p className='text-xs mb-2' style={{ color: 'var(--oai-subtle)' }}>
            📍 {[book.shelf_name, book.shelf_number].filter(Boolean).join(' · ')}
          </p>
        )}

        {/* Price & stock */}
        <div
          className='flex justify-between items-center mt-auto pt-3'
          style={{ borderTop: '1px solid var(--oai-border)' }}
        >
          <span className='font-semibold text-sm' style={{ color: 'var(--oai-text)' }}>
            ${parseFloat(book.price || 0).toFixed(2)}
          </span>
          {book.stock > 0 ? (
            <span className='badge-green'>{book.stock} in stock</span>
          ) : (
            <span className='badge-red'>Out of stock</span>
          )}
        </div>

        {/* Actions */}
        <div
          className='flex justify-end gap-3 mt-3 pt-3'
          style={{ borderTop: '1px solid var(--oai-border)' }}
        >
          <BiShow
            className='text-xl cursor-pointer transition-colors'
            style={{ color: 'var(--oai-muted)' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--oai-text)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--oai-muted)')}
            onClick={() => setShowModal(true)}
          />
          <Link to={`/books/details/${book.id || book._id}`}>
            <BsInfoCircle
              className='text-xl transition-colors'
              style={{ color: 'var(--oai-green)' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--oai-text)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--oai-green)')}
            />
          </Link>
          <Link to={`/books/edit/${book.id || book._id}`}>
            <AiOutlineEdit
              className='text-xl transition-colors'
              style={{ color: 'var(--oai-muted)' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--oai-text)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--oai-muted)')}
            />
          </Link>
          <Link to={`/books/delete/${book.id || book._id}`}>
            <MdOutlineDelete
              className='text-xl transition-colors'
              style={{ color: 'var(--oai-red)' }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.7')}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
            />
          </Link>
        </div>
      </div>

      {showModal && <BookModal book={book} onClose={() => setShowModal(false)} />}
    </div>
  );
};

export default BookSingleCard;
