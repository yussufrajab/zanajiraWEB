import { XMLParser } from 'fast-xml-parser';
import { readFile } from 'fs/promises';
import { statSync } from 'fs';
import { join, basename } from 'path';

const API_BASE = process.env.API_BASE_URL ?? 'http://localhost:4000/api';
const WXR_PATH = process.env.MIGRATE_WXR_PATH;
const UPLOADS_DIR = process.env.MIGRATE_UPLOADS_DIR;
const ADMIN_EMAIL = process.env.MIGRATE_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.MIGRATE_ADMIN_PASSWORD;

let token = '';

async function main() {
  if (!WXR_PATH || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
    console.error('Required env: MIGRATE_WXR_PATH, MIGRATE_ADMIN_EMAIL, MIGRATE_ADMIN_PASSWORD');
    process.exit(1);
  }

  token = await login();
  const xml = await readFile(WXR_PATH, 'utf8');
  const parser = new XMLParser({ ignoreAttributes: false, parseAttributeValue: false });
  const doc = parser.parse(xml);
  const items = (doc.rss?.channel?.item ?? []) as any[];

  const posts = items.filter((i) => i['wp:post_type'] === 'post');
  const attachments = items.filter((i) => i['wp:post_type'] === 'attachment');
  const attachmentByParent = new Map<string, any[]>();
  for (const a of attachments) {
    const parentId = String(a['wp:post_parent'] ?? '');
    if (!parentId) continue;
    if (!attachmentByParent.has(parentId)) attachmentByParent.set(parentId, []);
    attachmentByParent.get(parentId)!.push(a);
  }

  let created = 0;
  let skipped = 0;

  for (const item of posts) {
    const title = extractText(item.title) ?? 'Untitled';
    const slug = item['wp:post_name'] ?? slugify(title);
    const body = item['content:encoded'] ?? '';
    const date = toIso(item['wp:post_date_gmt'] ?? item['wp:post_date']);
    const categories = normalizeCategories(item.category);
    const kind = classify(categories);
    const postId = String(item['wp:post_id'] ?? '');

    try {
      const exists = await alreadyMigrated(kind, slug);
      if (exists) {
        console.log(`[skip] ${kind} "${title}" already exists as ${slug}`);
        skipped++;
        continue;
      }

      const attachmentIds: string[] = [];
      const attachmentsForPost = attachmentByParent.get(postId) ?? [];
      for (const attachment of attachmentsForPost) {
        const url = attachment['wp:attachment_url'] ?? extractText(attachment.guid);
        if (!url) continue;
        const docId = await uploadAttachment(url, kind, 'temp');
        if (docId) attachmentIds.push(docId);
      }

      const entityId = await createEntity(kind, {
        title,
        slug,
        body,
        date,
        categories,
        attachmentIds,
      });

      if (entityId) {
        await transitionToPublished(kind, entityId);
        console.log(`[created] [${kind}] ${title} (${slug})`);
        created++;
      }
    } catch (err) {
      console.error(`[error] [${kind}] ${title}: ${(err as Error).message}`);
    }
  }

  console.log(`\nMigration complete: ${created} created, ${skipped} skipped, ${posts.length} posts scanned.`);
}

async function login(): Promise<string> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });
  if (!res.ok) throw new Error(`Login failed: ${res.status} ${await res.text()}`);
  const json = (await res.json()) as { accessToken: string };
  return json.accessToken;
}

async function api(method: string, path: string, body?: unknown) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}: ${await res.text()}`);
  return res.json();
}

async function alreadyMigrated(kind: string, slug: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/${routeFor(kind)}/by-slug/${slug}`);
    return res.ok;
  } catch {
    return false;
  }
}

function routeFor(kind: string): string {
  switch (kind) {
    case 'vacancy':
      return 'vacancies';
    case 'interview':
      return 'interviews';
    default:
      return 'news';
  }
}

