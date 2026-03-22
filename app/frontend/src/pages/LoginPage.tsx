import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useSnackbar } from 'notistack';
import AuthCard from '../components/shared/AuthCard';

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

      const greeting =
        res.data.role === 'superuser'
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
    <AuthCard subtitle='Sign In'>
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

      <div className='mt-5 text-center text-sm' style={{ color: 'var(--oai-muted)' }}>
        New store owner?{' '}
        <Link to='/register' className='font-medium' style={{ color: 'var(--oai-green)' }}>
          Register your store →
        </Link>
      </div>
    </AuthCard>
  );
};

export default LoginPage;
