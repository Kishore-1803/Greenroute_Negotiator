# GreenRoute Negotiator

[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688.svg?style=flat&logo=fastapi)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18.3+-61DAFB.svg?style=flat&logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5+-3178C6.svg?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Google Maps](https://img.shields.io/badge/Google_Maps-Routes_API-4285F4.svg?style=flat&logo=googlemaps)](https://developers.google.com/maps)
[![SQLAlchemy](https://img.shields.io/badge/SQLAlchemy-2.0+-D71F00.svg?style=flat&logo=sqlalchemy)](https://www.sqlalchemy.org/)
[![Groq](https://img.shields.io/badge/Groq-Llama3/Mixtral-F55036.svg?style=flat)](https://groq.com)

**GreenRoute Negotiator** is an intelligent, multi-modal urban mobility platform designed for Indian cities. It combines live **Google Maps routing** (Car, Two-Wheeler, Cycling, Bus, and Metro), **materially load-bearing AI specialist agents**, a **transparent deterministic utility engine**, and **grounded Indian emission baselines** to nudge commuters toward sustainable, low-carbon travel.

---

## Key Highlights

- **Multi-Modal Routing Engine**: Real-time door-to-door routing across **Car**, **Two-Wheeler** (optimized for bike paths and narrow alleys), **Cycling**, **Bus**, and **Metro** via the Google Maps Routes and Directions API.
- **Accurate Indian Carbon & Cost Models**: Grounded in official Indian standards (**ARAI**, **MoRTH**, **BEE CAFE Stage II**, and **ICCT India**), applying realistic on-road adjustment multipliers (1.4x for cars, 1.2x for two-wheelers) and official fuel conversion metrics (2,310 g CO₂/L).
- **Load-Bearing Specialist Agents**: Four domain agents (**Speed**, **Cost**, **Carbon**, **Weather**) make bounded, deterministic metric adjustments (e.g., parking search time, vehicle wear, AQI exposure penalty, rain delays) *before* scoring. Deleting an agent changes the math and the recommendation.
- **Guardrailed LLM Negotiation & Explanation**: A multi-agent negotiation panel powered by **Groq** that is mathematically prohibited from overriding the computed winner. Plain-language explanations are cross-checked to ensure no hallucinated figures reach the user.
- **Voice Narration**: Optional text-to-speech powered by **ElevenLabs** to read out negotiation summaries and trip explanations.
- **Mobility Cooperation**: Dynamic carpool and relay matching with fellow commuters, offering cost and carbon discounts on private car trips.
- **Secure Authentication & Preference Learning**: Dual-identifier login (**Email or Phone Number**), PBKDF2 password hashing, and **SQLAlchemy ORM** over SQLite (WAL mode). The engine learns user priorities over time via online preference weight updates.
- **Interactive Map Experience**: Interactive Google Maps with real-time traffic condition color-coding (Clear Green, Mild Yellow, Heavy Red), transit station markers, and Satellite/Terrain/Transit layer switching.

---

## Table of Contents

- [Architecture](#architecture)
- [How It Works](#how-it-works)
- [Granular Indian Carbon & Cost Factors](#granular-indian-carbon--cost-factors)
- [Project Structure](#project-structure)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [API Reference](#api-reference)
- [Core Design Principles](#core-design-principles)

---

## Architecture

```text
React 18 + Vite Frontend (Tailwind CSS, Glassmorphic Dark UI, MapLibre & Google Maps)
                  ↕ REST / JSON (Strict Zod runtime contract validation)
FastAPI Backend (Domain-Driven Design, Pure Python Core, SQLAlchemy ORM)
   │
   ├── Routing Layer (Google Maps Routes & Directions API)
   │      ├── Car / Two-Wheeler (motorcycle-optimized paths) / Cycling
   │      └── Public Transit (Bus stops, Metro lines, and cached station db)
   │
   ├── Enrichment Engine (static_factors.py)
   │      └── Official ARAI / BEE CAFE-II / ICCT India carbon & fuel cost derivations
   │
   ├── Specialist Agent Adjustments (deterministic, 1:1 bounded channel mapping)
   │      ├── Speed Agent   → Door-to-door access/egress parking search friction
   │      ├── Cost Agent    → Ownership uplift (maintenance, depreciation, wear)
   │      ├── Carbon Agent  → Ambient AQI exposure penalty (caller-supplied)
   │      └── Weather Agent → Live rain caution delays (WeatherStack API)
   │
   ├── Mobility Cooperation Layer (overlap.py, commuter_pool.py)
   │      └── Dynamic commuter matching & carpool emission discounts
   │
   ├── Deterministic Utility Engine (min-max normalization + weighted sum)
   │      └── Evaluates adjusted metrics; highest score mathematically wins
   │
   ├── Guardrailed Negotiation & Explanation Layer (Groq LLM)
   │      └── Coordinator summarizes debate; validated against computed winner
   │
   ├── Voice Narration Layer (ElevenLabs API)
   │      └── High-fidelity text-to-speech for decisions and explanations
   │
   └── Persistence Layer (SQLAlchemy ORM + SQLite WAL Mode)
          └── Users, Trip History, Preference Memory, and Transit Cache
```

---

## How It Works

1. **Route Generation**: The user enters an origin and destination (or uses one-click geolocation). The backend queries the Google Maps API for available transit modes and routes.
2. **Baseline Enrichment**: Distance metrics are enriched with verified Indian emission (gCO₂/km) and fuel cost (₹/km) factors.
3. **Specialist Adjustments**: Active specialist agents propose bounded adjustments (e.g. +4 min car parking search, +15 min two-wheeler rain delay, AQI exposure scaling).
4. **Utility Scoring**: Scores are computed via min-max normalization against the user's weighted priorities (`w_time`, `w_cost`, `w_carbon`).
5. **AI Negotiation**: The Speed, Cost, and Carbon agents debate the trip trade-offs in Groq. The Coordinator narrates the outcome, strictly adhering to the calculated winner.
6. **Explanation & Audio**: A personalized "why" summary is generated and can be read aloud via ElevenLabs.
7. **Feedback & Learning**: When a commuter selects a mode, Preference Memory updates the user's weight vector online, and savings are recorded in their personal **Impact Dashboard**.

---

## Granular Indian Carbon & Cost Factors

GreenRoute uses empirical data from the **Automotive Research Association of India (ARAI)**, **BEE CAFE Stage II**, and **ICCT India (2024)** transport lifecycle reports:

| Mode | Base Emission | Real-World Multiplier | Adopted Emission (`gCO₂/km`) | Implied Mileage | Derived Fuel Cost (`₹/km`) | Basis / Source |
|---|---|---|---|---|---|---|
| **Car (ICE)** | 113.0 g/km | 1.4× (ICCT Gap) | **158.2** | 14.6 km/L | **₹6.99** | BEE CAFE-II baseline with on-road traffic/AC adjustment |
| **Two-Wheeler** | 38.2 g/km | 1.2× (ICCT Gap) | **45.8** | 50.4 km/L | **₹2.03** | ICCT FY20-21 Indian 2W fleet average |
| **Public Bus** | ~1000 g/km (WTW) | Allocated per pax | **25.0** / pax-km | — | **₹1.50** | ICCT HDV Lifecycle (urban diesel/CNG, 40 pax occupancy) |
| **Metro Rail** | Grid electric | Allocated per pax | **15.0** / pax-km | — | **₹2.50** | Standard high-efficiency electrified urban rail proxy |
| **Cycling** | 0 g/km | — | **0.0** | — | **₹0.00** | Zero tailpipe emissions |

*Petrol price benchmarked at ₹102.12/L (ARAI petrol emission factor: 2,310 g CO₂/L).*

---

## Project Structure

```text
GreenRoute_Negotiator/
├── backend/
│   ├── app/
│   │   ├── main.py                     # FastAPI composition root, CORS & app lifecycle
│   │   ├── api/
│   │   │   ├── routers/                # Auth, Trips, Users, Speech, Transit, Health
│   │   │   ├── dependencies.py         # Dependency injection for stores and use cases
│   │   │   └── error_handlers.py       # Domain error to HTTP status mapping
│   │   ├── application/use_cases/      # Clean orchestration use cases
│   │   ├── domain/                     # Pure framework-free business logic & math
│   │   │   ├── decision/               # Utility formula & switch policy
│   │   │   ├── negotiation/            # Material agent adjustments & guardrails
│   │   │   ├── cooperation/            # Carpool & commuter relay matching
│   │   │   └── preference/             # Online preference learning logic
│   │   ├── infrastructure/
│   │   │   ├── database/               # SQLAlchemy models & SQLite session (WAL mode)
│   │   │   ├── routing/google_maps/    # Google Maps Routes API client & transit routing
│   │   │   ├── enrichment/             # Sourced static cost and carbon factors
│   │   │   ├── llm/                    # Groq client, prompts & deterministic fallback
│   │   │   └── speech/                 # ElevenLabs text-to-speech integration
│   │   └── schemas/                    # Pydantic DTOs for requests and responses
│   └── pyproject.toml                  # Python dependencies (uv / pip)
│
├── frontend/
│   ├── src/
│   │   ├── app/                        # Router, AuthProvider, ErrorBoundary, App root
│   │   ├── components/                 # Layout (Header, Footer), Glassmorphic UI primitives
│   │   ├── features/map/               # Google Maps view, traffic layers, style selectors
│   │   ├── pages/
│   │   │   ├── Auth/                   # Standalone Login and Sign Up views
│   │   │   ├── Home/                   # Trip search form, presets, custom sliders
│   │   │   ├── TripWorkspace/          # Comparison cards, agent debate, audio narration
│   │   │   ├── ImpactDashboard/        # Personal carbon avoided, cost saved, trees equivalent
│   │   │   └── Profile/                # Commuter profile & sustainability status
│   │   ├── services/api/               # Fetch client & Zod schemas matching backend DTOs
│   │   └── styles/                     # Tailwind CSS & global styles
│   ├── package.json
│   └── vite.config.ts
├── PROGRESS.md                         # Detailed project evolution log
└── README.md
```

---

## Quick Start

### Prerequisites
- **Python**: 3.11, 3.12, or 3.13
- **Node.js**: v20+ or v22+
- **Google Maps API Key** (with Routes, Directions, and Places APIs enabled)

### 1. Backend Setup

```bash
cd backend

# Create and activate virtual environment
python -m venv .venv
# On Windows:
.\.venv\Scripts\activate
# On Linux/macOS:
source .venv/bin/activate

# Install dependencies
pip install -e .

# Configure environment
cp .env.example .env

# Run the FastAPI dev server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
Interactive Swagger docs will be available at: `http://localhost:8000/docs`.

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start Vite dev server
npm run dev
```
Open your browser at: `http://localhost:5173`.

---

## Configuration

### Backend (`backend/.env`)

| Variable | Description |
|---|---|
| `GOOGLE_MAPS_API_KEY` | Google Maps API key (requires Routes, Directions, Places) |
| `GROQ_API_KEY` | Optional. Enables live LLM negotiation and explanation generation |
| `GROQ_MODEL_NEGOTIATION` | Groq tool-calling model (default: `openai/gpt-oss-20b`) |
| `ELEVENLABS_API_KEY` | Optional. Enables voice narration for decisions and explanations |
| `ELEVENLABS_VOICE_ID` | Voice ID (default: `SAz9YHcvj6GT2YYXdXww` - River) |
| `PREFERENCE_DB_PATH` | Path to SQLite database (default: `greenroute_preferences.db`) |
| `WEATHERSTACK_API_KEY` | Optional. Ambient weather and rainfall detection |

---

## API Reference

All endpoints are prefixed with `/api/v1`:

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/auth/signup` | Register a new user using Email or Phone Number |
| `POST` | `/auth/login` | Authenticate using Email/Phone and Password |
| `GET` | `/users/me` | Fetch authenticated user profile and stats |
| `GET` | `/users/me/history` | Retrieve user's journey history |
| `POST` | `/trips/baseline` | Route, enrich, and score modes for an origin/destination |
| `POST` | `/trips/{id}/negotiation` | Run the 2-round multi-agent negotiation panel |
| `POST` | `/trips/{id}/explanation` | Generate plain-language decision explanation |
| `POST` | `/trips/{id}/selection` | Confirm selected mode and trigger Preference Memory update |
| `POST` | `/trips/{id}/cooperation` | Check for commuter carpooling and relay matches |
| `POST` | `/network/negotiate` | One-shot baseline routing + negotiation combined |
| `GET` | `/transit/stations` | Query cached transit bus stops and metro stations |
| `GET` | `/speech/status` | Check if ElevenLabs voice narration is active |
| `POST` | `/speech/narrate` | Convert text to audio MP3 stream |
| `GET` | `/health` | Server health and liveness probe |

---

## Core Design Principles

1. **Math Decides, AI Explains**: The winning route is always determined by pure Python mathematical formulas. The LLM is guardrailed to narrate and debate the result, never to override it.
2. **Deterministic Fallbacks**: If external AI or speech services are unreachable, the platform degrades gracefully to deterministic local transcripts without failing the user's trip.
3. **No Hallucinated Claims**: Every numeric metric in the negotiation or explanation is strictly validated against the actual route metrics before presentation.
4. **Clean Domain Boundaries**: The `domain/` layer contains zero web framework or database dependencies, ensuring clean testability and architectural resilience.
