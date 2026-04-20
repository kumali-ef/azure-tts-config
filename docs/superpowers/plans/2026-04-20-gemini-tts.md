# Gemini TTS Tab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Gemini TTS" tab to the TTS Config Tester for Google's Gemini 3.1 Flash TTS model with emerald green theme.

**Architecture:** Server-side Express proxy to the Gemini `generateContent` REST API, with SQLite recording persistence. React frontend with hardcoded 30-voice selector, accordion-based config panel, and recordings list. Follows the exact same pattern as all other provider tabs (Inworld, FishAudio, etc.).

**Tech Stack:** React 19, TypeScript, Express 5, better-sqlite3, Tailwind CSS 4, Vite

---

### Task 1: Add Gemini Types

**Files:**
- Modify: `src/types.ts` (append after FishAudio types at end of file)

- [ ] **Step 1: Add GeminiVoice, GeminiConfig, GeminiRecording types and default config**

Append the following to the end of `src/types.ts` (before the final line if any):

```typescript
// ── Gemini TTS Types ──

export interface GeminiVoice {
  name: string;
  displayName: string;
  gender: string;
  style: string;
}

export interface GeminiConfig {
  model: string;
  voiceName: string;
  voiceDisplayName: string;
  text: string;
}

export interface GeminiRecording {
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

export const DEFAULT_GEMINI_CONFIG: GeminiConfig = {
  model: 'gemini-3.1-flash-tts-preview',
  voiceName: '',
  voiceDisplayName: '',
  text: '',
};
```

- [ ] **Step 2: Verify the build still compiles**

Run: `cd /Users/kumali/EFProjects/tts-config-test && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/types.ts
git commit -m "feat(gemini): add Gemini TTS types and default config"
```

---

### Task 2: Create Gemini Database Module

**Files:**
- Create: `server/gemini-db.ts`

- [ ] **Step 1: Create `server/gemini-db.ts`**

```typescript
import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'tts-recordings.db');

const db = new Database(DB_PATH);

db.exec(`
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
  )
`);

export interface GeminiRecordingRow {
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

const insertStmt = db.prepare(`
  INSERT INTO gemini_recordings (id, model, voice_name, voice_display_name, text,
    audio_filename, api_response_time_ms, label)
  VALUES (@id, @model, @voice_name, @voice_display_name, @text,
    @audio_filename, @api_response_time_ms, @label)
`);

const listStmt = db.prepare(
  'SELECT * FROM gemini_recordings ORDER BY created_at DESC'
);

const getStmt = db.prepare('SELECT * FROM gemini_recordings WHERE id = ?');

const deleteStmt = db.prepare('DELETE FROM gemini_recordings WHERE id = ?');

const updateLabelStmt = db.prepare(
  'UPDATE gemini_recordings SET label = @label WHERE id = @id'
);

export function insertGeminiRecording(row: Omit<GeminiRecordingRow, 'created_at'>): GeminiRecordingRow {
  insertStmt.run(row);
  return getStmt.get(row.id) as GeminiRecordingRow;
}

export function listGeminiRecordings(): GeminiRecordingRow[] {
  return listStmt.all() as GeminiRecordingRow[];
}

export function getGeminiRecording(id: string): GeminiRecordingRow | undefined {
  return getStmt.get(id) as GeminiRecordingRow | undefined;
}

export function deleteGeminiRecording(id: string): boolean {
  const result = deleteStmt.run(id);
  return result.changes > 0;
}

export function updateGeminiRecordingLabel(id: string, label: string): GeminiRecordingRow | undefined {
  updateLabelStmt.run({ id, label });
  return getStmt.get(id) as GeminiRecordingRow | undefined;
}
```

- [ ] **Step 2: Verify the server code compiles**

Run: `cd /Users/kumali/EFProjects/tts-config-test && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add server/gemini-db.ts
git commit -m "feat(gemini): add database module for Gemini recordings"
```

---

### Task 3: Create Gemini Server Routes

**Files:**
- Create: `server/gemini-routes.ts`
- Modify: `server/index.ts`

- [ ] **Step 1: Create `server/gemini-routes.ts`**

