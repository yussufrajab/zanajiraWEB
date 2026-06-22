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

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      const res = await login(email, password, mfaCode || undefined);
      if (res.mfaRequired) {
        setMfaRequired(true);
        return;
      }
      localStorage.setItem('accessToken', res.accessToken);
      localStorage.setItem('user', JSON.stringify(res.user));
      router.push('/admin/dashboard');
    } catch {
      setError('Invalid credentials');
    }
  }

  return (
    <form onSubmit={submit} className="admin-login">
      <h1>Admin Login</h1>
      {error && <p role="alert">{error}</p>}
      <label>
        Email
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </label>
      <label>
        Password
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      </label>
      {mfaRequired && (
        <label>
          MFA code
          <input inputMode="numeric" value={mfaCode} onChange={(e) => setMfaCode(e.target.value)} required />
        </label>
      )}
      <button type="submit">Sign in</button>
    </form>
  );
}
