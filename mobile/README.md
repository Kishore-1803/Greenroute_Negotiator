# GreenRoute Mobile (Phone Frontend)

A React Native & Expo mobile application for **GreenRoute Negotiator**, mirroring the full feature set, atmospheric forest dark UI, and mathematical decision pipeline of the web application.

---

## Features

- **Accounts & Preference Memory**: Register/log in against the FastAPI backend (bcrypt + bearer tokens). The token lives in the OS keystore and the session survives a restart. Trips are attributed to your account, so the learned time/cost/carbon weights on Profile are the real ones from the backend — and show an honest "nothing learned yet" until you've actually completed a trip.
- **Voice Trip Planning**: Hold the mic on Home and say *"take me to Anna Nagar"*. ElevenLabs Scribe transcribes it, the destination is geocoded, all three modes are compared, and ElevenLabs TTS reads the recommendation back — with each stage shown as it happens.
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

### 2. Configure voice (one key, both directions)
Voice input and the spoken recommendation both run on ElevenLabs. Put your key in
`mobile-backend/.env`:
```
ELEVENLABS_API_KEY=sk_...
```
Without it the app still works: the typed planner is unaffected, and the recommendation is read
aloud by the phone's own speech engine instead of the ElevenLabs voice. Only the hold-to-speak
mic needs the key — there is no on-device fallback for transcription.

### 3. Rebuild the dev client
Voice adds native modules (`expo-audio`, `expo-location`, `expo-haptics`), so a JS reload is not
enough — the app must be rebuilt once:
```powershell
cd mobile
npx expo run:android
```

### 4. Start the Mobile Frontend
From the `mobile/` directory:
```powershell
cd mobile
npm start
```

### 5. Testing on Devices
- **Physical Phone (dev client)**: Open the GreenRoute dev-client build from step 3 and scan the QR code. *(Ensure your phone is on the same Wi-Fi as your computer; if routes time out, use the "Backend connection" strip on Home to point the app at your machine's LAN IP.)* This is the only target where voice and Google Maps work — both need native modules that plain Expo Go does not ship.
- **Android Emulator**: Press `a` (connects automatically to `http://10.0.2.2:8000`).
- **iOS Simulator**: Press `i`.
- **Web preview**: Press `w`. The typed planner works; the mic does not.
