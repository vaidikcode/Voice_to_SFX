# Voice → SFX Studio

Modern UI to turn quick voice sketches into polished sound effects using the backend at `api/voice_to_sfx`.

## Features
- Record or upload audio with a clean tabbed interface
- Live timer and saved-recording toast
- One-click generate with animated progress
- AI interpretation card and responsive audio grid

## Dev
```bash
npm install
npm run dev
```

Open the app and ensure the backend is available at `/api/voice_to_sfx` (Vercel function or local server). In development, requests go to `http://localhost:8000/api/voice_to_sfx`.

## Build
```bash
npm run build
npm run preview
```
