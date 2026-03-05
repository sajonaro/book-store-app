import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { PiBookOpenTextLight } from 'react-icons/pi';
import { BiUserCircle, BiShow } from 'react-icons/bi';
import { AiOutlineEdit } from 'react-icons/ai';
import { BsInfoCircle } from 'react-icons/bs';
import { MdOutlineDelete } from 'react-icons/md';
import BookModal from './BookModal';

const BookSingleCard = ({ book }) => {
  const [showModal, setShowModal] = useState(false);

  return (
    <div className='bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition p-4 flex flex-col'>
      {/* Year badge */}
      <div className='flex items-start justify-between mb-2'>
        <div className='flex items-center gap-2'>
          <PiBookOpenTextLight className='text-sky-400 text-2xl flex-shrink-0' />
          <h2 className='font-semibold text-gray-900 truncate'>{book.title}</h2>
        </div>
        {(book.publish_year || book.publishYear) && (
          <span className='text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full ml-2 flex-shrink-0'>
            {book.publish_year || book.publishYear}
          </span>
        )}
      </div>

      {/* Author */}
      <div className='flex items-center gap-2 mb-2'>
        <BiUserCircle className='text-sky-400 text-lg flex-shrink-0' />
        <span className='text-gray-600 text-sm'>{book.author}</span>
      </div>

      {/* Genre */}
      {book.genre && (
        <span className='self-start text-xs bg-sky-100 text-sky-700 px-2 py-0.5 rounded-full mb-2'>
          {book.genre}
        </span>
      )}

      {/* Price & stock */}
      <div className='flex justify-between items-center mt-auto pt-2 border-t border-gray-100'>
        <span className='font-bold text-gray-900'>${parseFloat(book.price || 0).toFixed(2)}</span>
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

      {showModal && <BookModal book={book} onClose={() => setShowModal(false)} />}
    </div>
  );
};

export default BookSingleCard;
