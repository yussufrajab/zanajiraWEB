'use client';

import { useRouter } from 'next/navigation';

export function AdminHeader({ onMenuClick }: { onMenuClick: () => void }) {
  const router = useRouter();
  const user = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || '{}') : {};

  function logout() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
    router.replace('/admin/login');
  }

  const initials = user.name
    ? user.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'AD';

  return (
    <header className="admin-header">
      <div className="admin-header-left">
        <button className="menu-toggle" onClick={onMenuClick} aria-label="Open menu">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <span className="text-muted" style={{ fontWeight: 600, color: 'var(--admin-text-muted)' }}>Admin Portal</span>
      </div>

      <div className="admin-header-right">
        <div className="admin-user">
          <div className="admin-avatar" aria-hidden="true">{initials}</div>
          <div className="admin-user-info">
            <span className="admin-user-name">{user.name || 'Admin User'}</span>
            <span className="admin-user-role">{user.role || 'Administrator'}</span>
          </div>
        </div>
        <button className="btn-logout" onClick={logout}>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          Logout
        </button>
      </div>
    </header>
  );
}
