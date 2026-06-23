'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Loading } from '../Loading';
import { AdminHeader } from './AdminHeader';
import { Sidebar } from './Sidebar';

export function AdminShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const token = localStorage.getItem('accessToken');
    if (!token && pathname !== '/admin/login') {
      router.replace('/admin/login');
      return;
    }
    setReady(true);
  }, [router, pathname]);

  if (!ready) return <Loading />;
  if (pathname === '/admin/login') return <>{children}</>;

  return (
    <div className="admin-layout">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="admin-main">
        <AdminHeader onMenuClick={() => setSidebarOpen(true)} />
        <main className="admin-content">{children}</main>
      </div>
    </div>
  );
}
