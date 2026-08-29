import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '@/app/App';
import '@/styles/globals.css';

// Prevent browser zoom-in/zoom-out gestures and keyboard shortcuts
if (typeof window !== 'undefined') {
  // Prevent Ctrl/Cmd + Mouse Wheel / Trackpad pinch zoom
  window.addEventListener(
    'wheel',
    (e) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
      }
    },
    { passive: false }
  );

  // Prevent Ctrl/Cmd + Plus, Minus, Zero, Equals
  window.addEventListener('keydown', (e) => {
    if (
      (e.ctrlKey || e.metaKey) &&
      (e.key === '+' ||
        e.key === '-' ||
        e.key === '=' ||
        e.key === '_' ||
        e.key === '0' ||
        e.code === 'NumpadAdd' ||
        e.code === 'NumpadSubtract' ||
        e.code === 'Numpad0' ||
        e.code === 'Equal' ||
        e.code === 'Minus' ||
        e.code === 'Digit0')
    ) {
      e.preventDefault();
    }
  });

  // Prevent Safari / iOS gesture pinch zoom
  document.addEventListener('gesturestart', (e) => e.preventDefault());
  document.addEventListener('gesturechange', (e) => e.preventDefault());
  document.addEventListener('gestureend', (e) => e.preventDefault());
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

