-- GIN indexes to back the site-wide full-text search (REQ-SRCH-02).
-- Indexes the same tsvector expressions used by SearchService.search.
-- The Page index is added in Phase 6 once the Page table exists.

CREATE INDEX IF NOT EXISTS "NewsPost_search_idx"
  ON "NewsPost"
  USING GIN (to_tsvector('simple', coalesce("titleSw", '') || ' ' || coalesce("bodySw", '')));

CREATE INDEX IF NOT EXISTS "Vacancy_search_idx"
  ON "Vacancy"
  USING GIN (to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(mda, '')));

CREATE INDEX IF NOT EXISTS "InterviewNotice_search_idx"
  ON "InterviewNotice"
  USING GIN (to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(mda, '')));