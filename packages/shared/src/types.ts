import {
  ContentStatus, UserRole, VacancyStatus, InterviewType, UserStatus, AuditAction,
} from './enums.js';

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface PaginationQuery {
  page?: number;
  pageSize?: number;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  status: UserStatus;
}

export interface PageResponse {
  id: string;
  slug: string;
  titleSw: string;
  titleEn: string | null;
  bodySw: string;
  bodyEn: string | null;
  updatedAt: string;
}

export interface DocumentResponse {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  downloadCount: number;
  url: string;
}

export interface NewsPostResponse {
  id: string;
  slug: string;
  titleSw: string;
  titleEn: string | null;
  bodySw: string;
  bodyEn: string | null;
  publishDate: string;
  status: ContentStatus;
  coverImageUrl: string | null;
  documents: DocumentResponse[];
}

export interface VacancyResponse {
  id: string;
  slug: string;
  title: string;
  mda: string;
  publishDate: string;
  closingDate: string;
  status: VacancyStatus;
  applyUrl: string | null;
  documents: DocumentResponse[];
}

export interface InterviewNoticeResponse {
  id: string;
  slug: string;
  title: string;
  mda: string;
  type: InterviewType;
  publishDate: string;
  status: ContentStatus;
  documents: DocumentResponse[];
}

export interface AuditLogResponse {
  id: string;
  userId: string | null;
  action: AuditAction;
  entityType: string;
  entityId: string;
  timestamp: string;
  diff: Record<string, unknown> | null;
}