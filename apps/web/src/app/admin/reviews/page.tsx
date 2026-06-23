'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { adminApi } from '@/lib/admin-api';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { Loading } from '@/components/Loading';
import { EmptyState } from '@/components/EmptyState';

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
    <div className="fade-in">
      <div className="admin-page-header">
        <h1>Pending review</h1>
      </div>

      {loading && <Loading />}
      {error && <div className="admin-alert admin-alert-error">{error}</div>}

      {!loading && !error && items.length === 0 && (
        <EmptyState title="Nothing waiting for review" message="All submitted content has been reviewed." />
      )}

      {!loading && !error && items.length > 0 && (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Title</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={`${item.type}-${item.id}`}>
                  <td>{item.type}</td>
                  <td>{item.title}</td>
                  <td><StatusBadge status={item.status} /></td>
                  <td style={{ textAlign: 'right' }}>
                    <Link href={item.href} className="admin-btn admin-btn-outline admin-btn-sm">Review</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
