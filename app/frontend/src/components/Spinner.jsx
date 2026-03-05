import React from 'react';

const Spinner = () => {
  return (
    <div className='flex justify-center items-center py-8'>
      <div className='w-12 h-12 border-4 border-gray-200 border-t-sky-500 rounded-full animate-spin' />
    </div>
  );
};

export default Spinner;
