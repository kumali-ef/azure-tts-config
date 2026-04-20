# Gemini TTS Tab Design

**Date:** 2026-04-20
**Status:** Draft

## Overview

Add a new "Gemini TTS" tab to the TTS Config Tester for Google's Gemini 3.1 Flash TTS model. Follows the established provider pattern (server proxy, recording persistence, accordion-based config UI). Emerald green color theme.

## API Details

- **Model:** `gemini-3.1-flash-tts-preview`
- **Endpoint:** `POST https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent`
- **Auth:** `x-goog-api-key: <API_KEY>` header
- **Request body:**
  ```json
  {
    "contents": [{ "parts": [{ "text": "<user text>" }] }],
    "generationConfig": {
      "response_modalities": ["AUDIO"],
      "speech_config": {
        "voice_config": {
          "prebuilt_voice_config": {
            "voice_name": "Kore"
          }
        }
      }
    }
  }
  ```
- **Response:** Audio is base64-encoded in `candidates[0].content.parts[0].inline_data.data` with `mime_type` indicating the format (e.g., `audio/wav`, `audio/mp3`).
- **Streaming:** Not supported in this implementation. The `streamGenerateContent` SSE endpoint exists but is reportedly inconsistent for TTS (may return audio as a single large chunk). Can be added later.
- **Voices:** 30 prebuilt voices — no dynamic voice list API. Voices are hardcoded in the client.

## File Structure

New files (following existing provider pattern):

```
src/GeminiApp.tsx                              — Main page component
src/hooks/useGeminiSettings.ts                 — API key persistence (localStorage)
src/hooks/useGeminiRecordings.ts               — Recording CRUD via /api/gemini/recordings
src/utils/gemini-tts.ts                        — Synthesis function + hardcoded voice list
src/components/gemini/GeminiSettings.tsx        — API key input
src/components/gemini/GeminiModelSelector.tsx   — Model dropdown (single option)
src/components/gemini/GeminiVoiceSelector.tsx   — Hardcoded voice dropdown
src/components/gemini/GeminiRecordingsList.tsx  — Recordings list panel
server/gemini-routes.ts                        — Express routes (proxy + recordings CRUD)
server/gemini-db.ts                            — SQLite table + queries
```

Modified files:

```
src/types.ts       — Add GeminiVoice, GeminiConfig, GeminiRecording, DEFAULT_GEMINI_CONFIG
src/App.tsx        — Add 'gemini' to Tab type, add tab button + render GeminiApp
server/index.ts    — Import and mount gemini router at /api/gemini
```

No `useGeminiVoices` hook needed — voices are a hardcoded constant in `gemini-tts.ts`.

## Types

```typescript
// src/types.ts additions

interface GeminiVoice {
  name: string;        // e.g., "Kore"
  displayName: string; // e.g., "Kore"
  gender: string;      // e.g., "Female"
  style: string;       // e.g., "Firm"
}

interface GeminiConfig {
  model: string;
  voiceName: string;
  voiceDisplayName: string;
  text: string;
}

interface GeminiRecording {
  id: string;
  model: string;
  voice_name: string;
  voice_display_name: string | null;
  text: string;
  audio_filename: string;
  api_response_time_ms: number | null;
  created_at: string;
  label: string | null;
}

const DEFAULT_GEMINI_CONFIG: GeminiConfig = {
  model: 'gemini-3.1-flash-tts-preview',
  voiceName: '',
  voiceDisplayName: '',
  text: '',
};
```

## Database Schema

```sql
CREATE TABLE IF NOT EXISTS gemini_recordings (
  id TEXT PRIMARY KEY,
  model TEXT NOT NULL,
  voice_name TEXT NOT NULL,
  voice_display_name TEXT,
  text TEXT NOT NULL,
  audio_filename TEXT NOT NULL,
  api_response_time_ms INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  label TEXT
);
```

Minimal columns — Gemini TTS has no configurable knobs (temperature, speed, etc.) beyond model/voice/text.

## Server Routes

All routes under `/api/gemini`:

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/synthesize` | Proxy TTS request to Gemini API, return decoded audio bytes |
| `POST` | `/recordings` | Save recording (multipart: audio file + config JSON) |
| `GET` | `/recordings` | List all recordings (newest first) |
| `GET` | `/recordings/:id` | Get single recording |
| `GET` | `/recordings/:id/audio` | Stream audio file |
| `DELETE` | `/recordings/:id` | Delete recording + audio file |
| `PATCH` | `/recordings/:id` | Update recording label |

### Synthesize proxy flow

1. Receive `{ apiKey, model, voiceName, text }` from client
2. Build Gemini `generateContent` request body with `response_modalities: ["AUDIO"]` and `speech_config`
3. POST to `https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent`
4. Extract `candidates[0].content.parts[0].inline_data.data` (base64 audio)
5. Detect MIME type from `inline_data.mime_type`
6. Decode base64 and send raw audio bytes to client with appropriate Content-Type

## Hardcoded Voice List

30 prebuilt voices defined as a constant array in `src/utils/gemini-tts.ts`:

| Name | Gender | Style |
|------|--------|-------|
| Zephyr | Female | Bright |
| Puck | Male | Upbeat |
| Charon | Male | Informative |
| Kore | Female | Firm |
| Fenrir | Male | Excitable |
| Leda | Female | Youthful |
| Orus | Male | Firm |
| Aoede | Female | Breezy |
| Callirrhoe | Female | Casual |
| Autonoe | Female | Bright |
| Enceladus | Male | Breathy |
| Iapetus | Male | Clear |
| Umbriel | Male | Easy-going |
| Algieba | Male | Informative |
| Despina | Female | Smooth |
| Erinome | Female | Clear |
| Algenib | Male | Gravelly |
| Rasalgethi | Male | Informative |
| Laomedeia | Female | Upbeat |
| Achernar | Male | Soft |
| Alnilam | Male | Firm |
| Schedar | Male | Even |
| Gacrux | Male | Mature |
| Pulcherrima | Female | Forward |
| Achird | Male | Friendly |
| Zubenelgenubi | Male | Casual |
| Vindemiatrix | Female | Gentle |
| Sadachbia | Male | Lively |
| Sadaltager | Male | Knowledgeable |
| Sulafat | Female | Warm |

## UI Layout

Split-panel (50/50), same as all other tabs:

**Left panel** (configuration):
- Accordion: "Gemini API" — API key input (stored in localStorage as `gemini_api_key`)
- Accordion: "Model" — Dropdown with `gemini-3.1-flash-tts-preview` (single option, future-proof)
- Accordion: "Voice" — Dropdown showing all 30 voices with name, gender, and style info
- Accordion: "Text" — Textarea for text to synthesize
- Action buttons: "🔊 Synthesize" (emerald primary) + "Show Code" (gray)
- Error/info banners

**Right panel** (recordings):
- List of past recordings, newest first
- Each recording shows: voice, text preview, timing, timestamp
- Play / Download / Delete / Load / Show Code actions

**Color theme:** Emerald (`emerald-500`, `emerald-600`, `emerald-700` for hover states).

## Error Handling

- Missing API key → yellow banner prompting key entry
- API errors → red banner with upstream error message
- Network failures → generic error message
- All follow existing patterns from other providers

## Out of Scope

- Streaming synthesis (can be added later)
- Multi-speaker TTS
- Dynamic voice fetching from API
- Additional models (only `gemini-3.1-flash-tts-preview`)
