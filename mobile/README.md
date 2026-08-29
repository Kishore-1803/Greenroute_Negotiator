# GreenRoute Mobile (Phone Frontend)

A React Native & Expo mobile application for **GreenRoute Negotiator**, mirroring the full feature set, atmospheric forest dark UI, and mathematical decision pipeline of the web application.

---

## Features

- **Atmospheric Dark Forest Aesthetic**: Custom frosted glass cards (`GlassCard`), glowing emerald accents (`#8EE074`), and dark nature background.
- **Route Planner & Geolocation**: Origin / Destination location autocomplete, GPS coordinate locator, and toggleable continuous preference weight sliders.
- **Interactive Multi-Modal Route Map**: Vector SVG map visualizer rendering backend GeoJSON paths for Car, Two-Wheeler, and Cycling.
- **3-Mode Comparison Cards**: Live Duration (min), Operating Cost (₹), Emissions (g CO₂), and Utility Score with real-time `RECOMMENDED` badge.
- **Traffic Surge Simulation**: Dual-gate deterministic `SWITCH` / `STAY` decision engine and impact diffs (+min, +₹, +g CO₂).
- **Preference Memory Feedback Loop**: One-tap mode selection confirmation that updates learned weight distributions.
- **Grounded AI Explanations**: 6 calm objection question chips (*"Why switch?", "Why stay?", "What changed?", "Is traffic real?", "Are emissions exact?", "Why this mode?"*).
- **Multi-Agent Negotiation Feed**: 2-round structured debates between Speed, Cost, and Carbon agents with Coordinator winner narration.
- **Architecture & Transparency Matrix**: 6-stage pipeline breakdown and deterministic formula inspector.

---

## Setup & Running

### 1. Ensure Backend is Running
The mobile app communicates with the FastAPI backend on port `8000`:
```powershell
cd backend
.\.venv\Scripts\uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 2. Start the Mobile Frontend
From the `mobile/` directory:
```powershell
cd mobile
npm start
```

### 3. Testing on Devices
- **Web preview**: Press `w` in the terminal to open the web browser.
- **Android Emulator**: Press `a` (connects automatically to `http://10.0.2.2:8000`).
- **iOS Simulator**: Press `i`.
- **Physical Phone (Expo Go)**: Scan the QR code shown in the terminal with the Expo Go app. *(Note: Ensure your phone is on the same Wi-Fi network as your computer, and update the backend URL in `src/services/api/client.ts` to your computer's local IP address if needed)*.
