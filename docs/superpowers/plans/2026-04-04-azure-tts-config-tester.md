# Azure TTS Config Tester — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a React + Express web app for interactively testing Azure TTS configuration parameters, with audio playback, recording persistence, and SDK code generation.

**Architecture:** Vite React frontend (port 7742) talks directly to Azure TTS REST API for voice listing and synthesis. Express backend (port 7740) with SQLite handles saving/loading recordings and their audio files. Single `npm run dev` starts both.

**Tech Stack:** React 18, TypeScript, Vite, Tailwind CSS, Express, better-sqlite3, multer, vitest

---

## File Structure

```
azure-stt-config/
├── package.json                     # Dependencies + scripts (dev runs both)
├── vite.config.ts                   # Vite config with proxy to backend
├── tsconfig.json                    # Frontend TS config
├── tsconfig.node.json               # Node/Vite TS config
├── tailwind.config.js               # Tailwind config
├── postcss.config.js                # PostCSS for Tailwind
├── index.html                       # Vite entry HTML
├── .gitignore
├── server/
│   ├── index.ts                     # Express server entry (port 7740)
│   ├── db.ts                        # SQLite setup + query helpers
│   └── routes.ts                    # Recordings CRUD routes
├── src/
│   ├── main.tsx                     # React mount point
│   ├── App.tsx                      # Main two-panel layout
│   ├── index.css                    # Tailwind directives + custom styles
│   ├── types.ts                     # Shared TS types (Voice, Recording, TtsConfig)
│   ├── utils/
│   │   ├── ssml.ts                  # SSML builder from config
│   │   ├── azure-tts.ts            # Azure REST API calls (voices + synthesize)
│   │   ├── code-generator.ts       # Python/Node SDK code generation
│   │   └── storage.ts              # localStorage get/set for Azure credentials
│   ├── components/
│   │   ├── AzureSettings.tsx        # API key + region inputs
│   │   ├── VoiceSelector.tsx        # Searchable, filterable voice dropdown
│   │   ├── ProsodyControls.tsx      # Rate, pitch, volume controls
│   │   ├── EmphasisControl.tsx      # Emphasis level dropdown
│   │   ├── StyleRoleControls.tsx    # Style dropdown + degree slider + role dropdown
│   │   ├── BreakControl.tsx         # Break duration/strength control
│   │   ├── TextInput.tsx            # Textarea for synthesis text
│   │   ├── ActionButtons.tsx        # Synthesize, Save, Show Code buttons
│   │   ├── ShowCodeModal.tsx        # Modal with Python/Node/SSML tabs
│   │   └── RecordingsList.tsx       # Right panel: saved recordings
│   └── hooks/
│       ├── useAzureSettings.ts      # Hook: key/region state + localStorage sync
│       ├── useVoices.ts             # Hook: fetch + filter voices from Azure
│       └── useRecordings.ts         # Hook: CRUD recordings via backend API
├── tests/
│   ├── ssml.test.ts                 # SSML builder unit tests
│   └── code-generator.test.ts       # Code generator unit tests
└── audio/                           # Stored audio files (gitignored)
```

---

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json`
- Create: `vite.config.ts`
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `tailwind.config.js`
- Create: `postcss.config.js`
- Create: `index.html`
- Create: `src/main.tsx`
- Create: `src/index.css`
- Create: `.gitignore`

- [ ] **Step 1: Initialize Vite React TypeScript project**

Run from `/Users/kumali/EFProjects/azure-stt-config`:

```bash
npm create vite@latest . -- --template react-ts
```

If prompted about existing files, choose to overwrite/ignore the docs directory.

- [ ] **Step 2: Install frontend dependencies**

```bash
npm install
npm install -D tailwindcss @tailwindcss/vite
```

- [ ] **Step 3: Install backend dependencies**

```bash
npm install express better-sqlite3 multer uuid cors
npm install -D @types/express @types/better-sqlite3 @types/multer @types/uuid @types/cors tsx concurrently
```

- [ ] **Step 4: Install test dependencies**

```bash
npm install -D vitest
```

- [ ] **Step 5: Configure Tailwind CSS**

Replace `src/index.css` with:

```css
@import "tailwindcss";
```

Update `vite.config.ts`:

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 7742,
    proxy: {
      '/api': {
        target: 'http://localhost:7740',
        changeOrigin: true,
      },
    },
  },
});
```

- [ ] **Step 6: Configure scripts in package.json**

Add to `package.json` scripts:

```json
{
  "scripts": {
    "dev": "concurrently \"npm run dev:server\" \"npm run dev:client\"",
    "dev:client": "vite",
    "dev:server": "tsx watch server/index.ts",
    "build": "tsc -b && vite build",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

- [ ] **Step 7: Create .gitignore**

```
node_modules/
dist/
audio/
*.db
.env
```

- [ ] **Step 8: Create placeholder App**

Replace `src/App.tsx` with:

```tsx
function App() {
  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <h1 className="text-2xl font-bold text-gray-800">Azure TTS Config Tester</h1>
      <p className="text-gray-600 mt-2">App shell ready.</p>
    </div>
  );
}

export default App;
```

Ensure `src/main.tsx` imports `./index.css`.

- [ ] **Step 9: Verify frontend starts**

```bash
npm run dev:client
```

Open `http://localhost:7742`. Expected: page shows "Azure TTS Config Tester" with Tailwind styling (gray background, bold heading).

Stop the dev server after verifying.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "chore: scaffold Vite React TS project with Tailwind and backend deps"
```

---

### Task 2: Shared TypeScript Types

**Files:**
- Create: `src/types.ts`

- [ ] **Step 1: Define types**

Create `src/types.ts`:

```ts
/** Azure voice object returned from the voices list API */
export interface AzureVoice {
  Name: string;
  DisplayName: string;
  LocalName: string;
  ShortName: string;
  Gender: string;
  Locale: string;
  LocaleName: string;
  StyleList?: string[];
  RolePlayList?: string[];
  VoiceType: string;
  Status: string;
  WordsPerMinute?: string;
}

/** TTS configuration parameters set by the user */
export interface TtsConfig {
  voiceName: string;
  voiceDisplayName: string;
  language: string;
  text: string;
  rate: string;
  pitch: string;
  volume: string;
  emphasis: string;
  style: string;
  styleDegree: number;
  role: string;
  breakType: 'duration' | 'strength';
  breakValue: string;
}

/** Recording metadata stored in the database */
export interface Recording {
  id: string;
  voice_name: string;
  voice_display_name: string;
  language: string;
  text: string;
  rate: string;
  pitch: string;
  volume: string;
  emphasis: string | null;
  style: string | null;
  style_degree: number | null;
  role: string | null;
  break_config: string | null;
  ssml: string;
  audio_filename: string;
  output_format: string;
  created_at: string;
  label: string | null;
}