```typescript
import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import {
  insertGeminiRecording,
  listGeminiRecordings,
  getGeminiRecording,
  deleteGeminiRecording,
  updateGeminiRecordingLabel,
} from './gemini-db';
import { AUDIO_DIR } from './db';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

// POST /api/gemini/synthesize — Proxy TTS request to Gemini API
router.post('/synthesize', async (req: Request, res: Response) => {
  const { apiKey, model, voiceName, text } = req.body as {
    apiKey?: string;
    model?: string;
    voiceName?: string;
    text?: string;
  };

  const key = typeof apiKey === 'string' ? apiKey.trim() : '';
  if (!key) {
    res.status(400).json({ error: 'Missing apiKey' });
    return;
  }
  if (!model || !voiceName || !text) {
    res.status(400).json({ error: 'Missing model, voiceName, or text' });
    return;
  }

  const url = `${GEMINI_API_BASE}/${model}:generateContent`;

  const body = {
    contents: [{ parts: [{ text }] }],
    generationConfig: {
      response_modalities: ['AUDIO'],
      speech_config: {
        voice_config: {
          prebuilt_voice_config: {
            voice_name: voiceName,
          },
        },
      },
    },
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'x-goog-api-key': key,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text();
      let json: unknown = null;
      try { json = text ? JSON.parse(text) : null; } catch { json = null; }
      res.status(response.status).json({
        error: `Gemini API error (${response.status})`,
        upstreamMessage: typeof json === 'object' && json !== null ? JSON.stringify(json) : text,
      });
      return;
    }

    const json = await response.json() as {
      candidates?: Array<{
        content?: {
          parts?: Array<{
            inline_data?: { mime_type?: string; data?: string };
          }>;
        };
      }>;
    };

    const inlineData = json.candidates?.[0]?.content?.parts?.[0]?.inline_data;
    if (!inlineData?.data) {
      res.status(502).json({ error: 'Gemini API returned no audio data' });
      return;
    }

    const audioBuffer = Buffer.from(inlineData.data, 'base64');
    const mimeType = inlineData.mime_type || 'audio/wav';
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Length', audioBuffer.byteLength.toString());
    res.setHeader('X-Audio-Mime-Type', mimeType);
    res.send(audioBuffer);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to call Gemini API';
    res.status(500).json({ error: message });
  }
});

// POST /api/gemini/recordings — Save recording
router.post('/recordings', upload.single('audio'), (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No audio file provided' });
      return;
    }

    const config = JSON.parse(req.body.config);
    const id = uuidv4();
    const ext = config.mime_type === 'audio/mp3' ? '.mp3' : '.wav';
    const audioFilename = `gemini-${id}${ext}`;
    const audioPath = path.join(AUDIO_DIR, audioFilename);

    fs.writeFileSync(audioPath, req.file.buffer);

    const row = insertGeminiRecording({
      id,
      model: config.model,
      voice_name: config.voice_name,
      voice_display_name: config.voice_display_name || null,
      text: config.text,
      audio_filename: audioFilename,
      api_response_time_ms: config.api_response_time_ms ?? null,
      label: config.label || null,
    });

    res.status(201).json(row);
  } catch (err) {
    console.error('Error saving Gemini recording:', err);
    res.status(500).json({ error: 'Failed to save recording' });
  }
});

// GET /api/gemini/recordings — List all recordings
router.get('/recordings', (_req: Request, res: Response) => {
  const recordings = listGeminiRecordings();
  res.json(recordings);
});

// GET /api/gemini/recordings/:id — Get single recording
router.get('/recordings/:id', (req: Request, res: Response) => {
  const recording = getGeminiRecording(req.params.id);
  if (!recording) {
    res.status(404).json({ error: 'Recording not found' });
    return;
  }
  res.json(recording);
});

// GET /api/gemini/recordings/:id/audio — Stream audio file
router.get('/recordings/:id/audio', (req: Request, res: Response) => {
  const recording = getGeminiRecording(req.params.id);
  if (!recording) {
    res.status(404).json({ error: 'Recording not found' });
    return;
  }

  const audioPath = path.join(AUDIO_DIR, recording.audio_filename);
  if (!fs.existsSync(audioPath)) {
    res.status(404).json({ error: 'Audio file not found' });
    return;
  }

  const ext = path.extname(recording.audio_filename).toLowerCase();
  const mimeType = ext === '.mp3' ? 'audio/mpeg' : 'audio/wav';
  res.setHeader('Content-Type', mimeType);
  fs.createReadStream(audioPath).pipe(res);
});

// DELETE /api/gemini/recordings/:id — Delete recording
router.delete('/recordings/:id', (req: Request, res: Response) => {
  const recording = getGeminiRecording(req.params.id);
  if (!recording) {
    res.status(404).json({ error: 'Recording not found' });
    return;
  }

  const audioPath = path.join(AUDIO_DIR, recording.audio_filename);
  if (fs.existsSync(audioPath)) {
    fs.unlinkSync(audioPath);
  }

  deleteGeminiRecording(req.params.id);
  res.status(204).send();
});

// PATCH /api/gemini/recordings/:id — Update label
router.patch('/recordings/:id', (req: Request, res: Response) => {
  const { label } = req.body;
  const updated = updateGeminiRecordingLabel(req.params.id, label);
  if (!updated) {
    res.status(404).json({ error: 'Recording not found' });
    return;
  }
  res.json(updated);
});

export default router;
```

