import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { Button } from '@/components/ui/Button';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/**
 * Top-level recovery state for a rendering failure -- a polished message, never a blank page
 * or a raw stack trace (Section 26). React error boundaries must be class components; there is
 * no hooks-based equivalent.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('GreenRoute rendering error', error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <GlassPanel level={2} className="flex max-w-md flex-col items-center gap-3 p-8 text-center">
          <AlertTriangle className="h-6 w-6 text-warning" />
          <h1 className="text-h2 font-bold text-ink-primary">Something went wrong.</h1>
          <p className="text-sm text-ink-secondary">
            An unexpected error occurred while rendering this page. Your trip data wasn't affected.
          </p>
          <Button onClick={() => window.location.assign('/')}>Return to GreenRoute</Button>
        </GlassPanel>
      </div>
    );
  }
}
