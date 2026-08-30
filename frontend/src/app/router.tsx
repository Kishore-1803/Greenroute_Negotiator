import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { useAuth } from '@/app/providers/AuthProvider';
import { PageShell } from '@/components/layout/PageShell';
import { HomePage } from '@/pages/Home';

// Everything except Home is route-level lazy-loaded: Home is the entry point and should paint
// immediately, while the Trip Workspace (motion, the map feature) and the informational pages
// shouldn't add to that first load (Section 25/28: keep heavy deps out of the initial bundle).
const TripWorkspacePage = lazy(() => import('@/pages/TripWorkspace').then((m) => ({ default: m.TripWorkspacePage })));
const HowItWorksPage = lazy(() => import('@/pages/HowItWorks').then((m) => ({ default: m.HowItWorksPage })));

const ImpactDashboardPage = lazy(() => import('@/pages/ImpactDashboard').then((m) => ({ default: m.ImpactDashboardPage })));
const ProfilePage = lazy(() => import('@/pages/Profile').then((m) => ({ default: m.ProfilePage })));
const LoginPage = lazy(() => import('@/pages/Auth/Login').then((m) => ({ default: m.LoginPage })));
const SignUpPage = lazy(() => import('@/pages/Auth/SignUp').then((m) => ({ default: m.SignUpPage })));
const NotFoundPage = lazy(() => import('@/pages/NotFound').then((m) => ({ default: m.NotFoundPage })));

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) {
    return <div className="flex h-64 w-full items-center justify-center text-sm text-white/70">Loading profile...</div>;
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
}

function withShell(children: React.ReactNode) {
  return (
    <PageShell>
      <Suspense fallback={<div className="flex h-64 w-full items-center justify-center text-sm text-white/70">Loading page…</div>}>{children}</Suspense>
    </PageShell>
  );
}

function withAuthShell(children: React.ReactNode) {
  return (
    <div className="flex flex-col min-h-[100dvh] w-full">
      <Suspense fallback={<div className="flex h-64 w-full items-center justify-center text-sm text-white/70">Loading page…</div>}>{children}</Suspense>
    </div>
  );
}

export const router = createBrowserRouter([
  // Public landing page: an unauthenticated visitor sees Home directly, not an immediate
  // redirect to /login. "Get Started" (Header) and the Home planner form's submit are what
  // actually route them to /login -- the page itself stays open.
  { path: '/', element: withShell(<HomePage />) },
  { path: '/login', element: withAuthShell(<LoginPage />) },
  { path: '/signup', element: withAuthShell(<SignUpPage />) },
  { path: '/trip', element: withShell(<ProtectedRoute><TripWorkspacePage /></ProtectedRoute>) },
  { path: '/trip/:tripId', element: withShell(<ProtectedRoute><TripWorkspacePage /></ProtectedRoute>) },
  { path: '/how-it-works', element: withShell(<HowItWorksPage />) },
  { path: '/impact', element: <Suspense fallback={<div />}><ProtectedRoute><ImpactDashboardPage /></ProtectedRoute></Suspense> },
  { path: '/profile', element: withShell(<ProtectedRoute><ProfilePage /></ProtectedRoute>) },
  { path: '*', element: withShell(<Suspense fallback={<div/>}><NotFoundPage /></Suspense>) },
]);
