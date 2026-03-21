import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useSnackbar } from 'notistack';

interface LoginResponse {
  token: string;
  user: { id: string; name: string; email: string };
  role: 'tenant-admin' | 'user' | 'superuser';
  tenant: { id: string; store_name: string; slug: string } | null;
}

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      enqueueSnackbar('Email is required', { variant: 'warning' });
      return;
    }
    if (!password.trim()) {
      enqueueSnackbar('Password is required', { variant: 'warning' });
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post<LoginResponse>('/auth/login', {
        email: email.trim(),
        password,
      });

      localStorage.setItem(
        'session',
        JSON.stringify({
          role: res.data.role,
          token: res.data.token,
          user: res.data.user,
          tenant: res.data.tenant,
        }),
      );

      const greeting = res.data.role === 'superuser'
        ? `Welcome, ${res.data.user.name}! (System Admin)`
        : `Welcome, ${res.data.user.name}!`;
      enqueueSnackbar(greeting, { variant: 'success' });
      navigate(res.data.role === 'superuser' ? '/superuser' : '/home');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { msg?: string } } }).response?.data?.msg ||
        'Login failed';
      enqueueSnackbar(msg, { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className='min-h-screen flex items-center justify-center px-4'
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
            Sign In
          </p>
        </div>

        <form onSubmit={handleLogin} className='space-y-4'>
          <div>
            <label className='oai-label'>Email</label>
            <input
              type='email'
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder='admin@yourstore.com'
              className='oai-input'
            />
          </div>
          <div>
            <label className='oai-label'>Password</label>
            <input
              type='password'
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder='••••••••'
              className='oai-input'
            />
          </div>
          <button
            type='submit'
            disabled={loading}
            className='btn-primary w-full mt-2'
            style={{ padding: '0.625rem 1rem' }}
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        {/* Register link */}
        <div className='mt-5 text-center text-sm' style={{ color: 'var(--oai-muted)' }}>
          New store owner?{' '}
          <Link
            to='/register'
            className='font-medium'
            style={{ color: 'var(--oai-green)' }}
          >
            Register your store →
          </Link>
        </div>

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
};

export default LoginPage;
