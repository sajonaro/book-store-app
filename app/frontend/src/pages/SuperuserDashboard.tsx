import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import api from '../utils/api';
import { useSession } from '../hooks/useSession';
import Spinner from '../components/Spinner';

interface TenantAdmin {
  id: string;
  name: string;
  email: string;
}

interface Tenant {
  id: string;
  store_name: string;
  slug: string;
  is_active: boolean;
  created_at?: string;
  admins: TenantAdmin[];
}

/** Eye icon for show/hide password toggle */
const EyeIcon = ({ open }: { open: boolean }) =>
  open ? (
    <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' className='w-4 h-4'>
      <path d='M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94' />
      <path d='M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19' />
      <line x1='1' y1='1' x2='23' y2='23' />
    </svg>
  ) : (
    <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' className='w-4 h-4'>
      <path d='M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z' />
      <circle cx='12' cy='12' r='3' />
    </svg>
  );

/** Password input with show/hide toggle */
const PwdInput = ({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) => {
  const [show, setShow] = useState(false);
  return (
    <div className='relative'>
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className='oai-input pr-10'
        style={{ width: '100%' }}
      />
      <button
        type='button'
        onClick={() => setShow((s) => !s)}
        className='absolute right-3 top-1/2 -translate-y-1/2'
        style={{ color: 'var(--oai-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        tabIndex={-1}
        aria-label={show ? 'Hide password' : 'Show password'}
      >
        <EyeIcon open={show} />
      </button>
    </div>
  );
};

/** Inline form to reset a tenant-admin's password */
const ResetPasswordForm = ({
  tenantId,
  admin,
  onClose,
}: {
  tenantId: string;
  admin: TenantAdmin;
  onClose: () => void;
}) => {
  const { enqueueSnackbar } = useSnackbar();
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPwd.length < 8) {
      enqueueSnackbar('Password must be at least 8 characters', { variant: 'warning' });
      return;
    }
    if (newPwd !== confirmPwd) {
      enqueueSnackbar('Passwords do not match', { variant: 'error' });
      return;
    }
    setLoading(true);
    try {
      await api.put(`/superuser/tenants/${tenantId}/admins/${admin.id}/password`, {
        new_password: newPwd,
      });
      enqueueSnackbar(`Password updated for ${admin.email}`, { variant: 'success' });
      onClose();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { msg?: string } } }).response?.data?.msg ||
        'Failed to update password';
      enqueueSnackbar(msg, { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className='mt-3 p-3 rounded-lg space-y-2'
      style={{ backgroundColor: 'var(--oai-hover)', border: '1px solid var(--oai-border)' }}
    >
      <p className='text-xs font-medium' style={{ color: 'var(--oai-muted)' }}>
        Reset password for <strong style={{ color: 'var(--oai-text)' }}>{admin.email}</strong>
      </p>
      <PwdInput value={newPwd} onChange={setNewPwd} placeholder='New password (min. 8 chars)' />
      <PwdInput value={confirmPwd} onChange={setConfirmPwd} placeholder='Confirm new password' />
      <div className='flex gap-2'>
        <button
          type='submit'
          disabled={loading}
          className='btn-primary'
          style={{ padding: '0.375rem 0.75rem', fontSize: '0.8rem' }}
        >
          {loading ? 'Saving…' : 'Set Password'}
        </button>
        <button
          type='button'
          onClick={onClose}
          style={{ color: 'var(--oai-muted)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem' }}
        >
          Cancel
        </button>
      </div>
    </form>
  );
};

const SuperuserDashboard: React.FC = () => {
  const session = useSession();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();

  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(false);
  const [resetTarget, setResetTarget] = useState<{ tenantId: string; admin: TenantAdmin } | null>(null);

  // Guard: redirect to login if not superuser
  useEffect(() => {
    if (!session || session.role !== 'superuser') {
      navigate('/login');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadTenants = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<{ data: Tenant[] }>('/superuser/tenants');
      setTenants(res.data.data || []);
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } }).response?.status;
      if (status === 401 || status === 403) {
        // Stale or invalid session — clear it and redirect to login
        localStorage.removeItem('session');
        navigate('/login');
        return;
      }
      enqueueSnackbar('Failed to load tenants', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [enqueueSnackbar, navigate]);

  // Load tenants once on mount
  useEffect(() => {
    loadTenants();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSuspend = async (tenant: Tenant) => {
    if (!window.confirm(`Suspend store "${tenant.store_name}"? Their users will not be able to log in.`)) return;
    try {
      await api.put(`/superuser/tenants/${tenant.id}/suspend`);
      enqueueSnackbar(`"${tenant.store_name}" suspended`, { variant: 'success' });
      setTenants((prev) =>
        prev.map((t) => (t.id === tenant.id ? { ...t, is_active: false } : t)),
      );
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { msg?: string } } }).response?.data?.msg ||
        'Failed to suspend tenant';
      enqueueSnackbar(msg, { variant: 'error' });
    }
  };

  const handleActivate = async (tenant: Tenant) => {
    try {
      await api.put(`/superuser/tenants/${tenant.id}/activate`);
      enqueueSnackbar(`"${tenant.store_name}" activated`, { variant: 'success' });
      setTenants((prev) =>
        prev.map((t) => (t.id === tenant.id ? { ...t, is_active: true } : t)),
      );
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { msg?: string } } }).response?.data?.msg ||
        'Failed to activate tenant';
      enqueueSnackbar(msg, { variant: 'error' });
    }
  };

  const handleSignOut = () => {
    localStorage.removeItem('session');
    navigate('/login');
  };

  if (!session) return null;

  return (
    <div className='min-h-screen' style={{ backgroundColor: 'var(--oai-bg)' }}>
      {/* Top nav */}
      <header
        style={{
          backgroundColor: 'var(--oai-surface)',
          borderBottom: '1px solid var(--oai-border)',
          position: 'sticky',
          top: 0,
          zIndex: 50,
        }}
      >
        <div className='max-w-7xl mx-auto px-6 h-14 flex items-center justify-between'>
          <div className='flex items-center gap-2'>
            <span>🛡️</span>
            <h1 className='text-base font-semibold tracking-tight' style={{ color: 'var(--oai-text)' }}>
              System Admin Dashboard
            </h1>
            <span
              className='text-xs px-2 py-0.5 rounded-full ml-1'
              style={{
                backgroundColor: 'rgba(239,68,68,0.12)',
                color: '#ef4444',
                border: '1px solid #ef4444',
              }}
            >
              superuser
            </span>
          </div>
          <button
            onClick={handleSignOut}
            className='text-xs font-medium transition-colors'
            style={{ color: 'var(--oai-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--oai-muted)')}
          >
            Sign out
          </button>
        </div>
      </header>

      <main className='max-w-5xl mx-auto px-6 py-10'>
        {/* Header */}
        <div className='mb-8'>
          <h2 className='text-2xl font-semibold' style={{ color: 'var(--oai-text)' }}>
            Tenant Management
          </h2>
          <p className='text-sm mt-1' style={{ color: 'var(--oai-muted)' }}>
            {tenants.length} registered store{tenants.length !== 1 ? 's' : ''} ·{' '}
            {tenants.filter((t) => t.is_active).length} active ·{' '}
            {tenants.filter((t) => !t.is_active).length} suspended
          </p>
        </div>

        {loading ? (
          <div className='flex justify-center py-16'>
            <Spinner />
          </div>
        ) : tenants.length === 0 ? (
          <div className='oai-card p-8 text-center'>
            <p style={{ color: 'var(--oai-muted)' }}>No tenants registered yet.</p>
          </div>
        ) : (
          <div className='space-y-4'>
            {tenants.map((tenant) => (
              <div
                key={tenant.id}
                className='oai-card p-6'
                style={{
                  borderLeft: `4px solid ${tenant.is_active ? 'var(--oai-green)' : '#ef4444'}`,
                }}
              >
                {/* Tenant header row */}
                <div className='flex items-start justify-between gap-4'>
                  <div className='flex-1 min-w-0'>
                    <div className='flex items-center gap-2 flex-wrap'>
                      <h3 className='text-base font-semibold' style={{ color: 'var(--oai-text)' }}>
                        {tenant.store_name}
                      </h3>
                      <span
                        className='text-xs px-2 py-0.5 rounded-full'
                        style={{
                          backgroundColor: tenant.is_active
                            ? 'rgba(16,185,129,0.1)'
                            : 'rgba(239,68,68,0.1)',
                          color: tenant.is_active ? 'var(--oai-green)' : '#ef4444',
                          border: `1px solid ${tenant.is_active ? 'var(--oai-green)' : '#ef4444'}`,
                        }}
                      >
                        {tenant.is_active ? 'Active' : 'Suspended'}
                      </span>
                    </div>
                    <p className='text-xs mt-0.5' style={{ color: 'var(--oai-subtle)' }}>
                      /store/{tenant.slug}
                    </p>
                  </div>

                  {/* Action buttons */}
                  <div className='flex gap-2 shrink-0'>
                    {tenant.is_active ? (
                      <button
                        onClick={() => handleSuspend(tenant)}
                        className='text-xs px-3 py-1.5 rounded-md font-medium transition-colors'
                        style={{
                          backgroundColor: 'rgba(239,68,68,0.1)',
                          color: '#ef4444',
                          border: '1px solid #ef4444',
                          cursor: 'pointer',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.2)')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.1)')}
                      >
                        Suspend
                      </button>
                    ) : (
                      <button
                        onClick={() => handleActivate(tenant)}
                        className='text-xs px-3 py-1.5 rounded-md font-medium transition-colors'
                        style={{
                          backgroundColor: 'rgba(16,185,129,0.1)',
                          color: 'var(--oai-green)',
                          border: '1px solid var(--oai-green)',
                          cursor: 'pointer',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(16,185,129,0.2)')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'rgba(16,185,129,0.1)')}
                      >
                        Activate
                      </button>
                    )}
                  </div>
                </div>

                {/* Admins section */}
                {tenant.admins.length > 0 && (
                  <div className='mt-4'>
                    <p className='text-xs font-semibold mb-2' style={{ color: 'var(--oai-muted)' }}>
                      ADMIN{tenant.admins.length > 1 ? 'S' : ''}
                    </p>
                    <div className='space-y-2'>
                      {tenant.admins.map((admin) => (
                        <div key={admin.id}>
                          <div
                            className='flex items-center justify-between rounded-lg px-3 py-2'
                            style={{
                              backgroundColor: 'var(--oai-bg)',
                              border: '1px solid var(--oai-border)',
                            }}
                          >
                            <div>
                              <span className='text-sm font-medium' style={{ color: 'var(--oai-text)' }}>
                                {admin.name}
                              </span>
                              <span className='text-xs ml-2' style={{ color: 'var(--oai-muted)' }}>
                                {admin.email}
                              </span>
                            </div>
                            <button
                              onClick={() =>
                                setResetTarget(
                                  resetTarget?.admin.id === admin.id
                                    ? null
                                    : { tenantId: tenant.id, admin },
                                )
                              }
                              className='text-xs px-2 py-1 rounded'
                              style={{
                                color: 'var(--oai-green)',
                                border: '1px solid var(--oai-green)',
                                background: 'none',
                                cursor: 'pointer',
                              }}
                            >
                              {resetTarget?.admin.id === admin.id ? 'Cancel' : 'Reset Password'}
                            </button>
                          </div>

                          {/* Inline reset password form */}
                          {resetTarget?.admin.id === admin.id && resetTarget.tenantId === tenant.id && (
                            <ResetPasswordForm
                              tenantId={tenant.id}
                              admin={admin}
                              onClose={() => setResetTarget(null)}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {tenant.admins.length === 0 && (
                  <p className='text-xs mt-3' style={{ color: 'var(--oai-subtle)' }}>
                    No admin users found for this tenant.
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default SuperuserDashboard;
