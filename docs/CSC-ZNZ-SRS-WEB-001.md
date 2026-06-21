# Software Requirements Specification (SRS)

## Civil Service Commission – Zanzibar Public Website

| | |
|---|---|
| **Document No.** | CSC-ZNZ-SRS-WEB-001 |
| **Version** | 1.0 |
| **Date** | 21 June 2026 |
| **Status** | Draft |
| **Prepared For** | Civil Service Commission – Zanzibar, President's Office (Constitution, Legal Affairs, Public Service and Good Governance) |
| **Reference Site** | www.zanajira.go.tz (current WordPress implementation, to be replaced) |

---

## Table of Contents

1. Introduction
2. Overall Description
3. System Architecture Overview
4. Functional Requirements
5. Data Requirements
6. External Interface Requirements
7. Non-Functional Requirements
8. Other Requirements
9. Appendix A — Sitemap / Page Inventory
10. Appendix B — Glossary

---

## 1. Introduction

### 1.1 Purpose

This document specifies the functional and non-functional requirements for the redevelopment of the Civil Service Commission – Zanzibar's public website, currently hosted at `zanajira.go.tz` on WordPress. It is intended for the development team, the Commission's ICT unit, and project stakeholders who will review, approve, and validate the delivered system.

### 1.2 Scope

The system to be built is a public-facing institutional website plus a content management backend for Commission staff. It covers:

- Public informational pages (About, Organization Structure, Services, Contact)
- Publishing of News, Vacancy Announcements, and Call-for-Interview notices, each typically backed by a downloadable document (PDF)
- A staff-facing admin panel for creating, reviewing, and publishing content
- Multilingual presentation of content (Swahili and English)
- Links to related Commission systems (the ZanAjira application portal, e-Office, HRMS, Salary Claim) — these remain **external systems**; this SRS does not cover their internal functionality, only the integration points

**Out of scope:** the job-application/submission workflow itself (handled by the separate `portal.zanajira.go.tz` system), HRMS, e-Office, and payroll systems.

### 1.3 Definitions, Acronyms, and Abbreviations

| Term | Definition |
|---|---|
| CSC | Civil Service Commission – Zanzibar |
| SRS | Software Requirements Specification |
| CMS | Content Management System |
| MDA | Ministries, Departments, and Agencies |
| LGA | Local Government Authorities |
| SSR | Server-Side Rendering |
| RBAC | Role-Based Access Control |
| API | Application Programming Interface |
| SMZ | Serikali ya Mapinduzi ya Zanzibar (Revolutionary Government of Zanzibar) |

### 1.4 References

- Current production site: `https://www.zanajira.go.tz/`
- Civil Service Commission Act No. 14 of 1986
- Zanzibar Constitution of 1984
- ZanAjira application portal: `https://portal.zanajira.go.tz/home`
- National Ajira Portal: `https://www.ajira.go.tz/`

### 1.5 Document Overview

Section 2 describes the product at a high level. Section 3 outlines the proposed architecture. Section 4 details functional requirements by module. Section 5 covers the data model. Sections 6–8 cover interfaces, non-functional requirements, and operational requirements. Appendices provide a page inventory and glossary.

---

## 2. Overall Description

### 2.1 Product Perspective

The new system replaces a WordPress + Elementor installation that is presently used almost entirely as a content publishing tool: static informational pages plus three continuously-updated listing types (News, Vacancy Announcements, Call for Interviews), each entry typically pairing a title with a downloadable PDF. The new system is a custom-built web application consisting of a public-facing frontend, a backend API with an administrative interface, and a database/file-storage layer, replacing WordPress core, its theme, and its plugin stack entirely.

### 2.2 Product Functions

At a high level, the system shall:

1. Present static institutional content (About Us, Organization Structure, Our Services, Contact Us) in both Swahili and English
2. Allow authorized staff to create, edit, schedule, and publish News, Vacancy Announcement, and Call-for-Interview entries, each with an attached document
3. Allow the public to browse, filter, search, and download published notices
4. Provide a document repository for all published PDFs with stable, shareable URLs
5. Provide role-based staff accounts for content creation and publishing workflows
6. Surface external links to related Commission systems and partner institutions
7. Be discoverable via search engines (SEO) so that job seekers can find vacancy notices directly from Google

