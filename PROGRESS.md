# Project Progress

Status snapshot for anyone picking this project up. For what the system *is* and how it's
built, see [`README.md`](README.md) — this file is about what's done, what's in flight, and
what's next.

## Where things stand

The primary flow works end-to-end and is covered by tests: a new trip gets routed on all three
modes, scored, negotiated over by the agent panel, explained, and the user's actual choice
feeds back into Preference Memory for next time. The advanced traffic-surge/SWITCH-STAY flow
builds on the same engine and also works. Both are exercised by real HTTP-level tests, not just
unit tests of the underlying math — see `backend/tests/api/test_http_flows.py` for the full
loop test.

```
Backend:   64/64 tests passing (pytest tests/)
Frontend:  clean build (tsc -b && vite build, 0 errors)
```

## What's done

**Backend**
- Deterministic utility engine (min-max normalization, weighted sum, zero-division/tie-guarded)
  and a matching SWITCH/STAY switch-policy for the advanced flow.
- Real OSRM integration across all 3 modes, with a cached-fallback that degrades honestly
  (never fabricates a route) when OSRM is unreachable.
- Real Docker-based traffic-surge simulation (segment-speed-file + `osrm-customize` + container
  restart) for the advanced flow.
- Sourced, documented cost/carbon factors — every constant carries its source, year, and
  assumptions (see `backend/app/infrastructure/enrichment/static_factors.py`).
- Two-round Speed/Cost/Carbon agent negotiation via Groq, with a Coordinator that is guardrailed
  (not just prompted) against overriding the mathematically computed winner — a bad LLM output
  is *rejected*, not just discouraged, and falls back to a deterministic transcript.
- LLM explanation layer with the same validate-or-fallback discipline: every number in an
  explanation is checked against the real decision context before it can reach a user.
- Preference Memory (SQLite): cold-start presets, an online update rule (clamped, renormalized),
  and a closed loop verified by an HTTP test that makes two sequential `/baseline` calls and
  confirms the second reflects a learned weight change.
- FastAPI layer: Pydantic-validated schemas, explicit CORS allowlist, a full domain-error → HTTP
  status mapping, and `/internal/*` debug routes gated to 404 outside development.
- DDD-style layering (`domain/` → `application/` → `infrastructure/` → `api/`) with `domain/`
  kept completely framework-free, which is what makes the core math/guardrails unit-testable
  without a server.

**Frontend**
- Full trip workspace: origin/destination input with geocoding + geolocation, a real interactive
  MapLibre map rendering backend-supplied route geometry, a 3-mode comparison (time/cost/carbon/
  utility, with the recommended mode badged), a live negotiation feed, and an explanation panel.
- Preference input as both a discrete stated-priority preset **and** a continuous custom-weight
  slider (Speed/Cost/Carbon), normalized client- and server-side.
- A selection-confirmation control that's the actual trigger for the Preference Memory learning
  loop, wired to real backend state (not a decorative button).
- Zod schemas mirroring the backend's Pydantic DTOs field-for-field, so a backend contract drift
  fails loudly at the API boundary instead of silently rendering `undefined`.
- Clean TypeScript build with no `any`-typed escape hatches in the API layer.

## Known gaps / what's next

Roughly in priority order:

1. **No frontend automated tests.** `vitest` + Testing Library are installed but unused — no
   `*.test.tsx` files, no `npm test` script. Worth adding component tests for
   `DecisionWorkspacePanel` and the trip hooks before this grows much further.
2. **Trips aren't persisted.** `InMemoryTripStore` loses all trip state on backend restart; only
   Preference Memory (SQLite) survives. Fine for a demo, not for anything long-running.
3. **OSRM cached-fallback covers one fixed corridor**, not multiple routes — an outage during a
   demo on any route other than the built-in Coimbatore one degrades to `"unavailable"` per
   mode rather than serving cached data. See the README's deviations table for the reasoning.
4. **`/internal/*` debug routes have no auth within development mode** — low risk locally, but
   worth a shared-secret header if this ever runs somewhere less trusted.
5. **Backend dependencies are floating (`>=`), not pinned** — a fresh install isn't guaranteed
   to reproduce today's exact tested versions.
6. **No CI pipeline yet.** Tests and the frontend build are both fast and deterministic enough
   to be a straightforward GitHub Actions addition (`pytest` + `npm run build`).

## Recently resolved

- Fixed a real bug where a fresh trip's Preference Memory learning signal was attributed against
  an arbitrary "current mode" instead of the system's actual recommendation — now correctly
  reads the computed best mode.
- The primary new-trip flow (comparison → negotiation → explanation → selection) no longer
  requires first triggering the advanced traffic-surge feature to be reachable.
- Added a real continuous preference-weight control (previously only discrete presets existed).
- Removed five orphaned/unused frontend components that duplicated logic already implemented
  inline elsewhere.
- Removed fabricated marketing statistics from the home page and fixed a demo-route card whose
  copy didn't match what it actually launched.
- Closed out stale documentation: a referenced `backend/legacy/` directory and a
  `reset_car_dataset.sh` script that no longer exist were removed from the docs rather than left
  dangling.
