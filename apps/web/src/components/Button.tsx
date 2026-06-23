'use client';

type ButtonVariant = 'primary' | 'accent' | 'outline' | 'ghost';
type ButtonSize = 'sm' | 'md';

const variantMap: Record<ButtonVariant, string> = {
  primary: 'btn-primary',
  accent: 'btn-accent',
  outline: 'btn-outline',
  ghost: 'btn-ghost',
};

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  type = 'button',
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`btn ${variantMap[variant]} ${size === 'sm' ? 'btn-sm' : ''}`}
    >
      {children}
    </button>
  );
}
