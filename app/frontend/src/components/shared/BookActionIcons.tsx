import React from 'react';
import { Link } from 'react-router-dom';
import { AiOutlineEdit } from 'react-icons/ai';
import { BsInfoCircle } from 'react-icons/bs';
import { MdOutlineDelete } from 'react-icons/md';

interface BookActionIconsProps {
  bookId: string;
  size?: string;
}

const BookActionIcons: React.FC<BookActionIconsProps> = ({ bookId, size = 'text-xl' }) => (
  <>
    <Link to={`/books/details/${bookId}`}>
      <BsInfoCircle
        className={`${size} transition-colors`}
        style={{ color: 'var(--oai-green)' }}
        onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--oai-text)')}
        onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--oai-green)')}
      />
    </Link>
    <Link to={`/books/edit/${bookId}`}>
      <AiOutlineEdit
        className={`${size} transition-colors`}
        style={{ color: 'var(--oai-muted)' }}
        onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--oai-text)')}
        onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--oai-muted)')}
      />
    </Link>
    <Link to={`/books/delete/${bookId}`}>
      <MdOutlineDelete
        className={`${size} transition-colors`}
        style={{ color: 'var(--oai-red)' }}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.7')}
        onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
      />
    </Link>
  </>
);

export default BookActionIcons;
