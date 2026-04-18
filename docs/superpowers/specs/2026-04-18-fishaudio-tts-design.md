# Fish Audio TTS Tab — Design Spec

**Date**: 2026-04-18
**Status**: Draft

## Overview

Add a Fish Audio TTS config tab to the TTS Config Tester app. Follows the established tab architecture. Cyan color theme.

## Fish Audio TTS API Summary

- **Auth**: `Authorization: Bearer $FISH_API_KEY`
- **TTS endpoint**: `POST https://api.fish.audio/v1/tts`
- **Content-Type**: `application/json` (also supports msgpack; we use JSON for simplicity)
- **Model selection**: via `model` HTTP header (e.g., `model: s2-pro`)
- **Response**: binary audio stream in requested format (not JSON-wrapped)
- **Models**: `s2-pro` (latest, 80+ languages), `s1` (previous, 13 languages)
- **Voice**: `reference_id` field — a model ID from fish.audio (community/cloned voices)
- **Audio formats**: mp3 (default), wav, pcm, opus
- **Emotions**: S1 uses `(emotion)` parentheses, S2-Pro uses `[emotion]` brackets with natural language

## Architecture

### Server (`server/fishaudio-routes.ts` + `server/fishaudio-db.ts`)

**Routes:**

| Route | Method | Description |
|---|---|---|
| `/api/fishaudio/synthesize` | POST | Non-streaming synthesis. Proxies to Fish Audio with `format: "wav"`, returns WAV bytes. |
| `/api/fishaudio/synthesize-stream` | POST | Streaming synthesis. Proxies to Fish Audio with `format: "wav"`, pipes binary stream to client. |
| `/api/fishaudio/recordings` | GET | List all recordings. |
| `/api/fishaudio/recordings` | POST | Save recording (multipart: audio blob + config JSON). |
| `/api/fishaudio/recordings/:id` | GET | Get single recording metadata. |
| `/api/fishaudio/recordings/:id/audio` | GET | Stream audio file. |
| `/api/fishaudio/recordings/:id` | DELETE | Delete recording + audio file. |
| `/api/fishaudio/recordings/:id` | PATCH | Update recording label. |

No voice listing proxy — voices are identified by `reference_id` (model ID from fish.audio website). User pastes the ID directly.

**Non-streaming proxy:**
1. Receive `{ apiKey, model, body }` from client
2. POST to `https://api.fish.audio/v1/tts` with `Authorization: Bearer {apiKey}`, `model` header, JSON body with `format: "wav"`
3. Read full response, send binary WAV bytes to client

**Streaming proxy:**
1. Same request to Fish Audio
2. Pipe response body directly to client (binary WAV stream)
3. Client tracks TTFB and collects chunks

**Database table**: `fishaudio_recordings` in shared `tts-recordings.db`.

Columns:
- `id` TEXT PRIMARY KEY
- `model` TEXT NOT NULL
- `reference_id` TEXT
- `voice_name` TEXT (user-provided label for the voice)
- `text` TEXT NOT NULL
- `chunk_length` INTEGER
- `normalize` INTEGER (0/1)
- `latency` TEXT
- `temperature` REAL
- `top_p` REAL
- `speed` REAL
- `volume` REAL
- `audio_filename` TEXT NOT NULL
- `api_response_time_ms` INTEGER
- `stream_duration_ms` INTEGER
- `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
- `label` TEXT

### Client

**Types** (`src/types.ts`):

```ts
interface FishAudioConfig {
  model: string;
  referenceId: string;
  voiceName: string; // user label for the voice
  text: string;
  chunkLength: number;
  normalize: boolean;
  latency: string;
  temperature: number;
  topP: number;
  speed: number;
  volume: number;
}

interface FishAudioRecording {
  id: string;
  model: string;
  reference_id: string | null;
  voice_name: string | null;
  text: string;
  chunk_length: number | null;
  normalize: number | null;
  latency: string | null;
  temperature: number | null;
  top_p: number | null;
  speed: number | null;
  volume: number | null;
  audio_filename: string;
  api_response_time_ms: number | null;
  stream_duration_ms: number | null;
  created_at: string;
  label: string | null;
}

