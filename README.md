# GreenRoute Negotiator

> **Merge note for other devs (read this first).** `main` integrates two parallel work
> streams off the same base commit:
>
> - **Kishore's branch** — a routing pivot to the **Google Maps Routes API + Gemini**, a
>   **Mobility Cooperation** (carpool / relay) feature, and a **User Impact Dashboard**
>   (`/impact`). All of this is wired and active.
> - **Vishal's branch** — the **specialist agents made materially load-bearing** (bounded
>   pre-scoring adjustments + an optional AQI term), a one-shot **`POST /api/v1/network/negotiate`**,
>   and optional **ElevenLabs voice narration** (`/api/v1/speech/*`).
>
> **Routing:** Google Maps is the wired provider. The **OSRM adapter under
> `backend/app/infrastructure/routing/osrm/`** is kept as an unwired drop-in behind the same
> `RoutingProvider` port — **not** imported by `api/dependencies.py`. To use it you supply your
> own three OSRM instances and repoint `get_raw_routing_provider` / `get_traffic_simulator`.

GreenRoute is a multi-modal trip recommender for short urban trips. Give it an origin,
destination, and what you care about (speed, cost, carbon — or a custom mix), and it:

1. Routes the trip on **Car**, **Two-wheeler**, and **Cycling** using the **Google Maps Routes
   API** (with a local cached-route fallback for the one fixed demo corridor).
2. Enriches each route with sourced cost (₹/km) and carbon (gCO₂/km) factors.
3. Lets the **Speed / Cost / Carbon** specialist agents apply bounded, individually-reasoned
   adjustments to those metrics — and, if a compatible commuter exists and you're open to it,
   a **Mobility Cooperation** discount on the Car — *before* scoring.
4. Scores all three modes with a transparent, weighted **utility formula**.
5. Runs the three agents through a two-round **negotiation**, then has a **Coordinator**
   narrate the winner — the Coordinator can explain the result but can never override it.
6. Explains the recommendation in plain language, grounded only in real numbers — optionally
   **read aloud** (ElevenLabs).
7. Learns from what you actually pick: your **Preference Memory** weight vector updates, and
   your choices roll up into a personal **Impact Dashboard**.

A second, advanced capability builds on the same engine: once a trip is underway, GreenRoute
can re-evaluate it after a simulated traffic surge → real route recomputation → a
deterministic SWITCH/STAY decision → the same negotiation and explanation machinery, run again
on the changed metrics.

**The core design rule**: the decision is always deterministic, pure-Python math. An LLM is
only ever allowed to *narrate* an already-computed result — never to compute or override one.
Every LLM output is validated against that rule before it can reach a user, with a deterministic
fallback if Groq is unreachable or a response fails validation. See
[Design principles](#design-principles) below for how that's enforced in code.

The three specialist agents are nonetheless **materially load-bearing**, not decorative. Before
the utility formula runs, each proposes a bounded, individually-reasoned adjustment on its own
channel — Speed adjusts time, Cost adjusts cost, Carbon adjusts carbon — correcting omissions
that the raw routing and enrichment figures document but don't account for (door-to-door parking
time; the parking/tolls/maintenance/depreciation that the cost factors explicitly exclude; and
pollution exposure when an AQI is supplied). Those proposals are summed per channel, clamped,
and *then* scored. Deleting an agent changes the utility scores, and can change the
recommendation. The deltas are computed deterministically in `domain/negotiation/adjustments.py`
— **an LLM never picks them**, which is what keeps the recommendation reproducible and keeps a
Groq outage from changing the answer.

---

## Table of contents