### 2.3 User Classes and Characteristics

| User Class | Description | Technical Skill |
|---|---|---|
| Public Visitor | Job seekers, civil servants, general public browsing/downloading notices | None assumed |
| Content Editor | MDA/Commission staff who draft News, Vacancy, and Interview entries | Low — must be usable by non-technical staff |
| Reviewer/Approver | Senior staff who review and approve content before publishing | Low |
| Site Administrator | ICT unit staff managing users, pages, and system configuration | Moderate–High |
| Developer/Maintainer | Technical team maintaining and extending the system | High |

### 2.4 Operating Environment

- Public site accessed via standard modern browsers (Chrome, Firefox, Safari, Edge) on desktop and mobile
- Admin panel accessed via desktop browsers on the Commission's office network or VPN
- Hosted on Linux-based servers (government data center or approved cloud), containerized for portability

### 2.5 Design and Implementation Constraints

- Must support bilingual content (Swahili primary, English secondary) for every public-facing page
- Must not depend on WordPress or any of its plugins/themes
- Technology stack is fixed as: **Next.js** (frontend), **NestJS** (backend API), **PostgreSQL** with **Prisma** (database/ORM), **MinIO/S3-compatible storage** (documents/media), **Redis** (caching and background jobs)
- Must integrate visually/structurally with existing SMZ branding (coat of arms, color scheme) currently used on the live site
- Existing content (pages, past news/vacancy PDFs) must be migrated, not discarded

### 2.6 Assumptions and Dependencies

- The Commission will designate Content Editors and Reviewers per department/unit
- Existing external systems (ZanAjira portal, e-Office, HRMS, Salary Claim) will continue operating independently and only need to be linked to, not integrated at the data level, in this phase
- A domain and SSL certificate for `zanajira.go.tz` (or successor domain) are available for the new deployment
- Historical WordPress content (pages + media library) will be exported and made available for migration

---

## 3. System Architecture Overview

| Layer | Technology | Responsibility |
|---|---|---|
| Frontend | Next.js (React, SSR/SSG) | Public site rendering, SEO, bilingual routing, admin UI shell |
| Backend API | NestJS (TypeScript) | Business logic, authentication, RBAC, content workflow, REST API |
| Database | PostgreSQL | Structured data: pages, notices, users, roles, audit logs |
| ORM | Prisma | Type-safe data access and schema migrations |
| File Storage | MinIO (S3-compatible) | PDF documents, images, media assets |
| Cache / Queue | Redis (+ BullMQ) | Listing-page caching, scheduled publish/expiry jobs, notification emails, PDF thumbnail generation |
| Hosting | Containerized (Docker), reverse proxy (Nginx) | Deployment, TLS termination, routing |

**High-level flow:** the public visitor's browser requests pages from Next.js, which renders server-side (for SEO) by calling the NestJS API; the API reads/writes through Prisma to PostgreSQL and reads/writes documents to MinIO; Redis caches frequently-read listings and handles background jobs such as auto-expiring old vacancy notices and sending publish notifications.

---

## 4. Functional Requirements

Each requirement is tagged with an ID and priority (**H**igh / **M**edium / **L**ow) for traceability.

### 4.1 Public Site — Static & Informational Pages

| ID | Requirement | Priority |
|---|---|---|
| REQ-PG-01 | The system shall display a Home page summarizing the Commission, latest news, and latest vacancies. | H |
| REQ-PG-02 | The system shall provide an "About Us" section with Introduction, Mission & Vision, and Core Functions sub-pages. | H |
| REQ-PG-03 | The system shall provide an "Organization Structure" section with Board, Department, Unit & Division, and Organization Chart sub-pages. | H |
| REQ-PG-04 | The system shall provide an "Our Service" page describing services offered. | M |
| REQ-PG-05 | The system shall provide a "Contact Us" page with office address, phone, email, and a location map. | H |
| REQ-PG-06 | Administrators shall be able to edit the text content of all static pages through the admin panel without code changes. | H |

