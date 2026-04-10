# Cartesia TTS Config Tester Tab — Design Spec

**Date:** 2026-04-10
**Status:** Draft

## Overview

Add a new "Cartesia TTS" tab to the TTS Config Tester app for testing the Cartesia sonic-3 text-to-speech service. Cartesia is a standalone API (not DashScope) with dynamic voice fetching, streaming SSE, and rich generation controls (speed, volume, emotion).

## Cartesia API Details

**Base URL:** `https://api.cartesia.ai`
**Auth:** `X-API-Key` header with API key
**Required header:** `Cartesia-Version: 2026-03-01`

### TTS Bytes (Non-streaming)

```
POST https://api.cartesia.ai/tts/bytes
Headers:
  X-API-Key: <key>
  Cartesia-Version: 2026-03-01
  Content-Type: application/json

Body:
{
  "model_id": "sonic-3",
  "transcript": "Hello world",
  "voice": { "mode": "id", "id": "<voice-uuid>" },
  "output_format": { "container": "mp3", "bit_rate": 128000, "sample_rate": 44100 },
  "language": "en",
  "generation_config": {
    "speed": 1.0,
    "volume": 1.0,
    "emotion": "neutral"
  }
}

Response: Raw audio bytes (Content-Type varies by output_format)
```

### TTS SSE (Streaming)

```
POST https://api.cartesia.ai/tts/sse
Headers: same as above
Body: same as above (output_format uses SSE-compatible formats)

Response: Server-Sent Events with base64 audio chunks
```

### List Voices

```
GET https://api.cartesia.ai/voices
Headers:
  X-API-Key: <key>
  Cartesia-Version: 2026-03-01
Query params: limit (1-100), starting_after, q, is_owner, gender, language

Response: { data: Voice[], has_more: boolean }
```

Voice object:
```json
{
  "id": "f786b574-daa5-4673-aa0c-cbe3e8534c02",
  "name": "Katie",
  "description": "...",
  "language": "en",
  "gender": "feminine"
}
```

## Models

Two model options in the selector:

| Model ID | Description |
|-----------|-------------|
| `sonic-3` | Latest stable snapshot (auto-updated) |
| `sonic-3-latest` | Latest beta (may change without notice) |

## Generation Config (sonic-3)

| Parameter | Type | Range | Default | UI |
|-----------|------|-------|---------|----|
| `speed` | number | 0.6 – 1.5 | 1.0 | Slider with numeric display |
| `volume` | number | 0.5 – 2.0 | 1.0 | Slider with numeric display |
| `emotion` | string | ~60 values | (empty/none) | Searchable dropdown |

### Emotion Values

Primary (best supported): `neutral`, `angry`, `excited`, `content`, `sad`, `scared`

Full list: `happy`, `excited`, `enthusiastic`, `elated`, `euphoric`, `triumphant`, `amazed`, `surprised`, `flirtatious`, `joking/comedic`, `curious`, `content`, `peaceful`, `serene`, `calm`, `grateful`, `affectionate`, `trust`, `sympathetic`, `anticipation`, `mysterious`, `angry`, `mad`, `outraged`, `frustrated`, `agitated`, `threatened`, `disgusted`, `contempt`, `envious`, `sarcastic`, `ironic`, `sad`, `dejected`, `melancholic`, `disappointed`, `hurt`, `guilty`, `bored`, `tired`, `rejected`, `nostalgic`, `wistful`, `apologetic`, `hesitant`, `insecure`, `confused`, `resigned`, `anxious`, `panicked`, `alarmed`, `scared`, `neutral`, `proud`, `confident`, `distant`, `skeptical`, `contemplative`, `determined`

## Languages

All 42 supported languages. Language field is **optional** — empty means Cartesia auto-detects.

| Code | Language | Code | Language | Code | Language |
|------|----------|------|----------|------|----------|
| `en` | English | `fr` | French | `de` | German |
| `es` | Spanish | `pt` | Portuguese | `zh` | Chinese |
| `ja` | Japanese | `hi` | Hindi | `it` | Italian |
| `ko` | Korean | `nl` | Dutch | `pl` | Polish |
| `ru` | Russian | `sv` | Swedish | `tr` | Turkish |
| `tl` | Tagalog | `bg` | Bulgarian | `ro` | Romanian |
| `ar` | Arabic | `cs` | Czech | `el` | Greek |
| `fi` | Finnish | `hr` | Croatian | `ms` | Malay |
| `sk` | Slovak | `da` | Danish | `ta` | Tamil |
| `uk` | Ukrainian | `hu` | Hungarian | `no` | Norwegian |
| `vi` | Vietnamese | `bn` | Bengali | `th` | Thai |
| `he` | Hebrew | `ka` | Georgian | `id` | Indonesian |
| `te` | Telugu | `gu` | Gujarati | `kn` | Kannada |
| `ml` | Malayalam | `mr` | Marathi | `pa` | Punjabi |

## Architecture

### Color Theme

**Lime/green** — `lime-500`, `lime-600`, `lime-700` for buttons, borders, accents.

### File Structure

