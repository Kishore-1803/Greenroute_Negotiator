import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';
type ButtonSize = 'md' | 'sm';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
  iconPosition?: 'left' | 'right';
}

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  // primary-dark (not primary) as the base fill: white-on-primary only clears a 3.3:1 contrast
  // ratio (fails WCAG AA's 4.5:1 for normal-size text) -- found via an axe-core audit in Phase 6.
  primary:
    'bg-primary-dark text-white shadow-sm hover:brightness-90 active:brightness-90 disabled:bg-ink-disabled',
  secondary:
    'glass-1 text-ink-primary hover:bg-primary/10 hover:border-primary/40 disabled:text-ink-disabled',
  ghost: 'text-ink-secondary hover:bg-black/[0.03] hover:text-ink-primary',
};

const SIZE_CLASS: Record<ButtonSize, string> = {
  md: 'h-12 px-5 text-base rounded-xl gap-2',
  sm: 'h-9 px-3.5 text-sm rounded-lg gap-1.5',
};

export function Button({
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'right',
  className,
  children,
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center font-semibold transition-colors',
        `duration-[var(--transition-fast)]`,
        'disabled:cursor-not-allowed disabled:opacity-60',
        VARIANT_CLASS[variant],
        SIZE_CLASS[size],
        className,
      )}
      disabled={disabled}
      {...rest}
    >
      {icon && iconPosition === 'left' ? icon : null}
      {children}
      {icon && iconPosition === 'right' ? icon : null}
    </button>
  );
}