### 4.2 News & Announcements Module

| ID | Requirement | Priority |
|---|---|---|
| REQ-NEWS-01 | The system shall allow Content Editors to create a news entry with title, body text, publish date, optional attached document, and optional cover image. | H |
| REQ-NEWS-02 | The system shall display news entries in reverse-chronological order on a public listing page. | H |
| REQ-NEWS-03 | The system shall allow filtering of news by date range and keyword. | M |
| REQ-NEWS-04 | Each news entry shall have a unique, stable, shareable URL. | H |

### 4.3 Vacancy Announcements Module

| ID | Requirement | Priority |
|---|---|---|
| REQ-VAC-01 | The system shall allow Content Editors to create a vacancy announcement with title, issuing MDA/LGA, publish date, closing date, and an attached PDF document. | H |
| REQ-VAC-02 | The system shall display vacancy announcements as a filterable, paginated public list (by MDA, by status: open/closed). | H |
| REQ-VAC-03 | The system shall automatically mark a vacancy as "closed" once its closing date has passed (via scheduled job). | M |
| REQ-VAC-04 | The system shall allow linking a vacancy announcement to the external ZanAjira application portal for candidates to apply. | H |
| REQ-VAC-05 | The system shall retain closed/expired vacancy announcements in an archive accessible via search, rather than deleting them. | M |

### 4.4 Call for Interview Module

| ID | Requirement | Priority |
|---|---|---|
| REQ-INT-01 | The system shall allow Content Editors to publish "Call for Interview" and "Interview Results" notices, each with title, related MDA, publish date, and attached PDF. | H |
| REQ-INT-02 | The system shall distinguish between "Call for Interview" and "Interview Results" as sub-categories within this module. | M |
| REQ-INT-03 | The system shall display Call-for-Interview notices as a filterable, paginated public list, consistent with the Vacancy module's presentation. | H |

### 4.5 Document Repository / Downloads

| ID | Requirement | Priority |
|---|---|---|
| REQ-DOC-01 | Every document (PDF) uploaded against a News, Vacancy, or Interview entry shall be stored centrally and accessible via a permanent download URL. | H |
| REQ-DOC-02 | The system shall restrict uploads to approved file types (PDF, DOCX, JPG, PNG) and enforce a maximum file size. | H |
| REQ-DOC-03 | The system shall scan uploaded files for malware before storage. | M |
| REQ-DOC-04 | The system shall record download counts per document for reporting purposes. | L |

### 4.6 Search

| ID | Requirement | Priority |
|---|---|---|
| REQ-SRCH-01 | The system shall provide a site-wide search across pages, news, vacancies, and interview notices. | H |
| REQ-SRCH-02 | Search results shall be returned in under 2 seconds for typical queries. | M |

### 4.7 Multilingual Content (Swahili / English)

| ID | Requirement | Priority |
|---|---|---|
| REQ-I18N-01 | All static pages and navigation shall be available in both Swahili and English, with a language switcher on every page. | H |
| REQ-I18N-02 | News, Vacancy, and Interview entries shall support an optional English translation field; if absent, the system shall display the Swahili original with a "not yet translated" indicator. | M |
| REQ-I18N-03 | The default language for first-time visitors shall be Swahili, matching current site convention. | M |

### 4.8 Admin / CMS & Content Workflow

| ID | Requirement | Priority |
|---|---|---|
| REQ-CMS-01 | The system shall provide an admin panel where Content Editors can create and edit News, Vacancy, and Interview entries through a form-based interface (no code/markup required). | H |
| REQ-CMS-02 | The system shall support a Draft → Submitted for Review → Published workflow for content created by Editors. | H |
| REQ-CMS-03 | Reviewers/Approvers shall be able to approve, reject, or request changes on submitted content, with optional comments. | M |
| REQ-CMS-04 | The system shall support scheduled publishing (publish at a future date/time). | M |
| REQ-CMS-05 | The system shall maintain a version/audit history of edits to each content item, recording who changed what and when. | M |
| REQ-CMS-06 | The system shall allow Editors to upload a PDF document as part of the publishing flow, with a preview before submission. | H |

