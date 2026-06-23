'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminApi } from '@/lib/admin-api';
import { DocumentUploader } from './DocumentUploader';

export function NewsForm({ initial }: { initial?: any }) {
  const router = useRouter();
  const [form, setForm] = useState({
    titleSw: initial?.titleSw ?? '',
    titleEn: initial?.titleEn ?? '',
    bodySw: initial?.bodySw ?? '',
    bodyEn: initial?.bodyEn ?? '',
    publishDate: initial?.publishDate?.slice(0, 10) ?? '',
  });
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (initial?.id) {
        await adminApi.newsUpdate(initial.id, form);
      } else {
        const created = await adminApi.newsCreate(form);
        router.push(`/admin/news/${created.id}`);
        return;
      }
    } catch (err: any) {
      setError(err.message ?? 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function transition(to: string) {
    if (!initial?.id) return;
    setError('');
    try {
      await adminApi.newsTransition(initial.id, to, comment || undefined);
      router.refresh();
    } catch (err: any) {
      setError(err.message ?? `Transition to ${to} failed`);
    }
  }

  return (
    <form onSubmit={save} className="admin-form fade-in">
      <div className="admin-page-header">
        <h1>{initial?.id ? 'Edit news' : 'New news'}</h1>
      </div>

      {error && <div className="admin-alert admin-alert-error">{error}</div>}

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
            <textarea value={form.bodySw} onChange={set('bodySw')} rows={10} required />
          </label>
          <label className="full-width">
            Body (English)
            <textarea value={form.bodyEn} onChange={set('bodyEn')} rows={10} />
          </label>
        </div>
      </div>

      <div className="admin-form-section">
        <h2>Publishing</h2>
        <div className="admin-form-grid">
          <label>
            Publish date
            <input type="date" value={form.publishDate} onChange={set('publishDate')} />
          </label>
        </div>
      </div>

      {initial?.id && (
        <div className="admin-form-section">
          <h2>Documents</h2>
          <DocumentUploader ownerType="NewsPost" ownerId={initial.id} />
        </div>
      )}

      <div className="admin-form-section">
        <div className="admin-form-actions">
          <button type="submit" className="admin-btn admin-btn-primary" disabled={saving}>
            {saving && <span className="spinner" aria-hidden="true" />}
            Save draft
          </button>
          {initial?.id && (
            <>
              <button type="button" className="admin-btn admin-btn-outline" onClick={() => transition('InReview')}>Submit for review</button>
              <button type="button" className="admin-btn admin-btn-success" onClick={() => transition('Published')}>Publish</button>
              <button type="button" className="admin-btn admin-btn-danger" onClick={() => transition('Rejected')}>Reject</button>
            </>
          )}
        </div>

        {initial?.id && (
          <label className="full-width" style={{ marginTop: '1rem' }}>
            Reviewer comment (for reject / request changes)
            <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3} />
          </label>
        )}
      </div>
    </form>
  );
}
