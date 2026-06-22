'use client';

import { useEffect, useState } from 'react';
import { InterviewForm } from '@/components/admin/InterviewForm';
import { adminApi } from '@/lib/admin-api';

export default function EditInterview({ params }: { params: { id: string } }) {
  const [item, setItem] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    adminApi.interviewById(params.id)
      .then(setItem)
      .catch((err) => setError(err.message));
  }, [params.id]);

  if (error) return <p role="alert">{error}</p>;
  if (!item) return <p>Loading…</p>;
  return <InterviewForm initial={item} />;
}
