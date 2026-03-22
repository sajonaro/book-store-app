import React from 'react';
import BookActionIcons from '../shared/BookActionIcons';
import { PLACEHOLDER_TABLE } from '../../utils/constants';
import { formatPrice, getBookLocation } from '../../utils/formatters';
import type { Book } from '../../types/book';

export type SortKey = 'title' | 'author' | 'publish_year' | 'genre' | 'language' | 'price' | 'stock' | 'created_at';
export type SortDir = 'asc' | 'desc';

interface ColDef {
  label: string;
  sortKey?: SortKey;
  thClass?: string;
}

const COLUMNS: ColDef[] = [
  { label: '#',        thClass: 'w-10' },
  { label: 'Cover',    thClass: 'w-14' },
  { label: 'Title',    sortKey: 'title' },
  { label: 'Author',   sortKey: 'author',       thClass: 'max-md:hidden' },
  { label: 'Year',     sortKey: 'publish_year', thClass: 'max-md:hidden' },
  { label: 'Genre',    sortKey: 'genre',        thClass: 'max-md:hidden' },
  { label: 'Language', sortKey: 'language',     thClass: 'max-lg:hidden' },
  { label: 'Location', thClass: 'max-lg:hidden' },
  { label: 'Price',    sortKey: 'price',        thClass: 'text-right max-md:hidden' },
  { label: 'Stock',    sortKey: 'stock',        thClass: 'text-center max-md:hidden' },
  { label: 'Actions',  thClass: 'text-center' },
];

interface BooksTableProps {
  books: Book[];
  sortKey: SortKey;
  sortDir: SortDir;
  onSort: (key: SortKey) => void;
}

const BooksTable: React.FC<BooksTableProps> = ({ books, sortKey, sortDir, onSort }) => {
  return (
    <div
      className='overflow-x-auto rounded-xl'
      style={{ border: '1px solid var(--oai-border)' }}
    >
      <table className='min-w-full text-sm' style={{ backgroundColor: 'var(--oai-surface)' }}>
        <thead
          style={{
            backgroundColor: 'var(--oai-surface-2)',
            borderBottom: '1px solid var(--oai-border)',
          }}
        >
          <tr>
            {COLUMNS.map((col) => {
              const active = col.sortKey === sortKey;
              const sortable = !!col.sortKey;
              return (
                <th
                  key={col.label}
                  className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider${
                    col.thClass ? ` ${col.thClass}` : ''
                  }${sortable ? ' select-none' : ''}`}
                  style={{
                    color: active ? 'var(--oai-green)' : 'var(--oai-muted)',
                    cursor: sortable ? 'pointer' : 'default',
                    whiteSpace: 'nowrap',
                  }}
                  onClick={sortable ? () => onSort(col.sortKey!) : undefined}
                  title={sortable ? `Sort by ${col.label}` : undefined}
                >
                  {col.label}
                  {sortable && (
                    <span className='ml-1 inline-block w-3 text-center'>
                      {active ? (sortDir === 'asc' ? '↑' : '↓') : (
                        <span style={{ opacity: 0.3 }}>↕</span>
                      )}
                    </span>
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {books.map((book, index) => (
            <tr
              key={book.id}
              style={{ borderBottom: '1px solid var(--oai-border)' }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.backgroundColor = 'var(--oai-surface-2)')
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.backgroundColor = 'transparent')
              }
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
                  onError={(e) => {
                    e.currentTarget.src = PLACEHOLDER_TABLE;
                  }}
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
              <td
                className='px-4 py-3 text-xs max-lg:hidden'
                style={{ color: 'var(--oai-subtle)' }}
              >
                {getBookLocation(book) || '—'}
              </td>
              <td
                className='px-4 py-3 text-right font-semibold max-md:hidden'
                style={{ color: 'var(--oai-text)' }}
              >
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
