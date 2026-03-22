import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import api from '../utils/api';
import { useSession } from '../hooks/useSession';
import Spinner from '../components/Spinner';
import DashboardLayout from '../components/DashboardLayout';

interface QRCodeData {
  catalog_url: string;
  qr_data_uri: string | null;
}

interface SearchConfig {
  idx_title: boolean;
  idx_author: boolean;
  idx_isbn: boolean;
  idx_publisher: boolean;
  idx_genre: boolean;
  idx_description: boolean;
  idx_publish_year: boolean;
  idx_language: boolean;
  idx_keywords: boolean;
}

const DEFAULT_SEARCH_CONFIG: SearchConfig = {
  idx_title: true,
  idx_author: true,
  idx_isbn: true,
  idx_publisher: true,
  idx_genre: true,
  idx_description: true,
  idx_publish_year: true,
  idx_language: true,
  idx_keywords: true,
};

const SEARCH_FIELD_LABELS: Record<keyof SearchConfig, string> = {
  idx_title: 'Title',
  idx_author: 'Author',
  idx_isbn: 'ISBN',
  idx_publisher: 'Publisher',
  idx_genre: 'Genre',
  idx_description: 'Description',
  idx_publish_year: 'Publication Year',
  idx_language: 'Language',
  idx_keywords: 'Keyword Tags',
};

interface TenantUser {
  id: string;
  name: string;
  email: string;
  role: string;
  created_at?: string;
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

/** Chevron icon for collapse toggle */
const ChevronIcon = ({ open }: { open: boolean }) => (
  <svg
    xmlns='http://www.w3.org/2000/svg'
    viewBox='0 0 24 24'
    fill='none'
    stroke='currentColor'
    strokeWidth='2'
    className='w-4 h-4 transition-transform duration-200'
    style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
  >
    <polyline points='6 9 12 15 18 9' />
  </svg>
);

/** Collapsible section wrapper */
const Section = ({
  title,
  defaultOpen = true,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className='oai-card overflow-hidden'>
      <button
        type='button'
        onClick={() => setOpen((o) => !o)}
        className='w-full flex items-center justify-between px-6 py-4'
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          borderBottom: open ? '1px solid var(--oai-border)' : 'none',
        }}
      >
        <h2 className='text-base font-semibold' style={{ color: 'var(--oai-text)' }}>
          {title}
        </h2>
        <span style={{ color: 'var(--oai-muted)' }}>
          <ChevronIcon open={open} />
        </span>
      </button>
      {open && <div className='px-6 py-5'>{children}</div>}
    </div>
  );
};

/** Horizontal divider with label */
const SubHeading = ({ label }: { label: string }) => (
  <div
    className='flex items-center gap-3 my-5'
    style={{ borderTop: '1px solid var(--oai-border)', paddingTop: '1.25rem' }}
  >
    <span className='text-xs font-semibold uppercase tracking-widest' style={{ color: 'var(--oai-muted)' }}>
      {label}
    </span>
  </div>
);

