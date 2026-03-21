import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useSnackbar } from 'notistack';

const RegisterPage: React.FC = () => {
  const [storeName, setStoreName] = useState('');
  const [adminName, setAdminName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [openaiApiKey, setOpenaiApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeName.trim()) {
      enqueueSnackbar('Store name is required', { variant: 'warning' });
      return;
    }
    if (!adminName.trim()) {
      enqueueSnackbar('Your name is required', { variant: 'warning' });
      return;
    }
    if (!email.trim()) {
      enqueueSnackbar('Email is required', { variant: 'warning' });
      return;
    }
    if (password.length < 8) {
      enqueueSnackbar('Password must be at least 8 characters', { variant: 'warning' });
      return;
    }
    if (!openaiApiKey.trim().startsWith('sk-')) {
      enqueueSnackbar('A valid OpenAI API key (starting with sk-) is required', { variant: 'warning' });
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post<{
        token: string;
        user: { id: string; name: string; email: string };
        tenant: { id: string; store_name: string; slug: string };
      }>('/auth/register', {
        store_name: storeName.trim(),
        admin_name: adminName.trim(),
        email: email.trim(),
        password,
        openai_api_key: openaiApiKey.trim(),
      });

      localStorage.setItem(
        'session',
        JSON.stringify({
          role: 'tenant-admin',
          token: res.data.token,
          user: res.data.user,
          tenant: res.data.tenant,
        }),
      );

      enqueueSnackbar(
        `Welcome! Your store "${res.data.tenant.store_name}" is ready.`,
        { variant: 'success', autoHideDuration: 5000 },
      );
      navigate('/home');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { msg?: string } } }).response?.data?.msg ||
        'Registration failed';
      enqueueSnackbar(msg, { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
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
            Register Your Store
          </p>
        </div>

        <form onSubmit={handleRegister} className='space-y-4'>
          <div>
            <label className='oai-label'>
              Store Name <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type='text'
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              placeholder='My Awesome Book Store'
              className='oai-input'
              required
            />
          </div>
          <div>
            <label className='oai-label'>
              Your Name <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type='text'
              value={adminName}
              onChange={(e) => setAdminName(e.target.value)}
              placeholder='Jane Smith'
              className='oai-input'
              required
            />
          </div>
          <div>
            <label className='oai-label'>
              Email <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type='email'
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder='jane@mystore.com'
              className='oai-input'
              required
            />
          </div>
          <div>
            <label className='oai-label'>
              Password <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type='password'
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder='Min. 8 characters'
              className='oai-input'
              required
            />
          </div>
          <div>
            <label className='oai-label'>
              OpenAI API Key <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showKey ? 'text' : 'password'}
                value={openaiApiKey}
                onChange={(e) => setOpenaiApiKey(e.target.value)}
                placeholder='sk-...'
                className='oai-input'
                style={{ paddingRight: '2.75rem' }}
                required
              />
              <button
                type='button'
                onClick={() => setShowKey((v) => !v)}
                style={{
                  position: 'absolute',
                  right: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--oai-muted)',
                  fontSize: '0.75rem',
                  padding: 0,
                }}
                tabIndex={-1}
              >
                {showKey ? 'Hide' : 'Show'}
              </button>
            </div>
            <p className='text-xs mt-1' style={{ color: 'var(--oai-subtle)' }}>
              Required for AI book recognition. Get yours at{' '}
              <a
                href='https://platform.openai.com/api-keys'
                target='_blank'
                rel='noopener noreferrer'
                style={{ color: 'var(--oai-green)' }}
              >
                platform.openai.com
              </a>
            </p>
          </div>

          <button
            type='submit'
            disabled={loading}
            className='btn-primary w-full mt-2'
            style={{ padding: '0.625rem 1rem' }}
          >
            {loading ? 'Creating store…' : 'Create Store & Sign In'}
          </button>
        </form>

        {/* Login link */}
        <div className='mt-5 text-center text-sm' style={{ color: 'var(--oai-muted)' }}>
          Already have a store?{' '}
          <Link
            to='/login'
            className='font-medium'
            style={{ color: 'var(--oai-green)' }}
          >
            Sign in →
          </Link>
        </div>

        {/* Divider line */}
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
};

export default RegisterPage;
