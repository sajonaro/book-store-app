import React from 'react';
import { AiOutlineClose } from 'react-icons/ai';
import { BiUserCircle } from 'react-icons/bi';
import { PiBookOpenTextLight } from 'react-icons/pi';

const PLACEHOLDER =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="120" height="160" viewBox="0 0 120 160"><rect width="120" height="160" fill="%23e2e8f0"/><text x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-size="40" fill="%2394a3b8">📚</text></svg>';

const BookModal = ({ book, onClose }) => {
  const thumb = book.cover_thumbnail || PLACEHOLDER;

  return (
    <div
      className='fixed inset-0 bg-black/60 z-50 flex justify-center items-center p-4'
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className='bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto relative'
      >
        <button
          onClick={onClose}
          className='absolute right-4 top-4 text-gray-400 hover:text-red-500 transition z-10'
        >
          <AiOutlineClose className='text-2xl' />
        </button>

        {/* Cover image */}
        <div className='h-52 bg-gray-100 overflow-hidden rounded-t-2xl'>
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
            <PiBookOpenTextLight className='text-sky-400 text-3xl flex-shrink-0 mt-0.5' />
            <div>
              <h2 className='text-xl font-bold text-gray-900 leading-tight'>{book.title}</h2>
              <div className='flex items-center gap-1 mt-1'>
                <BiUserCircle className='text-sky-400' />
                <span className='text-gray-500 text-sm'>{book.author}</span>
              </div>
            </div>
          </div>

          {/* Badges */}
          <div className='flex flex-wrap gap-2 mb-4'>
            {book.genre && (
              <span className='text-xs bg-sky-100 text-sky-700 px-2 py-0.5 rounded-full'>
                {book.genre}
              </span>
            )}
            {book.language && (
              <span className='text-xs bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full'>
                🌐 {book.language}
              </span>
            )}
            {(book.publish_year || book.publishYear) && (
              <span className='text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full'>
                {book.publish_year || book.publishYear}
              </span>
            )}
          </div>

          {/* Meta */}
          {book.publisher && (
            <p className='text-sm text-gray-600 mb-1'>
              <span className='font-medium text-gray-700'>Publisher:</span> {book.publisher}
            </p>
          )}
          {book.isbn && (
            <p className='text-sm text-gray-600 mb-1'>
              <span className='font-medium text-gray-700'>ISBN:</span> {book.isbn}
            </p>
          )}
          {(book.shelf_name || book.shelf_number) && (
            <p className='text-sm text-gray-600 mb-3'>
              <span className='font-medium text-gray-700'>Location:</span>{' '}
              {[book.shelf_name, book.shelf_number].filter(Boolean).join(' · ')}
            </p>
          )}

          {/* Description */}
          {book.description && (
            <p className='text-gray-700 text-sm leading-relaxed mb-4'>{book.description}</p>
          )}

          {/* Price & stock */}
          <div className='flex justify-between items-center border-t border-gray-100 pt-4 mt-2'>
            <span className='text-xl font-bold text-sky-600'>
              ${parseFloat(book.price || 0).toFixed(2)}
            </span>
            {book.stock > 0 ? (
              <span className='text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full'>
                {book.stock} in stock
              </span>
            ) : (
              <span className='text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full'>
                Out of stock
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookModal;
