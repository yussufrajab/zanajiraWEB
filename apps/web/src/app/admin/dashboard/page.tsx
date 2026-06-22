'use client';

export default function Dashboard() {
  const user = JSON.parse((typeof window !== 'undefined' && localStorage.getItem('user')) || '{}');
  return (
    <div>
      <h1>Dashboard</h1>
      <p>Signed in as {user.name ?? 'Unknown'} ({user.role ?? 'Unknown'})</p>
      <ul>
        <li>Create News, Vacancy, or Interview notice</li>
        <li>Review pending submissions</li>
        <li>Manage users and static pages</li>
      </ul>
    </div>
  );
}
