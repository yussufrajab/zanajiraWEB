export function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export async function uniqueSlug(base: string, exists: (s: string) => Promise<boolean>): Promise<string> {
  let slug = base;
  let i = 2;
  while (await exists(slug)) { slug = `${base}-${i++}`; }
  return slug;
}