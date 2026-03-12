import React from 'react';
import BookActionIcons from '../shared/BookActionIcons';
import { PLACEHOLDER_TABLE } from '../../utils/constants';
import { formatPrice, getBookLocation } from '../../utils/formatters';
import type { Book } from '../../types/book';

interface BooksTableProps {
  books: Book[];
}

const BooksTable: React.FC<BooksTableProps> = ({ books }) => {
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
              key={book.id}
              style={{ borderBottom: '1px solid var(--oai-border)' }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--oai-surface-2)')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <td className='px-4 py-3 text-xs' style={{ color: 'var(--oai-subtle)' }}>
                {index + 1}
              </td>
              <td className='px-4 py-3'>
                <img
                  src={book.cover_thumbnail || PLACEHOLDER_TABLE}
                  alt=''
                  className='w-9 h-12 object-cover rounded'
                  style={{ border: '1px solid var(--oai-border)' }}
                  onError={(e) => { e.currentTarget.src = PLACEHOLDER_TABLE; }}
                />
              </td>
              <td className='px-4 py-3 font-medium' style={{ color: 'var(--oai-text)' }}>
                {book.title}
              </td>
              <td className='px-4 py-3 max-md:hidden' style={{ color: 'var(--oai-muted)' }}>
                {book.author}
              </td>
              <td className='px-4 py-3 max-md:hidden' style={{ color: 'var(--oai-muted)' }}>
                {book.publish_year || '—'}
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
                {getBookLocation(book) || '—'}
              </td>
              <td className='px-4 py-3 text-right font-semibold max-md:hidden' style={{ color: 'var(--oai-text)' }}>
                {formatPrice(book.price)}
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
                  <BookActionIcons bookId={book.id} size='text-lg' />
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
