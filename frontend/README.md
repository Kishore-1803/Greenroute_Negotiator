# GreenRoute Negotiator — Frontend

React + TypeScript + Vite. Render-only: every routing, cost, carbon, utility, and switch/stay
decision comes from the backend — see the root [`README.md`](../README.md) for the full
architecture.

## Setup

```bash
npm ci
Copy-Item .env.example .env.local  # PowerShell; optional for the default local backend
npm run dev                  # http://localhost:5173
```

The application calls `/api/v1` by default. Vite forwards it to `http://127.0.0.1:8000`, so
opening `http://<host-ip>:5173` on another device works without that device calling its own
localhost. Set `GREENROUTE_API_PROXY_TARGET` in `.env.local` only when the backend is elsewhere.

## Scripts

| Command | Does |
|---|---|
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Typecheck + production build |
| `npm test` | Run the Vitest suite once |
| `npm run lint` | oxlint |

## Structure

```
src/
  app/            Composition root: App, router, providers, error boundary
  pages/          One folder per route (Home, TripWorkspace, Demo, HowItWorks, Transparency, About)
  features/       trip/ (mutation hooks), map/ (MapLibre integration)
  components/     ui/ (Button, GlassPanel, ...), layout/ (Header, Container, PageShell)
  services/api/   The one fetch() call site, Zod schemas, error normalization
  lib/            Small framework-free helpers (cn, formatting, the fixed demo-route constants)
  styles/         Design tokens + global CSS (the glass depth system)
```

Tests are co-located next to the code they cover (`Foo.tsx` / `Foo.test.tsx`), not in a
separate top-level test tree.
