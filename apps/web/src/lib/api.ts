import type {
  NewsPostResponse, VacancyResponse, InterviewNoticeResponse, PageResponse, Paginated,
} from '@zanweb/shared';

const BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? process.env.API_BASE_URL ?? 'http://localhost:4000/api';

async function get<T>(path: string): Promise<T> {
  // Pages are force-dynamic (SSR per request); fetch fresh data without the
  // revalidate tag, which triggers a Next 14.2 "suspended thenable" bug in
  // dynamic pages. The API caches listings in Redis already (Phase 5).
  const res = await fetch(`${BASE}${path}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`API ${path} -> ${res.status}`);
  return res.json() as Promise<T>;
}

function qs(params: Record<string, string | number | undefined>): string {
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') usp.set(k, String(v));
  }
  const s = usp.toString();
  return s ? `?${s}` : '';
}

export const api = {
  newsList: (p: { page?: number; q?: string; dateFrom?: string; dateTo?: string } = {}) =>
    get<Paginated<NewsPostResponse>>(`/news${qs({ page: p.page ?? 1, q: p.q, dateFrom: p.dateFrom, dateTo: p.dateTo })}`),
  newsBySlug: (slug: string) => get<NewsPostResponse>(`/news/by-slug/${slug}`),
  vacancyList: (p: { page?: number; mda?: string; status?: string } = {}) =>
    get<Paginated<VacancyResponse>>(`/vacancies${qs({ page: p.page ?? 1, mda: p.mda, status: p.status })}`),
  vacancyBySlug: (slug: string) => get<VacancyResponse>(`/vacancies/by-slug/${slug}`),
  interviewList: (p: { page?: number; type?: string } = {}) =>
    get<Paginated<InterviewNoticeResponse>>(`/interviews${qs({ page: p.page ?? 1, type: p.type })}`),
  interviewBySlug: (slug: string) => get<InterviewNoticeResponse>(`/interviews/by-slug/${slug}`),
  pageBySlug: (slug: string) => get<PageResponse>(`/pages/by-slug/${slug}`),
  pageTree: () => get<PageResponse[]>(`/pages/tree`),
  search: (q: string) => get<{ id: string; type: string; slug: string; title: string }[]>(`/search${qs({ q })}`),
};