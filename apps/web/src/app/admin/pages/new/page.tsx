'use client';

import { useEffect, useState } from 'react';
import { PageForm } from '@/components/admin/PageForm';
import { adminApi } from '@/lib/admin-api';

export default function NewPage() {
  const [parents, setParents] = useState<{ id: string; slug: string; titleSw: string }[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    adminApi.pageTree()
      .then((tree: any[]) => setParents(tree.map((p) => ({ id: p.id, slug: p.slug, titleSw: p.titleSw }))))
      .catch((err) => setError(err.message));
  }, []);

  if (error) return <p role="alert">{error}</p>;
  return <PageForm parents={parents} />;
}