- [ ] **Step 2: Register the router in `server/index.ts`**

Add the following import after the `fishaudioRouter` import:

```typescript
import geminiRouter from './gemini-routes';
```

Add the following mount after `app.use('/api/fishaudio', fishaudioRouter);`:

```typescript
app.use('/api/gemini', geminiRouter);
```

- [ ] **Step 3: Verify the server code compiles**

Run: `cd /Users/kumali/EFProjects/tts-config-test && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add server/gemini-routes.ts server/index.ts
git commit -m "feat(gemini): add server routes with API proxy and recordings CRUD"
```

---

### Task 4: Create Client TTS Utility

**Files:**
- Create: `src/utils/gemini-tts.ts`

- [ ] **Step 1: Create `src/utils/gemini-tts.ts` with hardcoded voices and synthesis function**

```typescript
import type { GeminiVoice } from '../types';

export const GEMINI_VOICES: GeminiVoice[] = [
  { name: 'Zephyr', displayName: 'Zephyr', gender: 'Female', style: 'Bright' },
  { name: 'Puck', displayName: 'Puck', gender: 'Male', style: 'Upbeat' },
  { name: 'Charon', displayName: 'Charon', gender: 'Male', style: 'Informative' },
  { name: 'Kore', displayName: 'Kore', gender: 'Female', style: 'Firm' },
  { name: 'Fenrir', displayName: 'Fenrir', gender: 'Male', style: 'Excitable' },
  { name: 'Leda', displayName: 'Leda', gender: 'Female', style: 'Youthful' },
  { name: 'Orus', displayName: 'Orus', gender: 'Male', style: 'Firm' },
  { name: 'Aoede', displayName: 'Aoede', gender: 'Female', style: 'Breezy' },
  { name: 'Callirrhoe', displayName: 'Callirrhoe', gender: 'Female', style: 'Casual' },
  { name: 'Autonoe', displayName: 'Autonoe', gender: 'Female', style: 'Bright' },
  { name: 'Enceladus', displayName: 'Enceladus', gender: 'Male', style: 'Breathy' },
  { name: 'Iapetus', displayName: 'Iapetus', gender: 'Male', style: 'Clear' },
  { name: 'Umbriel', displayName: 'Umbriel', gender: 'Male', style: 'Easy-going' },
  { name: 'Algieba', displayName: 'Algieba', gender: 'Male', style: 'Informative' },
  { name: 'Despina', displayName: 'Despina', gender: 'Female', style: 'Smooth' },
  { name: 'Erinome', displayName: 'Erinome', gender: 'Female', style: 'Clear' },
  { name: 'Algenib', displayName: 'Algenib', gender: 'Male', style: 'Gravelly' },
  { name: 'Rasalgethi', displayName: 'Rasalgethi', gender: 'Male', style: 'Informative' },
  { name: 'Laomedeia', displayName: 'Laomedeia', gender: 'Female', style: 'Upbeat' },
  { name: 'Achernar', displayName: 'Achernar', gender: 'Male', style: 'Soft' },
  { name: 'Alnilam', displayName: 'Alnilam', gender: 'Male', style: 'Firm' },
  { name: 'Schedar', displayName: 'Schedar', gender: 'Male', style: 'Even' },
  { name: 'Gacrux', displayName: 'Gacrux', gender: 'Male', style: 'Mature' },
  { name: 'Pulcherrima', displayName: 'Pulcherrima', gender: 'Female', style: 'Forward' },
  { name: 'Achird', displayName: 'Achird', gender: 'Male', style: 'Friendly' },
  { name: 'Zubenelgenubi', displayName: 'Zubenelgenubi', gender: 'Male', style: 'Casual' },
  { name: 'Vindemiatrix', displayName: 'Vindemiatrix', gender: 'Female', style: 'Gentle' },
  { name: 'Sadachbia', displayName: 'Sadachbia', gender: 'Male', style: 'Lively' },
  { name: 'Sadaltager', displayName: 'Sadaltager', gender: 'Male', style: 'Knowledgeable' },
  { name: 'Sulafat', displayName: 'Sulafat', gender: 'Female', style: 'Warm' },
];

export interface GeminiSynthesisParams {
  apiKey: string;
  model: string;
  voiceName: string;
  text: string;
}

export interface GeminiSynthesisResult {
  audioBuffer: ArrayBuffer;
  mimeType: string;
}

/** Non-streaming synthesis — server proxies to Gemini generateContent API */
export async function geminiSynthesize(params: GeminiSynthesisParams): Promise<GeminiSynthesisResult> {
  const response = await fetch('/api/gemini/synthesize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      apiKey: params.apiKey,
      model: params.model,
      voiceName: params.voiceName,
      text: params.text,
    }),
  });

  if (!response.ok) {
    let message = `Gemini API error (${response.status})`;
    try {
      const errJson = await response.json();
      message = errJson?.upstreamMessage || errJson?.error || message;
    } catch {
      const text = await response.text();
      if (text) message = `${message}: ${text}`;
    }
    throw new Error(message);
  }

  const mimeType = response.headers.get('X-Audio-Mime-Type') || response.headers.get('Content-Type') || 'audio/wav';
  const audioBuffer = await response.arrayBuffer();

  return { audioBuffer, mimeType };
}
```

