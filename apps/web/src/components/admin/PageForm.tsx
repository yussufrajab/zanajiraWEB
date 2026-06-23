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
    <form onSubmit={save} className="admin-form fade-in">
      <div className="admin-page-header">
        <h1>{initial?.slug ? 'Edit page' : 'New page'}</h1>
      </div>

      {error && <div className="admin-alert admin-alert-error">{error}</div>}

      <div className="admin-form-section">
        <h2>Page info</h2>
        <div className="admin-form-grid">
          <label>
            Slug *
            <input value={form.slug} onChange={set('slug')} required readOnly={!!initial?.slug} />
          </label>
          <label>
            Parent page
            <select value={form.parentId} onChange={set('parentId')}>
              <option value="">— No parent —</option>
              {parents.map((p) => <option key={p.id} value={p.id}>{p.slug} ({p.titleSw})</option>)}
            </select>
          </label>
        </div>
      </div>

      <div className="admin-form-section">
        <h2>Titles</h2>
        <div className="admin-form-grid">
          <label>
            Title (Swahili) *
            <input value={form.titleSw} onChange={set('titleSw')} required />
          </label>
          <label>
            Title (English)
            <input value={form.titleEn} onChange={set('titleEn')} />
          </label>
        </div>
      </div>

      <div className="admin-form-section">
        <h2>Content</h2>
        <div className="admin-form-grid">
          <label className="full-width">
            Body (Swahili) *
            <textarea value={form.bodySw} onChange={set('bodySw')} rows={12} required />
          </label>
          <label className="full-width">
            Body (English)
            <textarea value={form.bodyEn} onChange={set('bodyEn')} rows={12} />
          </label>
        </div>
      </div>

      <div className="admin-form-section">
        <button type="submit" className="admin-btn admin-btn-primary" disabled={saving}>
          {saving && <span className="spinner" aria-hidden="true" />}
          Save page
        </button>
      </div>
    </form>
  );
}
