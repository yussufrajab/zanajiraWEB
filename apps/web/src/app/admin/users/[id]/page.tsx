'use client';

import { useEffect, useState } from 'react';
import { UserForm } from '@/components/admin/UserForm';
import { adminApi } from '@/lib/admin-api';

export default function EditUser({ params }: { params: { id: string } }) {
  const [user] = useState(() => JSON.parse((typeof window !== 'undefined' && localStorage.getItem('user')) || '{}'));
  const [item, setItem] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    adminApi.usersList()
      .then((list: any[]) => {
        const found = list.find((u) => u.id === params.id);
        if (!found) throw new Error('User not found');
        setItem(found);
      })
      .catch((err) => setError(err.message));
  }, [params.id]);

  if (user.role !== 'Administrator') {
    return <p role="alert">You do not have permission to manage users.</p>;
  }

  if (error) return <p role="alert">{error}</p>;
  if (!item) return <p>Loading…</p>;
  return <UserForm initial={item} />;
}
