# ElevenLabs TTS Config Tab Design

## Overview

Add an ElevenLabs TTS tab to the TTS Config Tester app, supporting models `eleven_flash_v2_5` and `eleven_turbo_v2_5`. The tab follows the established pattern used by Cartesia, MiniMax, Qwen3, and Azure tabs: server-proxied API calls, client-side PCM-to-WAV conversion, recording persistence, and an amber/orange color theme.

## API Integration

### Authentication

- Header: `xi-api-key: <api_key>`
- API key stored in `localStorage` under `elevenlabs-api-key`

### Endpoints

**Voices list:** `GET https://api.elevenlabs.io/v1/voices`
- Response shape: `{ voices: [...], has_more, total_count, next_page_token }`
- Relevant fields per voice: `voice_id`, `name`, `labels` (object with accent, gender, etc.), `category`, `settings`

**Non-streaming TTS:** `POST https://api.elevenlabs.io/v1/text-to-speech/{voice_id}?output_format=pcm_24000`
- Request body:
  ```json
  {
    "text": "Hello world",
    "model_id": "eleven_flash_v2_5",
    "voice_settings": {
      "stability": 0.5,
      "similarity_boost": 0.75,
      "style": 0.0,
      "use_speaker_boost": true,
      "speed": 1.0
    },
    "language_code": "en"
  }
  ```
- Returns: raw PCM audio bytes (24 kHz, 16-bit signed integer, mono)

**Streaming TTS:** `POST https://api.elevenlabs.io/v1/text-to-speech/{voice_id}/stream?output_format=pcm_24000`
- Same request body as non-streaming
- Returns: chunked raw PCM audio stream (Transfer-Encoding: chunked)
- Unlike Cartesia's SSE+base64 approach, ElevenLabs streams raw binary audio chunks directly

### Output Format

Fixed to `pcm_24000` (24 kHz, 16-bit signed integer, mono). This matches the intended production format and avoids encoding overhead.

Client converts PCM to WAV by prepending a standard 44-byte WAV header with:
- Audio format: 1 (PCM integer)
- Channels: 1
- Sample rate: 24000
- Bits per sample: 16

## Architecture

### New Files

| Layer | File | Purpose |
|-------|------|---------|
| Server routes | `server/elevenlabs-routes.ts` | Proxy: voices list, synthesize, stream, CRUD recordings |
| Server DB | `server/elevenlabs-db.ts` | `elevenlabs_recordings` table in shared `tts-recordings.db` |
| Client page | `src/ElevenLabsApp.tsx` | Main tab component with amber theme |
| Client utils | `src/utils/elevenlabs-tts.ts` | API calls to server, PCM→WAV conversion, voice fetch |
| Hook | `src/hooks/useElevenLabsSettings.ts` | API key persistence in localStorage |
| Hook | `src/hooks/useElevenLabsVoices.ts` | Fetch and cache voice list |
| Hook | `src/hooks/useElevenLabsRecordings.ts` | CRUD operations for recordings |
| Component | `src/components/elevenlabs/ElevenLabsSettings.tsx` | API key input |
| Component | `src/components/elevenlabs/ElevenLabsModelSelector.tsx` | Model dropdown |
| Component | `src/components/elevenlabs/ElevenLabsVoiceSelector.tsx` | Searchable voice picker |
| Component | `src/components/elevenlabs/ElevenLabsVoiceSettings.tsx` | Sliders for stability/similarity/style/speed + speaker boost toggle |
| Component | `src/components/elevenlabs/ElevenLabsLanguage.tsx` | Optional language dropdown |
| Component | `src/components/elevenlabs/ElevenLabsRecordingsList.tsx` | Recordings table |

### Modified Files

| File | Change |
|------|--------|
| `src/App.tsx` | Add `'elevenlabs'` to Tab type, add amber tab button, add conditional render |
| `src/types.ts` | Add `ElevenLabsVoice`, `ElevenLabsConfig`, `ElevenLabsRecording`, `DEFAULT_ELEVENLABS_CONFIG` |
| `server/index.ts` | Import and mount `elevenlabsRouter` at `/api/elevenlabs` |

## Data Model

### TypeScript Types

```ts
interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  category: string;
  labels: Record<string, string>;
}

interface ElevenLabsConfig {
  model: string;
  voiceId: string;
  voiceName: string;
  text: string;
  languageCode: string;
  stability: number;
  similarityBoost: number;
  style: number;
  useSpeakerBoost: boolean;
  speed: number;
}

interface ElevenLabsRecording {
  id: string;
  model: string;
  voice_id: string;
  voice_name: string | null;
  text: string;
  language_code: string | null;
  stability: number | null;
  similarity_boost: number | null;
  style: number | null;
  use_speaker_boost: number | null;
  speed: number | null;
  audio_filename: string;
  api_response_time_ms: number | null;
  stream_duration_ms: number | null;
  created_at: string;
  label: string | null;
}

const DEFAULT_ELEVENLABS_CONFIG: ElevenLabsConfig = {
  model: 'eleven_flash_v2_5',
  voiceId: '',
  voiceName: '',
  text: '',
  languageCode: '',
  stability: 0.5,
  similarityBoost: 0.75,
  style: 0.0,
  useSpeakerBoost: true,
  speed: 1.0,
};
```

