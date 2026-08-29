import { RouterProvider } from 'react-router-dom';
import { QueryProvider } from './providers/QueryProvider';
import { ErrorBoundary } from './ErrorBoundary';
import { AuthProvider } from './providers/AuthProvider';
import { router } from './router';

export function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <QueryProvider>
          <RouterProvider router={router} />
        </QueryProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
