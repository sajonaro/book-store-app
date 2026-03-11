import React from 'react';

const Spinner: React.FC = () => {
  return (
    <div className='flex justify-center items-center py-10'>
      <div
        className='w-10 h-10 rounded-full animate-spin'
        style={{
          border: '2px solid var(--oai-border)',
          borderTopColor: 'var(--oai-green)',
        }}
      />
    </div>
  );
};

export default Spinner;
