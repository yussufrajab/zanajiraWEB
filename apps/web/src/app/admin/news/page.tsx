'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { adminApi } from '@/lib/admin-api';

export default function NewsAdmin() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    adminApi.newsList()
      .then((d) => setItems(d.items ?? []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1>News</h1>
      <Link href="/admin/news/new">+ New news</Link>
      {loading && <p>Loading…</p>}
      {error && <p role="alert">{error}</p>}
      <ul className="admin-list">
        {items.map((n) => (
          <li key={n.id}>
            <Link href={`/admin/news/${n.id}`}>{n.titleSw}</Link> — {n.status}
          </li>
        ))}
      </ul>
    </div>
  );
}
