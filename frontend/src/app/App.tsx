import { RouterProvider } from 'react-router-dom';
import { QueryProvider } from './providers/QueryProvider';
import { ErrorBoundary } from './ErrorBoundary';
import { router } from './router';

export function App() {
  return (
    <ErrorBoundary>
      <QueryProvider>
        <RouterProvider router={router} />
      </QueryProvider>
    </ErrorBoundary>
  );
}
