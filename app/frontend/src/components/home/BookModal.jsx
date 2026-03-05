import React from 'react';
import { AiOutlineClose } from 'react-icons/ai';
import { BiUserCircle } from 'react-icons/bi';
import { PiBookOpenTextLight } from 'react-icons/pi';

const BookModal = ({ book, onClose }) => {
  return (
    <div
      className='fixed inset-0 bg-black/60 z-50 flex justify-center items-center p-4'
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className='bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 relative'
      >
        <button
          onClick={onClose}
          className='absolute right-4 top-4 text-gray-400 hover:text-red-500 transition'
        >
          <AiOutlineClose className='text-2xl' />
        </button>

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
          <p className='text-sm text-gray-600 mb-3'>
            <span className='font-medium text-gray-700'>ISBN:</span> {book.isbn}
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
  );
};

export default BookModal;
