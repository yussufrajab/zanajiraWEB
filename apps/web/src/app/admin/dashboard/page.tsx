'use client';

import { useEffect, useState } from 'react';

type DashboardData = {
  byMonth: { month: string; count: number }[];
  byMda: { mda: string; _count: number }[];
  topDocs: { id: string; filename: string; downloadCount: number }[];
};

export default function Dashboard() {
  const user = JSON.parse((typeof window !== 'undefined' && localStorage.getItem('user')) || '{}');
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setError('No access token found. Please log in again.');
      return;
    }
    fetch('/api/analytics/dashboard', { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => {
        if (!res.ok) throw new Error(`Dashboard request failed: ${res.status}`);
        return res.json();
      })
      .then((json) => setData(json))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <div style={{ maxWidth: 900 }}>
      <h1>Dashboard</h1>
      <p>Signed in as {user.name ?? 'Unknown'} ({user.role ?? 'Unknown'})</p>

      {loading && <p>Loading analytics…</p>}
      {error && <p style={{ color: 'crimson' }}>{error}</p>}

      {!loading && !error && data && (
        <>
          <section style={{ marginBottom: 24 }}>
            <h2>Published content by month</h2>
            <table border={1} cellPadding={6} style={{ borderCollapse: 'collapse', width: '100%' }}>
              <thead>
                <tr>
                  <th>Month</th>
                  <th style={{ textAlign: 'right' }}>Count</th>
                </tr>
              </thead>
              <tbody>
                {data.byMonth.map((row) => (
                  <tr key={row.month}>
                    <td>{row.month}</td>
                    <td style={{ textAlign: 'right' }}>{row.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section style={{ marginBottom: 24 }}>
            <h2>Vacancies by MDA</h2>
            <table border={1} cellPadding={6} style={{ borderCollapse: 'collapse', width: '100%' }}>
              <thead>
                <tr>
                  <th>MDA</th>
                  <th style={{ textAlign: 'right' }}>Count</th>
                </tr>
              </thead>
              <tbody>
                {data.byMda.map((row) => (
                  <tr key={row.mda}>
                    <td>{row.mda}</td>
                    <td style={{ textAlign: 'right' }}>{row._count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section>
            <h2>Top downloaded documents</h2>
            <table border={1} cellPadding={6} style={{ borderCollapse: 'collapse', width: '100%' }}>
              <thead>
                <tr>
                  <th>Filename</th>
                  <th style={{ textAlign: 'right' }}>Downloads</th>
                </tr>
              </thead>
              <tbody>
                {data.topDocs.map((doc) => (
                  <tr key={doc.id}>
                    <td>{doc.filename}</td>
                    <td style={{ textAlign: 'right' }}>{doc.downloadCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      )}
    </div>
  );
}
