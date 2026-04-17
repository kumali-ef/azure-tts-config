# Inworld TTS Tab — Design Spec

**Date**: 2026-04-17
**Status**: Draft

## Overview

Add an Inworld TTS config tab to the TTS Config Tester app. Follows the same architecture pattern as ElevenLabs (server-side proxy with base64 decode, client-side PCM→WAV for streaming). Rose color theme.

## Inworld TTS API Summary

- **Auth**: `Authorization: Basic $INWORLD_API_KEY` (base64 key from Inworld portal)
- **List voices**: `GET https://api.inworld.ai/voices/v1/voices` — returns `{ voices: [...] }`
- **Non-streaming**: `POST https://api.inworld.ai/tts/v1/voice` — returns JSON `{ audioContent: "<base64>" }`
- **Streaming**: `POST https://api.inworld.ai/tts/v1/voice:stream` — NDJSON stream, each line: `{ "result": { "audioContent": "<base64>", ... } }`
- **Models**: `inworld-tts-1.5-max` (flagship), `inworld-tts-1.5-mini` (ultra-fast)
- **Audio**: Using `LINEAR16` encoding at 22050 Hz. Non-streaming response includes WAV header in decoded audioContent. Streaming chunks each include a complete WAV header.

## Architecture

### Server (`server/inworld-routes.ts` + `server/inworld-db.ts`)

**Routes:**

| Route | Method | Description |
|---|---|---|
| `/api/inworld/voices` | GET | Proxy voice list. Query param: `apiKey`. Forwards to Inworld API, returns voice array. |
| `/api/inworld/synthesize` | POST | Non-streaming synthesis. Decodes base64 `audioContent` from JSON response, sends raw WAV bytes. |
| `/api/inworld/synthesize-stream` | POST | Streaming synthesis. Reads NDJSON stream, decodes base64 chunks, strips WAV headers (44 bytes) from each, pipes raw PCM to client. |
| `/api/inworld/recordings` | GET | List all recordings. |
| `/api/inworld/recordings` | POST | Save recording (multipart: audio blob + config JSON). |
| `/api/inworld/recordings/:id` | GET | Get single recording metadata. |
| `/api/inworld/recordings/:id/audio` | GET | Stream audio file. |
| `/api/inworld/recordings/:id` | DELETE | Delete recording + audio file. |
| `/api/inworld/recordings/:id` | PATCH | Update recording label. |

**Database table**: `inworld_recordings` in shared `tts-recordings.db`.

Columns:
- `id` TEXT PRIMARY KEY
- `model` TEXT NOT NULL
- `voice_id` TEXT NOT NULL
- `voice_name` TEXT (display name)
- `text` TEXT NOT NULL
- `temperature` REAL
- `apply_text_normalization` TEXT
- `audio_filename` TEXT NOT NULL
- `api_response_time_ms` INTEGER
- `stream_duration_ms` INTEGER
- `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
- `label` TEXT

### Client

**Types** (`src/types.ts`):

```ts
interface InworldVoice {
  voiceId: string;
  name: string;
  displayName: string;
  description: string;
  langCode: string;
  tags: string[];
  source: string; // "SYSTEM" | "IVC"
}

interface InworldConfig {
  model: string;
  voiceId: string;
  voiceName: string;
  text: string;
  temperature: number;
  applyTextNormalization: string;
}

interface InworldRecording {
  id: string;
  model: string;
  voice_id: string;
  voice_name: string | null;
  text: string;
  temperature: number | null;
  apply_text_normalization: string | null;
  audio_filename: string;
  api_response_time_ms: number | null;
  stream_duration_ms: number | null;
  created_at: string;
  label: string | null;
}