- [ ] **Step 2: Verify the build compiles**

Run: `cd /Users/kumali/EFProjects/tts-config-test && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/utils/gemini-tts.ts
git commit -m "feat(gemini): add client TTS utility with 30 hardcoded voices"
```

---

### Task 5: Create Hooks

**Files:**
- Create: `src/hooks/useGeminiSettings.ts`
- Create: `src/hooks/useGeminiRecordings.ts`

- [ ] **Step 1: Create `src/hooks/useGeminiSettings.ts`**

```typescript
import { useState, useCallback } from 'react';

const STORAGE_KEY = 'gemini_api_key';

export function useGeminiSettings() {
  const [apiKey, setApiKeyState] = useState<string>(() => localStorage.getItem(STORAGE_KEY) || '');

  const setApiKey = useCallback((key: string) => {
    setApiKeyState(key);
    if (key) {
      localStorage.setItem(STORAGE_KEY, key);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  return {
    apiKey,
    setApiKey,
    isConfigured: !!apiKey.trim(),
  };
}
```

- [ ] **Step 2: Create `src/hooks/useGeminiRecordings.ts`**

```typescript
import { useState, useEffect, useCallback } from 'react';
import type { GeminiRecording } from '../types';

export function useGeminiRecordings() {
  const [recordings, setRecordings] = useState<GeminiRecording[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRecordings = useCallback(async () => {
    try {
      const res = await fetch('/api/gemini/recordings');
      if (!res.ok) throw new Error('Failed to fetch recordings');
      const data = await res.json();
      setRecordings(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load recordings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecordings();
  }, [fetchRecordings]);

  const saveRecording = useCallback(async (audioBlob: Blob, config: Record<string, unknown>) => {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.wav');
    formData.append('config', JSON.stringify(config));

    const res = await fetch('/api/gemini/recordings', {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) throw new Error('Failed to save recording');
    const saved = await res.json();
    setRecordings((prev) => [saved, ...prev]);
    return saved;
  }, []);

  const deleteRecording = useCallback(async (id: string) => {
    const res = await fetch(`/api/gemini/recordings/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete recording');
    setRecordings((prev) => prev.filter((r) => r.id !== id));
  }, []);

  return { recordings, loading, error, saveRecording, deleteRecording };
}
```

- [ ] **Step 3: Verify the build compiles**

Run: `cd /Users/kumali/EFProjects/tts-config-test && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useGeminiSettings.ts src/hooks/useGeminiRecordings.ts
git commit -m "feat(gemini): add settings and recordings hooks"
```

---

### Task 6: Create UI Components

**Files:**
- Create: `src/components/gemini/GeminiSettings.tsx`
- Create: `src/components/gemini/GeminiModelSelector.tsx`
- Create: `src/components/gemini/GeminiVoiceSelector.tsx`
- Create: `src/components/gemini/GeminiRecordingsList.tsx`

- [ ] **Step 1: Create `src/components/gemini/GeminiSettings.tsx`**

```tsx
interface Props {
  apiKey: string;
  onApiKeyChange: (key: string) => void;
}

