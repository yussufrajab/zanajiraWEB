'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminApi } from '@/lib/admin-api';

export function PageForm({ initial, parents }: { initial?: any; parents: { id: string; slug: string; titleSw: string }[] }) {
  const router = useRouter();
  const [form, setForm] = useState({
    slug: initial?.slug ?? '',
    titleSw: initial?.titleSw ?? '',
    titleEn: initial?.titleEn ?? '',
    bodySw: initial?.bodySw ?? '',
    bodyEn: initial?.bodyEn ?? '',
    parentId: initial?.parentId ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await adminApi.pageUpsert(form);
      router.push('/admin/pages');
    } catch (err: any) {
      setError(err.message ?? 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="admin-form">
      <h1>{initial?.slug ? 'Edit page' : 'New page'}</h1>
      {error && <p role="alert">{error}</p>}
      <label>Slug
        <input value={form.slug} onChange={set('slug')} required readOnly={!!initial?.slug} />
      </label>
      <label>Title (Swahili) <input value={form.titleSw} onChange={set('titleSw')} required /></label>
      <label>Title (English) <input value={form.titleEn} onChange={set('titleEn')} /></label>
      <label>Body (Swahili) <textarea value={form.bodySw} onChange={set('bodySw')} rows={12} required /></label>
      <label>Body (English) <textarea value={form.bodyEn} onChange={set('bodyEn')} rows={12} /></label>
      <label>Parent page
        <select value={form.parentId} onChange={set('parentId')}>
          <option value="">— No parent —</option>
          {parents.map((p) => <option key={p.id} value={p.id}>{p.slug} ({p.titleSw})</option>)}
        </select>
      </label>
      <button type="submit" disabled={saving}>Save page</button>
    </form>
  );
}
