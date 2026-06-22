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
    <form onSubmit={save} className="admin-form">
      <h1>{initial?.id ? 'Edit news' : 'New news'}</h1>
      {error && <p role="alert">{error}</p>}
      <label>Title (Swahili) <input value={form.titleSw} onChange={set('titleSw')} required /></label>
      <label>Title (English) <input value={form.titleEn} onChange={set('titleEn')} /></label>
      <label>Body (Swahili) <textarea value={form.bodySw} onChange={set('bodySw')} rows={8} required /></label>
      <label>Body (English) <textarea value={form.bodyEn} onChange={set('bodyEn')} rows={8} /></label>
      <label>Publish date <input type="date" value={form.publishDate} onChange={set('publishDate')} /></label>
      {initial?.id && <DocumentUploader ownerType="NewsPost" ownerId={initial.id} />}
      <div className="form-actions">
        <button type="submit" disabled={saving}>Save draft</button>
        {initial?.id && (
          <>
            <button type="button" onClick={() => transition('InReview')}>Submit for review</button>
            <button type="button" className="success" onClick={() => transition('Published')}>Publish</button>
            <button type="button" className="danger" onClick={() => transition('Rejected')}>Reject</button>
          </>
        )}
      </div>
      {initial?.id && (
        <label>Reviewer comment (for reject / request changes)
          <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3} />
        </label>
      )}
    </form>
  );
}
