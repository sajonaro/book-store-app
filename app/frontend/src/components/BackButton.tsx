import React from 'react';
import { BsArrowLeft } from 'react-icons/bs';
import { Link } from 'react-router-dom';

interface BackButtonProps {
  destination?: string;
}

const BackButton: React.FC<BackButtonProps> = ({ destination = '/home' }) => {
  return (
    <Link
      to={destination}
      className='inline-flex items-center gap-2 text-sm font-medium transition-colors'
      style={{ color: 'var(--oai-muted)' }}
      onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--oai-text)')}
      onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--oai-muted)')}
    >
      <BsArrowLeft className='text-base' />
      <span>Back</span>
    </Link>
  );
};

export default BackButton;