export function GeminiSettings({ apiKey, onApiKeyChange }: Props) {
  return (
    <div className="p-4 space-y-3">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Google AI API Key
        </label>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => onApiKeyChange(e.target.value)}
          placeholder="Paste your Gemini API key..."
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
        />
        <p className="text-xs text-gray-400 mt-1">
          Get your key from{' '}
          <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="text-emerald-500 hover:underline">
            Google AI Studio → API Keys
          </a>
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create `src/components/gemini/GeminiModelSelector.tsx`**

```tsx
const MODELS = [
  { id: 'gemini-3.1-flash-tts-preview', label: 'Gemini 3.1 Flash TTS (preview)' },
];

interface Props {
  model: string;
  onChange: (model: string) => void;
}

export function GeminiModelSelector({ model, onChange }: Props) {
  return (
    <div className="p-4">
      <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
      <select
        value={model}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
      >
        {MODELS.map((m) => (
          <option key={m.id} value={m.id}>{m.label}</option>
        ))}
      </select>
    </div>
  );
}
```

- [ ] **Step 3: Create `src/components/gemini/GeminiVoiceSelector.tsx`**

```tsx
import { useState, useMemo } from 'react';
import type { GeminiVoice } from '../../types';

interface Props {
  voices: GeminiVoice[];
  selectedVoiceName: string;
  onVoiceChange: (voiceName: string, displayName: string) => void;
}

export function GeminiVoiceSelector({ voices, selectedVoiceName, onVoiceChange }: Props) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search) return voices;
    const q = search.toLowerCase();
    return voices.filter(
      (v) =>
        v.name.toLowerCase().includes(q) ||
        v.gender.toLowerCase().includes(q) ||
        v.style.toLowerCase().includes(q)
    );
  }, [voices, search]);

  return (
    <div className="p-4 space-y-2">
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="🔍 Search voices..."
        className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
      />
      <div className="max-h-60 overflow-y-auto border rounded-md">
        {filtered.map((voice) => (
          <button
            key={voice.name}
            onClick={() => onVoiceChange(voice.name, voice.displayName)}
            className={`w-full text-left px-3 py-2 text-sm border-b last:border-b-0 hover:bg-emerald-50 transition-colors ${
              selectedVoiceName === voice.name ? 'bg-emerald-100 text-emerald-800' : 'text-gray-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="font-medium">{voice.displayName}</span>
              <span className="text-xs text-gray-400">{voice.gender}</span>
              <span className="text-[10px] px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded-full">
                {voice.style}
              </span>
            </div>
          </button>
        ))}
        {filtered.length === 0 && (
          <p className="p-3 text-sm text-gray-400">No voices match "{search}"</p>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create `src/components/gemini/GeminiRecordingsList.tsx`**

```tsx
import { useState } from 'react';
import type { GeminiRecording } from '../../types';

interface Props {
  recordings: GeminiRecording[];
  loading: boolean;
  error: string | null;
  onPlay: (id: string) => void;
  onDownload: (id: string) => void;
  onDelete: (id: string) => void;
  onLoad: (rec: GeminiRecording) => void;
  onShowCode: (rec: GeminiRecording) => void;
}

export function GeminiRecordingsList({ recordings, loading, error, onPlay, onDownload, onDelete, onLoad, onShowCode }: Props) {
  const [filter, setFilter] = useState('');

  const filtered = recordings.filter((rec) => {
    if (!filter) return true;
    const q = filter.toLowerCase();
    return (
      rec.text.toLowerCase().includes(q) ||
      rec.voice_name.toLowerCase().includes(q) ||
      (rec.voice_display_name || '').toLowerCase().includes(q) ||
      rec.model.toLowerCase().includes(q)
    );
  });

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b bg-white">
        <h2 className="text-lg font-bold text-gray-800 mb-2">Gemini Recordings</h2>
        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="🔍 Filter recordings..."
          className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm"
        />
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading && <p className="p-4 text-sm text-gray-500">Loading recordings...</p>}
        {error && <p className="p-4 text-sm text-red-500">{error}</p>}
        {!loading && filtered.length === 0 && (
          <p className="p-4 text-sm text-gray-400">No recordings yet. Synthesize some audio!</p>
        )}
        {filtered.map((rec) => (
          <div key={rec.id} className="px-4 py-3 border-b border-gray-100 hover:bg-gray-50">
            <div className="flex justify-between items-start">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="bg-emerald-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-medium">
                    gemini
                  </span>
                  <span className="text-sm font-medium text-gray-700 truncate">
                    {rec.voice_display_name || rec.voice_name}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1 truncate">{rec.text}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {new Date(rec.created_at).toLocaleString()}
                  {rec.api_response_time_ms != null && (
                    <span className="ml-2 text-emerald-500">⏱ {rec.api_response_time_ms}ms</span>
                  )}
                </p>
              </div>
              <div className="flex gap-1 ml-2">
                <button
                  onClick={() => onPlay(rec.id)}
                  className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
                  title="Play"
                >▶</button>
                <button
                  onClick={() => onDownload(rec.id)}
                  className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
                  title="Download"
                >⬇</button>
                <button
                  onClick={() => onLoad(rec)}
                  className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
                  title="Load config"
                >↩</button>
                <button
                  onClick={() => onDelete(rec.id)}
                  className="px-2 py-1 text-xs bg-gray-100 hover:bg-red-100 text-red-500 rounded"
                  title="Delete"
                >🗑</button>
                <button
                  onClick={() => onShowCode(rec)}
                  className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
                  title="Show config JSON"
                >{'{}'}</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Verify the build compiles**

Run: `cd /Users/kumali/EFProjects/tts-config-test && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/gemini/
git commit -m "feat(gemini): add UI components (settings, model, voice, recordings)"
```

---

### Task 7: Create GeminiApp Page Component

**Files:**
- Create: `src/GeminiApp.tsx`

- [ ] **Step 1: Create `src/GeminiApp.tsx`**

```tsx
import { useState, useRef, useCallback } from 'react';
import type { GeminiConfig, GeminiRecording } from './types';
import { DEFAULT_GEMINI_CONFIG } from './types';
import { useGeminiSettings } from './hooks/useGeminiSettings';
import { useGeminiRecordings } from './hooks/useGeminiRecordings';
import { geminiSynthesize, GEMINI_VOICES } from './utils/gemini-tts';
import { sanitizeFilename } from './utils/storage';
import { Accordion } from './components/Accordion';
import { ShowJsonModal } from './components/ShowJsonModal';
import { GeminiSettings } from './components/gemini/GeminiSettings';
import { GeminiModelSelector } from './components/gemini/GeminiModelSelector';
import { GeminiVoiceSelector } from './components/gemini/GeminiVoiceSelector';
import { GeminiRecordingsList } from './components/gemini/GeminiRecordingsList';

function recordingToConfig(rec: GeminiRecording): GeminiConfig {
  return {
    model: rec.model,
    voiceName: rec.voice_name,
    voiceDisplayName: rec.voice_display_name || rec.voice_name,
    text: rec.text,
  };
}

export function GeminiApp() {
  const { apiKey, setApiKey, isConfigured } = useGeminiSettings();
  const { recordings, loading: recsLoading, error: recsError, saveRecording, deleteRecording } = useGeminiRecordings();

  const [config, setConfig] = useState<GeminiConfig>(DEFAULT_GEMINI_CONFIG);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [codeModalJson, setCodeModalJson] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const updateConfig = useCallback((updates: Partial<GeminiConfig>) => {
    setConfig((prev) => ({ ...prev, ...updates }));
  }, []);

  const canSynthesize = isConfigured && !!config.text && !!config.voiceName;

  const configToJson = (cfg: GeminiConfig) => JSON.stringify({
    model: cfg.model,
    voiceName: cfg.voiceName,
    voiceDisplayName: cfg.voiceDisplayName,
    text: cfg.text,
  }, null, 2);

  const handleSynthesize = async () => {
    if (!canSynthesize) return;
    setIsSynthesizing(true);
    setError(null);
    try {
      const startTime = performance.now();
      const { audioBuffer, mimeType } = await geminiSynthesize({
        apiKey,
        model: config.model,
        voiceName: config.voiceName,
        text: config.text,
      });
      const apiResponseTimeMs = Math.round(performance.now() - startTime);
      const blob = new Blob([audioBuffer], { type: mimeType });
      const url = URL.createObjectURL(blob);
      if (audioRef.current) {
        audioRef.current.src = url;
        audioRef.current.play();
      }
      await saveRecording(blob, {
        model: config.model,
        voice_name: config.voiceName,
        voice_display_name: config.voiceDisplayName,
        text: config.text,
        mime_type: mimeType,
        api_response_time_ms: apiResponseTimeMs,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Synthesis failed');
    } finally {
      setIsSynthesizing(false);
    }
  };

  const handlePlayRecording = (id: string) => {
    if (audioRef.current) {
      audioRef.current.src = `/api/gemini/recordings/${id}/audio`;
      audioRef.current.play();
    }
  };

  const handleDownloadRecording = (id: string) => {
    const rec = recordings.find((r) => r.id === id);
    if (!rec) return;
    const voiceName = sanitizeFilename(rec.voice_display_name || rec.voice_name);
    const a = document.createElement('a');
    a.href = `/api/gemini/recordings/${id}/audio`;
    a.download = `gemini-${voiceName}-${id}.wav`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleLoadRecording = (rec: GeminiRecording) => {
    setConfig(recordingToConfig(rec));
  };

  return (
    <div className="flex h-[calc(100vh-52px)]">
      {/* Left Panel - Configuration */}
      <div className="w-1/2 overflow-y-auto p-4 space-y-3 border-r">
        <Accordion title="Gemini API">
          <GeminiSettings apiKey={apiKey} onApiKeyChange={setApiKey} />
        </Accordion>

        <Accordion title="Model">
          <GeminiModelSelector model={config.model} onChange={(model) => updateConfig({ model })} />
        </Accordion>

        <Accordion title="Voice">
          <GeminiVoiceSelector
            voices={GEMINI_VOICES}
            selectedVoiceName={config.voiceName}
            onVoiceChange={(voiceName, voiceDisplayName) => updateConfig({ voiceName, voiceDisplayName })}
          />
        </Accordion>

        <Accordion title="Text">
          <div className="p-4">
            <textarea
              value={config.text}
              onChange={(e) => updateConfig({ text: e.target.value })}
              placeholder="Enter text to synthesize..."
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-y"
            />
            <p className="text-xs text-gray-400 mt-1">{config.text.length} characters</p>
          </div>
        </Accordion>

        {/* Action Buttons */}
        <div className="flex gap-2 px-4">
          <button
            onClick={handleSynthesize}
            disabled={!canSynthesize || isSynthesizing}
            className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg font-semibold text-sm disabled:opacity-50 hover:bg-emerald-700 transition-colors"
          >
            {isSynthesizing ? '⏳ Synthesizing...' : '🔊 Synthesize'}
          </button>
          <button
            onClick={() => setCodeModalJson(configToJson(config))}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg font-semibold text-sm hover:bg-gray-700 transition-colors"
          >
            Show Code
          </button>
        </div>

        {error && (
          <div className="mx-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
            {error}
          </div>
        )}

        {!isConfigured && (
          <div className="mx-4 p-3 bg-yellow-50 border border-yellow-200 text-yellow-700 rounded-md text-sm">
            Enter your Google AI API key to get started.
          </div>
        )}
      </div>

      {/* Right Panel - Recordings */}
      <div className="w-1/2 overflow-y-auto bg-gray-50">
        <GeminiRecordingsList
          recordings={recordings}
          loading={recsLoading}
          error={recsError}
          onPlay={handlePlayRecording}
          onDownload={handleDownloadRecording}
          onDelete={deleteRecording}
          onLoad={handleLoadRecording}
          onShowCode={(rec) => setCodeModalJson(configToJson(recordingToConfig(rec)))}
        />
      </div>

      <audio ref={audioRef} />

      {codeModalJson && (
        <ShowJsonModal
          json={codeModalJson}
          buttonClassName="px-4 py-2 bg-emerald-600 text-white rounded-md text-sm font-medium hover:bg-emerald-700 transition-colors"
          onClose={() => setCodeModalJson(null)}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify the build compiles**

Run: `cd /Users/kumali/EFProjects/tts-config-test && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/GeminiApp.tsx
git commit -m "feat(gemini): add GeminiApp page component"
```

---

### Task 8: Integrate Gemini Tab into App

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Add import for GeminiApp**

Add after the `FishAudioApp` import (line 8):

```typescript
import { GeminiApp } from './GeminiApp';
```

- [ ] **Step 2: Add `'gemini'` to the Tab union type**

Change line 10 from:

```typescript
type Tab = 'azure' | 'minimax' | 'qwen3' | 'cartesia' | 'elevenlabs' | 'inworld' | 'fishaudio';
```

to:

```typescript
type Tab = 'azure' | 'minimax' | 'qwen3' | 'cartesia' | 'elevenlabs' | 'inworld' | 'fishaudio' | 'gemini';
```

- [ ] **Step 3: Add the Gemini tab button**

Add the following button after the Fish Audio tab button (after line 88, before the Aura2 external link):

```tsx
          <button
            onClick={() => setActiveTab('gemini')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'gemini'
                ? 'border-emerald-500 text-emerald-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Gemini TTS
          </button>
```

- [ ] **Step 4: Update the content rendering conditional**

Change line 101 from:

```tsx
      {activeTab === 'azure' ? <AzureApp /> : activeTab === 'minimax' ? <MiniMaxApp /> : activeTab === 'qwen3' ? <Qwen3App /> : activeTab === 'cartesia' ? <CartesiaApp /> : activeTab === 'elevenlabs' ? <ElevenLabsApp /> : activeTab === 'inworld' ? <InworldApp /> : <FishAudioApp />}
```

to:

```tsx
      {activeTab === 'azure' ? <AzureApp /> : activeTab === 'minimax' ? <MiniMaxApp /> : activeTab === 'qwen3' ? <Qwen3App /> : activeTab === 'cartesia' ? <CartesiaApp /> : activeTab === 'elevenlabs' ? <ElevenLabsApp /> : activeTab === 'inworld' ? <InworldApp /> : activeTab === 'fishaudio' ? <FishAudioApp /> : <GeminiApp />}
```

- [ ] **Step 5: Verify full build compiles**

Run: `cd /Users/kumali/EFProjects/tts-config-test && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add src/App.tsx
git commit -m "feat(gemini): integrate Gemini TTS tab into main app"
```

---

### Task 9: Build Verification

- [ ] **Step 1: Run full TypeScript check**

Run: `cd /Users/kumali/EFProjects/tts-config-test && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 2: Run Vite production build**

Run: `cd /Users/kumali/EFProjects/tts-config-test && npm run build`
Expected: Build completes successfully with no errors.

- [ ] **Step 3: Run existing tests**

Run: `cd /Users/kumali/EFProjects/tts-config-test && npm run test`
Expected: All existing tests pass (ssml.test.ts, code-generator.test.ts).

- [ ] **Step 4: Verify dev server starts**

Run: `cd /Users/kumali/EFProjects/tts-config-test && npm run dev`
Expected: Both client (port 7742) and server (port 7740) start without errors. The Gemini TTS tab is visible and clickable in the header. Kill the server after verifying.
