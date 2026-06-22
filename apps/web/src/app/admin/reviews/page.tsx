'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { adminApi } from '@/lib/admin-api';

interface ReviewItem {
  id: string;
  type: 'News' | 'Vacancy' | 'Interview';
  title: string;
  status: string;
  href: string;
}

export default function ReviewsAdmin() {
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      adminApi.newsList('InReview').then((d) => (d.items ?? []).map((n: any) => ({ id: n.id, type: 'News', title: n.titleSw, status: n.status, href: `/admin/news/${n.id}` }))),
      adminApi.vacancyList('InReview').then((d) => (d.items ?? []).map((v: any) => ({ id: v.id, type: 'Vacancy', title: v.title, status: v.status, href: `/admin/vacancies/${v.id}` }))),
      adminApi.interviewList('InReview').then((d) => (d.items ?? []).map((i: any) => ({ id: i.id, type: 'Interview', title: i.title, status: i.status, href: `/admin/interviews/${i.id}` }))),
    ])
      .then((groups) => setItems(groups.flat().sort((a, b) => a.title.localeCompare(b.title))))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1>Pending review</h1>
      {loading && <p>Loading…</p>}
      {error && <p role="alert">{error}</p>}
      {items.length === 0 && !loading && <p>Nothing waiting for review.</p>}
      <ul className="admin-list">
        {items.map((item) => (
          <li key={`${item.type}-${item.id}`}>
            <strong>{item.type}:</strong>{' '}
            <Link href={item.href}>{item.title}</Link> — {item.status}
          </li>
        ))}
      </ul>
    </div>
  );
}
