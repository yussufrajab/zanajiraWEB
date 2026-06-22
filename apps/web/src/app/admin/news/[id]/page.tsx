'use client';

import { useEffect, useState } from 'react';
import { NewsForm } from '@/components/admin/NewsForm';
import { adminApi } from '@/lib/admin-api';

export default function EditNews({ params }: { params: { id: string } }) {
  const [item, setItem] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    adminApi.newsById(params.id)
      .then(setItem)
      .catch((err) => setError(err.message));
  }, [params.id]);

  if (error) return <p role="alert">{error}</p>;
  if (!item) return <p>Loading…</p>;
  return <NewsForm initial={item} />;
}
