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
    <div className='min-h-screen flex items-center justify-center bg-gray-50'>
      <div className='bg-white rounded-2xl shadow-lg p-10 w-full max-w-md'>
        {/* Logo / title */}
        <h1 className='text-4xl font-bold text-center text-sky-600 mb-2'>📚 BookStore</h1>
        <p className='text-center text-gray-500 mb-8'>Inventory & Catalog System</p>

        {/* Role selector */}
        <div className='mb-6'>
          <label className='block text-sm font-medium text-gray-700 mb-1'>I am a…</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className='w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-sky-400'
          >
            <option value='user'>User (Buyer)</option>
            <option value='admin'>Admin</option>
          </select>
        </div>

        {role === 'admin' ? (
          <form onSubmit={handleAdminLogin} className='space-y-4'>
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-1'>Email</label>
              <input
                type='email'
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder='admin@bookstore.com'
                className='w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-sky-400'
              />
            </div>
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-1'>Password</label>
              <input
                type='password'
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder='••••••••'
                className='w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-sky-400'
              />
            </div>
            <button
              type='submit'
              disabled={loading}
              className='w-full bg-sky-500 hover:bg-sky-600 text-white font-semibold py-2 rounded-lg transition disabled:opacity-50'
            >
              {loading ? 'Signing in…' : 'Sign In as Admin'}
            </button>
          </form>
        ) : (
          <div className='text-center'>
            <p className='text-gray-500 mb-6 text-sm'>
              No account needed. Browse and search the catalog freely.
            </p>
            <button
              onClick={handleContinueAsUser}
              className='w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-2 rounded-lg transition'
            >
              Continue as Buyer →
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default LoginPage;
