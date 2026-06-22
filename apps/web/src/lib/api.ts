import type {
  NewsPostResponse, VacancyResponse, InterviewNoticeResponse, PageResponse, Paginated,
} from '@zanweb/shared';

const BASE = process.env.API_BASE_URL ?? 'http://localhost:4000/api';

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { next: { revalidate: 300 } });
  if (!res.ok) throw new Error(`API ${path} -> ${res.status}`);
  return res.json() as Promise<T>;
}

export const api = {
  newsList: (page = 1) => get<Paginated<NewsPostResponse>>(`/news?page=${page}`),
  newsBySlug: (slug: string) => get<NewsPostResponse>(`/news/by-slug/${slug}`),
  vacancyList: (page = 1, mda?: string) => get<Paginated<VacancyResponse>>(`/vacancies?page=${page}${mda ? `&mda=${mda}` : ''}`),
  vacancyBySlug: (slug: string) => get<VacancyResponse>(`/vacancies/by-slug/${slug}`),
  interviewList: (page = 1, type?: string) => get<Paginated<InterviewNoticeResponse>>(`/interviews?page=${page}${type ? `&type=${type}` : ''}`),
  interviewBySlug: (slug: string) => get<InterviewNoticeResponse>(`/interviews/by-slug/${slug}`),
  pageBySlug: (slug: string) => get<PageResponse>(`/pages/by-slug/${slug}`),
  pageTree: () => get<PageResponse[]>(`/pages/tree`),
  search: (q: string) => get<{ id: string; type: string; slug: string; title: string }[]>(`/search?q=${encodeURIComponent(q)}`),
};