'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { adminApi } from '@/lib/admin-api';

const STATUSES = ['', 'Draft', 'InReview', 'Published', 'Rejected', 'Archived'];

export default function NewsAdmin() {
  const [items, setItems] = useState<any[]>([]);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    adminApi.newsList(status || undefined)
      .then((d) => setItems(d.items ?? []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [status]);

  return (
    <div>
      <h1>News</h1>
      <Link href="/admin/news/new">+ New news</Link>
      <label className="status-filter">Status
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          {STATUSES.map((s) => <option key={s} value={s}>{s || 'All (public)'}</option>)}
        </select>
      </label>
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
