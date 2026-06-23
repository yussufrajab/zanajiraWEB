export function Loading({ message = 'Loading…' }: { message?: string }) {
  return (
    <div className="empty-state fade-in">
      <span className="spinner" aria-hidden="true" />
      <p>{message}</p>
    </div>
  );
}