- [Quick start](#quick-start)
- [Architecture](#architecture)
- [Project structure](#project-structure)
- [API reference](#api-reference)
- [Design principles](#design-principles)
- [Testing](#testing)
- [Configuration](#configuration)
- [Deliberate deviations from the original plan](#deliberate-deviations-from-the-original-plan)
- [Known limitations](#known-limitations)
- [Making a change: a quick map](#making-a-change-a-quick-map)

---

## Quick start

**Requires:** Python 3.11–3.13, Node `^20.19.0` or `22.12–24.x`, and
[uv](https://docs.astral.sh/uv/) for the locked Python environment. (Docker only if you swap
routing back to OSRM — see below.)

### 1. Routing (Google Maps — wired)

Set `GOOGLE_MAPS_API_KEY` in `backend/.env`. The key needs the **Routes API** enabled.

> Without a key, the backend still starts and responds — routing calls fail over to a cached
> demo route for the one fixed demo corridor and return per-mode `distance_km: null` for
> anything else. See [`backend/app/infrastructure/routing/cached_fallback.py`](backend/app/infrastructure/routing/cached_fallback.py).

<details><summary><b>Alternative: OSRM (unwired, kept in the tree)</b></summary>

The adapter under `backend/app/infrastructure/routing/osrm/` implements the same
`RoutingProvider` port but is **not** imported by `api/dependencies.py`. To use it: run your
own three OSRM instances (car `:5000` / two-wheeler `:5001` / cycling `:5002` — dataset build
notes in [`backend/data/osrm/README.md`](backend/data/osrm/README.md)), then in
`api/dependencies.py` point `get_raw_routing_provider` / `get_traffic_simulator` at
`OSRMRoutingProvider` / `OSRMTrafficSimulator` instead of the Google Maps ones.

</details>

### 2. Backend

```bash
cd backend
uv sync --locked --extra dev
Copy-Item .env.example .env                 # PowerShell; GROQ_API_KEY is optional
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Interactive API docs: `http://localhost:8000/docs`. Run the test suite: `pytest tests/` (see
[Testing](#testing)).

### 3. Frontend

```bash
cd frontend
npm ci
npm run dev                                # http://localhost:5173
```

The default frontend configuration uses `/api/v1`, which Vite proxies to the local backend.
Copy `frontend/.env.example` to `.env.local` only to point that proxy at another backend.
Production build: `npm run build` (runs `tsc -b && vite build`
— fails on any type error). Lint: `npm run lint`.

### 4. Try it

Open `http://localhost:5173`, enter an origin/destination (or use the pre-filled Coimbatore
demo defaults), pick what matters most to you, and hit **Find Best Route**. You'll land on the
Trip Workspace with all three modes compared, a recommended mode, a "why" explanation, and a
live agent negotiation feed you can trigger on demand.

### LAN / college-network demo

The previous configuration embedded `http://localhost:8000` in the browser bundle. On a
classmate's laptop, `localhost` means their laptop, so API calls fail (often as a 404). The new
default is same-origin `/api/v1`; Vite forwards it to the backend on the presentation machine.

1. Start the backend and frontend above on the presentation laptop.
2. Run `ipconfig`, find its Wi-Fi IPv4 address, and share `http://<laptop-ip>:5173` — never the
   `localhost` URL.
3. Allow private-network inbound TCP ports 5173 and 8000 in Windows Defender Firewall if asked.
4. Check `http://localhost:8000/api/v1/health` on the host, then open the shared URL on a
   second device.

If the second device cannot load the frontend at all, the college Wi-Fi is probably using client
isolation. That policy cannot be solved in application code; use a hotspot, a deployed host, or
ask the network administrator for a demo network.

---

## Architecture

```text
React frontend (render-only — no decision logic lives here)
      ↕ REST/JSON, validated with Zod at the boundary
FastAPI backend (owns every decision)
   │
   ├── Google Maps Routes API (car / two-wheeler-approx / cycle)   [wired]
   │      └── cached-demo-route fallback if the API is unreachable (one known fixed trip)
   │      └── OSRM ×3 self-hosted adapter kept in the tree, unwired
   │
   ├── Traffic simulation (advanced flow): Google Maps traffic-aware recompute
   │
   ├── Sourced, cited cost/carbon enrichment (static_factors.py)
   │
   ├── Specialist-agent pre-scoring adjustments (Speed/Cost/Carbon, bounded) +
   │      Mobility Cooperation carpool/relay discount on Car (match-gated)
   │
   ├── Preference Memory: SQLite per-user time/cost/carbon weights,
   │      cold-start preset + online clamped/renormalized update rule
   │
   ├── Specialist-agent adjustment layer (deterministic, bounded, 1:1 channel mapping)
   │      Speed→time, Cost→cost, Carbon→carbon (AQI exposure, caller-supplied only)
   │      Round 1 proposes → Round 2 sums per channel and clamps → feeds the formula below
   │
   ├── Deterministic utility engine (min-max normalized, weighted sum)
   │      → runs on the ADJUSTED metrics; the mode with the highest score wins, always
   │
   ├── 2-round negotiation panel (Speed/Cost/Carbon agents + Coordinator, Groq)
   │      guardrailed: Coordinator's declared winner MUST equal the computed winner,
   │      or the response is rejected and replaced with a deterministic transcript
   │
   ├── LLM explanation layer (Groq, narrates only) + deterministic fallback,
   │      every number in the output validated against the real decision context
   │
   └── Voice narration (ElevenLabs, optional): speaks the Coordinator summary /
          the explanation aloud -- text-to-speech only, never a new claim
```

### Request flow (primary flow — a new trip)

```text
POST /trips/baseline  { origin, destination, stated_priority | custom_weights, user_id }
   → routes all 3 modes, enriches, loads/cold-starts preference weights,
     computes utility scores, returns best_mode + full comparison

POST /trips/{id}/negotiation   → Round 1 → Round 2 → Coordinator (never overrides best_mode)
POST /trips/{id}/explanation   → plain-language "why", grounded in the same numbers
POST /trips/{id}/selection     { selected_mode }
   → if selected_mode != best_mode: preference weights update, clamp, renormalize, persist

Next POST /trips/baseline for the same user_id reads the updated weights back out.
```

### Advanced flow (an in-progress trip, condition changes)

```text
POST /trips/{id}/condition-change
   → real Docker/OSRM traffic surge on the car dataset → re-route → re-score
     → deterministic SWITCH/STAY decision (current mode vs. alternatives)
   → the same /negotiation and /explanation endpoints, re-run on the new metrics
```

---

## Project structure

### Backend (`backend/app/`) — layered by dependency direction

Each layer only knows about the one below it. `domain/` has zero framework imports (no
FastAPI, no httpx, no Docker) — it's pure Python business logic, which is what makes the
utility formula and guardrails independently unit-testable.

```text
backend/app/
├── main.py                    Composition entrypoint: FastAPI app, CORS, error handlers, routers
│
├── api/                       HTTP layer -- request/response translation only
│   ├── routers/
│   │   ├── trips.py               /api/v1/trips/* -- the whole public contract
│   │   ├── health.py               /api/v1/health
│   │   └── internal_debug.py       /internal/* -- dev-only, 404s outside GREENROUTE_ENV=development
│   ├── dependencies.py            composition root: wires infra adapters into use cases
│   └── error_handlers.py          domain error -> HTTP status code mapping (the ONLY place that knows)
│
├── schemas/                   Pydantic DTOs (request/response validation + OpenAPI docs)
│   ├── requests.py, responses.py, common.py
│
├── application/use_cases/     Orchestration only -- no business rules live here
│   ├── evaluate_baseline.py       route + enrich + score all 3 modes -> best_mode
│   ├── run_negotiation.py         build negotiation context, try Groq, validate, fall back
│   ├── explain_decision.py        same try/validate/fallback shape, for explanations
│   ├── record_selection.py        the Preference Memory learning trigger
│   └── trigger_condition_change.py  the advanced SWITCH/STAY flow
│
├── domain/                    Pure business logic -- the actual rules, framework-free
│   ├── decision/
│   │   ├── utility.py              THE formula: min-max normalize + weighted sum
│   │   ├── switch_policy.py        deterministic SWITCH/STAY gate logic
│   │   └── entities.py             Trip, ModeMetrics, Decision
│   ├── negotiation/
│   │   └── interfaces.py           validate_transcript() -- the Coordinator guardrail
│   ├── explanation/
│   │   └── interfaces.py           validate_output() -- the "no hallucinated numbers" guardrail
│   ├── preference/
│   │   └── entities.py             cold-start presets, weight-vector shape
│   ├── enrichment/ , routing/      Protocol interfaces infrastructure/ implements
│   └── common/errors.py           the full domain error taxonomy
│
└── infrastructure/             Concrete adapters -- the ONLY place external services are touched
    ├── routing/osrm/               OSRM client, traffic simulator, cached fallback
    ├── enrichment/static_factors.py  sourced cost/carbon constants (see file docstring)
    ├── llm/                        Groq clients + prompts + deterministic fallbacks
    ├── preference/sqlite_store.py  the Preference Memory persistence
    └── config/settings.py          the ONE place environment variables are read
```

**If you're new here, read in this order**: `domain/decision/utility.py` (the math) →
`domain/negotiation/interfaces.py` (the guardrail) → `application/use_cases/evaluate_baseline.py`
(how it's all wired together) → `api/routers/trips.py` (the HTTP surface).

### Frontend (`frontend/src/`)

```text
frontend/src/
├── app/                    App.tsx, router.tsx (4 routes: /, /trip, /trip/:id, /how-it-works),
│                           ErrorBoundary, React Query provider
├── pages/
│   ├── Home/                   trip planner form, preference presets + custom-weight sliders
│   ├── TripWorkspace/          the main workspace: route comparison, negotiation feed, decision
│   └── HowItWorks/             transparency/explainer page
├── features/
│   ├── map/                    MapLibre GL map, route polylines from backend GeoJSON, geocoding
│   └── trip/hooks/              one React Query mutation hook per backend endpoint
├── services/api/               fetch client + Zod schemas mirroring the backend DTOs field-for-field
│                                (a backend contract drift fails loudly here, not silently downstream)
├── components/                 shared layout + UI primitives
├── lib/                        small pure helpers (formatting, user id, mock/default locations)
└── types/mode.ts               the frozen TravelMode union ('car' | 'two_wheeler' | 'cycling')
```

**If you're new here, read in this order**: `services/api/types.ts` (the full data contract) →
`pages/TripWorkspace/index.tsx` (state orchestration, one hook per endpoint) →
`pages/TripWorkspace/DecisionWorkspacePanel.tsx` (where most of the UI actually lives).

---

## API reference

All routes are under `http://localhost:8000/api/v1` (interactive docs at `/docs`).

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/trips/baseline` | New trip: routes + scores all 3 modes, returns the recommendation |
| `POST` | `/trips/{id}/negotiation` | Runs the 2-round agent negotiation for this trip's current state |
| `POST` | `/trips/{id}/explanation` | Plain-language "why", optionally answering an objection category |
| `POST` | `/trips/{id}/condition-change` | Advanced flow: simulate a traffic surge, get a SWITCH/STAY decision |
| `POST` | `/trips/{id}/selection` | Record what mode the user actually picked (drives Preference Memory + Impact Dashboard) |
| `POST` | `/trips/{id}/cooperation` | Mobility Cooperation: find carpool/relay candidates for this trip + an AI mediation transcript |
| `POST` | `/network/negotiate` | One-shot: `/trips/baseline` + `/trips/{id}/negotiation` in a single call (scored modes + full 2-round transcript + winner out); also writes a `negotiation_log` audit row |
| `GET` | `/users/{id}/impact` | User Impact Dashboard stats (trips, green choices, carbon/cost saved, trees-equivalent) |
| `GET` | `/speech/status` | Is voice narration configured on this server? (`{enabled, provider, voice_id}`) |
| `POST` | `/speech/narrate` | Text in, an `audio/mpeg` MP3 out (ElevenLabs). Optional -- `enabled:false` when `ELEVENLABS_API_KEY` is unset |
| `GET` | `/health` | Liveness check |

`aqi` on `/trips/baseline` (and `/network/negotiate`) is an optional ambient Air Quality Index. Supplied, it feeds the Carbon specialist's exposure adjustment; omitted, that channel contributes nothing -- the backend never invents an air-quality number. `willing_to_carpool` (default `true`) gates the Mobility Cooperation discount on the Car mode.

`current_mode` on `/trips/baseline` is optional — omit it for a fresh recommendation; the
response's `current_mode` defaults to `best_mode`. Send either `stated_priority` (a preset) or
`custom_weights` (a continuous `{time, cost, carbon}` vector, normalized server-side) to steer
the utility weighting for that one call.

---

## Design principles

A few rules are enforced in code, not just convention, and are worth knowing before you change
anything:

- **Agents move the data; math picks the winner.** The specialists' adjustments
  (`domain/negotiation/adjustments.py`) change what the utility formula is fed, so the agents
  genuinely affect the outcome — but every delta is a deterministic function of the real metrics
  plus a caller-supplied AQI, bounded by an explicit clamp, and recorded with its reason in the
  response's `adjustments` block. Because no LLM chooses a delta, the same trip always scores the
  same way and a Groq outage cannot change the recommendation — the deterministic fallback
  narrates the *same* ranking Groq would have.
- **The LLM never picks a winner.** `domain/negotiation/interfaces.py::validate_transcript`
  raises `CoordinatorOverrideError` if the Coordinator's declared winner doesn't exactly match
  the independently computed one. `application/use_cases/run_negotiation.py` catches that and
  falls back to a deterministic transcript — it never reaches the user. Same pattern for
  explanations (`validate_output`, rejects any number not traceable to the real decision
  context).
- **Every failure degrades, never crashes the flow.** OSRM down → per-mode `"unavailable"` (or
  cached demo data for the one known corridor), never a 5xx for the whole request. Groq down or
  unconfigured → deterministic fallback. Both are disclosed in-band: `routing_source` on every
  mode, `provider` on every negotiation/explanation response — the frontend can show a fallback
  state honestly instead of pretending everything is live.
- **Domain code imports nothing but domain code.** `backend/app/domain/` has zero FastAPI/httpx/
  Docker/SQLite imports. This is what makes `utility.py` and the guardrails testable with plain
  `pytest`, no server needed.
- **Preference Memory only learns from a real disagreement.** A selection that matches the
  recommendation is a no-op — see `record_selection.py`. Weights are clamped to a minimum of
  `0.01` and renormalized to sum to 1 after every update (`sqlite_store.py`).

---

## Testing

### Backend

```bash
cd backend
uv run pytest tests/          # unit (domain math) + infrastructure + full HTTP-level flows
```

Organized as:
- `tests/domain/` — the utility formula, switch policy, negotiation guardrails (framework-free,
  fast, no server).
- `tests/infrastructure/` — SQLite preference store, OSRM cached-fallback behavior.
- `tests/api/` — real `TestClient` HTTP requests against fake (non-network) providers: request
  validation, the full preference-learning loop across two `/baseline` calls, negotiation/
  explanation/condition-change over HTTP, and one end-to-end test that walks the entire primary
  flow (new trip → baseline → negotiation → selection → a second trip using the learned
  weights).

### Frontend

`npm run build` (`tsc -b`) is the current correctness gate — it fails on any type error, and the
Zod schemas in `services/api/types.ts` catch a backend contract drift at runtime. **There is no
automated frontend test suite yet** — `vitest` and Testing Library are installed as
devDependencies but no `*.test.tsx` files exist and there's no `npm test` script. If you add
component tests, wire up a `test` script in `package.json` pointing at `vitest run`.

---

## Configuration

### Backend (`backend/.env`, copy from `.env.example`)

| Variable | Default | Purpose |
|---|---|---|
| `GOOGLE_MAPS_API_KEY` | unset | **The wired router.** Needs the Routes API enabled. Unset → cached fallback for the demo corridor only. |
| `GROQ_API_KEY` | unset | Optional. Without it, negotiation/explanation always use the deterministic fallback. |
| `GROQ_MODEL_EXPLANATION` / `GROQ_MODEL_NEGOTIATION` | `openai/gpt-oss-20b` | Must support forced tool calling (see note below). |
| `ELEVENLABS_API_KEY` | unset | Optional. Enables `POST /speech/narrate` (voice narration of the Coordinator summary and the explanation). Unset → the frontend hides the listen buttons. |
| `ELEVENLABS_VOICE_ID` / `ELEVENLABS_MODEL` | `SAz9YHcvj6GT2YYXdXww` (River) / `eleven_turbo_v2_5` | Premade voice + model. Library/cloned voices need a paid ElevenLabs plan. |
| `PREFERENCE_DB_PATH` | `greenroute_preferences.db` | SQLite file for Preference Memory, the negotiation log, and the Impact Dashboard |
| `OSRM_HOST` / `OSRM_PORT_CAR` / `_TWO_WHEELER` / `_CYCLING` | `http://localhost` / `5000` / `5001` / `5002` | Only used if you swap routing back to the **unwired** OSRM adapter. |
| `DEFAULT_ORIGIN_LON/LAT`, `DEFAULT_DEST_LON/LAT` | Coimbatore demo pair | Used by the cached-fallback route and `/internal` debug routes |
| `GREENROUTE_ENV` | `development` | Set anything else to disable the `/internal/*` debug routes (they 404) |
| `CORS_ALLOW_ORIGINS` | local Vite origins | Explicit comma-separated allowlist for direct browser-to-API deployments. The `/api` proxy does not need it. |

> **Picking a Groq model.** Every LLM call here uses a *forced* `tool_choice`, so the model
> must support tool calling — `groq/compound` does not, and returns
> `400 "tool calling is not supported with this model"`. Model availability is also per-account:
> check yours with
> `curl https://api.groq.com/openai/v1/models -H "Authorization: Bearer $GROQ_API_KEY"` and pick
> one whose `supported_features` includes `tools`. Note that Groq validates the tool schema
> **server-side**: if a response overruns a `maxLength` in `negotiation_prompts.py`, the whole
> call is rejected with a 400 and the request silently degrades to the deterministic fallback,
> so those bounds are sized not to bind in normal use.

### Frontend (`frontend/.env.local`, copy from `.env.example`)

| Variable | Default | Purpose |
|---|---|---|
| `VITE_API_BASE_URL` | `/api/v1` | Browser API base. Relative is the recommended local/LAN setting. |
| `GREENROUTE_API_PROXY_TARGET` | `http://127.0.0.1:8000` | Vite-only backend target; it is not exposed in the browser bundle. |

---

## Deliberate deviations from the original plan

This project started from a hackathon "Master Plan" spec. A few things were deliberately
changed from that literal spec, with reasons:

| Area | Original plan | Adopted | Why |
|---|---|---|---|
| Routing engine | Self-hosted OSRM ×3 | **Google Maps Routes API** (wired); OSRM kept as an unwired drop-in | Live traffic + zero infra to run for a demo. The OSRM path is preserved behind the `RoutingProvider` port. |
| Cost/carbon factors | Car 138 g/₹7.2, Two-wheeler 41.2 g/₹2.5, Cycling 0/0 (uncited) | Car 113.0 g (India CAFE-II), Two-wheeler 41.2 g (ICCT), Cycling **0 g**, costs derived from live fuel price | Cited data where a source exists; cycling's food-energy lifecycle figure was dropped back to 0 for the pivot. Full table in [`static_factors.py`](backend/app/infrastructure/enrichment/static_factors.py). |
| Specialist agents | Narrate the winner only | **Also apply bounded pre-scoring adjustments** on their own channel (+ optional AQI) | Makes deleting an agent actually change the recommendation; deltas are deterministic, so a Groq outage can't. See [`domain/negotiation/adjustments.py`](backend/app/domain/negotiation/adjustments.py). |
| Utility tie-case | `norm = 0` when two modes tie on a metric | `norm = 1.0` on a tie | Scoring a tie as "worst possible" is a product defect — see [`utility.py`](backend/app/domain/decision/utility.py). |
| Groq fallback | Static `pregenerated_fallback.json` transcript | A deterministic fallback provider computed from the live trip's real metrics | Adapts to any trip; disclosed via the `provider` field on every response. |

---

## Known limitations

Being upfront about these so they don't surprise a new contributor:

- **Trip storage is SQLite** (`SQLiteTripStore`), same file as Preference Memory / the
  negotiation log / the Impact Dashboard (`PREFERENCE_DB_PATH`).
- **Thin frontend tests.** `npm test` runs one vitest file (`services/api/types.contract.test.ts`,
  the backend-contract guard). Component tests are still worth adding.
- **Cached routing fallback covers one corridor only** (the `DEFAULT_ORIGIN/DEST` demo pair) —
  see the deviations table.
- **Two "adjust the Car before scoring" mechanisms now coexist** in `evaluate_baseline.py`:
  the specialist-agent adjustments (bounded, per-channel) and the Mobility Cooperation discount
  (flat, carpool-match-gated). They run in that order; both are disclosed on the Car's
  `routing_disclosure`.
- **`/internal/*` debug routes** are gated to 404 outside `GREENROUTE_ENV=development` but are
  not authenticated within development mode.
- **Lockfiles are required.** `backend/uv.lock` and `frontend/package-lock.json` are committed.
  Use `uv sync --locked --extra dev` and `npm ci`; regenerate a lock only for intentional upgrades.

---

## Making a change: a quick map

| I want to... | Start here |
|---|---|
| Change the utility formula or weighting | `backend/app/domain/decision/utility.py` — then update `tests/domain/decision/test_utility.py` |
| Change cost/carbon numbers | `backend/app/infrastructure/enrichment/static_factors.py` — keep the source/year/assumptions fields filled in |
| Change what the Speed/Cost/Carbon agents argue, or their prompts | `backend/app/infrastructure/llm/negotiation_prompts.py`, `negotiation_provider.py` |
| Change the agents' pre-scoring adjustments (or the AQI model) | `backend/app/domain/negotiation/adjustments.py` — then `tests/domain/negotiation/test_adjustments.py` |
| Change the carpool/relay matching or savings | `backend/app/domain/cooperation/overlap.py`, `infrastructure/cooperation/commuter_pool.py` |
| Swap routing (Google Maps ⇄ OSRM) | `backend/app/api/dependencies.py` — `get_raw_routing_provider` / `get_traffic_simulator` |
| Change the SWITCH/STAY threshold logic | `backend/app/domain/decision/switch_policy.py` |
| Change how Preference Memory learns | `backend/app/infrastructure/preference/sqlite_store.py` (the update rule), `domain/preference/entities.py` (cold-start presets) |
| Add a new API field | Update `backend/app/schemas/` (Pydantic) **and** `frontend/src/services/api/types.ts` (Zod) together — they must stay in sync |
| Add a new page or route | `frontend/src/app/router.tsx`, then a folder under `frontend/src/pages/` |
| Change the map | `frontend/src/features/map/` |
| Add a new backend endpoint | A use case under `application/use_cases/`, wired via `api/dependencies.py`, exposed via a router in `api/routers/`, mapped to an HTTP status in `api/error_handlers.py` if it introduces a new error type |