/** Password input with show/hide toggle */
const PwdInput = ({
  value,
  onChange,
  placeholder,
  required,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
}) => {
  const [show, setShow] = useState(false);
  return (
    <div className='relative'>
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
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

const TenantSettingsPage: React.FC = () => {
  const session = useSession();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const isAdmin = session?.role === 'tenant-admin';

  // ── Store Settings state ────────────────────────────────────────────────────
  const [storeName, setStoreName] = useState(session?.tenant?.store_name || '');
  const [storeNameLoading, setStoreNameLoading] = useState(false);

  const [logoPreview, setLogoPreview] = useState<string | null>(session?.tenant?.logo_url || null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoLoading, setLogoLoading] = useState(false);

  // ── Search Config state (admin only) ────────────────────────────────────────
  const [searchConfig, setSearchConfig] = useState<SearchConfig>(DEFAULT_SEARCH_CONFIG);
  const [searchConfigLoading, setSearchConfigLoading] = useState(false);
  const [searchConfigSaving, setSearchConfigSaving] = useState(false);
  const [reindexLoading, setReindexLoading] = useState(false);
  const [reindexResult, setReindexResult] = useState<{ indexed_count: number; total_books: number } | null>(null);

  // ── OpenAI / QR ─────────────────────────────────────────────────────────────
  const [apiKey, setApiKey] = useState('');
  const [apiKeyLoading, setApiKeyLoading] = useState(false);
  const [qrData, setQrData] = useState<QRCodeData | null>(null);
  const [qrLoading, setQrLoading] = useState(false);

  // ── Password change state (all users) ───────────────────────────────────────
  const [profileCurrentPwd, setProfileCurrentPwd] = useState('');
  const [profileNewPwd, setProfileNewPwd] = useState('');
  const [profileConfirmPwd, setProfileConfirmPwd] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);

  // ── User list + create (admin only) ─────────────────────────────────────────
  const [users, setUsers] = useState<TenantUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPwd, setNewUserPwd] = useState('');
  const [newUserConfirmPwd, setNewUserConfirmPwd] = useState('');
  const [createUserLoading, setCreateUserLoading] = useState(false);

  const loadSearchConfig = useCallback(async () => {
    if (!isAdmin) return;
    setSearchConfigLoading(true);
    try {
      const res = await api.get<{ data: SearchConfig }>('/tenant/search-config');
      setSearchConfig(res.data.data || DEFAULT_SEARCH_CONFIG);
    } catch {
      // silently fall back to defaults
    } finally {
      setSearchConfigLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    if (!session) navigate('/login');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadUsers = useCallback(async () => {
    if (!isAdmin) return;
    setUsersLoading(true);
    try {
      const res = await api.get<{ data: TenantUser[] }>('/auth/users');
      setUsers(res.data.data || []);
    } catch {
      // silently fail
    } finally {
      setUsersLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    if (isAdmin) {
      loadUsers();
      loadSearchConfig();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleSaveStoreName = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = storeName.trim();
    if (!trimmed || trimmed.length < 2) {
      enqueueSnackbar('Store name must be at least 2 characters', { variant: 'warning' });
      return;
    }
    setStoreNameLoading(true);
    try {
      await api.put('/tenant/settings', { store_name: trimmed });
      const stored = JSON.parse(localStorage.getItem('session') || 'null');
      if (stored?.tenant) { stored.tenant.store_name = trimmed; localStorage.setItem('session', JSON.stringify(stored)); }
      enqueueSnackbar('Store name updated!', { variant: 'success' });
    } catch (err: unknown) {
      enqueueSnackbar((err as { response?: { data?: { msg?: string } } }).response?.data?.msg || 'Failed to update store name', { variant: 'error' });
    } finally {
      setStoreNameLoading(false);
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setLogoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleLogoUpload = async () => {
    if (!logoFile) { enqueueSnackbar('Please select a logo file first', { variant: 'warning' }); return; }
    setLogoLoading(true);
    try {
      const formData = new FormData();
      formData.append('logo', logoFile);
      const res = await api.post<{ msg: string; tenant: { logo_url: string | null } }>('/tenant/logo', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      const stored = JSON.parse(localStorage.getItem('session') || 'null');
      if (stored?.tenant) { stored.tenant.logo_url = res.data.tenant?.logo_url; localStorage.setItem('session', JSON.stringify(stored)); }
      enqueueSnackbar('Logo updated successfully!', { variant: 'success' });
      setLogoFile(null);
    } catch (err: unknown) {
      enqueueSnackbar((err as { response?: { data?: { msg?: string } } }).response?.data?.msg || 'Logo upload failed', { variant: 'error' });
    } finally {
      setLogoLoading(false);
    }
  };

  const handleSaveApiKey = async () => {
    if (!apiKey.trim()) { enqueueSnackbar('An OpenAI API key is required', { variant: 'warning' }); return; }
    setApiKeyLoading(true);
    try {
      await api.put('/tenant/apikey', { openai_api_key: apiKey.trim() });
      enqueueSnackbar('OpenAI API key saved successfully!', { variant: 'success' });
      setApiKey('');
    } catch (err: unknown) {
      enqueueSnackbar((err as { response?: { data?: { msg?: string } } }).response?.data?.msg || 'Failed to save API key', { variant: 'error' });
    } finally {
      setApiKeyLoading(false);
    }
  };

  const handleGenerateQR = async () => {
    setQrLoading(true);
    try {
      const res = await api.get<QRCodeData>('/tenant/qrcode');
      setQrData(res.data);
    } catch (err: unknown) {
      enqueueSnackbar((err as { response?: { data?: { msg?: string } } }).response?.data?.msg || 'QR code generation failed', { variant: 'error' });
    } finally {
      setQrLoading(false);
    }
  };

  const handleDownloadQR = () => {
    if (!qrData?.qr_data_uri) return;
    const link = document.createElement('a');
    link.href = qrData.qr_data_uri;
    link.download = `${session?.tenant?.slug || 'store'}-qrcode.png`;
    link.click();
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileCurrentPwd) { enqueueSnackbar('Current password is required', { variant: 'warning' }); return; }
    if (!profileNewPwd) { enqueueSnackbar('New password is required', { variant: 'warning' }); return; }
    if (profileNewPwd.length < 8) { enqueueSnackbar('New password must be at least 8 characters', { variant: 'warning' }); return; }
    if (profileNewPwd !== profileConfirmPwd) { enqueueSnackbar('Passwords do not match', { variant: 'error' }); return; }
    setProfileLoading(true);
    try {
      await api.put('/auth/profile', { current_password: profileCurrentPwd, new_password: profileNewPwd });
      enqueueSnackbar('Password updated successfully!', { variant: 'success' });
      setProfileCurrentPwd(''); setProfileNewPwd(''); setProfileConfirmPwd('');
    } catch (err: unknown) {
      enqueueSnackbar((err as { response?: { data?: { msg?: string } } }).response?.data?.msg || 'Failed to update password', { variant: 'error' });
    } finally {
      setProfileLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim()) { enqueueSnackbar('Name is required', { variant: 'warning' }); return; }
    if (!newUserEmail.trim()) { enqueueSnackbar('Email is required', { variant: 'warning' }); return; }
    if (newUserPwd.length < 8) { enqueueSnackbar('Password must be at least 8 characters', { variant: 'warning' }); return; }
    if (newUserPwd !== newUserConfirmPwd) { enqueueSnackbar('Passwords do not match', { variant: 'error' }); return; }
    setCreateUserLoading(true);
    try {
      await api.post('/auth/users', { name: newUserName.trim(), email: newUserEmail.trim(), password: newUserPwd });
      enqueueSnackbar(`User "${newUserName.trim()}" created successfully`, { variant: 'success' });
      setNewUserName(''); setNewUserEmail(''); setNewUserPwd(''); setNewUserConfirmPwd('');
      loadUsers();
    } catch (err: unknown) {
      enqueueSnackbar((err as { response?: { data?: { msg?: string } } }).response?.data?.msg || 'Failed to create user', { variant: 'error' });
    } finally {
      setCreateUserLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!window.confirm(`Delete user "${userName}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/auth/users/${userId}`);
      enqueueSnackbar(`User "${userName}" deleted`, { variant: 'success' });
      setUsers((prev) => prev.filter((u) => u.id !== userId));
    } catch (err: unknown) {
      enqueueSnackbar((err as { response?: { data?: { msg?: string } } }).response?.data?.msg || 'Failed to delete user', { variant: 'error' });
    }
  };

  const handleSaveSearchConfig = async () => {
    setSearchConfigSaving(true);
    try {
      const res = await api.put<{ data: SearchConfig }>('/tenant/search-config', searchConfig);
      setSearchConfig(res.data.data || searchConfig);
      enqueueSnackbar('Search configuration saved!', { variant: 'success' });
    } catch (err: unknown) {
      enqueueSnackbar((err as { response?: { data?: { msg?: string } } }).response?.data?.msg || 'Failed to save search configuration', { variant: 'error' });
    } finally {
      setSearchConfigSaving(false);
    }
  };

  const handleReindex = async () => {
    setReindexLoading(true);
    setReindexResult(null);
    try {
      const res = await api.post<{ indexed_count: number; total_books: number; msg: string }>('/tenant/search-reindex');
      setReindexResult({ indexed_count: res.data.indexed_count, total_books: res.data.total_books });
      enqueueSnackbar(`Reindex complete: ${res.data.indexed_count} of ${res.data.total_books} books indexed`, { variant: 'success' });
    } catch (err: unknown) {
      enqueueSnackbar((err as { response?: { data?: { msg?: string } } }).response?.data?.msg || 'Reindex failed', { variant: 'error' });
    } finally {
      setReindexLoading(false);
    }
  };

  const handleSignOut = () => { localStorage.removeItem('session'); navigate('/login'); };

  if (!session) return null;

  return (
    <DashboardLayout>
      <main className='max-w-2xl mx-auto px-6 py-10 space-y-3'>

        {/* ── Store Information ─────────────────────────────────────────────── */}
        <Section title='Store Information' defaultOpen={true}>
          <p className='text-sm mb-2' style={{ color: 'var(--oai-muted)' }}>
            Signed in as: <strong style={{ color: 'var(--oai-text)' }}>{session.user?.email}</strong>
            {' '}
            <span
              className='text-xs px-2 py-0.5 rounded-full'
              style={{
                backgroundColor: isAdmin ? 'rgba(16,185,129,0.1)' : 'rgba(99,102,241,0.1)',
                color: isAdmin ? 'var(--oai-green)' : '#818cf8',
                border: `1px solid ${isAdmin ? 'var(--oai-green)' : '#818cf8'}`,
              }}
            >
              {isAdmin ? 'Admin' : 'User'}
            </span>
          </p>
          <p className='text-sm' style={{ color: 'var(--oai-subtle)' }}>
            Store URL: <code style={{ color: 'var(--oai-green)' }}>/store/{session.tenant?.slug}</code>
          </p>
        </Section>

        {/* ── Store Settings (admin only): Name + Logo ──────────────────────── */}
        {isAdmin && (
          <Section title='Store Settings' defaultOpen={false}>
            {/* Store Name */}
            <p className='text-xs font-semibold uppercase tracking-widest mb-3' style={{ color: 'var(--oai-muted)' }}>
              Store Name
            </p>
            <p className='text-sm mb-3' style={{ color: 'var(--oai-muted)' }}>
              Change the display name shown in the nav bar and buyer catalog.
            </p>
            <form onSubmit={handleSaveStoreName} className='flex items-center gap-3 mb-6'>
              <input
                type='text'
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                placeholder='My Awesome Book Store'
                className='oai-input flex-1'
                minLength={2}
                maxLength={100}
                required
              />
              <button
                type='submit'
                disabled={storeNameLoading}
                className='btn-primary'
                style={{ padding: '0.5rem 1rem', fontSize: '0.875rem', whiteSpace: 'nowrap' }}
              >
                {storeNameLoading ? 'Saving…' : 'Save Name'}
              </button>
            </form>

            {/* Store Logo */}
            <div style={{ borderTop: '1px solid var(--oai-border)', paddingTop: '1.25rem' }}>
              <p className='text-xs font-semibold uppercase tracking-widest mb-3' style={{ color: 'var(--oai-muted)' }}>
                Store Logo
              </p>
              <p className='text-sm mb-4' style={{ color: 'var(--oai-muted)' }}>
                Upload a custom logo shown in the nav bar and buyer-facing catalog.
              </p>

              {logoPreview && (
                <div className='mb-4'>
                  <img
                    src={logoPreview}
                    alt='Logo preview'
                    className='rounded-lg border'
                    style={{ maxHeight: '80px', maxWidth: '200px', objectFit: 'contain', borderColor: 'var(--oai-border)' }}
                  />
                </div>
              )}

              <div className='flex items-center gap-3'>
                <label className='btn-primary cursor-pointer' style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}>
                  Choose File
                  <input
                    type='file'
                    accept='image/jpeg,image/png,image/webp,image/svg+xml'
                    onChange={handleLogoChange}
                    className='hidden'
                  />
                </label>
                {logoFile && (
                  <span className='text-sm' style={{ color: 'var(--oai-muted)' }}>
                    {logoFile.name}
                  </span>
                )}
              </div>

              {logoFile && (
                <button
                  onClick={handleLogoUpload}
                  disabled={logoLoading}
                  className='btn-primary mt-3'
                  style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
                >
                  {logoLoading ? 'Uploading…' : 'Upload Logo'}
                </button>
              )}
            </div>
          </Section>
        )}

        {/* ── User Management: user list (admin) + password change (all) ───── */}
        <Section title='User Management' defaultOpen={false}>

          {/* Admin: user list */}
          {isAdmin && (
            <>
              <p className='text-xs font-semibold uppercase tracking-widest mb-3' style={{ color: 'var(--oai-muted)' }}>
                All Users
              </p>
              {usersLoading ? (
                <Spinner />
              ) : users.length === 0 ? (
                <p className='text-sm mb-4' style={{ color: 'var(--oai-subtle)' }}>No additional users yet.</p>
              ) : (
                <div className='space-y-2 mb-5'>
                  {users.map((u) => (
                    <div
                      key={u.id}
                      className='flex items-center justify-between rounded-lg px-4 py-2'
                      style={{ backgroundColor: 'var(--oai-bg)', border: '1px solid var(--oai-border)' }}
                    >
                      <div>
                        <span className='text-sm font-medium' style={{ color: 'var(--oai-text)' }}>
                          {u.name}
                        </span>
                        <span className='text-xs ml-2' style={{ color: 'var(--oai-muted)' }}>
                          {u.email}
                        </span>
                      </div>
                      <div className='flex items-center gap-3'>
                        <span
                          className='text-xs px-2 py-0.5 rounded-full'
                          style={{
                            backgroundColor: u.role === 'tenant-admin' ? 'rgba(16,185,129,0.1)' : 'rgba(99,102,241,0.1)',
                            color: u.role === 'tenant-admin' ? 'var(--oai-green)' : '#818cf8',
                            border: `1px solid ${u.role === 'tenant-admin' ? 'var(--oai-green)' : '#818cf8'}`,
                          }}
                        >
                          {u.role === 'tenant-admin' ? 'Admin' : 'User'}
                        </span>
                        {u.role !== 'tenant-admin' && (
                          <button
                            onClick={() => handleDeleteUser(u.id, u.name)}
                            className='text-xs'
                            style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem 0.5rem' }}
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Add new user */}
              <div style={{ borderTop: '1px solid var(--oai-border)', paddingTop: '1.25rem', marginBottom: '1.5rem' }}>
                <p className='text-xs font-semibold uppercase tracking-widest mb-3' style={{ color: 'var(--oai-muted)' }}>
                  Add New User
                </p>
                <form onSubmit={handleCreateUser} className='space-y-3'>
                  <div>
                    <label className='oai-label'>Full Name</label>
                    <input type='text' value={newUserName} onChange={(e) => setNewUserName(e.target.value)} placeholder='Jane Smith' className='oai-input' />
                  </div>
                  <div>
                    <label className='oai-label'>Email</label>
                    <input type='email' value={newUserEmail} onChange={(e) => setNewUserEmail(e.target.value)} placeholder='jane@store.com' className='oai-input' />
                  </div>
                  <div>
                    <label className='oai-label'>Password <span style={{ color: '#ef4444' }}>*</span></label>
                    <PwdInput value={newUserPwd} onChange={setNewUserPwd} placeholder='Min. 8 characters' />
                  </div>
                  <div>
                    <label className='oai-label'>Confirm Password <span style={{ color: '#ef4444' }}>*</span></label>
                    <PwdInput value={newUserConfirmPwd} onChange={setNewUserConfirmPwd} placeholder='Retype password' />
                  </div>
                  <button type='submit' disabled={createUserLoading} className='btn-primary' style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}>
                    {createUserLoading ? 'Creating…' : 'Create User'}
                  </button>
                </form>
              </div>
            </>
          )}

          {/* All users: change own password */}
          <div style={ isAdmin ? { borderTop: '1px solid var(--oai-border)', paddingTop: '1.25rem' } : {}}>
            <p className='text-xs font-semibold uppercase tracking-widest mb-3' style={{ color: 'var(--oai-muted)' }}>
              Change Your Password
            </p>
            <p className='text-sm mb-4' style={{ color: 'var(--oai-muted)' }}>
              Enter your current password to authorize the change.
            </p>
            <form onSubmit={handleUpdatePassword} className='space-y-3'>
              <div>
                <label className='oai-label'>Current Password <span style={{ color: '#ef4444' }}>*</span></label>
                <PwdInput value={profileCurrentPwd} onChange={setProfileCurrentPwd} placeholder='Your current password' required />
              </div>
              <div>
                <label className='oai-label'>New Password <span style={{ color: '#ef4444' }}>*</span></label>
                <PwdInput value={profileNewPwd} onChange={setProfileNewPwd} placeholder='Min. 8 characters' />
              </div>
              <div>
                <label className='oai-label'>Confirm New Password <span style={{ color: '#ef4444' }}>*</span></label>
                <PwdInput value={profileConfirmPwd} onChange={setProfileConfirmPwd} placeholder='Retype new password' />
              </div>
              <button type='submit' disabled={profileLoading} className='btn-primary' style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}>
                {profileLoading ? 'Saving…' : 'Change Password'}
              </button>
            </form>
          </div>
        </Section>

        {/* ── Search Index Settings (admin only) ──────────────────────────── */}
        {isAdmin && (
          <Section title='Search Index Settings' defaultOpen={false}>
            <p className='text-sm mb-4' style={{ color: 'var(--oai-muted)' }}>
              Choose which book fields are indexed in Elasticsearch for full-text search.
              All fields are enabled by default. Disable fields to reduce noise or improve relevance.
              After changing the configuration, click <strong>Save Config</strong> and then
              <strong> Rebuild Search Index</strong> to apply changes to existing books.
            </p>

            {searchConfigLoading ? (
              <Spinner />
            ) : (
              <div className='space-y-3 mb-5'>
                {(Object.keys(SEARCH_FIELD_LABELS) as Array<keyof SearchConfig>).map((field) => (
                  <label
                    key={field}
                    className='flex items-center justify-between cursor-pointer rounded-lg px-4 py-3'
                    style={{ backgroundColor: 'var(--oai-bg)', border: '1px solid var(--oai-border)' }}
                  >
                    <span className='text-sm font-medium' style={{ color: 'var(--oai-text)' }}>
                      {SEARCH_FIELD_LABELS[field]}
                    </span>
                    <div className='relative inline-flex items-center'>
                      <input
                        type='checkbox'
                        checked={searchConfig[field]}
                        onChange={(e) => setSearchConfig((prev) => ({ ...prev, [field]: e.target.checked }))}
                        className='sr-only peer'
                      />
                      <div
                        onClick={() => setSearchConfig((prev) => ({ ...prev, [field]: !prev[field] }))}
                        className='w-11 h-6 rounded-full cursor-pointer transition-colors duration-200'
                        style={{
                          backgroundColor: searchConfig[field] ? 'var(--oai-green)' : 'var(--oai-border)',
                          position: 'relative',
                        }}
                      >
                        <div
                          className='absolute top-0.5 left-0.5 w-5 h-5 rounded-full transition-transform duration-200'
                          style={{
                            backgroundColor: 'white',
                            transform: searchConfig[field] ? 'translateX(20px)' : 'translateX(0)',
                          }}
                        />
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            )}

            <div className='flex flex-wrap items-center gap-3 mt-2'>
              <button
                onClick={handleSaveSearchConfig}
                disabled={searchConfigSaving || searchConfigLoading}
                className='btn-primary'
                style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
              >
                {searchConfigSaving ? 'Saving…' : 'Save Config'}
              </button>

              <button
                onClick={handleReindex}
                disabled={reindexLoading}
                className='btn-primary'
                style={{ padding: '0.5rem 1rem', fontSize: '0.875rem', backgroundColor: 'rgba(99,102,241,0.15)', color: '#818cf8', border: '1px solid #818cf8' }}
              >
                {reindexLoading ? 'Rebuilding…' : 'Rebuild Search Index'}
              </button>
            </div>

            {reindexResult && (
              <p className='text-sm mt-3' style={{ color: 'var(--oai-green)' }}>
                ✓ Indexed {reindexResult.indexed_count} of {reindexResult.total_books} books successfully.
              </p>
            )}
          </Section>
        )}

        {/* ── OpenAI API Key (all users) ───────────────────────────────────── */}
        <Section title='OpenAI API Key' defaultOpen={false}>
          <p className='text-sm mb-4' style={{ color: 'var(--oai-muted)' }}>
            Required for AI-powered book recognition. Stored encrypted. Leave blank to keep the existing key.
          </p>
          <div className='flex items-center gap-3'>
            <input
              type='password'
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder='sk-...'
              className='oai-input flex-1'
            />
            <button
              onClick={handleSaveApiKey}
              disabled={apiKeyLoading}
              className='btn-primary'
              style={{ padding: '0.5rem 1rem', fontSize: '0.875rem', whiteSpace: 'nowrap' }}
            >
              {apiKeyLoading ? 'Saving…' : 'Save Key'}
            </button>
          </div>
        </Section>

        {/* ── Buyer QR Code (all users) ─────────────────────────────────────── */}
        <Section title='Buyer QR Code' defaultOpen={false}>
          <p className='text-sm mb-4' style={{ color: 'var(--oai-muted)' }}>
            Generate a QR code buyers can scan to open your catalog directly.
          </p>

          {!qrData && (
            <button onClick={handleGenerateQR} disabled={qrLoading} className='btn-primary' style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}>
              {qrLoading ? <Spinner /> : 'Generate QR Code'}
            </button>
          )}

          {qrData && (
            <div>
              <p className='text-sm mb-3' style={{ color: 'var(--oai-muted)' }}>
                Catalog URL:{' '}
                <a href={qrData.catalog_url} target='_blank' rel='noopener noreferrer' style={{ color: 'var(--oai-green)' }}>
                  {qrData.catalog_url}
                </a>
              </p>

              {qrData.qr_data_uri ? (
                <div className='flex flex-col items-start gap-3'>
                  <img src={qrData.qr_data_uri} alt='QR Code' className='rounded-lg border' style={{ borderColor: 'var(--oai-border)', width: 200, height: 200 }} />
                  <div className='flex gap-2'>
                    <button onClick={handleDownloadQR} className='btn-primary' style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}>
                      Download PNG
                    </button>
                    <button onClick={() => setQrData(null)} className='text-sm' style={{ color: 'var(--oai-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
                      Regenerate
                    </button>
                  </div>
                </div>
              ) : (
                <p className='text-sm' style={{ color: 'var(--oai-subtle)' }}>
                  {(qrData as unknown as { msg?: string }).msg || 'QR code image unavailable.'}
                </p>
              )}
            </div>
          )}
        </Section>
      </main>
    </DashboardLayout>
  );
};

export default TenantSettingsPage;
