'use client';

import { useState, useEffect } from 'react';
import { adminApi } from '@/lib/admin-api';

export function DocumentUploader({ ownerType, ownerId }: { ownerType: string; ownerId: string }) {
  const [docs, setDocs] = useState<{ id: string; filename: string }[]>([]);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      if (preview) URL.revokeObjectURL(preview);
      const objectUrl = URL.createObjectURL(file);
      setPreview(file.type.startsWith('image/') ? objectUrl : null);
      const doc = await adminApi.uploadDocument(file, ownerType, ownerId);
      setDocs((d) => [...d, { id: doc.id, filename: doc.filename }]);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  return (
    <div className="document-uploader">
      <label>
        Attach document (PDF/DOCX/JPG/PNG, ≤25MB)
        <input type="file" accept=".pdf,.docx,.jpg,.jpeg,.png" onChange={onFile} disabled={uploading} />
      </label>
      {uploading && <p>Uploading…</p>}
      {preview && <img src={preview} alt="Preview" width={200} />}
      <ul>{docs.map((d) => <li key={d.id}>{d.filename}</li>)}</ul>
    </div>
  );
}