/** Default config values */
export const DEFAULT_CONFIG: TtsConfig = {
  voiceName: '',
  voiceDisplayName: '',
  language: 'en-US',
  text: '',
  rate: 'medium',
  pitch: 'medium',
  volume: 'medium',
  emphasis: '',
  style: '',
  styleDegree: 1.0,
  role: '',
  breakType: 'strength',
  breakValue: '',
};
```

- [ ] **Step 2: Commit**

```bash
git add src/types.ts
git commit -m "feat: add shared TypeScript types for Voice, TtsConfig, Recording"
```

---

### Task 3: SSML Builder Utility

**Files:**
- Create: `src/utils/ssml.ts`
- Create: `tests/ssml.test.ts`

- [ ] **Step 1: Write failing tests for SSML builder**

Create `tests/ssml.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { buildSsml } from '../src/utils/ssml';
import { TtsConfig, DEFAULT_CONFIG } from '../src/types';

describe('buildSsml', () => {
  it('builds minimal SSML with just voice and text', () => {
    const config: TtsConfig = {
      ...DEFAULT_CONFIG,
      voiceName: 'en-US-JennyNeural',
      language: 'en-US',
      text: 'Hello world',
    };
    const ssml = buildSsml(config);
    expect(ssml).toContain('<speak version="1.0"');
    expect(ssml).toContain('xml:lang="en-US"');
    expect(ssml).toContain('<voice name="en-US-JennyNeural">');
    expect(ssml).toContain('Hello world');
    expect(ssml).toContain('</voice>');
    expect(ssml).toContain('</speak>');
  });

  it('includes prosody when rate differs from default', () => {
    const config: TtsConfig = {
      ...DEFAULT_CONFIG,
      voiceName: 'en-US-JennyNeural',
      language: 'en-US',
      text: 'Fast speech',
      rate: 'fast',
    };
    const ssml = buildSsml(config);
    expect(ssml).toContain('<prosody');
    expect(ssml).toContain('rate="fast"');
  });

  it('includes all prosody attributes when all differ from default', () => {
    const config: TtsConfig = {
      ...DEFAULT_CONFIG,
      voiceName: 'en-US-JennyNeural',
      language: 'en-US',
      text: 'Test',
      rate: 'fast',
      pitch: 'high',
      volume: 'loud',
    };
    const ssml = buildSsml(config);
    expect(ssml).toContain('rate="fast"');
    expect(ssml).toContain('pitch="high"');
    expect(ssml).toContain('volume="loud"');
  });

  it('includes emphasis when set', () => {
    const config: TtsConfig = {
      ...DEFAULT_CONFIG,
      voiceName: 'en-US-JennyNeural',
      language: 'en-US',
      text: 'Important',
      emphasis: 'strong',
    };
    const ssml = buildSsml(config);
    expect(ssml).toContain('<emphasis level="strong">');
  });

  it('includes express-as when style is set', () => {
    const config: TtsConfig = {
      ...DEFAULT_CONFIG,
      voiceName: 'en-US-JennyNeural',
      language: 'en-US',
      text: 'Happy text',
      style: 'cheerful',
      styleDegree: 1.5,
    };
    const ssml = buildSsml(config);
    expect(ssml).toContain('xmlns:mstts=');
    expect(ssml).toContain('<mstts:express-as style="cheerful" styledegree="1.5">');
  });

  it('includes role in express-as when set', () => {
    const config: TtsConfig = {
      ...DEFAULT_CONFIG,
      voiceName: 'en-US-JennyNeural',
      language: 'en-US',
      text: 'News',
      style: 'cheerful',
      styleDegree: 1.0,
      role: 'narrator',
    };
    const ssml = buildSsml(config);
    expect(ssml).toContain('role="narrator"');
  });

  it('includes break when breakValue is set with strength', () => {
    const config: TtsConfig = {
      ...DEFAULT_CONFIG,
      voiceName: 'en-US-JennyNeural',
      language: 'en-US',
      text: 'After pause',
      breakType: 'strength',
      breakValue: 'strong',
    };
    const ssml = buildSsml(config);
    expect(ssml).toContain('<break strength="strong"/>');
  });

  it('includes break when breakValue is set with duration', () => {
    const config: TtsConfig = {
      ...DEFAULT_CONFIG,
      voiceName: 'en-US-JennyNeural',
      language: 'en-US',
      text: 'After pause',
      breakType: 'duration',
      breakValue: '500ms',
    };
    const ssml = buildSsml(config);
    expect(ssml).toContain('<break time="500ms"/>');
  });

  it('omits prosody element when all values are default', () => {
    const config: TtsConfig = {
      ...DEFAULT_CONFIG,
      voiceName: 'en-US-JennyNeural',
      language: 'en-US',
      text: 'Plain text',
    };
    const ssml = buildSsml(config);
    expect(ssml).not.toContain('<prosody');
  });

  it('omits express-as when no style or role set', () => {
    const config: TtsConfig = {
      ...DEFAULT_CONFIG,
      voiceName: 'en-US-JennyNeural',
      language: 'en-US',
      text: 'Plain text',
    };
    const ssml = buildSsml(config);
    expect(ssml).not.toContain('express-as');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/ssml.test.ts
```

Expected: FAIL — `buildSsml` is not found.

- [ ] **Step 3: Implement SSML builder**

Create `src/utils/ssml.ts`:

```ts
import { TtsConfig } from '../types';

export function buildSsml(config: TtsConfig): string {
  const hasStyle = config.style !== '';
  const hasRole = config.role !== '';
  const hasExpressAs = hasStyle || hasRole;
  const hasProsody =
    config.rate !== 'medium' ||
    config.pitch !== 'medium' ||
    config.volume !== 'medium';
  const hasEmphasis = config.emphasis !== '' && config.emphasis !== 'none';
  const hasBreak = config.breakValue !== '';

  const msttsNs = hasExpressAs ? ' xmlns:mstts="https://www.w3.org/2001/mstts"' : '';

  let innerContent = config.text;

  // Wrap with emphasis if set
  if (hasEmphasis) {
    innerContent = `<emphasis level="${config.emphasis}">${innerContent}</emphasis>`;
  }

  // Prepend break if set
  if (hasBreak) {
    if (config.breakType === 'duration') {
      innerContent = `<break time="${config.breakValue}"/>${innerContent}`;
    } else {
      innerContent = `<break strength="${config.breakValue}"/>${innerContent}`;
    }
  }

  // Wrap with prosody if any prosody values differ from default
  if (hasProsody) {
    const attrs: string[] = [];
    if (config.rate !== 'medium') attrs.push(`rate="${config.rate}"`);
    if (config.pitch !== 'medium') attrs.push(`pitch="${config.pitch}"`);
    if (config.volume !== 'medium') attrs.push(`volume="${config.volume}"`);
    innerContent = `<prosody ${attrs.join(' ')}>${innerContent}</prosody>`;
  }

  // Wrap with express-as if style or role is set
  if (hasExpressAs) {
    const attrs: string[] = [];
    if (hasStyle) {
      attrs.push(`style="${config.style}"`);
      attrs.push(`styledegree="${config.styleDegree}"`);
    }
    if (hasRole) {
      attrs.push(`role="${config.role}"`);
    }
    innerContent = `<mstts:express-as ${attrs.join(' ')}>${innerContent}</mstts:express-as>`;
  }

  return `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis"${msttsNs} xml:lang="${config.language}"><voice name="${config.voiceName}">${innerContent}</voice></speak>`;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/ssml.test.ts
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/utils/ssml.ts tests/ssml.test.ts
git commit -m "feat: add SSML builder utility with tests"
```

---

### Task 4: Code Generator Utility

**Files:**
- Create: `src/utils/code-generator.ts`
- Create: `tests/code-generator.test.ts`

- [ ] **Step 1: Write failing tests for code generator**

Create `tests/code-generator.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { generatePythonCode, generateNodeCode } from '../src/utils/code-generator';
import { TtsConfig, DEFAULT_CONFIG } from '../src/types';

const sampleConfig: TtsConfig = {
  ...DEFAULT_CONFIG,
  voiceName: 'en-US-JennyNeural',
  voiceDisplayName: 'Jenny',
  language: 'en-US',
  text: 'Hello world',
  rate: 'fast',
  pitch: 'high',
  volume: 'loud',
  style: 'cheerful',
  styleDegree: 1.5,
};

describe('generatePythonCode', () => {
  it('includes language and voice name', () => {
    const code = generatePythonCode(sampleConfig);
    expect(code).toContain('en-US-JennyNeural');
    expect(code).toContain('en-US');
  });

  it('includes azure.cognitiveservices.speech import', () => {
    const code = generatePythonCode(sampleConfig);
    expect(code).toContain('import azure.cognitiveservices.speech as speechsdk');
  });

  it('includes SSML with config params', () => {
    const code = generatePythonCode(sampleConfig);
    expect(code).toContain('rate="fast"');
    expect(code).toContain('pitch="high"');
    expect(code).toContain('style="cheerful"');
  });

  it('generates minimal code when config is default', () => {
    const minimal: TtsConfig = {
      ...DEFAULT_CONFIG,
      voiceName: 'en-US-GuyNeural',
      voiceDisplayName: 'Guy',
      language: 'en-US',
      text: 'Test',
    };
    const code = generatePythonCode(minimal);
    expect(code).toContain('en-US-GuyNeural');
    expect(code).not.toContain('prosody');
  });
});

describe('generateNodeCode', () => {
  it('includes language and voice name', () => {
    const code = generateNodeCode(sampleConfig);
    expect(code).toContain('en-US-JennyNeural');
    expect(code).toContain('en-US');
  });

  it('includes microsoft-cognitiveservices-speech-sdk require', () => {
    const code = generateNodeCode(sampleConfig);
    expect(code).toContain('microsoft-cognitiveservices-speech-sdk');
  });

  it('includes SSML with config params', () => {
    const code = generateNodeCode(sampleConfig);
    expect(code).toContain('rate="fast"');
    expect(code).toContain('style="cheerful"');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/code-generator.test.ts
```

Expected: FAIL — functions not found.

- [ ] **Step 3: Implement code generators**

Create `src/utils/code-generator.ts`:

```ts
import { TtsConfig } from '../types';
import { buildSsml } from './ssml';

export function generatePythonCode(config: TtsConfig): string {
  const ssml = buildSsml(config);
  const escapedSsml = ssml.replace(/"/g, '\\"');

  return `import azure.cognitiveservices.speech as speechsdk

# Azure Speech Service configuration
speech_config = speechsdk.SpeechConfig(
    subscription="YOUR_SUBSCRIPTION_KEY",
    region="YOUR_REGION"
)

# Voice: ${config.voiceDisplayName} (${config.language})
speech_config.speech_synthesis_voice_name = "${config.voiceName}"

# SSML with all parameters
ssml = "${escapedSsml}"

# Synthesize speech
synthesizer = speechsdk.SpeechSynthesizer(speech_config=speech_config)
result = synthesizer.speak_ssml_async(ssml).get()

if result.reason == speechsdk.ResultReason.SynthesizingAudioCompleted:
    print("Speech synthesized successfully.")
elif result.reason == speechsdk.ResultReason.Canceled:
    cancellation = result.cancellation_details
    print(f"Speech synthesis canceled: {cancellation.reason}")
    if cancellation.error_details:
        print(f"Error details: {cancellation.error_details}")
`;
}

export function generateNodeCode(config: TtsConfig): string {
  const ssml = buildSsml(config);
  const escapedSsml = ssml.replace(/`/g, '\\`').replace(/\$/g, '\\$');

  return `const sdk = require("microsoft-cognitiveservices-speech-sdk");

// Azure Speech Service configuration
const speechConfig = sdk.SpeechConfig.fromSubscription(
  "YOUR_SUBSCRIPTION_KEY",
  "YOUR_REGION"
);

// Voice: ${config.voiceDisplayName} (${config.language})
speechConfig.speechSynthesisVoiceName = "${config.voiceName}";

// SSML with all parameters
const ssml = \`${escapedSsml}\`;

// Synthesize speech
const synthesizer = new sdk.SpeechSynthesizer(speechConfig);
synthesizer.speakSsmlAsync(
  ssml,
  (result) => {
    if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
      console.log("Speech synthesized successfully.");
    } else {
      console.error("Speech synthesis canceled:", result.errorDetails);
    }
    synthesizer.close();
  },
  (err) => {
    console.error("Error:", err);
    synthesizer.close();
  }
);
`;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/code-generator.test.ts
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/utils/code-generator.ts tests/code-generator.test.ts
git commit -m "feat: add Python and Node.js SDK code generators with tests"
```

---

### Task 5: Azure TTS Client Utility

**Files:**
- Create: `src/utils/azure-tts.ts`
- Create: `src/utils/storage.ts`

- [ ] **Step 1: Create localStorage helper**

Create `src/utils/storage.ts`:

```ts
const AZURE_KEY_STORAGE = 'azure-tts-key';
const AZURE_REGION_STORAGE = 'azure-tts-region';

export function getStoredKey(): string {
  return localStorage.getItem(AZURE_KEY_STORAGE) || '';
}

export function setStoredKey(key: string): void {
  localStorage.setItem(AZURE_KEY_STORAGE, key);
}

export function getStoredRegion(): string {
  return localStorage.getItem(AZURE_REGION_STORAGE) || '';
}

export function setStoredRegion(region: string): void {
  localStorage.setItem(AZURE_REGION_STORAGE, region);
}
```

- [ ] **Step 2: Create Azure TTS API client**

Create `src/utils/azure-tts.ts`:

```ts
import { AzureVoice } from '../types';

export async function fetchVoices(key: string, region: string): Promise<AzureVoice[]> {
  const url = `https://${region}.tts.speech.microsoft.com/cognitiveservices/voices/list`;
  const response = await fetch(url, {
    headers: {
      'Ocp-Apim-Subscription-Key': key,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch voices: ${response.status} - ${errorText}`);
  }

  return response.json();
}

export async function synthesizeSpeech(
  key: string,
  region: string,
  ssml: string
): Promise<ArrayBuffer> {
  const url = `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': key,
      'Content-Type': 'application/ssml+xml',
      'X-Microsoft-OutputFormat': 'audio-16khz-128kbitrate-mono-mp3',
    },
    body: ssml,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Synthesis failed: ${response.status} - ${errorText}`);
  }

  return response.arrayBuffer();
}
```

- [ ] **Step 3: Commit**

```bash
git add src/utils/azure-tts.ts src/utils/storage.ts
git commit -m "feat: add Azure TTS API client and localStorage helpers"
```

---

### Task 6: Backend — SQLite Database

**Files:**
- Create: `server/db.ts`

- [ ] **Step 1: Create database module**

Create `server/db.ts`:

```ts
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = path.join(process.cwd(), 'tts-recordings.db');
const AUDIO_DIR = path.join(process.cwd(), 'audio');

// Ensure audio directory exists
if (!fs.existsSync(AUDIO_DIR)) {
  fs.mkdirSync(AUDIO_DIR, { recursive: true });
}

const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL');

// Create recordings table
db.exec(`
  CREATE TABLE IF NOT EXISTS recordings (
    id TEXT PRIMARY KEY,
    voice_name TEXT NOT NULL,
    voice_display_name TEXT NOT NULL,
    language TEXT NOT NULL,
    text TEXT NOT NULL,
    rate TEXT NOT NULL DEFAULT 'medium',
    pitch TEXT NOT NULL DEFAULT 'medium',
    volume TEXT NOT NULL DEFAULT 'medium',
    emphasis TEXT,
    style TEXT,
    style_degree REAL,
    role TEXT,
    break_config TEXT,
    ssml TEXT NOT NULL,
    audio_filename TEXT NOT NULL,
    output_format TEXT NOT NULL DEFAULT 'audio-16khz-128kbitrate-mono-mp3',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    label TEXT
  )
`);

export interface RecordingRow {
  id: string;
  voice_name: string;
  voice_display_name: string;
  language: string;
  text: string;
  rate: string;
  pitch: string;
  volume: string;
  emphasis: string | null;
  style: string | null;
  style_degree: number | null;
  role: string | null;
  break_config: string | null;
  ssml: string;
  audio_filename: string;
  output_format: string;
  created_at: string;
  label: string | null;
}

const insertStmt = db.prepare(`
  INSERT INTO recordings (id, voice_name, voice_display_name, language, text, rate, pitch, volume,
    emphasis, style, style_degree, role, break_config, ssml, audio_filename, output_format, label)
  VALUES (@id, @voice_name, @voice_display_name, @language, @text, @rate, @pitch, @volume,
    @emphasis, @style, @style_degree, @role, @break_config, @ssml, @audio_filename, @output_format, @label)
`);

const listStmt = db.prepare(
  'SELECT * FROM recordings ORDER BY created_at DESC'
);

const getStmt = db.prepare('SELECT * FROM recordings WHERE id = ?');

const deleteStmt = db.prepare('DELETE FROM recordings WHERE id = ?');

const updateLabelStmt = db.prepare(
  'UPDATE recordings SET label = @label WHERE id = @id'
);

export function insertRecording(row: Omit<RecordingRow, 'created_at'>): RecordingRow {
  insertStmt.run(row);
  return getStmt.get(row.id) as RecordingRow;
}

export function listRecordings(): RecordingRow[] {
  return listStmt.all() as RecordingRow[];
}

export function getRecording(id: string): RecordingRow | undefined {
  return getStmt.get(id) as RecordingRow | undefined;
}

export function deleteRecording(id: string): boolean {
  const result = deleteStmt.run(id);
  return result.changes > 0;
}

export function updateRecordingLabel(id: string, label: string): RecordingRow | undefined {
  updateLabelStmt.run({ id, label });
  return getStmt.get(id) as RecordingRow | undefined;
}

export { AUDIO_DIR };
export default db;
```

- [ ] **Step 2: Commit**

```bash
git add server/db.ts
git commit -m "feat: add SQLite database setup with recordings CRUD"
```

---

### Task 7: Backend — Express Server & Routes

**Files:**
- Create: `server/routes.ts`
- Create: `server/index.ts`

- [ ] **Step 1: Create recordings routes**

Create `server/routes.ts`:

```ts
import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import {
  insertRecording,
  listRecordings,
  getRecording,
  deleteRecording,
  updateRecordingLabel,
  AUDIO_DIR,
} from './db';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// POST /api/recordings — Save recording
router.post('/recordings', upload.single('audio'), (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No audio file provided' });
      return;
    }

    const config = JSON.parse(req.body.config);
    const id = uuidv4();
    const audioFilename = `${id}.mp3`;
    const audioPath = path.join(AUDIO_DIR, audioFilename);

    // Save audio file to disk
    fs.writeFileSync(audioPath, req.file.buffer);

    const row = insertRecording({
      id,
      voice_name: config.voice_name,
      voice_display_name: config.voice_display_name,
      language: config.language,
      text: config.text,
      rate: config.rate,
      pitch: config.pitch,
      volume: config.volume,
      emphasis: config.emphasis || null,
      style: config.style || null,
      style_degree: config.style_degree ?? null,
      role: config.role || null,
      break_config: config.break_config || null,
      ssml: config.ssml,
      audio_filename: audioFilename,
      output_format: config.output_format || 'audio-16khz-128kbitrate-mono-mp3',
      label: config.label || null,
    });

    res.status(201).json(row);
  } catch (err) {
    console.error('Error saving recording:', err);
    res.status(500).json({ error: 'Failed to save recording' });
  }
});

// GET /api/recordings — List all recordings
router.get('/recordings', (_req: Request, res: Response) => {
  const recordings = listRecordings();
  res.json(recordings);
});

// GET /api/recordings/:id — Get single recording
router.get('/recordings/:id', (req: Request, res: Response) => {
  const recording = getRecording(req.params.id);
  if (!recording) {
    res.status(404).json({ error: 'Recording not found' });
    return;
  }
  res.json(recording);
});

// GET /api/recordings/:id/audio — Stream audio file
router.get('/recordings/:id/audio', (req: Request, res: Response) => {
  const recording = getRecording(req.params.id);
  if (!recording) {
    res.status(404).json({ error: 'Recording not found' });
    return;
  }

  const audioPath = path.join(AUDIO_DIR, recording.audio_filename);
  if (!fs.existsSync(audioPath)) {
    res.status(404).json({ error: 'Audio file not found' });
    return;
  }

  res.setHeader('Content-Type', 'audio/mpeg');
  fs.createReadStream(audioPath).pipe(res);
});

// DELETE /api/recordings/:id — Delete recording
router.delete('/recordings/:id', (req: Request, res: Response) => {
  const recording = getRecording(req.params.id);
  if (!recording) {
    res.status(404).json({ error: 'Recording not found' });
    return;
  }

  // Delete audio file
  const audioPath = path.join(AUDIO_DIR, recording.audio_filename);
  if (fs.existsSync(audioPath)) {
    fs.unlinkSync(audioPath);
  }

  deleteRecording(req.params.id);
  res.status(204).send();
});

// PATCH /api/recordings/:id — Update label
router.patch('/recordings/:id', (req: Request, res: Response) => {
  const { label } = req.body;
  const updated = updateRecordingLabel(req.params.id, label);
  if (!updated) {
    res.status(404).json({ error: 'Recording not found' });
    return;
  }
  res.json(updated);
});

export default router;
```

- [ ] **Step 2: Create Express server entry**

Create `server/index.ts`:

```ts
import express from 'express';
import cors from 'cors';
import recordingsRouter from './routes';

const app = express();
const PORT = 7740;

app.use(cors());
app.use(express.json());
app.use('/api', recordingsRouter);

app.listen(PORT, () => {
  console.log(`Azure TTS Config backend running on http://localhost:${PORT}`);
});
```

- [ ] **Step 3: Verify backend starts**

```bash
npx tsx server/index.ts
```

Expected: Console shows "Azure TTS Config backend running on http://localhost:7740". Stop after verifying.

- [ ] **Step 4: Verify dev script starts both**

```bash
npm run dev
```

Expected: Both backend (port 7740) and frontend (port 7742) start. Stop after verifying.

- [ ] **Step 5: Commit**

```bash
git add server/routes.ts server/index.ts
git commit -m "feat: add Express backend with recordings CRUD routes"
```

---

### Task 8: React Hooks

**Files:**
- Create: `src/hooks/useAzureSettings.ts`
- Create: `src/hooks/useVoices.ts`
- Create: `src/hooks/useRecordings.ts`

- [ ] **Step 1: Create useAzureSettings hook**

Create `src/hooks/useAzureSettings.ts`:

```ts
import { useState, useEffect } from 'react';
import { getStoredKey, setStoredKey, getStoredRegion, setStoredRegion } from '../utils/storage';

export function useAzureSettings() {
  const [key, setKey] = useState(getStoredKey);
  const [region, setRegion] = useState(getStoredRegion);

  useEffect(() => {
    setStoredKey(key);
  }, [key]);

  useEffect(() => {
    setStoredRegion(region);
  }, [region]);

  const isConfigured = key.length > 0 && region.length > 0;

  return { key, setKey, region, setRegion, isConfigured };
}
```

- [ ] **Step 2: Create useVoices hook**

Create `src/hooks/useVoices.ts`:

```ts
import { useState, useEffect, useMemo } from 'react';
import { AzureVoice } from '../types';
import { fetchVoices } from '../utils/azure-tts';

export function useVoices(key: string, region: string) {
  const [voices, setVoices] = useState<AzureVoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [languageFilter, setLanguageFilter] = useState('');

  const loadVoices = async () => {
    if (!key || !region) return;
    setLoading(true);
    setError(null);
    try {
      const result = await fetchVoices(key, region);
      setVoices(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch voices');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (key && region) {
      loadVoices();
    }
  }, [key, region]);

  const languages = useMemo(() => {
    const locales = new Set(voices.map((v) => v.Locale));
    return Array.from(locales).sort();
  }, [voices]);

  const filteredVoices = useMemo(() => {
    return voices.filter((voice) => {
      const matchesLanguage = !languageFilter || voice.Locale === languageFilter;
      const matchesSearch =
        !searchQuery ||
        voice.DisplayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        voice.ShortName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        voice.LocaleName.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesLanguage && matchesSearch;
    });
  }, [voices, languageFilter, searchQuery]);

  return {
    voices: filteredVoices,
    allVoices: voices,
    languages,
    loading,
    error,
    searchQuery,
    setSearchQuery,
    languageFilter,
    setLanguageFilter,
    retry: loadVoices,
  };
}
```

- [ ] **Step 3: Create useRecordings hook**

Create `src/hooks/useRecordings.ts`:

```ts
import { useState, useEffect, useCallback } from 'react';
import { Recording } from '../types';

export function useRecordings() {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRecordings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/recordings');
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

  const saveRecording = async (audioBlob: Blob, config: Record<string, unknown>) => {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.mp3');
    formData.append('config', JSON.stringify(config));

    const res = await fetch('/api/recordings', {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) throw new Error('Failed to save recording');
    const saved = await res.json();
    setRecordings((prev) => [saved, ...prev]);
    return saved;
  };

  const deleteRecording = async (id: string) => {
    const res = await fetch(`/api/recordings/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete recording');
    setRecordings((prev) => prev.filter((r) => r.id !== id));
  };

  const updateLabel = async (id: string, label: string) => {
    const res = await fetch(`/api/recordings/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label }),
    });
    if (!res.ok) throw new Error('Failed to update label');
    const updated = await res.json();
    setRecordings((prev) => prev.map((r) => (r.id === id ? updated : r)));
  };

  return { recordings, loading, error, saveRecording, deleteRecording, updateLabel, refresh: fetchRecordings };
}
```

- [ ] **Step 4: Commit**

```bash
git add src/hooks/
git commit -m "feat: add React hooks for Azure settings, voices, and recordings"
```

---

### Task 9: Configuration Components (Left Panel)

**Files:**
- Create: `src/components/AzureSettings.tsx`
- Create: `src/components/VoiceSelector.tsx`
- Create: `src/components/ProsodyControls.tsx`
- Create: `src/components/EmphasisControl.tsx`
- Create: `src/components/StyleRoleControls.tsx`
- Create: `src/components/BreakControl.tsx`
- Create: `src/components/TextInput.tsx`

- [ ] **Step 1: Create AzureSettings component**

Create `src/components/AzureSettings.tsx`:

```tsx
interface AzureSettingsProps {
  apiKey: string;
  region: string;
  onKeyChange: (key: string) => void;
  onRegionChange: (region: string) => void;
}

const REGIONS = [
  'eastus', 'eastus2', 'westus', 'westus2', 'westus3',
  'centralus', 'northcentralus', 'southcentralus',
  'westeurope', 'northeurope', 'uksouth',
  'southeastasia', 'eastasia', 'japaneast', 'japanwest',
  'australiaeast', 'canadacentral', 'brazilsouth',
  'koreacentral', 'centralindia', 'francecentral',
];

export function AzureSettings({ apiKey, region, onKeyChange, onRegionChange }: AzureSettingsProps) {
  return (
    <div className="space-y-3 p-4 bg-white rounded-lg shadow-sm border">
      <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Azure Settings</h2>
      <div>
        <label className="block text-sm font-medium text-gray-600 mb-1">API Key</label>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => onKeyChange(e.target.value)}
          placeholder="Enter your Azure Speech API key"
          className="w-full px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-600 mb-1">Region</label>
        <select
          value={region}
          onChange={(e) => onRegionChange(e.target.value)}
          className="w-full px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">Select a region...</option>
          {REGIONS.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create VoiceSelector component**

Create `src/components/VoiceSelector.tsx`:

```tsx
import { AzureVoice } from '../types';

interface VoiceSelectorProps {
  voices: AzureVoice[];
  languages: string[];
  selectedVoice: string;
  searchQuery: string;
  languageFilter: string;
  loading: boolean;
  error: string | null;
  onVoiceChange: (voice: AzureVoice | null) => void;
  onSearchChange: (query: string) => void;
  onLanguageChange: (language: string) => void;
  onRetry: () => void;
}

export function VoiceSelector({
  voices,
  languages,
  selectedVoice,
  searchQuery,
  languageFilter,
  loading,
  error,
  onVoiceChange,
  onSearchChange,
  onLanguageChange,
  onRetry,
}: VoiceSelectorProps) {
  return (
    <div className="space-y-3 p-4 bg-white rounded-lg shadow-sm border">
      <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Voice</h2>

      {error && (
        <div className="flex items-center gap-2 text-red-600 text-sm">
          <span>{error}</span>
          <button onClick={onRetry} className="underline hover:no-underline">Retry</button>
        </div>
      )}

      <div className="flex gap-2">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search voices..."
          className="flex-1 px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={languageFilter}
          onChange={(e) => onLanguageChange(e.target.value)}
          className="px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All languages</option>
          {languages.map((lang) => (
            <option key={lang} value={lang}>{lang}</option>
          ))}
        </select>
      </div>

      <select
        value={selectedVoice}
        onChange={(e) => {
          const voice = voices.find((v) => v.ShortName === e.target.value) || null;
          onVoiceChange(voice);
        }}
        disabled={loading || voices.length === 0}
        className="w-full px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-blue-500"
        size={8}
      >
        {loading && <option>Loading voices...</option>}
        {!loading && voices.length === 0 && <option>No voices available</option>}
        {voices.map((voice) => (
          <option key={voice.ShortName} value={voice.ShortName}>
            {voice.DisplayName} ({voice.Locale}) - {voice.Gender}
          </option>
        ))}
      </select>

      <p className="text-xs text-gray-500">
        {voices.length} voice{voices.length !== 1 ? 's' : ''} available
      </p>
    </div>
  );
}
```

- [ ] **Step 3: Create ProsodyControls component**

Create `src/components/ProsodyControls.tsx`:

```tsx
interface ProsodyControlsProps {
  rate: string;
  pitch: string;
  volume: string;
  onRateChange: (rate: string) => void;
  onPitchChange: (pitch: string) => void;
  onVolumeChange: (volume: string) => void;
}

const RATE_OPTIONS = ['x-slow', 'slow', 'medium', 'fast', 'x-fast'];
const PITCH_OPTIONS = ['x-low', 'low', 'medium', 'high', 'x-high'];
const VOLUME_OPTIONS = ['silent', 'x-soft', 'soft', 'medium', 'loud', 'x-loud'];

export function ProsodyControls({
  rate, pitch, volume,
  onRateChange, onPitchChange, onVolumeChange,
}: ProsodyControlsProps) {
  return (
    <div className="space-y-3 p-4 bg-white rounded-lg shadow-sm border">
      <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Prosody</h2>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">Rate</label>
          <select
            value={rate}
            onChange={(e) => onRateChange(e.target.value)}
            className="w-full px-2 py-1.5 border rounded-md text-sm"
          >
            {RATE_OPTIONS.map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">Pitch</label>
          <select
            value={pitch}
            onChange={(e) => onPitchChange(e.target.value)}
            className="w-full px-2 py-1.5 border rounded-md text-sm"
          >
            {PITCH_OPTIONS.map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">Volume</label>
          <select
            value={volume}
            onChange={(e) => onVolumeChange(e.target.value)}
            className="w-full px-2 py-1.5 border rounded-md text-sm"
          >
            {VOLUME_OPTIONS.map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create EmphasisControl component**

Create `src/components/EmphasisControl.tsx`:

```tsx
interface EmphasisControlProps {
  emphasis: string;
  onChange: (emphasis: string) => void;
}

const EMPHASIS_OPTIONS = ['', 'none', 'reduced', 'moderate', 'strong'];

export function EmphasisControl({ emphasis, onChange }: EmphasisControlProps) {
  return (
    <div className="space-y-2 p-4 bg-white rounded-lg shadow-sm border">
      <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Emphasis</h2>
      <select
        value={emphasis}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border rounded-md text-sm"
      >
        <option value="">Default (none)</option>
        {EMPHASIS_OPTIONS.filter(Boolean).map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </div>
  );
}
```

- [ ] **Step 5: Create StyleRoleControls component**

Create `src/components/StyleRoleControls.tsx`:

```tsx
interface StyleRoleControlsProps {
  styles: string[];
  roles: string[];
  style: string;
  styleDegree: number;
  role: string;
  onStyleChange: (style: string) => void;
  onStyleDegreeChange: (degree: number) => void;
  onRoleChange: (role: string) => void;
}

export function StyleRoleControls({
  styles, roles, style, styleDegree, role,
  onStyleChange, onStyleDegreeChange, onRoleChange,
}: StyleRoleControlsProps) {
  if (styles.length === 0 && roles.length === 0) return null;

  return (
    <div className="space-y-3 p-4 bg-white rounded-lg shadow-sm border">
      <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Style & Role</h2>

      {styles.length > 0 && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Style</label>
            <select
              value={style}
              onChange={(e) => onStyleChange(e.target.value)}
              className="w-full px-3 py-2 border rounded-md text-sm"
            >
              <option value="">Default</option>
              {styles.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {style && (
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Style Degree: {styleDegree.toFixed(2)}
              </label>
              <input
                type="range"
                min="0.01"
                max="2"
                step="0.01"
                value={styleDegree}
                onChange={(e) => onStyleDegreeChange(parseFloat(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-400">
                <span>0.01</span>
                <span>1.0</span>
                <span>2.0</span>
              </div>
            </div>
          )}
        </>
      )}

      {roles.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">Role</label>
          <select
            value={role}
            onChange={(e) => onRoleChange(e.target.value)}
            className="w-full px-3 py-2 border rounded-md text-sm"
          >
            <option value="">Default</option>
            {roles.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 6: Create BreakControl component**

Create `src/components/BreakControl.tsx`:

```tsx
interface BreakControlProps {
  breakType: 'duration' | 'strength';
  breakValue: string;
  onBreakTypeChange: (type: 'duration' | 'strength') => void;
  onBreakValueChange: (value: string) => void;
}

const STRENGTH_OPTIONS = ['', 'none', 'x-weak', 'weak', 'medium', 'strong', 'x-strong'];

export function BreakControl({ breakType, breakValue, onBreakTypeChange, onBreakValueChange }: BreakControlProps) {
  return (
    <div className="space-y-3 p-4 bg-white rounded-lg shadow-sm border">
      <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Break (Pause)</h2>

      <div className="flex gap-3">
        <label className="flex items-center gap-1 text-sm">
          <input
            type="radio"
            checked={breakType === 'strength'}
            onChange={() => { onBreakTypeChange('strength'); onBreakValueChange(''); }}
          />
          Strength
        </label>
        <label className="flex items-center gap-1 text-sm">
          <input
            type="radio"
            checked={breakType === 'duration'}
            onChange={() => { onBreakTypeChange('duration'); onBreakValueChange(''); }}
          />
          Duration (ms)
        </label>
      </div>

      {breakType === 'strength' ? (
        <select
          value={breakValue}
          onChange={(e) => onBreakValueChange(e.target.value)}
          className="w-full px-3 py-2 border rounded-md text-sm"
        >
          <option value="">No break</option>
          {STRENGTH_OPTIONS.filter(Boolean).map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      ) : (
        <input
          type="number"
          value={breakValue.replace('ms', '')}
          onChange={(e) => onBreakValueChange(e.target.value ? `${e.target.value}ms` : '')}
          placeholder="e.g. 500"
          min="0"
          max="5000"
          className="w-full px-3 py-2 border rounded-md text-sm"
        />
      )}
    </div>
  );
}
```

- [ ] **Step 7: Create TextInput component**

Create `src/components/TextInput.tsx`:

```tsx
interface TextInputProps {
  text: string;
  onChange: (text: string) => void;
}

export function TextInput({ text, onChange }: TextInputProps) {
  return (
    <div className="space-y-2 p-4 bg-white rounded-lg shadow-sm border">
      <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Text</h2>
      <textarea
        value={text}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Enter text to synthesize..."
        rows={4}
        className="w-full px-3 py-2 border rounded-md text-sm resize-y focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );
}
```

- [ ] **Step 8: Commit**

```bash
git add src/components/AzureSettings.tsx src/components/VoiceSelector.tsx src/components/ProsodyControls.tsx src/components/EmphasisControl.tsx src/components/StyleRoleControls.tsx src/components/BreakControl.tsx src/components/TextInput.tsx
git commit -m "feat: add configuration components (settings, voice, prosody, emphasis, style, break, text)"
```

---

### Task 10: Action Buttons & Show Code Modal

**Files:**
- Create: `src/components/ActionButtons.tsx`
- Create: `src/components/ShowCodeModal.tsx`

- [ ] **Step 1: Create ActionButtons component**

Create `src/components/ActionButtons.tsx`:

```tsx
interface ActionButtonsProps {
  canSynthesize: boolean;
  canSave: boolean;
  isSynthesizing: boolean;
  onSynthesize: () => void;
  onSave: () => void;
  onShowCode: () => void;
}

export function ActionButtons({
  canSynthesize, canSave, isSynthesizing,
  onSynthesize, onSave, onShowCode,
}: ActionButtonsProps) {
  return (
    <div className="flex gap-2 p-4">
      <button
        onClick={onSynthesize}
        disabled={!canSynthesize || isSynthesizing}
        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
      >
        {isSynthesizing ? 'Synthesizing...' : 'Synthesize & Play'}
      </button>
      <button
        onClick={onSave}
        disabled={!canSave}
        className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
      >
        Save
      </button>
      <button
        onClick={onShowCode}
        className="px-4 py-2 bg-gray-600 text-white rounded-md text-sm font-medium hover:bg-gray-700 transition-colors"
      >
        Show Code
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Create ShowCodeModal component**

Create `src/components/ShowCodeModal.tsx`:

```tsx
import { useState } from 'react';
import { TtsConfig } from '../types';
import { generatePythonCode, generateNodeCode } from '../utils/code-generator';
import { buildSsml } from '../utils/ssml';

interface ShowCodeModalProps {
  config: TtsConfig;
  onClose: () => void;
}

type Tab = 'python' | 'nodejs' | 'ssml';

export function ShowCodeModal({ config, onClose }: ShowCodeModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>('python');
  const [copied, setCopied] = useState(false);

  const codeMap: Record<Tab, string> = {
    python: generatePythonCode(config),
    nodejs: generateNodeCode(config),
    ssml: buildSsml(config),
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(codeMap[activeTab]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: 'python', label: 'Python SDK' },
    { key: 'nodejs', label: 'Node.js SDK' },
    { key: 'ssml', label: 'SSML' },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Generated Code</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-xl">&times;</button>
        </div>

        <div className="flex border-b">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-auto p-4">
          <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-sm overflow-x-auto whitespace-pre-wrap">
            <code>{codeMap[activeTab]}</code>
          </pre>
        </div>

        <div className="flex justify-end p-4 border-t">
          <button
            onClick={handleCopy}
            className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            {copied ? 'Copied!' : 'Copy to Clipboard'}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/ActionButtons.tsx src/components/ShowCodeModal.tsx
git commit -m "feat: add action buttons and show code modal with Python/Node/SSML tabs"
```

---

### Task 11: Recordings List Component (Right Panel)

**Files:**
- Create: `src/components/RecordingsList.tsx`

- [ ] **Step 1: Create RecordingsList component**

Create `src/components/RecordingsList.tsx`:

```tsx
import { Recording } from '../types';

interface RecordingsListProps {
  recordings: Recording[];
  loading: boolean;
  error: string | null;
  onPlay: (id: string) => void;
  onDelete: (id: string) => void;
}

export function RecordingsList({ recordings, loading, error, onPlay, onDelete }: RecordingsListProps) {
  return (
    <div className="h-full flex flex-col">
      <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide p-4 pb-2">
        Saved Recordings ({recordings.length})
      </h2>

      {error && (
        <div className="mx-4 p-2 bg-red-50 text-red-600 rounded text-sm">{error}</div>
      )}

      {loading && (
        <div className="p-4 text-gray-500 text-sm">Loading recordings...</div>
      )}

      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
        {recordings.length === 0 && !loading && (
          <p className="text-gray-400 text-sm italic">No saved recordings yet.</p>
        )}

        {recordings.map((rec) => (
          <div key={rec.id} className="p-3 bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">
                  {rec.voice_display_name}
                  <span className="text-gray-400 font-normal ml-1">({rec.language})</span>
                </p>
                <p className="text-xs text-gray-500 truncate mt-0.5">{rec.text}</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {rec.rate !== 'medium' && <Tag label={`rate: ${rec.rate}`} />}
                  {rec.pitch !== 'medium' && <Tag label={`pitch: ${rec.pitch}`} />}
                  {rec.volume !== 'medium' && <Tag label={`vol: ${rec.volume}`} />}
                  {rec.style && <Tag label={rec.style} />}
                  {rec.emphasis && <Tag label={`emphasis: ${rec.emphasis}`} />}
                </div>
                {rec.label && (
                  <p className="text-xs text-blue-600 mt-1">{rec.label}</p>
                )}
                <p className="text-xs text-gray-400 mt-1">
                  {new Date(rec.created_at).toLocaleString()}
                </p>
              </div>

              <div className="flex flex-col gap-1">
                <button
                  onClick={() => onPlay(rec.id)}
                  className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200 transition-colors"
                >
                  ▶ Play
                </button>
                <button
                  onClick={() => onDelete(rec.id)}
                  className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs hover:bg-red-200 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Tag({ label }: { label: string }) {
  return (
    <span className="inline-block px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
      {label}
    </span>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/RecordingsList.tsx
git commit -m "feat: add recordings list component for right panel"
```

---

### Task 12: App Shell — Wire Everything Together

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Implement the full App component**

Replace `src/App.tsx` with:

```tsx
import { useState, useRef, useCallback } from 'react';
import { TtsConfig, AzureVoice, DEFAULT_CONFIG } from './types';
import { useAzureSettings } from './hooks/useAzureSettings';
import { useVoices } from './hooks/useVoices';
import { useRecordings } from './hooks/useRecordings';
import { buildSsml } from './utils/ssml';
import { synthesizeSpeech } from './utils/azure-tts';
import { AzureSettings } from './components/AzureSettings';
import { VoiceSelector } from './components/VoiceSelector';
import { ProsodyControls } from './components/ProsodyControls';
import { EmphasisControl } from './components/EmphasisControl';
import { StyleRoleControls } from './components/StyleRoleControls';
import { BreakControl } from './components/BreakControl';
import { TextInput } from './components/TextInput';
import { ActionButtons } from './components/ActionButtons';
import { ShowCodeModal } from './components/ShowCodeModal';
import { RecordingsList } from './components/RecordingsList';

function App() {
  const { key, setKey, region, setRegion, isConfigured } = useAzureSettings();
  const {
    voices, languages, loading: voicesLoading, error: voicesError,
    searchQuery, setSearchQuery, languageFilter, setLanguageFilter, retry,
  } = useVoices(key, region);
  const { recordings, loading: recsLoading, error: recsError, saveRecording, deleteRecording } = useRecordings();

  const [config, setConfig] = useState<TtsConfig>(DEFAULT_CONFIG);
  const [selectedVoice, setSelectedVoice] = useState<AzureVoice | null>(null);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastAudioBlob, setLastAudioBlob] = useState<Blob | null>(null);

  const audioRef = useRef<HTMLAudioElement>(null);

  const updateConfig = useCallback((updates: Partial<TtsConfig>) => {
    setConfig((prev) => ({ ...prev, ...updates }));
  }, []);

  const handleVoiceSelect = (voice: AzureVoice | null) => {
    setSelectedVoice(voice);
    if (voice) {
      updateConfig({
        voiceName: voice.ShortName,
        voiceDisplayName: voice.DisplayName,
        language: voice.Locale,
        style: '',
        styleDegree: 1.0,
        role: '',
      });
    }
  };

  const handleSynthesize = async () => {
    if (!isConfigured || !config.voiceName || !config.text) return;
    setIsSynthesizing(true);
    setError(null);
    try {
      const ssml = buildSsml(config);
      const audioBuffer = await synthesizeSpeech(key, region, ssml);
      const blob = new Blob([audioBuffer], { type: 'audio/mpeg' });
      setLastAudioBlob(blob);
      const url = URL.createObjectURL(blob);
      if (audioRef.current) {
        audioRef.current.src = url;
        audioRef.current.play();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Synthesis failed');
    } finally {
      setIsSynthesizing(false);
    }
  };

  const handleSave = async () => {
    if (!lastAudioBlob) return;
    try {
      const ssml = buildSsml(config);
      await saveRecording(lastAudioBlob, {
        voice_name: config.voiceName,
        voice_display_name: config.voiceDisplayName,
        language: config.language,
        text: config.text,
        rate: config.rate,
        pitch: config.pitch,
        volume: config.volume,
        emphasis: config.emphasis || null,
        style: config.style || null,
        style_degree: config.style ? config.styleDegree : null,
        role: config.role || null,
        break_config: config.breakValue
          ? JSON.stringify({ type: config.breakType, value: config.breakValue })
          : null,
        ssml,
      });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save recording');
    }
  };

  const handlePlayRecording = (id: string) => {
    if (audioRef.current) {
      audioRef.current.src = `/api/recordings/${id}/audio`;
      audioRef.current.play();
    }
  };

  const canSynthesize = isConfigured && !!config.voiceName && !!config.text;
  const canSave = !!lastAudioBlob;

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm border-b px-6 py-3">
        <h1 className="text-xl font-bold text-gray-800">Azure TTS Config Tester</h1>
      </header>

      <div className="flex h-[calc(100vh-52px)]">
        {/* Left Panel - Configuration */}
        <div className="w-1/2 overflow-y-auto p-4 space-y-3 border-r">
          <AzureSettings
            apiKey={key}
            region={region}
            onKeyChange={setKey}
            onRegionChange={setRegion}
          />

          <VoiceSelector
            voices={voices}
            languages={languages}
            selectedVoice={config.voiceName}
            searchQuery={searchQuery}
            languageFilter={languageFilter}
            loading={voicesLoading}
            error={voicesError}
            onVoiceChange={handleVoiceSelect}
            onSearchChange={setSearchQuery}
            onLanguageChange={setLanguageFilter}
            onRetry={retry}
          />

          <ProsodyControls
            rate={config.rate}
            pitch={config.pitch}
            volume={config.volume}
            onRateChange={(rate) => updateConfig({ rate })}
            onPitchChange={(pitch) => updateConfig({ pitch })}
            onVolumeChange={(volume) => updateConfig({ volume })}
          />

          <div className="grid grid-cols-2 gap-3">
            <EmphasisControl
              emphasis={config.emphasis}
              onChange={(emphasis) => updateConfig({ emphasis })}
            />
            <BreakControl
              breakType={config.breakType}
              breakValue={config.breakValue}
              onBreakTypeChange={(breakType) => updateConfig({ breakType })}
              onBreakValueChange={(breakValue) => updateConfig({ breakValue })}
            />
          </div>

          <StyleRoleControls
            styles={selectedVoice?.StyleList || []}
            roles={selectedVoice?.RolePlayList || []}
            style={config.style}
            styleDegree={config.styleDegree}
            role={config.role}
            onStyleChange={(style) => updateConfig({ style })}
            onStyleDegreeChange={(styleDegree) => updateConfig({ styleDegree })}
            onRoleChange={(role) => updateConfig({ role })}
          />

          <TextInput text={config.text} onChange={(text) => updateConfig({ text })} />

          <ActionButtons
            canSynthesize={canSynthesize}
            canSave={canSave}
            isSynthesizing={isSynthesizing}
            onSynthesize={handleSynthesize}
            onSave={handleSave}
            onShowCode={() => setShowCodeModal(true)}
          />

          {error && (
            <div className="mx-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
              {error}
            </div>
          )}

          {!isConfigured && (
            <div className="mx-4 p-3 bg-yellow-50 border border-yellow-200 text-yellow-700 rounded-md text-sm">
              Enter your Azure API key and region to get started.
            </div>
          )}
        </div>

        {/* Right Panel - Saved Recordings */}
        <div className="w-1/2 overflow-y-auto bg-gray-50">
          <RecordingsList
            recordings={recordings}
            loading={recsLoading}
            error={recsError}
            onPlay={handlePlayRecording}
            onDelete={deleteRecording}
          />
        </div>
      </div>

      {/* Hidden audio element for playback */}
      <audio ref={audioRef} />

      {/* Show Code Modal */}
      {showCodeModal && (
        <ShowCodeModal config={config} onClose={() => setShowCodeModal(false)} />
      )}
    </div>
  );
}

export default App;
```

- [ ] **Step 2: Verify the app builds**

```bash
npx tsc --noEmit
```

Expected: No type errors.

- [ ] **Step 3: Run all tests**

```bash
npx vitest run
```

Expected: All tests pass.

- [ ] **Step 4: Verify the full app starts**

```bash
npm run dev
```

Open `http://localhost:7742`. Expected: Full UI renders with both panels — config on the left, recordings on the right.

Stop the dev server after verifying.

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx
git commit -m "feat: wire all components together in App shell with two-panel layout"
```

---

### Task 13: Final Verification & Cleanup

**Files:**
- Modify: `.gitignore`

- [ ] **Step 1: Ensure .gitignore covers all generated files**

Verify `.gitignore` contains:

```
node_modules/
dist/
audio/
*.db
.env
```

- [ ] **Step 2: Run the full test suite**

```bash
npm test
```

Expected: All tests pass.

- [ ] **Step 3: Build check**

```bash
npm run build
```

Expected: Build completes without errors.

- [ ] **Step 4: Full manual smoke test**

```bash
npm run dev
```

Open `http://localhost:7742` and verify:
1. Azure Settings: can enter key and region
2. Voice Selector: after entering valid credentials, voices load and are filterable/searchable
3. Prosody/Emphasis/Style/Break controls render and respond to changes
4. Text input works
5. Show Code button opens modal with Python, Node.js, and SSML tabs
6. Copy button works
7. Synthesize & Play button produces audio (with valid Azure credentials)
8. Save button stores the recording
9. Right panel shows saved recordings
10. Play button on recordings plays audio
11. Delete button removes recordings

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "chore: final cleanup and verification"
```
