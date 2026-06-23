# WordPress Migration Plan — Static Pages

## Overview

Copy content from the old WordPress site (`zanajira.go.tz`) to the new Next.js frontend. The old site has these static content pages (excluding dynamic news/vacancies/interviews which already work):

| Old URL | New Route | Content |
|---------|-----------|---------|
| `/about-us/` | `/about` | Introduction & Background of the Commission |
| `/about-us/introduction/` | `/about/introduction` | Introduction (same as above — old site redirects) |
| `/about-us/mission-vission/` | `/about/mission-vision` | Mission & Vision statements |
| `/about-us/core-functions/` | `/about/core-functions` | Core Functions & Core Values |
| `/organization-structure/` | `/organization` | Landing page with links to sub-pages |
| `/organization-structure/board/` | `/organization/board` | Board members table (7 members) |
| `/organization-structure/department/` | `/organization/department` | 3 Departments with responsibilities |
| `/organization-structure/unit-division/` | `/organization/unit-division` | Sections + Departments with Divisions |
| `/organization-structure/organization-chart/` | `/organization/chart` | Org chart info (content placeholder) |
| `/our-service/` | `/services` | List of 11 services |

## Approach

Since the existing CMS routes (`about/[child]`, `organization/[child]`, `[slug]`) fetch from an API that requires the database, and the user wants frontend pages visible now, I'll create **dedicated page components** with the migrated content as React markup.

## Files to Create (9 pages)

1. `apps/web/src/app/[locale]/about/page.tsx` — About landing (Introduction content)
2. `apps/web/src/app/[locale]/about/introduction/page.tsx` — Introduction (or redirect to /about)
3. `apps/web/src/app/[locale]/about/mission-vision/page.tsx` — Mission & Vision
4. `apps/web/src/app/[locale]/about/core-functions/page.tsx` — Core Functions & Values
5. `apps/web/src/app/[locale]/organization/page.tsx` — Organization Structure landing
6. `apps/web/src/app/[locale]/organization/board/page.tsx` — Board members table
7. `apps/web/src/app/[locale]/organization/department/page.tsx` — Departments & responsibilities
8. `apps/web/src/app/[locale]/organization/unit-division/page.tsx` — Units & Divisions
9. `apps/web/src/app/[locale]/organization/chart/page.tsx` — Organization Chart
10. `apps/web/src/app/[locale]/services/page.tsx` — Our Services

## Files to Modify

1. **`apps/web/src/components/Header.tsx`** — Add dropdown sub-navigation for "About Us" (Introduction, Mission & Vision, Core Functions) and "Organization Structure" (Board, Department, Unit & Division, Organization Chart)

2. **`apps/web/messages/en.json`** — Add translation keys for sub-menu items
3. **`apps/web/messages/sw.json`** — Add translation keys for sub-menu items

4. **`apps/web/src/styles/globals.css`** — Add CSS for:
   - Dropdown sub-navigation menus (desktop hover + mobile expand)
   - Page-specific styles (board table, service list, department sections)

## Component Design

Each page will be a server component with:
- `generateMetadata` for SEO
- Section title with gold accent underline
- Content rendered in `article.cms-page` wrapper (reusing existing CMS page styles)
- Bilingual content (Swahili primary, English fallback)
- Back-link to parent section where appropriate

## Header Changes

- Convert "About Us" to a dropdown with: Introduction, Mission & Vision, Core Functions
- Convert "Organization Structure" to a dropdown with: Board, Department, Unit & Division, Organization Chart
- "Our Services" stays as a direct link
- Desktop: hover-triggered dropdown menus
- Mobile: expandable accordion sub-lists

## Implementation Order

1. Add translation keys for sub-navigation items
2. Create all page components with migrated content
3. Update Header with dropdown sub-navigation
4. Add CSS for dropdown menus and page-specific styles

## Migration Status Tracking

| Page | Content Source | Status |
|------|---------------|--------|
| About / Introduction | Wordpress intro + background | Pending |
| Mission & Vision | Wordpress mission/vision quotes | Pending |
| Core Functions | Wordpress functions list + values | Pending |
| Organization Structure | Wordpress landing (directory) | Pending |
| Board | Wordpress board table | Pending |
| Department | Wordpress 3 departments | Pending |
| Unit & Division | Wordpress sections + divisions | Pending |
| Organization Chart | Wordpress chart placeholder | Pending |
| Our Services | Wordpress 11 services list | Pending |
