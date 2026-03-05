import React from 'react';
import { Link } from 'react-router-dom';
import { AiOutlineEdit } from 'react-icons/ai';
import { BsInfoCircle } from 'react-icons/bs';
import { MdOutlineDelete } from 'react-icons/md';

const BooksTable = ({ books }) => {
  return (
    <div className='overflow-x-auto rounded-2xl border border-gray-200 shadow-sm'>
      <table className='min-w-full bg-white text-sm'>
        <thead className='bg-gray-50 text-gray-600 uppercase text-xs tracking-wider'>
          <tr>
            <th className='px-4 py-3 text-left font-medium'>#</th>
            <th className='px-4 py-3 text-left font-medium'>Title</th>
            <th className='px-4 py-3 text-left font-medium max-md:hidden'>Author</th>
            <th className='px-4 py-3 text-left font-medium max-md:hidden'>Year</th>
            <th className='px-4 py-3 text-left font-medium max-md:hidden'>Genre</th>
            <th className='px-4 py-3 text-right font-medium max-md:hidden'>Price</th>
            <th className='px-4 py-3 text-center font-medium max-md:hidden'>Stock</th>
            <th className='px-4 py-3 text-center font-medium'>Actions</th>
          </tr>
        </thead>
        <tbody className='divide-y divide-gray-100'>
          {books.map((book, index) => (
            <tr key={book.id || book._id} className='hover:bg-gray-50 transition'>
              <td className='px-4 py-3 text-gray-400'>{index + 1}</td>
              <td className='px-4 py-3 font-medium text-gray-900'>{book.title}</td>
              <td className='px-4 py-3 text-gray-600 max-md:hidden'>{book.author}</td>
              <td className='px-4 py-3 text-gray-600 max-md:hidden'>
                {book.publish_year || book.publishYear || '—'}
              </td>
              <td className='px-4 py-3 max-md:hidden'>
                {book.genre ? (
                  <span className='text-xs bg-sky-100 text-sky-700 px-2 py-0.5 rounded-full'>
                    {book.genre}
                  </span>
                ) : (
                  <span className='text-gray-400'>—</span>
                )}
              </td>
              <td className='px-4 py-3 text-right font-semibold text-gray-800 max-md:hidden'>
                ${parseFloat(book.price || 0).toFixed(2)}
              </td>
              <td className='px-4 py-3 text-center max-md:hidden'>
                {book.stock > 0 ? (
                  <span className='text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full'>
                    {book.stock}
                  </span>
                ) : (
                  <span className='text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full'>
                    Out
                  </span>
                )}
              </td>
              <td className='px-4 py-3'>
                <div className='flex justify-center gap-3'>
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
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default BooksTable;