### 4.9 User & Role Management

| ID | Requirement | Priority |
|---|---|---|
| REQ-USR-01 | The system shall support role-based access control with, at minimum, the roles: Content Editor, Reviewer, Administrator. | H |
| REQ-USR-02 | The system shall restrict admin-panel access to authenticated staff accounts only. | H |
| REQ-USR-03 | Administrators shall be able to create, deactivate, and reassign roles for staff accounts. | H |
| REQ-USR-04 | The system shall enforce password complexity and support multi-factor authentication for Administrator accounts. | M |
| REQ-USR-05 | The system shall log all authentication attempts (success/failure) for audit purposes. | M |

### 4.10 Notifications

| ID | Requirement | Priority |
|---|---|---|
| REQ-NTF-01 | The system shall send an email notification to a Reviewer when content is submitted for review. | M |
| REQ-NTF-02 | The system shall send an email notification to the originating Editor when their content is approved, rejected, or published. | M |
| REQ-NTF-03 | The system shall optionally notify subscribed public users by email when new vacancies matching saved criteria are published. | L |

### 4.11 External Links & System Integrations

| ID | Requirement | Priority |
|---|---|---|
| REQ-EXT-01 | The system shall display persistent links to: ZanAjira application portal, National Ajira Portal, e-Office, HRMS, Staff Mail, and Salary Claim systems. | H |
| REQ-EXT-02 | The system shall display links to partner/related institutions (Ikulu Zanzibar, eGAZ, ZAECA, ZPSC, IPA). | M |
| REQ-EXT-03 | Vacancy announcements shall be able to deep-link to the relevant application form on the ZanAjira application portal. | H |

### 4.12 Analytics & Reporting

| ID | Requirement | Priority |
|---|---|---|
| REQ-RPT-01 | The system shall track page views and document downloads. | M |
| REQ-RPT-02 | The system shall provide Administrators a dashboard summarizing content published per month, per MDA, and most-downloaded documents. | L |

---

## 5. Data Requirements

High-level entities to be modeled in PostgreSQL via Prisma:

| Entity | Key Attributes | Notes |
|---|---|---|
| `User` | id, name, email, passwordHash, role, status | Staff accounts only; public visitors are not authenticated |
| `Role` | id, name, permissions | Editor, Reviewer, Administrator |
| `Page` | id, slug, titleSw, titleEn, bodySw, bodyEn, updatedAt | Static informational pages |
| `NewsPost` | id, titleSw, titleEn, bodySw, bodyEn, publishDate, status, authorId | |
| `Vacancy` | id, title, mda, publishDate, closingDate, status, applyUrl, authorId | status: draft/review/published/closed |
| `InterviewNotice` | id, title, mda, type (call/result), publishDate, status, authorId | |
| `Document` | id, filename, mimeType, sizeBytes, storageKey, ownerType, ownerId, downloadCount | Linked polymorphically to News/Vacancy/Interview entries |
| `Department` | id, nameSw, nameEn | For org structure pages and MDA tagging |
| `AuditLog` | id, userId, action, entityType, entityId, timestamp, diff | Tracks content workflow history |

Relationships: `NewsPost`, `Vacancy`, and `InterviewNotice` each have a one-to-many relationship with `Document`; all content entities reference `User` as author and optionally a `Reviewer`; `Vacancy` and `InterviewNotice` reference `Department`.

---

## 6. External Interface Requirements

### 6.1 User Interfaces

- Responsive public site supporting desktop, tablet, and mobile breakpoints
- Admin panel optimized for desktop use (forms, tables, file upload widgets)
- Consistent use of SMZ branding (coat of arms, official color palette) across both

### 6.2 Hardware Interfaces

- None beyond standard server/network hardware; no specialized hardware interfaces required

### 6.3 Software Interfaces

- PostgreSQL database server
- MinIO (or compatible S3 object storage) for document/media storage
- Redis server for caching and job queues
- SMTP service for outbound email notifications

### 6.4 Communication Interfaces

