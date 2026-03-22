import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSession } from '../hooks/useSession';
import axios from 'axios';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const NAV_ITEMS = [
  {
    id: 'search',
    label: 'Search',
    path: '/search',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
    ),
  },
  {
    id: 'inventory',
    label: 'Inventory',
    path: '/home',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      </svg>
    ),
  },
  {
    id: 'management',
    label: 'Management',
    path: '/settings',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14" />
        <path d="M12 2v2M12 20v2M2 12h2M20 12h2" />
      </svg>
    ),
  },
];

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const session = useSession();
  const navigate = useNavigate();
  const location = useLocation();

  const [tenantName, setTenantName] = useState(session?.tenant?.store_name || 'Planet of Books');
  const [tenantLogo, setTenantLogo] = useState<string | null>(session?.tenant?.logo_url || null);

  useEffect(() => {
    const slug = session?.tenant?.slug;
    if (!slug) return;
    axios
      .get<{ data: { store_name: string; logo_url: string | null } }>(`/tenant/${slug}/info`)
      .then((res) => {
        const fresh = res.data.data;
        setTenantName(fresh.store_name || 'Planet of Books');
        setTenantLogo(fresh.logo_url || null);
        const stored = JSON.parse(localStorage.getItem('session') || 'null');
        if (stored?.tenant) {
          stored.tenant.store_name = fresh.store_name;
          stored.tenant.logo_url = fresh.logo_url;
          localStorage.setItem('session', JSON.stringify(stored));
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSignOut = () => {
    localStorage.removeItem('session');
    navigate('/login');
  };

  const activeTab = NAV_ITEMS.find((item) => location.pathname === item.path)?.id || 'inventory';

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: 'var(--oai-bg)' }}>
      {/* Left sidebar */}
      <aside
        style={{
          width: '220px',
          minWidth: '220px',
          backgroundColor: 'var(--oai-surface)',
          borderRight: '1px solid var(--oai-border)',
          display: 'flex',
          flexDirection: 'column',
          position: 'fixed',
          top: 0,
          left: 0,
          bottom: 0,
          zIndex: 40,
        }}
      >
        {/* Logo / brand */}
        <div
          style={{
            padding: '1rem 1.25rem',
            borderBottom: '1px solid var(--oai-border)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.625rem',
            minHeight: '56px',
          }}
        >
          {tenantLogo ? (
            <img src={tenantLogo} alt="logo" style={{ height: '24px', objectFit: 'contain', flexShrink: 0 }} />
          ) : (
            <img src="/logo.svg" alt="BookStore" style={{ height: '24px', width: 'auto', flexShrink: 0 }} />
          )}
          <span
            className="store-brand-name"
            style={{
              color: 'var(--oai-text)',
              fontSize: '0.9rem',
              fontWeight: 600,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {tenantName}
          </span>
        </div>

        {/* Nav items */}
        <nav style={{ flex: 1, padding: '0.75rem 0' }}>
          {NAV_ITEMS.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => navigate(item.path)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  width: '100%',
                  padding: '0.625rem 1.25rem',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontSize: '0.875rem',
                  fontWeight: isActive ? 600 : 400,
                  color: isActive ? 'var(--oai-text)' : 'var(--oai-muted)',
                  backgroundColor: isActive ? 'var(--oai-hover)' : 'transparent',
                  borderLeft: isActive ? '3px solid var(--oai-green)' : '3px solid transparent',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = 'var(--oai-hover)';
                    e.currentTarget.style.color = 'var(--oai-text)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = 'var(--oai-muted)';
                  }
                }}
              >
                <span style={{ flexShrink: 0, opacity: isActive ? 1 : 0.7 }}>{item.icon}</span>
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Sign out at bottom */}
        <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid var(--oai-border)' }}>
          <button
            onClick={handleSignOut}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.625rem',
              width: '100%',
              padding: '0.5rem 0',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.8125rem',
              color: 'var(--oai-muted)',
              transition: 'color 0.15s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--oai-muted)')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Sign out
          </button>
        </div>
      </aside>

      {/* Main area with slim top bar */}
      <div style={{ flex: 1, marginLeft: '220px', display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        {/* Slim top header — user info + sign out */}
        <header
          style={{
            backgroundColor: 'var(--oai-surface)',
            borderBottom: '1px solid var(--oai-border)',
            height: '56px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 1.5rem',
            position: 'sticky',
            top: 0,
            zIndex: 30,
          }}
        >
          {/* Logged-in user info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15" style={{ color: 'var(--oai-muted)', flexShrink: 0 }}>
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            <span className="text-xs" style={{ color: 'var(--oai-muted)' }}>
              Logged as:{' '}
              <strong style={{ color: 'var(--oai-text)', fontWeight: 600 }}>
                {session?.user?.name || session?.user?.email || 'Unknown'}
              </strong>
              {', '}
              <span
                style={{
                  color: session?.role === 'tenant-admin' ? 'var(--oai-green)' : '#818cf8',
                  fontWeight: 500,
                }}
              >
                {session?.role === 'tenant-admin' ? 'Admin' : session?.role === 'superuser' ? 'Superuser' : 'User'}
              </span>
            </span>
          </div>

          <button
            onClick={handleSignOut}
            className="text-xs font-medium transition-colors"
            style={{ color: 'var(--oai-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--oai-muted)')}
          >
            Sign out
          </button>
        </header>

        {/* Page content */}
        <main style={{ flex: 1 }}>
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
