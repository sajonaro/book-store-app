import React from 'react';

interface InfoRowProps {
  label: string;
  value?: string | number | null;
}

const InfoRow: React.FC<InfoRowProps> = ({ label, value }) =>
  value != null && value !== '' ? (
    <div
      className='flex flex-col sm:flex-row sm:gap-4 py-3'
      style={{ borderBottom: '1px solid var(--oai-border)' }}
    >
      <span
        className='text-xs font-medium uppercase tracking-wider sm:w-36 flex-shrink-0'
        style={{ color: 'var(--oai-muted)' }}
      >
        {label}
      </span>
      <span className='text-sm mt-0.5 sm:mt-0' style={{ color: 'var(--oai-text)' }}>
        {value}
      </span>
    </div>
  ) : null;

export default InfoRow;