const DEFAULT_INWORLD_CONFIG: InworldConfig = {
  model: 'inworld-tts-1.5-max',
  voiceId: '',
  voiceName: '',
  text: '',
  temperature: 1.0,
  applyTextNormalization: 'APPLY_TEXT_NORMALIZATION_UNSPECIFIED',
};
```

**Utils** (`src/utils/inworld-tts.ts`):

- `inworldSynthesize(params)` — Non-streaming. POST to `/api/inworld/synthesize`, receive WAV bytes directly (server already decoded base64). Return ArrayBuffer.
- `inworldSynthesizeStreaming(params, audioElement)` — Streaming. POST to `/api/inworld/synthesize-stream`, read raw PCM stream, build WAV from collected PCM chunks. Same pattern as ElevenLabs. PCM is 16-bit signed, mono, 22050 Hz.
- `fetchInworldVoices(apiKey)` — GET `/api/inworld/voices?apiKey=...`, returns `InworldVoice[]`.

**Hooks:**

- `useInworldSettings()` — API key in localStorage under `inworld_api_key`.
- `useInworldVoices(apiKey)` — Fetch/cache voice list.
- `useInworldRecordings()` — CRUD for recordings via `/api/inworld/recordings`.

**Components** (`src/components/inworld/`):

- `InworldSettings.tsx` — API key input (masked).
- `InworldModelSelector.tsx` — Dropdown: `inworld-tts-1.5-max`, `inworld-tts-1.5-mini`.
- `InworldVoiceSelector.tsx` — Searchable voice picker, shows displayName + description + tags.
- `InworldVoiceSettings.tsx` — Temperature slider (0.1–2.0). Text normalization dropdown (Auto/On/Off).
- `InworldRecordingsList.tsx` — Recordings table with ▶, ⬇, ↩, 🗑, {} buttons.

**Main component**: `src/InworldApp.tsx` — follows ElevenLabsApp structure with rose theme.

**Tab integration**: Add `'inworld'` to Tab type union in `App.tsx`, rose color (`border-rose-500 text-rose-600`).

## Audio Data Flow

### Non-streaming
1. Client → POST `/api/inworld/synthesize` (apiKey, params)
2. Server → POST `https://api.inworld.ai/tts/v1/voice` with `audioConfig: { audioEncoding: "LINEAR16", sampleRateHertz: 22050 }`
3. Server ← JSON `{ audioContent: "<base64>" }`
4. Server decodes base64 → raw WAV bytes → sends to client
5. Client receives WAV blob → plays + saves

### Streaming
1. Client → POST `/api/inworld/synthesize-stream` (apiKey, params)
2. Server → POST `https://api.inworld.ai/tts/v1/voice:stream` with same audioConfig
3. Server ← NDJSON stream of `{ "result": { "audioContent": "<base64>" } }` chunks
4. Server: for each chunk, decode base64, strip 44-byte WAV header, pipe raw PCM to client
5. Client collects raw PCM chunks, builds WAV header (16-bit, mono, 22050 Hz), creates WAV blob → plays + saves

## File List

| File | Type | Description |
|---|---|---|
| `server/inworld-db.ts` | New | SQLite table + CRUD |
| `server/inworld-routes.ts` | New | Express routes (proxy + recordings) |
| `server/index.ts` | Modified | Mount inworldRouter |
| `src/types.ts` | Modified | Add Inworld types |
| `src/utils/inworld-tts.ts` | New | API calls, PCM→WAV |
| `src/hooks/useInworldSettings.ts` | New | API key localStorage |
| `src/hooks/useInworldVoices.ts` | New | Voice fetch/cache |
| `src/hooks/useInworldRecordings.ts` | New | Recordings CRUD |
| `src/components/inworld/InworldSettings.tsx` | New | API key input |
| `src/components/inworld/InworldModelSelector.tsx` | New | Model dropdown |
| `src/components/inworld/InworldVoiceSelector.tsx` | New | Searchable voice picker |
| `src/components/inworld/InworldVoiceSettings.tsx` | New | Temperature + text normalization |
| `src/components/inworld/InworldRecordingsList.tsx` | New | Recordings list |
| `src/InworldApp.tsx` | New | Main tab component |
| `src/App.tsx` | Modified | Add inworld tab |