const DEFAULT_FISHAUDIO_CONFIG: FishAudioConfig = {
  model: 's2-pro',
  referenceId: '',
  voiceName: '',
  text: '',
  chunkLength: 200,
  normalize: true,
  latency: 'balanced',
  temperature: 0.7,
  topP: 0.7,
  speed: 1.0,
  volume: 0,
};
```

**Utils** (`src/utils/fishaudio-tts.ts`):

- `fishAudioSynthesize(params)` — Non-streaming. POST to `/api/fishaudio/synthesize`, receive WAV bytes directly. Return ArrayBuffer.
- `fishAudioSynthesizeStreaming(params, audioElement)` — Streaming. POST to `/api/fishaudio/synthesize-stream`, read binary stream for TTFB measurement, collect full WAV. Return `{ ttfbMs, totalMs, buffer }`.

No PCM→WAV conversion needed — Fish Audio returns complete WAV when `format: "wav"`.

**Hooks:**

- `useFishAudioSettings()` — API key in localStorage under `fishaudio_api_key`.
- `useFishAudioRecordings()` — CRUD for recordings via `/api/fishaudio/recordings`.

No voice hook needed (reference_id is manual text input).

**Components** (`src/components/fishaudio/`):

- `FishAudioSettings.tsx` — API key input (masked).
- `FishAudioModelSelector.tsx` — Dropdown: `s2-pro` (latest), `s1` (previous).
- `FishAudioVoiceInput.tsx` — Text input for reference_id (model ID from fish.audio) + optional voice name label.
- `FishAudioAdvancedSettings.tsx` — Temperature slider (0.0–1.0), top_p slider (0.0–1.0), chunk_length slider (100–300), normalize toggle, latency dropdown (normal/balanced), speed slider (0.5–2.0), volume slider (-20–20).
- `FishAudioRecordingsList.tsx` — Recordings table with ▶, ⬇, ↩, 🗑, {} buttons.

**Main component**: `src/FishAudioApp.tsx` — follows established pattern with cyan theme.

**Tab integration**: Add `'fishaudio'` to Tab type union in `App.tsx`, cyan color (`border-cyan-500 text-cyan-600`).

## Audio Data Flow

### Non-streaming
1. Client → POST `/api/fishaudio/synthesize` (apiKey, model, body)
2. Server → POST `https://api.fish.audio/v1/tts` with `Authorization: Bearer {key}`, `model` header, body `{ text, reference_id, format: "wav", ... }`
3. Server ← binary WAV bytes
4. Server → forward WAV bytes to client
5. Client creates blob, plays audio, saves recording

### Streaming
1. Client → POST `/api/fishaudio/synthesize-stream` (apiKey, model, body)
2. Server → POST `https://api.fish.audio/v1/tts` with same params
3. Server ← binary stream → pipes to client
4. Client reads stream incrementally, tracks TTFB on first chunk
5. Client concatenates all chunks into WAV blob → plays + saves

## File List

| File | Type | Description |
|---|---|---|
| `server/fishaudio-db.ts` | New | SQLite table + CRUD |
| `server/fishaudio-routes.ts` | New | Express routes (proxy + recordings) |
| `server/index.ts` | Modified | Mount fishaudioRouter |
| `src/types.ts` | Modified | Add Fish Audio types |
| `src/utils/fishaudio-tts.ts` | New | API calls |
| `src/hooks/useFishAudioSettings.ts` | New | API key localStorage |
| `src/hooks/useFishAudioRecordings.ts` | New | Recordings CRUD |
| `src/components/fishaudio/FishAudioSettings.tsx` | New | API key input |
| `src/components/fishaudio/FishAudioModelSelector.tsx` | New | Model dropdown |
| `src/components/fishaudio/FishAudioVoiceInput.tsx` | New | Reference ID + name inputs |
| `src/components/fishaudio/FishAudioAdvancedSettings.tsx` | New | Temperature, top_p, speed, volume, etc. |
| `src/components/fishaudio/FishAudioRecordingsList.tsx` | New | Recordings list |
| `src/FishAudioApp.tsx` | New | Main tab component |
| `src/App.tsx` | Modified | Add fishaudio tab |
