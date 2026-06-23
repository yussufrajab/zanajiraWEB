'use client';

import { useEffect, useState } from 'react';
import { adminApi } from '../../../lib/admin-api';
import { Loading } from '../../../components/Loading';
import { EmptyState } from '../../../components/EmptyState';

type DashboardData = {
  byMonth: { month: string; count: number }[];
  byMda: { mda: string; _count: number }[];
  topDocs: { id: string; filename: string; downloadCount: number }[];
};

export default function Dashboard() {
  const user = JSON.parse((typeof window !== 'undefined' && localStorage.getItem('user')) || '{}');
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi
      .dashboard()
      .then((json) => setData(json as DashboardData))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="fade-in">
      <div className="admin-page-header">
        <div>
          <h1>Dashboard</h1>
          <p className="text-muted">Signed in as {user.name ?? 'Unknown'} ({user.role ?? 'Unknown'})</p>
        </div>
      </div>

      {loading && <Loading />}
      {error && <div className="admin-alert admin-alert-error">{error}</div>}

      {!loading && !error && data && (
        <>
          <div className="stat-grid">
            <div className="stat-card">
              <div className="stat-card-label">Published Items</div>
              <div className="stat-card-value">{data.byMonth.reduce((sum, r) => sum + Number(r.count), 0)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-label">MDAs Hiring</div>
              <div className="stat-card-value">{data.byMda.length}</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-label">Documents</div>
              <div className="stat-card-value">{data.topDocs.length}</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-label">Recent Months</div>
              <div className="stat-card-value">{data.byMonth.length}</div>
            </div>
          </div>

          <div className="grid-2">
            <section className="admin-card">
              <div className="admin-card-body">
                <h2 className="admin-card-title">Published content by month</h2>
                {data.byMonth.length === 0 ? (
                  <EmptyState title="No data yet" />
                ) : (
                  <div className="admin-table-wrap">
                    <table className="admin-table">
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
                  </div>
                )}
              </div>
            </section>

            <section className="admin-card">
              <div className="admin-card-body">
                <h2 className="admin-card-title">Vacancies by MDA</h2>
                {data.byMda.length === 0 ? (
                  <EmptyState title="No vacancies yet" />
                ) : (
                  <div className="admin-table-wrap">
                    <table className="admin-table">
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
                  </div>
                )}
              </div>
            </section>
          </div>

          <section className="admin-card mt-4">
            <div className="admin-card-body">
              <h2 className="admin-card-title">Top downloaded documents</h2>
              {data.topDocs.length === 0 ? (
                <EmptyState title="No downloads yet" />
              ) : (
                <div className="admin-table-wrap">
                  <table className="admin-table">
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
                </div>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
