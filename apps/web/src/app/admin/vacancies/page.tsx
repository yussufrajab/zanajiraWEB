'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { adminApi } from '@/lib/admin-api';

export default function VacanciesAdmin() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    adminApi.vacancyList()
      .then((d) => setItems(d.items ?? []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1>Vacancies</h1>
      <Link href="/admin/vacancies/new">+ New vacancy</Link>
      {loading && <p>Loading…</p>}
      {error && <p role="alert">{error}</p>}
      <ul className="admin-list">
        {items.map((v) => (
          <li key={v.id}>
            <Link href={`/admin/vacancies/${v.id}`}>{v.title}</Link> — {v.status}
          </li>
        ))}
      </ul>
    </div>
  );
}
