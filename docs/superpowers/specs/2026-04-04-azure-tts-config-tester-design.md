# Azure TTS Config Tester — Design Spec

## Overview

A web application for interactively testing Azure Text-to-Speech (TTS) configuration parameters. Users can select voices, adjust SSML parameters (rate, pitch, volume, emphasis, style, role, breaks), synthesize speech, play it back, and save recordings with their configs for later reference. A "Show Code" feature generates ready-to-use Python and Node.js SDK code snippets for the current configuration.

## Architecture

```
┌─────────────────────────────────────┐
│  React Frontend (Vite, TypeScript)  │
│  Port: 7742                         │
│  - Azure TTS config UI              │
│  - Direct calls to Azure TTS API    │
│  - Saved recordings management      │
├─────────────────────────────────────┤
│  Node.js Backend (Express)          │
│  Port: 7740                         │
│  - SQLite for recording metadata    │
│  - Local file storage for audio     │
│  - REST API for CRUD operations     │
└─────────────────────────────────────┘
```

### Data Flow

1. User enters Azure key + region (stored in localStorage).
2. App fetches voice list from Azure REST API: `GET https://{region}.tts.speech.microsoft.com/cognitiveservices/voices/list`.
3. User selects voice, adjusts parameters, enters text.
4. On "Synthesize & Play": app constructs SSML, POSTs to Azure TTS endpoint, plays returned audio via `<audio>` element.
5. On "Save Recording": audio blob + config sent to backend for persistence.
6. On "Show Code": modal displays equivalent Python/Node.js SDK code.

### Key Decision: No Azure API Proxying

Azure TTS calls go directly from the browser. The backend is solely for saving/loading recordings. This keeps the backend simple and avoids it needing Azure credentials.

## UI Components

### Layout

Single page, two-panel layout:
- **Left Panel**: Configuration controls
- **Right Panel**: Saved recordings list

### Left Panel — Configuration

1. **Azure Settings**
   - API Key input (password field)
   - Region dropdown or text input
   - Persisted in localStorage

2. **Voice Selector**
   - Searchable dropdown filtered by language and locale
   - Fetched dynamically from Azure API on load
   - Each entry shows: `DisplayName (Locale) - Gender`
   - After selection, dynamically reveals which styles/roles that voice supports

3. **Prosody Controls**
   - **Rate**: dropdown (x-slow, slow, medium, fast, x-fast) or custom percentage input
   - **Pitch**: dropdown (x-low, low, medium, high, x-high) or custom %/semitones input
   - **Volume**: dropdown (silent, x-soft, soft, medium, loud, x-loud) or custom dB input

4. **Emphasis**
   - Dropdown: none, reduced, moderate, strong
   - Applied to the entire text

5. **Style & Role** (conditionally shown based on selected voice capabilities)
   - **Style**: dropdown populated from the voice's supported styles
   - **Style Degree**: slider from 0.01 to 2.0 (default 1.0)
   - **Role**: dropdown populated from the voice's supported roles

6. **Break**
   - A separate control to set a pause before the text is spoken
   - Duration input in milliseconds, or strength keyword dropdown (none, x-weak, weak, medium, strong, x-strong)
   - When set, a `<break>` element is prepended inside the SSML before the text content

7. **Text Input**
   - Multiline textarea for the text to synthesize

8. **Action Buttons**
   - `[Synthesize & Play]` — constructs SSML, calls Azure TTS, plays audio
   - `[Save Recording]` — saves current audio + config to backend
   - `[Show Code]` — opens modal with SDK code snippets

### Right Panel — Saved Recordings

- List of saved recordings from the backend, sorted by newest first
- Each entry displays: voice name, text snippet, params summary, timestamp
- Click entry to play its saved audio
- Delete button per entry

### Show Code Modal

- Triggered by `[Show Code]` button
- Two tabs: **Python SDK** | **Node.js SDK**
- Code block dynamically generated from current config including:
  - Language and voice name
  - All SSML parameters (rate, pitch, volume, emphasis, style, style degree, role, break)
  - Complete, copy-paste-ready code snippet
- SSML preview tab showing the raw generated SSML
- **Copy to clipboard** button per tab

## Data Model (SQLite)

### `recordings` table

