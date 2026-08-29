import type { ComponentPropsWithoutRef, ElementType, ReactNode } from 'react';
import { cn } from '@/lib/cn';

type GlassLevel = 1 | 2 | 3;

interface GlassPanelOwnProps {
  level?: GlassLevel;
  as?: ElementType;
  className?: string;
  children: ReactNode;
}

type GlassPanelProps = GlassPanelOwnProps & Omit<ComponentPropsWithoutRef<'div'>, keyof GlassPanelOwnProps>;

const LEVEL_CLASS: Record<GlassLevel, string> = {
  1: 'glass-1',
  2: 'glass-2',
  3: 'glass-3',
};

/**
 * The one glass surface primitive. Every card/panel in the app should render through this
 * rather than hand-rolling backdrop-blur classes, so the 3-level depth system stays consistent.
 * Forwards any other HTML attribute (style, tabIndex, aria-*, role, ...) straight through.
 */
export function GlassPanel({ level = 2, as: Tag = 'div', className, children, ...rest }: GlassPanelProps) {
  return <Tag className={cn(LEVEL_CLASS[level], 'rounded-2xl', className)} {...rest}>{children}</Tag>;
}
