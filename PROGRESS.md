# Project Progress

Status snapshot for anyone picking this project up. For what the system *is* and how it's
built, see [`README.md`](README.md) — this file is about what's done, what's in flight, and
what's next.

## Where things stand

`main` now integrates two parallel streams off the same base commit (`55b6a9f`):
**Kishore's** Google Maps + Gemini routing pivot, Mobility Cooperation (carpool/relay), and
User Impact Dashboard; and **Vishal's** load-bearing specialist agents + optional AQI, one-shot
`/api/v1/network/negotiate`, and ElevenLabs voice. Routing is wired to **Google Maps**; the
OSRM adapter stays in the tree, unwired.

The primary flow works end-to-end and is covered by tests: a new trip gets routed on all three
modes, agent-adjusted (and carpool-discounted if a match exists), scored, negotiated over,
explained, and the user's choice feeds Preference Memory + the Impact Dashboard. The advanced
traffic-surge/SWITCH-STAY flow builds on the same engine.

```
Backend:   95/95 tests passing (pytest tests/)
Frontend:  clean build (tsc -b && vite build, 0 errors) + 5/5 vitest contract tests
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
- An expandable "Agent Adjustments" trail in the Trip Workspace (raw -> adjusted per
  mode/channel, with each agent's reason and any clamp), an optional AQI input on both
  planner forms, and a "Listen" button (ElevenLabs voice) on the Coordinator summary and
  the explanation -- shown only when the server reports speech is configured.

## Known gaps / what's next

Roughly in priority order:

1. **Thin frontend test coverage.** `npm test` now runs one vitest file
   (`services/api/types.contract.test.ts`, the backend-contract guard). Component tests for
   `DecisionWorkspacePanel` / `AgentAdjustmentTrail` and the trip hooks are still worth adding.
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

- **Merged Kishore's `origin/main`.** Both streams started from `55b6a9f`. Resolved keeping
  *both* sides: Google Maps stays the wired router; the OSRM adapter is kept unwired (swap in
  `api/dependencies.py`). `evaluate_baseline.py` runs the specialist-agent adjustments *then*
  the carpool discount before scoring. `dependencies.py` / `main.py` / `trips.py` /
  `requests.py` / `types.ts` / `DecisionWorkspacePanel.tsx` / `TripWorkspace/index.tsx` carry
  both feature sets. Two base tests updated for the friend's `cycling` carbon `130 → 0`. The
  committed `greenroute_preferences.db` was un-tracked (it's gitignored).

- **Agent adjustments are now visible in the UI.** `BaselineResponse` / `/network/negotiate`
  carry `raw_modes`, `adjustments` (every proposal + reason + clamp), and `aqi`; the Trip
  Workspace renders an expandable "Agent Adjustments" trail (raw -> adjusted per mode/channel,
  greyed-out agents, AQI + clamp badges), and both planner forms take an optional AQI input.
  Frontend Zod schemas were extended to match, guarded by `types.contract.test.ts` (the first
  frontend test in the repo -- `npm test` now runs vitest).
- **Voice narration (ElevenLabs).** New `POST /api/v1/speech/narrate` (text -> MP3, LRU-cached)
  and `GET /api/v1/speech/status`. A `SpeechProvider` port + `ElevenLabsSpeechProvider` adapter
  behind the same "unconfigured -> feature off, not a crash" pattern as the Groq providers.
  The frontend shows a "Listen" button next to the Coordinator summary and the explanation,
  rendered only when `/speech/status` reports `enabled`. The `ELEVENLABS_API_KEY` that had sat
  unread in `.env` since forever is now actually wired through `settings.py`.

- **Made the specialist agents load-bearing.** They previously only produced prose. Each agent
  now proposes a bounded, deterministic adjustment on its own channel *before*
  `compute_utility_scores` runs (proposals summed per channel, then clamped), so deleting an
  agent changes the recommendation. Deltas are pure functions of the metrics + an optional
  caller-supplied AQI — never LLM-chosen — so the outcome stays reproducible and a Groq outage
  can't move it. Guarded by `tests/domain/negotiation/test_adjustments.py`.
- **Fixed the Groq model default.** `groq/compound` (the old default) has no tool-calling
  support, yet every LLM call uses a forced `tool_choice`. Default is now `openai/gpt-oss-20b`;
  the `maxLength` bounds in `negotiation_prompts.py` (which Groq validates server-side) were
  raised so a normal-length response no longer silently drops to the fallback.

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
