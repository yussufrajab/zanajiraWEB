'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { login } from '../../../lib/admin-api';

export default function AdminLogin() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [mfaRequired, setMfaRequired] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = await login(email, password, mfaCode || undefined);
      if (res.mfaRequired) {
        setMfaRequired(true);
        setSubmitting(false);
        return;
      }
      localStorage.setItem('accessToken', res.accessToken);
      localStorage.setItem('user', JSON.stringify(res.user));
      router.push('/admin/dashboard');
    } catch {
      setSubmitting(false);
      setError('Invalid credentials');
    }
  }

  return (
    <div className="admin-login-page">
      <div className="admin-login-card fade-in">
        <div className="admin-login-brand">
          <img src="/branding/logo.png" alt="CSC Zanzibar logo" />
          <h1>Admin Login</h1>
          <p>Civil Service Commission — Zanzibar</p>
        </div>

        {error && <div className="admin-alert admin-alert-error">{error}</div>}

        <form onSubmit={submit} className="admin-form">
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              autoComplete="email"
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </label>
          {mfaRequired && (
            <label>
              MFA code
              <input
                inputMode="numeric"
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value)}
                required
                autoComplete="one-time-code"
                placeholder="Enter 6-digit code"
              />
            </label>
          )}
          <button type="submit" className="admin-btn admin-btn-primary" disabled={submitting}>
            {submitting && <span className="spinner" aria-hidden="true" />}
            Sign in
          </button>
        </form>
      </div>
    </div>
  );
}
