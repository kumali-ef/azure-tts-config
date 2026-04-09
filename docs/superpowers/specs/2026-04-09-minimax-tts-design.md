# MiniMax TTS Config Tester Page — Design Spec

## Overview

Add a second TTS provider page for MiniMax alongside the existing Azure TTS page. Users switch between providers via tab navigation at the top of the app. Each provider page is a fully independent component with its own state, hooks, API utils, and database table.

## Architecture

**Approach: Parallel Page Components** — A thin root `App.tsx` renders tab navigation and conditionally mounts either `AzureApp` or `MiniMaxApp`. Each page owns its full configuration, synthesis, and recording workflow independently. Shared generic components (Accordion, action button patterns) are reused.

## MiniMax API Integration

### Synthesis Endpoint
- `POST https://api.minimaxi.com/v1/t2a_v2`
- Auth: `Authorization: Bearer {api_key}`
- Content-Type: `application/json`
- Body: JSON with `model`, `text`, `voice_setting`, `audio_setting`, `stream`, `language_boost`, `voice_modify`

### Voice List Endpoint
- `GET https://api.minimaxi.com/v1/voice/list`
- Auth: `Authorization: Bearer {api_key}`
- Returns: `system_voice[]`, `voice_cloning[]`, `voice_generation[]`
- Proxied through Express server to avoid exposing API key in browser

### Streaming
- Same synthesis endpoint with `stream: true`
- Returns chunked responses with hex-encoded audio data
- Decode hex → binary for playback via MediaSource or buffer concatenation

### Audio Response Format
- Non-streaming: `data.audio` contains hex-encoded audio string → convert to binary
- Output format: `hex` (default), response needs hex→ArrayBuffer conversion

## Models

Available models (latest two generations):
- `speech-2.8-hd` — High quality
- `speech-2.8-turbo` — Fast
- `speech-2.6-hd` — High quality
- `speech-2.6-turbo` — Fast

## UI Layout

Two-panel layout matching Azure TTS page structure.

### Left Panel — Configuration

1. **MiniMax Settings** — API Key (required, masked), Group ID (optional)
2. **Model** — 2×2 card grid selector with HD/Turbo distinction
3. **Voice** — Tabbed selector (System / Cloned / Custom ID)
   - System & Cloned: fetched from voice list API, searchable list
   - Custom ID: manual text input for voice_id
4. **Voice Settings** — Sliders for speed (0.5–2.0), vol (0–10), pitch (-12 to +12); emotion chip selector (happy, sad, angry, calm, fearful, disgusted, surprised)
5. **Language Boost** — Dropdown with `auto` default + all supported languages
6. **Voice Modify** — Timbre slider, intensity slider, sound effect dropdown (none, spacious_echo, bathroom, etc.)
7. **Text** — Textarea with hint about interjections `(laughs)` and pause markers `<#1.5#>`
8. **Action Buttons** — Synthesize, Stream & Play, Show Code

### Right Panel — Recordings

- MiniMax-only recordings list (separate from Azure)
- Model badge (color-coded: hd=purple, turbo=green)
- Custom voice badge when using custom voice_id
- TTFB + total duration for streaming, single timing for sync
- Play, Load Config, Delete actions

## Data Model

### New Table: `minimax_recordings`

```sql
CREATE TABLE IF NOT EXISTS minimax_recordings (
  id TEXT PRIMARY KEY,
  model TEXT NOT NULL,
  voice_id TEXT NOT NULL,
  voice_name TEXT,
  text TEXT NOT NULL,
  speed REAL NOT NULL DEFAULT 1.0,
  vol REAL NOT NULL DEFAULT 1.0,
  pitch INTEGER NOT NULL DEFAULT 0,
  emotion TEXT,
  language_boost TEXT,
  voice_modify_timbre REAL,
  voice_modify_intensity REAL,
  voice_modify_sound_effect TEXT,
  audio_filename TEXT NOT NULL,
  api_response_time_ms INTEGER,
  stream_duration_ms INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  label TEXT
);
```

## File Structure

```
src/
  App.tsx              → Root with tab switching (Azure TTS | MiniMax TTS)
  AzureApp.tsx         → Current App.tsx renamed (no logic changes)
  MiniMaxApp.tsx       → New MiniMax page component
  types.ts             → Add MiniMaxConfig, MiniMaxRecording, MiniMaxVoice
  components/
    minimax/
      MiniMaxSettings.tsx       → API key + Group ID inputs
      ModelSelector.tsx         → 2×2 model card grid
      MiniMaxVoiceSelector.tsx  → Tabbed voice selector (System/Cloned/Custom)
      VoiceSettings.tsx         → Speed, vol, pitch sliders + emotion chips
      LanguageBoost.tsx         → Language dropdown
      VoiceModify.tsx           → Timbre, intensity, sound effect controls
      MiniMaxRecordingsList.tsx → Recordings list with model badges
  utils/
    minimax-tts.ts     → synthesize(), synthesizeStreaming(), fetchVoices()
  hooks/
    useMiniMaxSettings.ts   → localStorage for API key + group ID
    useMiniMaxVoices.ts     → Fetch + cache voice list
    useMiniMaxRecordings.ts → CRUD for minimax_recordings
server/
  minimax-db.ts        → minimax_recordings table + CRUD
  minimax-routes.ts    → /api/minimax/* endpoints
```

## API Proxy Routes

The MiniMax API key should not be sent from the browser directly. The Express server proxies:

- `POST /api/minimax/synthesize` → forwards to MiniMax T2A endpoint
- `GET /api/minimax/voices?api_key=...` → fetches voice list

However, for this config tester app (same pattern as Azure TTS), the API key is entered in the browser and sent directly to MiniMax from the client side, consistent with how Azure TTS currently works. No server proxy needed for synthesis.

The voice list endpoint requires the API key as a query param or header — this will be called directly from the browser as well (same pattern as Azure voice list fetch).

## Recordings API

- `POST /api/minimax/recordings` — Save recording (multipart: audio file + config JSON)
- `GET /api/minimax/recordings` — List all MiniMax recordings
- `GET /api/minimax/recordings/:id` — Get single recording
- `GET /api/minimax/recordings/:id/audio` — Stream audio file
- `DELETE /api/minimax/recordings/:id` — Delete recording
- `PATCH /api/minimax/recordings/:id` — Update label

## Timing Metrics

- **Sync synthesis**: `api_response_time_ms` = total request time (same as Azure)
- **Streaming synthesis**: `api_response_time_ms` = TTFB, `stream_duration_ms` = total time

## Text Features

For `speech-2.8-*` models only:
- **Interjections**: `(laughs)`, `(sighs)`, `(coughs)`, `(breath)`, etc.
- **Pause control**: `<#1.5#>` for 1.5 second pause (range 0.01–99.99)

The text input should show hints about these features when a 2.8 model is selected.
