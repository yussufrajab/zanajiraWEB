'use client';

import { useState, useEffect } from 'react';
import { adminApi } from '@/lib/admin-api';

export function DocumentUploader({ ownerType, ownerId }: { ownerType: string; ownerId: string }) {
  const [docs, setDocs] = useState<{ id: string; filename: string; url?: string }[]>([]);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      if (preview) URL.revokeObjectURL(preview);
      const objectUrl = URL.createObjectURL(file);
      setPreview(file.type.startsWith('image/') ? objectUrl : null);
      const doc = await adminApi.uploadDocument(file, ownerType, ownerId);
      setDocs((d) => [...d, { id: doc.id, filename: doc.filename, url: doc.url }]);
    } catch (err: any) {
      setError(err.message ?? 'Upload failed');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  return (
    <div className="document-uploader">
      <label>
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
        <span>Attach document (PDF/DOCX/JPG/PNG, ≤25MB)</span>
        <input type="file" accept=".pdf,.docx,.jpg,.jpeg,.png" onChange={onFile} disabled={uploading} />
      </label>
      {uploading && <p className="text-muted" style={{ textAlign: 'center', marginTop: '0.75rem' }}>Uploading…</p>}
      {error && <div className="admin-alert admin-alert-error" style={{ marginTop: '0.75rem' }}>{error}</div>}
      {preview && <img src={preview} alt="Preview" className="document-preview" width={200} />}
      <ul className="document-list">
        {docs.map((d) => (
          <li key={d.id}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            {d.url ? <a href={d.url} target="_blank" rel="noopener noreferrer">{d.filename}</a> : d.filename}
          </li>
        ))}
      </ul>
    </div>
  );
}
