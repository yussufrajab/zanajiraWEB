'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

export function AdminShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const token = localStorage.getItem('accessToken');
    if (!token && pathname !== '/admin/login') {
      router.replace('/admin/login');
      return;
    }
    setReady(true);
  }, [router, pathname]);

  if (!ready) return <p>Loading…</p>;
  if (pathname === '/admin/login') return <>{children}</>;

  return (
    <div className="admin">
      <aside>
        <nav aria-label="Admin">
          <Link href="/admin/dashboard">Dashboard</Link>
          <Link href="/admin/news">News</Link>
          <Link href="/admin/vacancies">Vacancies</Link>
          <Link href="/admin/interviews">Interviews</Link>
          <Link href="/admin/pages">Pages</Link>
          <Link href="/admin/users">Users</Link>
          <Link href="/admin/reviews">Reviews</Link>
        </nav>
      </aside>
      <main>{children}</main>
    </div>
  );
}