- All traffic served over HTTPS (TLS 1.2+)
- Frontend-to-backend communication via REST API (JSON)
- Outbound links to external systems (ZanAjira portal, e-Office, HRMS) via standard HTTPS hyperlinks; no server-to-server data exchange required in this phase

---

## 7. Non-Functional Requirements

### 7.1 Performance

- Public pages shall achieve a server response (Time to First Byte) under 500ms under normal load
- Listing pages (News/Vacancy/Interview) shall be cached via Redis with a TTL appropriate to update frequency (e.g., 5 minutes) to reduce database load

### 7.2 Security

- All admin actions shall require authentication; sensitive actions (publish, delete, user management) shall require appropriate role authorization
- Uploaded files shall be validated by type and scanned before storage
- The system shall be protected against common web vulnerabilities (OWASP Top 10): SQL injection (mitigated by Prisma's parameterized queries), XSS, CSRF, etc.
- Regular dependency updates shall be applied to avoid the kind of plugin-driven vulnerabilities common to the legacy WordPress installation

### 7.3 Usability & Accessibility

- Public pages shall follow WCAG 2.1 AA guidelines where practicable (alt text, color contrast, keyboard navigation)
- The admin content-creation forms shall be usable by non-technical staff with minimal training

### 7.4 Reliability & Availability

- Target uptime of 99.5% for the public site
- Automated daily backups of the database and document storage

### 7.5 Scalability

- The architecture shall support horizontal scaling of the Next.js and NestJS layers independently as traffic grows (e.g., during high-volume recruitment periods)

### 7.6 Maintainability

- Codebase shall follow a documented module structure (NestJS modules per domain: News, Vacancy, Interview, Documents, Users)
- Database schema changes shall be managed through Prisma migrations with version control

### 7.7 Search Engine Optimization (SEO)

- Public pages shall be server-side rendered to ensure indexability by search engines
- Vacancy and News pages shall include appropriate meta tags, structured data, and human-readable URLs (e.g., `/vacancies/tangazo-la-nafasi-za-kazi-2026`)

### 7.8 Localization

- All public-facing UI strings, not just content, shall be translatable (Swahili/English) via a centralized translation resource

### 7.9 Legal & Compliance

- The system shall comply with applicable Zanzibar/Tanzania data protection requirements for any personal data collected (e.g., subscriber emails under REQ-NTF-03)
- Government branding usage shall follow SMZ guidelines for the coat of arms and official seals

---

## 8. Other Requirements

### 8.1 Hosting & Deployment

- The application shall be containerized (Docker) to support deployment to either a government data center or an approved cloud provider
- A staging environment shall be available for content/QA review prior to production deployment

### 8.2 Backup & Disaster Recovery

- Daily automated backups of PostgreSQL and MinIO storage, retained for a minimum of 30 days
- A documented recovery procedure with a target Recovery Time Objective (RTO) of 4 hours

### 8.3 Training & Handover

- The development team shall provide admin-panel training and documentation for Content Editors, Reviewers, and Administrators prior to go-live
- A content migration plan shall be executed to move existing WordPress pages, news, vacancy, and interview-notice content (including PDFs) into the new system before cutover

---

## Appendix A — Sitemap / Page Inventory

Mirrors the structure of the current site to ensure no content category is lost in migration:

- Home
- About Us
  - Introduction
  - Mission & Vision
  - Core Functions
- Organization Structure
  - Board
  - Department
  - Unit & Division
  - Organization Chart
- Our Service
- Contact Us
- Latest News (listing + detail pages)
- Vacancy Announcements (listing + detail pages)
- Call for Interviews (listing + detail pages, including results)
- External Links (Ikulu Zanzibar, eGAZ, ZAECA, ZPSC, IPA, National Ajira Portal)
- Staff Services (e-Office, HRMS, Staff Mail, Salary Claim) — external links only

## Appendix B — Glossary

| Term | Meaning |
|---|---|
| Tangazo | Swahili for "announcement/notice" |
| Usaili | Swahili for "interview" |
| Nafasi za Kazi | Swahili for "job vacancies" |
| MDA | Ministries, Departments, and Agencies |
| LGA | Local Government Authority |

---

*End of document.*