### Database Table

```sql
CREATE TABLE IF NOT EXISTS elevenlabs_recordings (
  id TEXT PRIMARY KEY,
  model TEXT NOT NULL,
  voice_id TEXT NOT NULL,
  voice_name TEXT,
  text TEXT NOT NULL,
  language_code TEXT,
  stability REAL,
  similarity_boost REAL,
  style REAL,
  use_speaker_boost INTEGER,
  speed REAL,
  audio_filename TEXT NOT NULL,
  api_response_time_ms INTEGER,
  stream_duration_ms INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  label TEXT
);
```

## Server Routes

All routes mounted at `/api/elevenlabs`.

### `GET /voices?apiKey=...`
- Proxy to `GET https://api.elevenlabs.io/v1/voices` with `xi-api-key` header
- The API supports pagination via `next_page_token`, but a single call returns all voices for the account (typically sufficient). No pagination loop needed.
- Returns the `voices` array from the response

### `POST /synthesize`
- Body: `{ apiKey, voiceId, body }` where `body` is the TTS request payload
- Proxy to `POST https://api.elevenlabs.io/v1/text-to-speech/{voiceId}?output_format=pcm_24000`
- Returns raw PCM audio bytes with `Content-Type: application/octet-stream`

### `POST /synthesize-stream`
- Body: `{ apiKey, voiceId, body }` where `body` is the TTS request payload
- Proxy to `POST https://api.elevenlabs.io/v1/text-to-speech/{voiceId}/stream?output_format=pcm_24000`
- Pipes the response body directly to the client as chunked binary

### `POST /recordings` (multipart)
- Save audio file + config metadata to DB
- Audio file named `elevenlabs-{uuid}.wav`

### `GET /recordings` — List all

### `GET /recordings/:id` — Get one

### `GET /recordings/:id/audio` — Stream audio file

### `DELETE /recordings/:id` — Delete recording + file

### `PATCH /recordings/:id` — Update label

## UI Design

### Tab

- Position: After Cartesia, before the Deepgram external link
- Label: "ElevenLabs TTS"
- Active color: `amber-500` border, `amber-600` text

### Left Panel (Configuration)

Accordion sections in order:

1. **ElevenLabs API** — Single text input for API key
2. **Model** — Dropdown with two options:
   - `eleven_flash_v2_5` — Low latency flash model (default)
   - `eleven_turbo_v2_5` — Turbo model
3. **Voice** — Searchable dropdown showing voice name + labels (accent, gender). Populated from API when key is set.
4. **Voice Settings** — Four sliders and one toggle:
   - Stability: 0–1, step 0.01, default 0.5
   - Similarity Boost: 0–1, step 0.01, default 0.75
   - Style: 0–1, step 0.01, default 0.0
   - Speed: 0.25–4.0, step 0.05, default 1.0
   - Use Speaker Boost: checkbox, default checked
5. **Language** — Optional dropdown with common languages:
   en, zh, ja, ko, fr, de, es, pt, it, nl, pl, ru, sv, tr, ar, hi, id, th, vi, cs, el, fi, hu, ro, da, no, uk
6. **Text** — Textarea for input text

### Action Buttons

- **Synthesize** — Solid amber (`bg-amber-600`), calls non-streaming endpoint
- **Stream & Play** — Outline amber (`border-amber-500 text-amber-600`), calls streaming endpoint
- **Show Code** — Gray button, shows JSON config in modal

### Right Panel

Recordings list identical to Cartesia pattern: table with play, delete, load config, show code buttons. Shows model, voice, timing metrics, and label.

## Streaming Implementation

ElevenLabs streaming is simpler than Cartesia's SSE approach:

1. Server receives request, proxies to ElevenLabs streaming endpoint
2. Server pipes the raw binary response body directly to client
3. Client reads chunks from `response.body.getReader()`
4. Each chunk is raw PCM bytes (not base64, not SSE) — append directly to buffer
5. Track TTFB (time to first chunk) and total duration
6. After stream completes, concatenate all chunks, wrap in WAV header, play via `<audio>` element

## Error Handling

- Missing API key → yellow warning banner
- Invalid API key → display upstream error message from ElevenLabs
- Network errors → red error banner with message
- Empty voice list → show retry button
- Synthesis failure → display error message, don't save recording
