'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { adminApi } from '@/lib/admin-api';
import { Loading } from '@/components/Loading';
import { EmptyState } from '@/components/EmptyState';

interface PageNode {
  id: string;
  slug: string;
  titleSw: string;
  titleEn?: string;
  children?: PageNode[];
}

function PageItem({ page, depth = 0 }: { page: PageNode; depth?: number }) {
  return (
    <li className="page-tree-item" style={{ paddingLeft: `${depth * 1.5}rem` }}>
      <div className="page-tree-row">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
        <div className="page-tree-meta">
          <Link href={`/admin/pages/${page.slug}`}>{page.slug}</Link>
          <span className="text-muted">{page.titleSw}{page.titleEn ? ` / ${page.titleEn}` : ''}</span>
        </div>
      </div>
      {page.children && page.children.length > 0 && (
        <ul className="page-tree-children">{page.children.map((c) => <PageItem key={c.id} page={c} depth={depth + 1} />)}</ul>
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
    <div className="fade-in">
      <div className="admin-page-header">
        <h1>Static pages</h1>
        <Link href="/admin/pages/new" className="admin-btn admin-btn-primary">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New page
        </Link>
      </div>

      {loading && <Loading />}
      {error && <div className="admin-alert admin-alert-error">{error}</div>}

      {!loading && !error && tree.length === 0 && (
        <EmptyState title="No pages" message="Create your first static page to get started." />
      )}

      {!loading && !error && tree.length > 0 && (
        <div className="admin-card">
          <div className="admin-card-body">
            <ul className="page-tree">
              {tree.map((p) => <PageItem key={p.id} page={p} />)}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
