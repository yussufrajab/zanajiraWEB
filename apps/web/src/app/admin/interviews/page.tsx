'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { adminApi } from '@/lib/admin-api';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { Loading } from '@/components/Loading';
import { EmptyState } from '@/components/EmptyState';

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
    <div className="fade-in">
      <div className="admin-page-header">
        <h1>Interviews</h1>
        <Link href="/admin/interviews/new" className="admin-btn admin-btn-primary">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New interview notice
        </Link>
      </div>

      <div className="admin-toolbar">
        <label className="admin-filter">
          Status
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            {STATUSES.map((s) => <option key={s} value={s}>{s || 'All'}</option>)}
          </select>
        </label>
      </div>

      {loading && <Loading />}
      {error && <div className="admin-alert admin-alert-error">{error}</div>}

      {!loading && !error && items.length === 0 && (
        <EmptyState title="No interview notices" message="Create your first interview notice to get started." />
      )}

      {!loading && !error && items.length > 0 && (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Type</th>
                <th>MDA</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((i) => (
                <tr key={i.id}>
                  <td>{i.title}</td>
                  <td>{i.type}</td>
                  <td>{i.mda}</td>
                  <td><StatusBadge status={i.status} /></td>
                  <td style={{ textAlign: 'right' }}>
                    <Link href={`/admin/interviews/${i.id}`} className="admin-btn admin-btn-outline admin-btn-sm">Edit</Link>
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
