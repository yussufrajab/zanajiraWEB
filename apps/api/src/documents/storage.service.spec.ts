import { StorageService } from './storage.service';

describe('StorageService keys/urls', () => {
  const config: any = { get: (k: string) => (k === 'S3_PUBLIC_BASE_URL' ? 'http://localhost:9000/zanweb-documents' : 'x') };
  const s = new StorageService(config);

  it('builds a key from ownerType, ownerId, filename', () => {
    expect(s.buildKey('Vacancy', 'v1', 'tangazo.pdf')).toMatch(/^Vacancy\/v1\/[a-z0-9-]+-tangazo\.pdf$/);
  });
  it('builds a public URL from a key', () => {
    expect(s.publicUrl('Vacancy/v1/tangazo.pdf')).toBe('http://localhost:9000/zanweb-documents/Vacancy/v1/tangazo.pdf');
  });
});