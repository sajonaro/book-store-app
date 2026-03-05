import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import BackButton from '../components/BackButton';
import Spinner from '../components/Spinner';

const InfoRow = ({ label, value }) =>
  value != null && value !== '' ? (
    <div className='flex flex-col sm:flex-row sm:gap-4 py-3 border-b border-gray-100 last:border-0'>
      <span className='text-sm font-medium text-gray-500 sm:w-36 flex-shrink-0'>{label}</span>
      <span className='text-gray-900'>{value}</span>
    </div>
  ) : null;

const ShowBook = () => {
  const [book, setBook] = useState({});
  const [loading, setLoading] = useState(false);
  const { id } = useParams();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const response = await axios.get(`/books/${id}`);
        setBook(response.data.data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  return (
    <div className='min-h-screen bg-gray-50 p-6'>
      <BackButton />
      <h1 className='text-3xl font-bold text-gray-900 my-6'>Book Details</h1>

      {loading ? (
        <Spinner />
      ) : (
        <div className='bg-white rounded-2xl shadow-sm border border-gray-200 p-6 max-w-2xl'>
          <div className='flex items-start justify-between mb-4'>
            <div>
              <h2 className='text-2xl font-bold text-gray-900'>{book.title}</h2>
              <p className='text-gray-500 mt-1'>{book.author}</p>
            </div>
            <div className='text-right'>
              <p className='text-2xl font-bold text-sky-600'>
                ${parseFloat(book.price || 0).toFixed(2)}
              </p>
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

          {book.genre && (
            <span className='inline-block text-xs bg-sky-100 text-sky-700 px-2 py-0.5 rounded-full mb-4'>
              {book.genre}
            </span>
          )}

          {book.description && (
            <p className='text-gray-700 mb-4 leading-relaxed'>{book.description}</p>
          )}

          <div className='border-t border-gray-100 pt-4'>
            <InfoRow label='ISBN' value={book.isbn} />
            <InfoRow label='Publisher' value={book.publisher} />
            <InfoRow label='Publish Year' value={book.publish_year} />
            <InfoRow label='Book ID' value={book.id} />
            <InfoRow
              label='Created'
              value={book.created_at ? new Date(book.created_at).toLocaleDateString() : null}
            />
            <InfoRow
              label='Last Updated'
              value={book.updated_at ? new Date(book.updated_at).toLocaleDateString() : null}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ShowBook;
