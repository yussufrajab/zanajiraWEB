'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminApi } from '@/lib/admin-api';

const ROLES = ['Editor', 'Reviewer', 'Administrator'];
const STATUSES = ['Active', 'Deactivated'];

export function UserForm({ initial }: { initial?: any }) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: initial?.name ?? '',
    email: initial?.email ?? '',
    role: initial?.role ?? 'Editor',
    status: initial?.status ?? 'Active',
    password: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess(false);
    try {
      if (initial?.id) {
        const { password, ...rest } = form;
        await adminApi.userUpdate(initial.id, rest);
      } else {
        await adminApi.userCreate(form);
        setForm({ name: '', email: '', role: 'Editor', status: 'Active', password: '' });
        setSuccess(true);
      }
      if (initial?.id) {
        router.push('/admin/users');
      }
    } catch (err: any) {
      setError(err.message ?? 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="admin-form">
      <h2>{initial?.id ? 'Edit user' : 'New user'}</h2>

      {success && <div className="admin-alert admin-alert-info">User created successfully.</div>}
      {error && <div className="admin-alert admin-alert-error">{error}</div>}

      <div className="admin-form-grid">
        <label>
          Name *
          <input value={form.name} onChange={set('name')} required />
        </label>
        <label>
          Email *
          <input type="email" value={form.email} onChange={set('email')} required />
        </label>
        <label>
          Role *
          <select value={form.role} onChange={set('role')} required>
            {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </label>
        <label>
          Status *
          <select value={form.status} onChange={set('status')} required>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
        {!initial?.id && (
          <label>
            Password *
            <input type="password" value={form.password} onChange={set('password')} required />
          </label>
        )}
      </div>

      <button type="submit" className="admin-btn admin-btn-primary" disabled={saving}>
        {saving && <span className="spinner" aria-hidden="true" />}
        {initial?.id ? 'Update user' : 'Create user'}
      </button>
    </form>
  );
}
