import React from 'react';
import BookSingleCard from './BookSingleCard';
import type { Book } from '../../types/book';

interface BooksCardProps {
  books: Book[];
}

const BooksCard: React.FC<BooksCardProps> = ({ books }) => {
  return (
    <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'>
      {books.map((book) => (
        <BookSingleCard key={book.id} book={book} />
      ))}
    </div>
  );
};

export default BooksCard;