async function createEntity(kind: string, payload: any): Promise<string | null> {
  const route = routeFor(kind);
  const titleSw = payload.title;
  const bodySw = stripShortcodes(payload.body);
  const publishDate = payload.date;

  let body: any;
  if (kind === 'vacancy') {
    const closingDate = new Date(new Date(publishDate).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    body = {
      title: payload.title,
      mda: mdaFrom(payload.categories),
      closingDate,
      publishDate,
      documentIds: payload.attachmentIds,
    };
  } else if (kind === 'interview') {
    body = {
      title: payload.title,
      mda: mdaFrom(payload.categories),
      type: 'CallForInterview',
      publishDate,
      documentIds: payload.attachmentIds,
    };
  } else {
    body = {
      titleSw,
      titleEn: null,
      bodySw,
      bodyEn: null,
      publishDate,
      documentIds: payload.attachmentIds,
    };
  }

  const created = (await api('POST', `/${route}`, body)) as { id: string };
  return created.id;
}

async function transitionToPublished(kind: string, entityId: string) {
  const route = routeFor(kind);
  const target = kind === 'vacancy' ? 'Published' : 'Published';
  await api('POST', `/${route}/${entityId}/transition`, { to: target });
}

async function uploadAttachment(url: string, ownerType: string, ownerId: string): Promise<string | null> {
  if (!UPLOADS_DIR) {
    console.warn(`  ! MIGRATE_UPLOADS_DIR not set; cannot upload ${url}`);
    return null;
  }
  const fileName = basename(new URL(url).pathname);
  const localPath = findLocalFile(fileName);
  if (!localPath) {
    console.warn(`  ! local file not found for ${fileName}`);
    return null;
  }
  const buf = await readFile(localPath);
  const mime = inferMime(fileName);
  const form = new FormData();
  form.append('file', new Blob([buf], { type: mime }), fileName);

  const res = await fetch(`${API_BASE}/documents/upload/${ownerType}/${ownerId}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form as any,
  });
  if (!res.ok) {
    console.warn(`  ! upload failed for ${fileName}: ${res.status}`);
    return null;
  }
  const json = (await res.json()) as { id: string };
  return json.id;
}

function findLocalFile(fileName: string): string | null {
  const candidates = [join(UPLOADS_DIR!, fileName), join(UPLOADS_DIR!, fileName.replace(/-[0-9]+x[0-9]+\./, '.'))];
  return candidates.find((p) => existsSync(p)) ?? null;
}

function existsSync(path: string): boolean {
  try {
    statSync(path);
    return true;
  } catch {
    return false;
  }
}

function inferMime(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'pdf':
      return 'application/pdf';
    case 'png':
      return 'image/png';
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    default:
      return 'application/octet-stream';
  }
}

function mdaFrom(categories: string[]): string {
  const government = categories.find((c) => / ministry|wizara|ofis|taasisi|idara/i.test(c));
  return government ?? 'WordPress Migration';
}

function classify(categories: string[]): 'news' | 'vacancy' | 'interview' {
  const joined = categories.join(' ').toLowerCase();
  if (/nafasi|vacancy|kazi|ajira/.test(joined)) return 'vacancy';
  if (/usaili|interview|matokeo/.test(joined)) return 'interview';
  return 'news';
}

function normalizeCategories(category: any): string[] {
  if (!category) return [];
  if (typeof category === 'string') return [category];
  if (Array.isArray(category)) {
    return category.map((c) => (typeof c === 'string' ? c : c['#text'] ?? '')).filter(Boolean);
  }
  return [category['#text'] ?? ''].filter(Boolean);
}

function extractText(value: any): string | undefined {
  if (typeof value === 'string') return value;
  return value?.['#text'];
}

function toIso(date: any): string | undefined {
  if (!date) return undefined;
  const d = new Date(String(date).replace(' ', 'T'));
  return isNaN(d.getTime()) ? undefined : d.toISOString();
}

function stripShortcodes(html: string): string {
  return (html ?? '').replace(/\[[^\]]+\]/g, '');
}

function slugify(text: string): string {
  return String(text)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 80);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
