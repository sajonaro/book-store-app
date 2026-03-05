import React from 'react';
import { BsArrowLeft } from 'react-icons/bs';
import { Link } from 'react-router-dom';

const BackButton = ({ destination = '/home' }) => {
  return (
    <Link
      to={destination}
      className='inline-flex items-center gap-2 text-sky-600 hover:text-sky-800 font-medium transition'
    >
      <BsArrowLeft className='text-xl' />
      <span>Back</span>
    </Link>
  );
};

export default BackButton;
