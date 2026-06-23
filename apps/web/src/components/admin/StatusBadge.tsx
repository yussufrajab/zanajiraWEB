export function StatusBadge({ status }: { status?: string }) {
  if (!status) return null;
  const normalized = status.toLowerCase().replace(/[^a-z]/g, '');
  return <span className={`status-badge status-${normalized}`}>{status}</span>;
}
