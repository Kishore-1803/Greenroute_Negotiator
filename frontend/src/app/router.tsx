import { lazy, Suspense } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { PageShell } from '@/components/layout/PageShell';
import { HomePage } from '@/pages/Home';

// Everything except Home is route-level lazy-loaded: Home is the entry point and should paint
// immediately, while the Trip Workspace (motion, the map feature) and the informational pages
// shouldn't add to that first load (Section 25/28: keep heavy deps out of the initial bundle).
const TripWorkspacePage = lazy(() => import('@/pages/TripWorkspace').then((m) => ({ default: m.TripWorkspacePage })));
const HowItWorksPage = lazy(() => import('@/pages/HowItWorks').then((m) => ({ default: m.HowItWorksPage })));

const ImpactDashboardPage = lazy(() => import('@/pages/ImpactDashboard').then((m) => ({ default: m.ImpactDashboardPage })));
const ProfilePage = lazy(() => import('@/pages/Profile').then((m) => ({ default: m.ProfilePage })));

function withShell(children: React.ReactNode) {
  return (
    <PageShell>
      <Suspense fallback={<div className="flex h-64 w-full items-center justify-center text-sm text-white/70">Loading page…</div>}>{children}</Suspense>
    </PageShell>
  );
}

export const router = createBrowserRouter([
  { path: '/', element: withShell(<HomePage />) },
  { path: '/trip', element: withShell(<TripWorkspacePage />) },
  { path: '/trip/:tripId', element: withShell(<TripWorkspacePage />) },
  { path: '/how-it-works', element: withShell(<HowItWorksPage />) },
  { path: '/impact', element: <Suspense fallback={<div />}> <ImpactDashboardPage /> </Suspense> },
  { path: '/profile', element: withShell(<ProfilePage />) },
]);