| Column             | Type     | Description                                         |
|--------------------|----------|-----------------------------------------------------|
| `id`               | TEXT     | Primary key (UUID)                                  |
| `voice_name`       | TEXT     | Azure voice short name (e.g., `en-US-JennyNeural`)  |
| `voice_display_name` | TEXT   | Human-readable display name                         |
| `language`         | TEXT     | Locale (e.g., `en-US`)                              |
| `text`             | TEXT     | Input text that was synthesized                     |
| `rate`             | TEXT     | Rate value                                          |
| `pitch`            | TEXT     | Pitch value                                         |
| `volume`           | TEXT     | Volume value                                        |
| `emphasis`         | TEXT     | Emphasis level (nullable)                           |
| `style`            | TEXT     | Speaking style (nullable)                           |
| `style_degree`     | REAL     | Style intensity 0.01–2.0 (nullable)                 |
| `role`             | TEXT     | Role (nullable)                                     |
| `break_config`     | TEXT     | Break settings as JSON (nullable)                   |
| `ssml`             | TEXT     | Full generated SSML                                 |
| `audio_filename`   | TEXT     | Path to saved audio file                            |
| `output_format`    | TEXT     | Audio format used                                   |
| `created_at`       | DATETIME | Timestamp of creation                              |
| `label`            | TEXT     | Optional user label/note (nullable)                 |

Audio files stored at `./audio/{id}.mp3` (or appropriate extension based on output format).

## Backend API (Express)

| Method   | Endpoint                     | Description                                              |
|----------|------------------------------|----------------------------------------------------------|
| `POST`   | `/api/recordings`            | Save audio blob + config. Multipart form: audio file + JSON config. Returns saved recording with ID. |
| `GET`    | `/api/recordings`            | List all saved recordings (metadata only). Sorted by `created_at` desc. |
| `GET`    | `/api/recordings/:id`        | Get single recording metadata.                           |
| `GET`    | `/api/recordings/:id/audio`  | Stream the audio file for playback.                      |
| `DELETE` | `/api/recordings/:id`        | Delete recording (DB entry + audio file).                |
| `PATCH`  | `/api/recordings/:id`        | Update label/notes on a recording.                       |

## Azure REST API Integration

### Fetch Voice List
```
GET https://{region}.tts.speech.microsoft.com/cognitiveservices/voices/list
Header: Ocp-Apim-Subscription-Key: {key}
```

### Synthesize Speech
```
POST https://{region}.tts.speech.microsoft.com/cognitiveservices/v1
Headers:
  Ocp-Apim-Subscription-Key: {key}
  Content-Type: application/ssml+xml
  X-Microsoft-OutputFormat: audio-16khz-128kbitrate-mono-mp3
Body: <SSML>
```

### SSML Template
```xml
<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis"
       xmlns:mstts="https://www.w3.org/2001/mstts"
       xml:lang="{language}">
  <voice name="{voiceName}">
    <mstts:express-as style="{style}" styledegree="{styleDegree}" role="{role}">
      <prosody rate="{rate}" pitch="{pitch}" volume="{volume}">
        <emphasis level="{emphasis}">
          {text}
        </emphasis>
      </prosody>
    </mstts:express-as>
  </voice>
</speak>
```

Elements are conditionally included only when their values differ from defaults.

## Error Handling

| Scenario                              | Handling                                                    |
|---------------------------------------|-------------------------------------------------------------|
| No Azure key/region set               | Disable Synthesize button, show prompt to configure         |
| Invalid Azure key                     | Show error toast with API response message                  |
| Voice list fetch fails                | Show error message with retry button                        |
| Voice doesn't support style/role      | Hide style/role controls dynamically                        |
| Synthesis fails (network/API error)   | Show error toast with Azure error message                   |
| Empty text input                      | Disable Synthesize button                                   |
| Backend unreachable                   | Recordings panel shows error; synthesize still works        |
| Audio file missing on disk            | Return 404, show "audio not found" in UI                    |

## Tech Stack

- **Frontend**: React 18+, TypeScript, Vite
- **Backend**: Node.js, Express, better-sqlite3 (or sqlite3)
- **Styling**: Tailwind CSS for utility-first styling with minimal setup
- **Dev**: Single `npm run dev` starts both frontend (port 7742) and backend (port 7740)
- **Frontend proxies** `/api/*` requests to backend during development

## Out of Scope

- User authentication
- Cloud deployment configuration
- SSML visual editor (text-level markup of breaks/emphasis)
- Batch synthesis
- Real-time streaming TTS
