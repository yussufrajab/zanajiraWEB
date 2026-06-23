export function EmptyState({ title, message, children }: { title: string; message?: string; children?: React.ReactNode }) {
  return (
    <div className="empty-state fade-in">
      <svg className="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <path d="M20 13V7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h6" />
        <path d="M8 7h8M8 11h3M8 15h2" />
        <circle cx="17.5" cy="17.5" r="2.5" />
        <path d="M21 21l-1.5-1.5" />
      </svg>
      <h3>{title}</h3>
      {message && <p>{message}</p>}
      {children}
    </div>
  );
}
