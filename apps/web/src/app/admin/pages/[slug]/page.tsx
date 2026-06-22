'use client';

import { useEffect, useState } from 'react';
import { PageForm } from '@/components/admin/PageForm';
import { adminApi } from '@/lib/admin-api';

export default function EditPage({ params }: { params: { slug: string } }) {
  const [item, setItem] = useState<any>(null);
  const [parents, setParents] = useState<{ id: string; slug: string; titleSw: string }[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      adminApi.pageBySlug(params.slug),
      adminApi.pageTree().then((tree: any[]) => tree.map((p) => ({ id: p.id, slug: p.slug, titleSw: p.titleSw }))),
    ])
      .then(([page, p]) => { setItem(page); setParents(p); })
      .catch((err) => setError(err.message));
  }, [params.slug]);

  if (error) return <p role="alert">{error}</p>;
  if (!item) return <p>Loading…</p>;
  return <PageForm initial={item} parents={parents} />;
}
