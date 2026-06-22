'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { adminApi } from '@/lib/admin-api';

const STATUSES = ['', 'Draft', 'InReview', 'Published', 'Rejected', 'Archived'];

export default function InterviewsAdmin() {
  const [items, setItems] = useState<any[]>([]);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    adminApi.interviewList(status || undefined)
      .then((d) => setItems(d.items ?? []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [status]);

  return (
    <div>
      <h1>Interviews</h1>
      <Link href="/admin/interviews/new">+ New interview notice</Link>
      <label className="status-filter">Status
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          {STATUSES.map((s) => <option key={s} value={s}>{s || 'All (public)'}</option>)}
        </select>
      </label>
      {loading && <p>Loading…</p>}
      {error && <p role="alert">{error}</p>}
      <ul className="admin-list">
        {items.map((i) => (
          <li key={i.id}>
            <Link href={`/admin/interviews/${i.id}`}>{i.title}</Link> — {i.type} — {i.status}
          </li>
        ))}
      </ul>
    </div>
  );
}
