import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useSnackbar } from 'notistack';
import AuthCard from '../components/shared/AuthCard';

const RegisterPage: React.FC = () => {
  const [storeName, setStoreName] = useState('');
  const [adminName, setAdminName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
    <AuthCard subtitle='Register Your Store'>
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
        <button
          type='submit'
          disabled={loading}
          className='btn-primary w-full mt-2'
          style={{ padding: '0.625rem 1rem' }}
        >
          {loading ? 'Creating store…' : 'Create Store & Sign In'}
        </button>
      </form>

      <div className='mt-5 text-center text-sm' style={{ color: 'var(--oai-muted)' }}>
        Already have a store?{' '}
        <Link to='/login' className='font-medium' style={{ color: 'var(--oai-green)' }}>
          Sign in →
        </Link>
      </div>
    </AuthCard>
  );
};

export default RegisterPage;
