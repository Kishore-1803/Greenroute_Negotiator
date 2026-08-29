# Project Progress

Status snapshot for anyone picking this project up. For what the system *is* and how it's built, see [`README.md`](README.md) — this file is about what's done, what's in flight, and what's next.

## Where things stand

`main` is the primary production-ready branch containing the complete integrated GreenRoute platform:
- **Routing Engine**: Fully powered by **Google Maps Routes & Directions API** with rich multi-modal support (**Car**, **Two-Wheeler**, **Cycling**, **Bus**, and **Metro**), transit stop extraction, and interactive traffic/layer mapping. All legacy OSRM dependencies have been permanently removed for a clean, unified codebase.
- **Real-World Indian Emissions & Cost Engine**: Precision-grounded in ARAI, MoRTH, ICCT India, and BEE CAFE Stage II standards. Includes real-world multipliers (1.4x for cars, 1.2x for two-wheelers) and official fuel conversion factors (2,310 g CO₂/L).
- **Authentication & Database**: Full **SQLAlchemy ORM** migration over SQLite with WAL mode. Universal user authentication supporting either **Email or Phone Number**, PBKDF2 password hashing, and client-side route protection (`ProtectedRoute`).
- **AI & Specialist Agents**: Load-bearing **Speed / Cost / Carbon / Weather** specialist agents with bounded pre-scoring adjustments, Groq LLM negotiation panel, plain-language explanation generation, and ElevenLabs voice narration.
- **Mobility Cooperation & Impact**: Commuter carpool matching/discounts and personal **User Impact Dashboard** tracking CO₂ avoided, cost savings, and trees saved.

---

## What's done

### 1. Authentication & Security
- **Dual Identifier Auth**: Users can register and log in using either **Email** or **Phone Number** with automated format detection.
- **Password Security**: PBKDF2 HMAC SHA-256 with 100,000 iterations and unique per-user cryptographic salts.
- **Route Protection**: Client-side `ProtectedRoute` wrapper guarding Home, Workspace, Impact Dashboard, and Profile views.
- **Refined Auth Experience**: Professional, distraction-free Auth shell with dedicated glassmorphic styling and standalone layout.

### 2. Multi-Modal Routing & Maps
- **Google Maps API Integration**: Live routing across Car, Two-Wheeler (optimized for narrow pathways), Cycling, Bus, and Metro transit.
- **Transit Discovery & DB Caching**: Automated station/stop discovery and persistent SQLAlchemy transit station caching.
- **Interactive Traffic & Map Layers**: Minimalist real-time traffic legend (Clear Green, Mild Yellow, Heavy Red) and map style selector (Satellite, Terrain, Transit).
- **Geolocation**: One-click origin auto-detection with fallback geocoding.

### 3. Sourced Carbon & Cost Derivation Engine
- **Granular Vehicle Data**: Sourced directly from official Indian transport studies (ARAI / ICCT India / BEE CAFE-II):
  - **Car**: 158.2 gCO₂/km (CAFE-II baseline 113.0 × 1.4 real-world gap).
  - **Two-Wheeler**: 45.8 gCO₂/km (ICCT FY20-21 fleet average 38.2 × 1.2 real-world gap).
  - **Bus**: 25.0 gCO₂/passenger-km (WTW lifecycle ~1000 g/km ÷ 40 passengers).
  - **Metro**: 15.0 gCO₂/passenger-km (High-efficiency electrified transit proxy).
  - **Cycling**: 0.0 gCO₂/km (zero tailpipe).
- **Fuel Mileage & Cost Math**: Uses ARAI's 2,310 g CO₂/L petrol factor to derive real-world fuel economy (14.6 km/L car, 50.4 km/L two-wheeler) and accurate per-km out-of-pocket costs at current retail fuel prices.

### 4. Specialist Agent Negotiation & Utility Scoring
- **Deterministic Utility Engine**: Min-max normalization and weighted sum over door-to-door duration, out-of-pocket cost, and carbon emissions.
- **Material Specialist Adjustments**: Deterministic, bounded proposals on 1:1 channels (Speed → access/egress, Cost → ownership uplift, Carbon → AQI exposure, Weather → rain delay).
- **Guardrailed Groq Panel**: Two-round negotiation and plain-language explanation where the LLM is mathematically constrained to only narrate the computed winner.
- **ElevenLabs Voice Narration**: High-fidelity text-to-speech for Coordinator summaries and route explanations.

### 5. Database Architecture & SQLAlchemy Migration
- **SQLAlchemy ORM Models**: Clean domain persistence for `User`, `TripHistory`, `NegotiationLog`, `TransitStation`, and `UserPreference`.
- **SQLite Performance**: Configured with `PRAGMA journal_mode=WAL` for concurrent reads and resilient startup schema migrations.

### 6. Codebase Hygiene & Cleanup
- **OSRM Purge**: Completely removed all legacy OSRM files, test suites, and demo scripts.
- **Linting & Code Quality**: Auto-fixed over 120 backend issues via `ruff` and cleaned up frontend TypeScript/ESLint warnings.

---

## Known gaps / what's next

1. **OTP Verification**: Optional SMS/Email OTP verification when a reliable production gateway is integrated.
2. **Additional Transit Cities**: Expand transit station database caching beyond Chennai / Coimbatore to additional Indian metropolitan transit networks.
3. **Automated CI/CD**: Set up a GitHub Actions pipeline for automated linting and build validation.

---

## Recently resolved

- **SQLAlchemy Migration**: Converted all raw database operations to SQLAlchemy ORM models with SQLite WAL pragma and automated column additions.
- **Universal Identifier Auth**: Enabled logging in and signing up with either email or phone number.
- **Real-World Emission Data**: Updated all carbon and fuel calculations to match real-world Indian road studies.
- **Clean Main Branch**: Cleaned up legacy OSRM assets, demo scripts, and completed full frontend/backend linting passes.
- **Map & Transit UX**: Added map style switching (Satellite/Terrain/Transit) and traffic condition indicators.
