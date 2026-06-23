const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/api';

export interface LoginResult {
  accessToken: string;
  user: { id: string; email: string; name: string; role: string };
  mfaRequired?: boolean;
}

export async function login(email: string, password: string, mfaCode?: string): Promise<LoginResult> {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, mfaCode }),
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Login failed');
  return res.json();
}

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('accessToken');
}

async function authed(path: string, init?: RequestInit) {
  const token = getToken();
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: { ...init?.headers, Authorization: `Bearer ${token ?? ''}` },
  });
  if (!res.ok) throw new Error(`${path} ${res.status}`);
  return res.json();
}

export const adminApi = {
  newsList: (status?: string) => authed(`/news?page=1&pageSize=100${status ? `&status=${encodeURIComponent(status)}` : ''}`),
  newsCreate: (dto: any) => authed('/news', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dto) }),
  newsUpdate: (id: string, dto: any) => authed(`/news/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dto) }),
  newsTransition: (id: string, to: string, comment?: string) =>
    authed(`/news/${id}/transition`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ to, comment }) }),
  newsById: (id: string) => authed(`/news/by-id/${id}`),

  vacancyList: (status?: string) => authed(`/vacancies?page=1&pageSize=100${status ? `&status=${encodeURIComponent(status)}` : ''}`),
  vacancyCreate: (dto: any) => authed('/vacancies', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dto) }),
  vacancyUpdate: (id: string, dto: any) => authed(`/vacancies/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dto) }),
  vacancyTransition: (id: string, to: string, comment?: string) =>
    authed(`/vacancies/${id}/transition`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ to, comment }) }),
  vacancyById: (id: string) => authed(`/vacancies/by-id/${id}`),

  interviewList: (status?: string) => authed(`/interviews?page=1&pageSize=100${status ? `&status=${encodeURIComponent(status)}` : ''}`),
  interviewCreate: (dto: any) => authed('/interviews', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dto) }),
  interviewUpdate: (id: string, dto: any) => authed(`/interviews/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dto) }),
  interviewTransition: (id: string, to: string, comment?: string) =>
    authed(`/interviews/${id}/transition`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ to, comment }) }),
  interviewById: (id: string) => authed(`/interviews/by-id/${id}`),

  departments: () => authed('/departments'),

  uploadDocument: (file: File, ownerType: string, ownerId: string) => {
    const fd = new FormData();
    fd.append('file', file);
    return authed(`/documents/upload/${ownerType}/${ownerId}`, { method: 'POST', body: fd });
  },

  usersList: () => authed('/users'),
  userCreate: (dto: any) => authed('/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dto) }),
  userUpdate: (id: string, dto: any) => authed(`/users/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dto) }),

  pageUpsert: (dto: any) => authed('/pages', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dto) }),
  pageTree: () => authed('/pages/tree'),
  pageBySlug: (slug: string) => authed(`/pages/by-slug/${slug}`),

  dashboard: () => authed('/analytics/dashboard'),
};
