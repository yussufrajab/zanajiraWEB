'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { adminApi } from '@/lib/admin-api';

export default function InterviewsAdmin() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    adminApi.interviewList()
      .then((d) => setItems(d.items ?? []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1>Interviews</h1>
      <Link href="/admin/interviews/new">+ New interview notice</Link>
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
