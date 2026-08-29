import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface ContainerProps {
  className?: string;
  children: ReactNode;
}

/** Consistent max-width + gutter for page content. Desktop-first, per the responsive spec. */
export function Container({ className, children }: ContainerProps) {
  return <div className={cn('mx-auto w-full max-w-7xl px-5 sm:px-8 lg:px-12', className)}>{children}</div>;
}
