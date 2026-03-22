import React from 'react';

interface AuthCardProps {
  subtitle: string;
  children: React.ReactNode;
}

/**
 * Shared card shell for authentication pages (Login, Register).
 * Renders the logo, brand name, subtitle, wraps children, and shows the footer.
 */
const AuthCard: React.FC<AuthCardProps> = ({ subtitle, children }) => (
  <div
    className='min-h-screen flex items-center justify-center px-4 py-12'
    style={{ backgroundColor: 'var(--oai-bg)' }}
  >
    <div
      className='w-full max-w-sm animate-fade-in'
      style={{
        backgroundColor: 'var(--oai-surface)',
        border: '1px solid var(--oai-border)',
        borderRadius: 'var(--oai-radius-xl)',
        padding: '2.5rem 2rem',
      }}
    >
      {/* Logo / title */}
      <div className='text-center mb-8'>
        <div className='flex justify-center mb-3'>
          <img src='/logo.svg' alt='Planet of Books' style={{ height: '64px', width: 'auto' }} />
        </div>
        <h1 className='store-brand-name' style={{ color: 'var(--oai-text)', fontSize: '2rem' }}>
          Planet of Books
        </h1>
        <p className='text-sm mt-1' style={{ color: 'var(--oai-muted)' }}>
          {subtitle}
        </p>
      </div>

      {children}

      {/* Footer */}
      <div
        className='mt-6 pt-5 text-center text-xs'
        style={{
          borderTop: '1px solid var(--oai-border)',
          color: 'var(--oai-subtle)',
        }}
      >
        Planet of Books © {new Date().getFullYear()}
      </div>
    </div>
  </div>
);

export default AuthCard;
