import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { PiBookOpenTextLight } from 'react-icons/pi';
import { BiUserCircle, BiShow } from 'react-icons/bi';
import { AiOutlineEdit } from 'react-icons/ai';
import { BsInfoCircle } from 'react-icons/bs';
import { MdOutlineDelete } from 'react-icons/md';
import BookModal from './BookModal';

const PLACEHOLDER =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="120" height="160" viewBox="0 0 120 160"><rect width="120" height="160" fill="%23e2e8f0"/><text x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-size="40" fill="%2394a3b8">📚</text></svg>';

const BookSingleCard = ({ book }) => {
  const [showModal, setShowModal] = useState(false);
  const thumb = book.cover_thumbnail || PLACEHOLDER;

  return (
    <div className='bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition flex flex-col overflow-hidden'>
      {/* Cover thumbnail */}
      <div className='h-44 bg-gray-100 overflow-hidden flex-shrink-0'>
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
            <PiBookOpenTextLight className='text-sky-400 text-xl flex-shrink-0' />
            <h2 className='font-semibold text-gray-900 truncate text-sm'>{book.title}</h2>
          </div>
          {(book.publish_year || book.publishYear) && (
            <span className='text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full ml-2 flex-shrink-0'>
              {book.publish_year || book.publishYear}
            </span>
          )}
        </div>

        {/* Author */}
        <div className='flex items-center gap-1.5 mb-2'>
          <BiUserCircle className='text-sky-400 text-base flex-shrink-0' />
          <span className='text-gray-600 text-xs truncate'>{book.author}</span>
        </div>

        {/* Badges: genre + language */}
        <div className='flex flex-wrap gap-1 mb-2'>
          {book.genre && (
            <span className='text-xs bg-sky-100 text-sky-700 px-2 py-0.5 rounded-full'>
              {book.genre}
            </span>
          )}
          {book.language && (
            <span className='text-xs bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full'>
              {book.language}
            </span>
          )}
        </div>

        {/* Location */}
        {(book.shelf_name || book.shelf_number) && (
          <p className='text-xs text-gray-400 mb-2'>
            📍 {[book.shelf_name, book.shelf_number].filter(Boolean).join(' · ')}
          </p>
        )}

        {/* Price & stock */}
        <div className='flex justify-between items-center mt-auto pt-2 border-t border-gray-100'>
          <span className='font-bold text-gray-900 text-sm'>${parseFloat(book.price || 0).toFixed(2)}</span>
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

        {/* Actions */}
        <div className='flex justify-end gap-3 mt-3 pt-3 border-t border-gray-100'>
          <BiShow
            className='text-xl text-blue-500 hover:text-blue-700 cursor-pointer transition'
            onClick={() => setShowModal(true)}
          />
          <Link to={`/books/details/${book.id || book._id}`}>
            <BsInfoCircle className='text-xl text-green-600 hover:text-green-800 transition' />
          </Link>
          <Link to={`/books/edit/${book.id || book._id}`}>
            <AiOutlineEdit className='text-xl text-yellow-500 hover:text-yellow-700 transition' />
          </Link>
          <Link to={`/books/delete/${book.id || book._id}`}>
            <MdOutlineDelete className='text-xl text-red-500 hover:text-red-700 transition' />
          </Link>
        </div>
      </div>

      {showModal && <BookModal book={book} onClose={() => setShowModal(false)} />}
    </div>
  );
};

export default BookSingleCard;