```
server/
  cartesia-db.ts          # SQLite CRUD for cartesia_recordings table
  cartesia-routes.ts      # Express router: /api/cartesia/*

src/
  CartesiaApp.tsx          # Main tab component
  utils/cartesia-tts.ts    # Voice list, request builder, synthesis functions
  hooks/
    useCartesiaSettings.ts  # API key (localStorage)
    useCartesiaVoices.ts    # Dynamic voice fetching from API
    useCartesiaRecordings.ts # Recording CRUD
  components/cartesia/
    CartesiaSettings.tsx     # API key input
    CartesiaModelSelector.tsx # Model dropdown (2 models)
    CartesiaVoiceSelector.tsx # Searchable voice list (fetched from API)
    CartesiaLanguage.tsx      # Searchable language dropdown (optional, 42 langs)
    CartesiaGenerationConfig.tsx # Speed slider + Volume slider + Emotion dropdown
    CartesiaRecordingsList.tsx   # Recording history with code/play/load/delete
```

### Data Flow

#### Voice Fetching
1. Frontend calls `GET /api/cartesia/voices?apiKey=<key>`
2. Server proxies to `GET https://api.cartesia.ai/voices` with pagination (fetches all pages)
3. Returns full voice list to frontend
4. Frontend caches in hook state, supports search/filter

#### Non-streaming Synthesis
1. Frontend sends config to `POST /api/cartesia/synthesize`
2. Server builds Cartesia request, calls `POST https://api.cartesia.ai/tts/bytes`
3. Server receives raw audio bytes, saves to `audio/cartesia-{uuid}.mp3`
4. Server saves recording metadata to `cartesia_recordings` table
5. Server returns `{ id, recording }` to frontend
6. Frontend plays audio via `<audio>` element

#### Streaming Synthesis
1. Frontend sends config to `POST /api/cartesia/stream`
2. Server proxies SSE from `POST https://api.cartesia.ai/tts/sse`
3. Server forwards SSE events to client
4. Frontend decodes base64 audio chunks, builds `MediaSource` for real-time playback
5. After stream completes, frontend saves recording via `POST /api/cartesia/recordings`

### Database Schema

Table: `cartesia_recordings` in `tts-recordings.db`

```sql
CREATE TABLE IF NOT EXISTS cartesia_recordings (
  id TEXT PRIMARY KEY,
  model TEXT NOT NULL,
  voice_id TEXT NOT NULL,
  voice_name TEXT,
  text TEXT NOT NULL,
  language TEXT,
  speed REAL,
  volume REAL,
  emotion TEXT,
  audio_filename TEXT NOT NULL,
  api_response_time_ms INTEGER,
  stream_duration_ms INTEGER,
  created_at TEXT DEFAULT (datetime('now')),
  label TEXT
);
```

### Types

```typescript
interface CartesiaVoice {
  id: string;
  name: string;
  description: string;
  language: string;
  gender: string;
  is_owner: boolean;
}

interface CartesiaConfig {
  model: string;          // 'sonic-3' | 'sonic-3-latest'
  voiceId: string;        // UUID
  voiceName: string;      // Display name
  text: string;
  language: string;       // ISO code or '' for auto-detect
  speed: number;          // 0.6-1.5, default 1.0
  volume: number;         // 0.5-2.0, default 1.0
  emotion: string;        // From emotion list or '' for none
}

interface CartesiaRecording {
  id: string;
  model: string;
  voice_id: string;
  voice_name: string | null;
  text: string;
  language: string | null;
  speed: number | null;
  volume: number | null;
  emotion: string | null;
  audio_filename: string;
  api_response_time_ms: number | null;
  stream_duration_ms: number | null;
  created_at: string;
  label: string | null;
}

const DEFAULT_CARTESIA_CONFIG: CartesiaConfig = {
  model: 'sonic-3',
  voiceId: '',
  voiceName: '',
  text: '',
  language: '',
  speed: 1.0,
  volume: 1.0,
  emotion: '',
};
```

### API Request Builder

The output format for both non-streaming and streaming is MP3:
```json
{
  "container": "mp3",
  "bit_rate": 128000,
  "sample_rate": 44100
}
```

Using MP3 for SSE streaming as well keeps things simple — accumulate base64-encoded MP3 chunks client-side, same pattern as MiniMax/Qwen3. No raw PCM conversion needed.

### Show Code Modal

Reuse the existing `ShowJsonModal` component. Config JSON shows:
```json
{
  "model": "sonic-3",
  "voiceId": "f786b574-...",
  "voiceName": "Katie",
  "text": "Hello world",
  "language": "en",
  "speed": 1.0,
  "volume": 1.0,
  "emotion": "neutral"
}
```

### App Integration

- Add `'cartesia'` to `Tab` union in `App.tsx`
- Add lime-themed tab button
- Conditional render `<CartesiaApp />`
- Register `cartesiaRouter` at `/api/cartesia` in `server/index.ts`

## Key Differences from MiniMax/Qwen3

| Aspect | MiniMax/Qwen3 | Cartesia |
|--------|---------------|----------|
| Platform | DashScope (Aliyun) | cartesia.ai (standalone) |
| Auth | Authorization: Bearer | X-API-Key header |
| Version header | None | Cartesia-Version: 2026-03-01 |
| Voices | Static/API on DashScope | Dynamic API at `/voices` |
| Voice ID format | Short string names | UUIDs |
| Non-streaming response | URL (Qwen3) / hex (MiniMax) | Raw bytes |
| Streaming response | Hex chunks (MiniMax) / base64 (Qwen3) | Base64 SSE chunks |
| Generation controls | Limited (speed/vol/pitch) | Speed, volume, emotion |
| Output format | Implicit MP3 | Explicit format in request |
