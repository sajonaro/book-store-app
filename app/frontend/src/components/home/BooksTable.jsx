import React from 'react';
import { Link } from 'react-router-dom';
import { AiOutlineEdit } from 'react-icons/ai';
import { BsInfoCircle } from 'react-icons/bs';
import { MdOutlineDelete } from 'react-icons/md';

const PLACEHOLDER =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="54" viewBox="0 0 40 54"><rect width="40" height="54" fill="%231c1c1c"/><text x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-size="18" fill="%23666680">📚</text></svg>';

const BooksTable = ({ books }) => {
  return (
    <div
      className='overflow-x-auto rounded-xl'
      style={{ border: '1px solid var(--oai-border)' }}
    >
      <table className='min-w-full text-sm' style={{ backgroundColor: 'var(--oai-surface)' }}>
        <thead style={{ backgroundColor: 'var(--oai-surface-2)', borderBottom: '1px solid var(--oai-border)' }}>
          <tr>
            {['#', 'Cover', 'Title', 'Author', 'Year', 'Genre', 'Language', 'Location', 'Price', 'Stock', 'Actions'].map(
              (h, i) => (
                <th
                  key={h}
                  className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider${
                    i === 0 ? ' w-10' : ''
                  }${i === 1 ? ' w-14' : ''}${
                    [3, 4, 5].includes(i) ? ' max-md:hidden' : ''
                  }${[6, 7].includes(i) ? ' max-lg:hidden' : ''}${
                    i === 8 ? ' text-right max-md:hidden' : ''
                  }${i === 9 ? ' text-center max-md:hidden' : ''}${
                    i === 10 ? ' text-center' : ''
                  }`}
                  style={{ color: 'var(--oai-muted)' }}
                >
                  {h}
                </th>
              ),
            )}
          </tr>
        </thead>
        <tbody>
          {books.map((book, index) => (
            <tr
              key={book.id || book._id}
              style={{ borderBottom: '1px solid var(--oai-border)' }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--oai-surface-2)')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <td className='px-4 py-3 text-xs' style={{ color: 'var(--oai-subtle)' }}>
                {index + 1}
              </td>
              <td className='px-4 py-3'>
                <img
                  src={book.cover_thumbnail || PLACEHOLDER}
                  alt=''
                  className='w-9 h-12 object-cover rounded'
                  style={{ border: '1px solid var(--oai-border)' }}
                  onError={(e) => { e.currentTarget.src = PLACEHOLDER; }}
                />
              </td>
              <td className='px-4 py-3 font-medium' style={{ color: 'var(--oai-text)' }}>
                {book.title}
              </td>
              <td className='px-4 py-3 max-md:hidden' style={{ color: 'var(--oai-muted)' }}>
                {book.author}
              </td>
              <td className='px-4 py-3 max-md:hidden' style={{ color: 'var(--oai-muted)' }}>
                {book.publish_year || book.publishYear || '—'}
              </td>
              <td className='px-4 py-3 max-md:hidden'>
                {book.genre ? (
                  <span className='badge-blue'>{book.genre}</span>
                ) : (
                  <span style={{ color: 'var(--oai-subtle)' }}>—</span>
                )}
              </td>
              <td className='px-4 py-3 max-lg:hidden'>
                {book.language ? (
                  <span className='badge-purple'>{book.language}</span>
                ) : (
                  <span style={{ color: 'var(--oai-subtle)' }}>—</span>
                )}
              </td>
              <td className='px-4 py-3 text-xs max-lg:hidden' style={{ color: 'var(--oai-subtle)' }}>
                {book.shelf_name || book.shelf_number
                  ? [book.shelf_name, book.shelf_number].filter(Boolean).join(' · ')
                  : '—'}
              </td>
              <td className='px-4 py-3 text-right font-semibold max-md:hidden' style={{ color: 'var(--oai-text)' }}>
                ${parseFloat(book.price || 0).toFixed(2)}
              </td>
              <td className='px-4 py-3 text-center max-md:hidden'>
                {book.stock > 0 ? (
                  <span className='badge-green'>{book.stock}</span>
                ) : (
                  <span className='badge-red'>Out</span>
                )}
              </td>
              <td className='px-4 py-3'>
                <div className='flex justify-center gap-3'>
                  <Link to={`/books/details/${book.id || book._id}`}>
                    <BsInfoCircle
                      className='text-lg transition-colors'
                      style={{ color: 'var(--oai-green)' }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--oai-text)')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--oai-green)')}
                    />
                  </Link>
                  <Link to={`/books/edit/${book.id || book._id}`}>
                    <AiOutlineEdit
                      className='text-lg transition-colors'
                      style={{ color: 'var(--oai-muted)' }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--oai-text)')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--oai-muted)')}
                    />
                  </Link>
                  <Link to={`/books/delete/${book.id || book._id}`}>
                    <MdOutlineDelete
                      className='text-lg transition-colors'
                      style={{ color: 'var(--oai-red)' }}
                      onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.7')}
                      onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
                    />
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
