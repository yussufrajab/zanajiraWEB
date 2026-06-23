'use client';

type BadgeVariant = 'success' | 'danger' | 'warning' | 'info' | 'muted';

const variantMap: Record<BadgeVariant, string> = {
  success: 'badge-success',
  danger: 'badge-danger',
  warning: 'badge-warning',
  info: 'badge-info',
  muted: 'badge-muted',
};

export function Badge({ children, variant = 'muted' }: { children: React.ReactNode; variant?: BadgeVariant }) {
  return <span className={`badge ${variantMap[variant]}`}>{children}</span>;
}
