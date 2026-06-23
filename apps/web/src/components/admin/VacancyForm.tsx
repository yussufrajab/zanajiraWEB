'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminApi } from '@/lib/admin-api';
import { DocumentUploader } from './DocumentUploader';

export function VacancyForm({ initial }: { initial?: any }) {
  const router = useRouter();
  const [form, setForm] = useState({
    title: initial?.title ?? '',
    mda: initial?.mda ?? '',
    closingDate: initial?.closingDate?.slice(0, 10) ?? '',
    applyUrl: initial?.applyUrl ?? 'https://portal.zanajira.go.tz/home',
    departmentId: initial?.departmentId ?? '',
  });
  const [departments, setDepartments] = useState<{ id: string; nameSw: string; nameEn?: string }[]>([]);
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    adminApi.departments().then(setDepartments).catch(() => setDepartments([]));
  }, []);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (initial?.id) {
        await adminApi.vacancyUpdate(initial.id, form);
      } else {
        const created = await adminApi.vacancyCreate(form);
        router.push(`/admin/vacancies/${created.id}`);
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
      await adminApi.vacancyTransition(initial.id, to, comment || undefined);
      router.refresh();
    } catch (err: any) {
      setError(err.message ?? `Transition to ${to} failed`);
    }
  }

  return (
    <form onSubmit={save} className="admin-form fade-in">
      <div className="admin-page-header">
        <h1>{initial?.id ? 'Edit vacancy' : 'New vacancy'}</h1>
      </div>

      {error && <div className="admin-alert admin-alert-error">{error}</div>}

      <div className="admin-form-section">
        <h2>Basic details</h2>
        <div className="admin-form-grid">
          <label>
            Title *
            <input value={form.title} onChange={set('title')} required />
          </label>
          <label>
            MDA *
            <input value={form.mda} onChange={set('mda')} required />
          </label>
          <label>
            Department
            <select value={form.departmentId} onChange={set('departmentId')}>
              <option value="">— Select department —</option>
              {departments.map((d) => <option key={d.id} value={d.id}>{d.nameSw}{d.nameEn ? ` / ${d.nameEn}` : ''}</option>)}
            </select>
          </label>
          <label>
            Closing date *
            <input type="date" value={form.closingDate} onChange={set('closingDate')} required />
          </label>
          <label className="full-width">
            Apply URL
            <input type="url" value={form.applyUrl} onChange={set('applyUrl')} />
          </label>
        </div>
      </div>

      {initial?.id && (
        <div className="admin-form-section">
          <h2>Documents</h2>
          <DocumentUploader ownerType="Vacancy" ownerId={initial.id} />
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
