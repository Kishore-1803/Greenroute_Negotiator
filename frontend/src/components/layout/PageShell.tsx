import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { Header } from './Header';
import { cn } from '@/lib/cn';

interface PageShellProps {
  children: ReactNode;
}

/** Wraps every page: header + main landmark. Locks to 100vh no-scroll on Home and Trip Workspace pages. */
export function PageShell({ children }: PageShellProps) {
  const location = useLocation();
  const isNoScroll = location.pathname === '/' || location.pathname.startsWith('/trip');

  return (
    <div className="flex flex-col min-h-[100dvh] w-full">
      <Header />
      <main className={cn('flex-1 flex flex-col relative', !isNoScroll && 'pb-24')}>
        {children}
      </main>
    </div>
  );
}
