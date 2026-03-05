import React from 'react';
import BookSingleCard from './BookSingleCard';

const BooksCard = ({ books }) => {
  return (
    <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'>
      {books.map((book) => (
        <BookSingleCard key={book.id || book._id} book={book} />
      ))}
    </div>
  );
};

export default BooksCard;
