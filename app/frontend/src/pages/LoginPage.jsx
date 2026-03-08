import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useSnackbar } from 'notistack';

const LoginPage = () => {
  const [role, setRole] = useState('user');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();

  const handleContinueAsUser = () => {
    localStorage.setItem('session', JSON.stringify({ role: 'user' }));
    navigate('/search');
  };

  const handleAdminLogin = async (e) => {
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
      const res = await axios.post('/auth/login', { email: email.trim(), password });
      localStorage.setItem(
        'session',
        JSON.stringify({ role: 'admin', token: res.data.token, user: res.data.user }),
      );
      enqueueSnackbar(`Welcome, ${res.data.user.name}!`, { variant: 'success' });
      navigate('/home');
    } catch (err) {
      const msg = err.response?.data?.msg || 'Login failed';
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
          <div className='text-4xl mb-3'>📚</div>
          <h1 className='text-2xl font-semibold' style={{ color: 'var(--oai-text)' }}>
            BookStore
          </h1>
          <p className='text-sm mt-1' style={{ color: 'var(--oai-muted)' }}>
            Inventory & Catalog System
          </p>
        </div>

        {/* Role selector */}
        <div className='mb-5'>
          <label className='oai-label'>I am a…</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className='oai-input'
          >
            <option value='user'>User (Buyer)</option>
            <option value='admin'>Admin</option>
          </select>
        </div>

        {role === 'admin' ? (
          <form onSubmit={handleAdminLogin} className='space-y-4'>
            <div>
              <label className='oai-label'>Email</label>
              <input
                type='email'
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder='admin@bookstore.com'
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
              {loading ? 'Signing in…' : 'Sign in as Admin'}
            </button>
          </form>
        ) : (
          <div className='text-center'>
            <p className='text-sm mb-5' style={{ color: 'var(--oai-muted)' }}>
              No account needed. Browse and search the catalog freely.
            </p>
            <button
              onClick={handleContinueAsUser}
              className='btn-primary w-full'
              style={{ padding: '0.625rem 1rem' }}
            >
              Continue as Buyer →
            </button>
          </div>
        )}

        {/* Divider line */}
        <div
          className='mt-8 pt-5 text-center text-xs'
          style={{
            borderTop: '1px solid var(--oai-border)',
            color: 'var(--oai-subtle)',
          }}
        >
          BookStore © {new Date().getFullYear()}
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
