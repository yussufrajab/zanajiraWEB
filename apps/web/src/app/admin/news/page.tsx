'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { adminApi } from '@/lib/admin-api';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { Loading } from '@/components/Loading';
import { EmptyState } from '@/components/EmptyState';

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
    <div className="fade-in">
      <div className="admin-page-header">
        <h1>News</h1>
        <Link href="/admin/news/new" className="admin-btn admin-btn-primary">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New news
        </Link>
      </div>

      <div className="admin-toolbar">
        <label className="admin-filter">
          Status
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            {STATUSES.map((s) => <option key={s} value={s}>{s || 'All (public)'}</option>)}
          </select>
        </label>
      </div>

      {loading && <Loading />}
      {error && <div className="admin-alert admin-alert-error">{error}</div>}

      {!loading && !error && items.length === 0 && (
        <EmptyState title="No news items" message="Create your first news article to get started." />
      )}

      {!loading && !error && items.length > 0 && (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Title (Swahili)</th>
                <th>Status</th>
                <th>Published</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((n) => (
                <tr key={n.id}>
                  <td>{n.titleSw}</td>
                  <td><StatusBadge status={n.status} /></td>
                  <td>{n.publishDate ? new Date(n.publishDate).toLocaleDateString() : '—'}</td>
                  <td style={{ textAlign: 'right' }}>
                    <Link href={`/admin/news/${n.id}`} className="admin-btn admin-btn-outline admin-btn-sm">Edit</Link>
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
