'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { UserForm } from '@/components/admin/UserForm';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { adminApi } from '@/lib/admin-api';
import { Loading } from '@/components/Loading';
import { EmptyState } from '@/components/EmptyState';

export default function UsersAdmin() {
  const [user] = useState(() => JSON.parse((typeof window !== 'undefined' && localStorage.getItem('user')) || '{}'));
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    adminApi.usersList()
      .then(setUsers)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (user.role !== 'Administrator') {
    return <div className="admin-alert admin-alert-error" role="alert">You do not have permission to manage users.</div>;
  }

  return (
    <div className="fade-in">
      <div className="admin-page-header">
        <h1>Users</h1>
      </div>

      <section className="admin-card mb-6">
        <div className="admin-card-body">
          <UserForm />
        </div>
      </section>

      {error && <div className="admin-alert admin-alert-error">{error}</div>}
      {loading && <Loading />}

      {!loading && !error && users.length === 0 && (
        <EmptyState title="No users" message="Add the first user using the form above." />
      )}

      {!loading && !error && users.length > 0 && (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.name}</td>
                  <td>{u.email}</td>
                  <td>{u.role}</td>
                  <td><StatusBadge status={u.status} /></td>
                  <td style={{ textAlign: 'right' }}>
                    <Link href={`/admin/users/${u.id}`} className="admin-btn admin-btn-outline admin-btn-sm">Edit</Link>
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
