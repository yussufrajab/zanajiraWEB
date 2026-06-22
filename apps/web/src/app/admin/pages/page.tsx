'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { adminApi } from '@/lib/admin-api';

interface PageNode {
  id: string;
  slug: string;
  titleSw: string;
  children?: PageNode[];
}

function PageItem({ page, depth = 0 }: { page: PageNode; depth?: number }) {
  return (
    <li style={{ paddingLeft: `${depth * 1.2}rem` }}>
      <Link href={`/admin/pages/${page.slug}`}>{page.slug}</Link> — {page.titleSw}
      {page.children && page.children.length > 0 && (
        <ul>{page.children.map((c) => <PageItem key={c.id} page={c} depth={depth + 1} />)}</ul>
      )}
    </li>
  );
}

export default function PagesAdmin() {
  const [tree, setTree] = useState<PageNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    adminApi.pageTree()
      .then(setTree)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1>Static pages</h1>
      <Link href="/admin/pages/new">+ New page</Link>
      {loading && <p>Loading…</p>}
      {error && <p role="alert">{error}</p>}
      <ul className="admin-list">{tree.map((p) => <PageItem key={p.id} page={p} />)}</ul>
    </div>
  );
}
