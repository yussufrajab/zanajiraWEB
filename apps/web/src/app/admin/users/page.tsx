'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { UserForm } from '@/components/admin/UserForm';
import { adminApi } from '@/lib/admin-api';

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
    return <p role="alert">You do not have permission to manage users.</p>;
  }

  return (
    <div>
      <h1>Users</h1>
      {error && <p role="alert">{error}</p>}
      <UserForm />
      {loading && <p>Loading…</p>}
      <table className="admin-table">
        <thead>
          <tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th></th></tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id}>
              <td>{u.name}</td>
              <td>{u.email}</td>
              <td>{u.role}</td>
              <td>{u.status}</td>
              <td><Link href={`/admin/users/${u.id}`}>Edit</Link></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
