'use client';

import { useEffect, useState } from 'react';
import { VacancyForm } from '@/components/admin/VacancyForm';
import { adminApi } from '@/lib/admin-api';

export default function EditVacancy({ params }: { params: { id: string } }) {
  const [item, setItem] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    adminApi.vacancyById(params.id)
      .then(setItem)
      .catch((err) => setError(err.message));
  }, [params.id]);

  if (error) return <p role="alert">{error}</p>;
  if (!item) return <p>Loading…</p>;
  return <VacancyForm initial={item} />;
}
