# MiniMax TTS: Migrate from MiniMax Direct API to Aliyun DashScope

**Date:** 2026-04-09
**Status:** Approved

## Problem

The current MiniMax TTS integration calls the MiniMax official API directly (`api.minimaxi.com`). We need to switch all API calls to route through Aliyun DashScope (`dashscope.aliyuncs.com`) instead, as a full replacement.

## Approach

Surgically update the API client layer and minimal UI elements. The server-side recording storage, database schema, and most UI components remain unchanged since they don't interact with the MiniMax API directly.

## Design

### API Endpoint

All requests go to a single unified Aliyun DashScope endpoint:

```
POST https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation
```

Authentication: `Authorization: Bearer <DASHSCOPE_API_KEY>` header.

No GroupId concept — removed entirely.

### Synthesis Request Body

The key structural change is wrapping all synthesis parameters inside an `input` object:

```json
{
  "model": "MiniMax/speech-2.8-turbo",
  "input": {
    "text": "Hello world",
    "voice_setting": {
      "voice_id": "male-qn-qingse",
      "speed": 1.0,
      "vol": 1.0,
      "pitch": 0,
      "emotion": "happy"
    },
    "audio_setting": {
      "sample_rate": 32000,
      "bitrate": 128000,
      "format": "mp3",
      "channel": 1
    },
    "language_boost": "Chinese",
    "voice_modify": {
      "pitch": 10,
      "intensity": -20,
      "sound_effects": "robotic"
    },
    "output_format": "hex",
    "subtitle_enable": false
  }
}
```

### Streaming

- **Request**: No `stream` field in body. Instead, add `X-DashScope-SSE: enable` header.
- **Response format**: SSE (Server-Sent Events) — lines prefixed with `data: `. The existing streaming parser already handles `data: ` prefix stripping and `data: [DONE]` termination.
- **Chunk structure change**: `chunk.data.audio` → `chunk.output.data.audio`; status check via `chunk.output.base_resp`.

### Synchronous Synthesis Response

```json
{
  "output": {
    "base_resp": { "status_code": 0, "status_msg": "success" },
    "data": { "audio": "<hex-encoded>", "status": 2 },
    "extra_info": { "audio_length": 3528, "audio_sample_rate": 32000, ... }
  },
  "usage": { "characters": 26 },
  "request_id": "..."
}
```

Key path changes:
- `json.base_resp` → `json.output.base_resp`
- `json.data.audio` → `json.output.data.audio`

### Voice Listing

Same unified endpoint, differentiated by request body:

```json
{
  "model": "MiniMax/speech-2.8-turbo",
  "input": {
    "action": "get_voice",
    "voice_type": "all"
  }
}
```

Response path change: `json.system_voice` → `json.output.system_voice`, `json.voice_cloning` → `json.output.voice_cloning`.

### Model Names

Models use the `MiniMax/` prefix and are shown as-is in the UI:

| Model ID | Description |
|---|---|
| `MiniMax/speech-2.8-hd` | High quality (2.8) |
| `MiniMax/speech-2.8-turbo` | Fast (2.8) |
| `MiniMax/speech-02-hd` | High quality (02) |
| `MiniMax/speech-02-turbo` | Fast (02) |

Default model: `MiniMax/speech-2.8-turbo`

The 2.6 models are removed.

### UI Changes

- **Settings section**: Remove GroupId field. Keep API Key only. Label: "Minimax@Aliyun".
- **Model selector**: Updated to the 4 models above with full prefixed names.
- **Text hint**: Updated `is28Model` check to `model.includes('speech-2.8')`.

### Files Changed

| File | Change |
|---|---|
| `src/utils/minimax-tts.ts` | New endpoint, request body restructuring, response path updates |
| `src/hooks/useMiniMaxSettings.ts` | Remove groupId state |
| `src/hooks/useMiniMaxVoices.ts` | Remove groupId parameter |
| `src/components/minimax/MiniMaxSettings.tsx` | Remove GroupId input, update label |
| `src/components/minimax/ModelSelector.tsx` | New model list with MiniMax/ prefix |
| `src/types.ts` | Update DEFAULT_MINIMAX_CONFIG.model |
| `src/MiniMaxApp.tsx` | Remove groupId references, update is28Model check |

### Files NOT Changed

- `server/minimax-routes.ts` — recording CRUD, no API interaction
- `server/minimax-db.ts` — database schema unchanged
- `src/hooks/useMiniMaxRecordings.ts` — talks to our server, not MiniMax
- `src/components/minimax/MiniMaxVoiceSelector.tsx` — consumes voice data, format unchanged
- `src/components/minimax/VoiceSettings.tsx` — no API interaction
- `src/components/minimax/LanguageBoost.tsx` — no API interaction
- `src/components/minimax/VoiceModify.tsx` — no API interaction

### Error Handling

No changes to error handling strategy. Aliyun uses the same `base_resp.status_code` convention (0 = success). Error codes are compatible.

### Testing

Manual testing: configure a DashScope API key, verify voice listing, sync synthesis, and streaming synthesis all work.
