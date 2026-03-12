import React from 'react';
import { PLACEHOLDER_CARD } from '../../utils/constants';

interface CoverUploadProps {
  coverThumb: string | null;
  fileRef: React.RefObject<HTMLInputElement | null>;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemove: () => void;
}

const CoverUpload: React.FC<CoverUploadProps> = ({ coverThumb, fileRef, onFileChange, onRemove }) => (
  <div className='flex items-start gap-4 mb-6'>
    <img
      src={coverThumb || PLACEHOLDER_CARD}
      alt='Book cover'
      className='w-24 h-32 object-cover rounded-lg flex-shrink-0'
      style={{ border: '1px solid var(--oai-border)' }}
      onError={(e) => { e.currentTarget.src = PLACEHOLDER_CARD; }}
    />
    <div className='flex flex-col gap-2 justify-end h-32'>
      <p className='text-xs' style={{ color: 'var(--oai-muted)' }}>Book Cover</p>
      <button
        type='button'
        onClick={() => fileRef.current?.click()}
        className='btn-secondary text-xs px-3 py-1.5'
      >
        {coverThumb ? 'Change Image' : 'Upload Image'}
      </button>
      {coverThumb && (
        <button
          type='button'
          onClick={onRemove}
          className='text-xs transition-colors'
          style={{ color: 'var(--oai-subtle)' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--oai-red)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--oai-subtle)')}
        >
          Remove
        </button>
      )}
      <input ref={fileRef} type='file' accept='image/*' className='hidden' onChange={onFileChange} />
    </div>
  </div>
);

export default CoverUpload;
