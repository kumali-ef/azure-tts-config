# Azure Viseme Capture & Display Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Capture Azure TTS `VisemeReceived` events during synthesis, persist them alongside the recording, and display them in a per-recording timeline + table modal.

**Architecture:** A `Capture viseme events` toggle in Azure Settings routes synthesis through the browser Speech SDK (WebSocket) instead of the existing REST endpoint, because the REST `cognitiveservices/v1` endpoint returns audio bytes only and cannot emit viseme events. Captured events are stored as a JSON string in a new nullable `visemes` column on the `recordings` table. Pure data/geometry helpers live in an SDK-free module so tests never import the SDK.

**Tech Stack:** React 19, TypeScript, Vite, Tailwind 4, Express 5, better-sqlite3, vitest, `microsoft-cognitiveservices-speech-sdk@1.51.0`

**Spec:** `docs/superpowers/specs/2026-09-08-azure-viseme-capture-design.md`

---

## Context an engineer new to this codebase needs

**Run the app:** `npm run dev` — starts the Express server on `:7740` and Vite on `:7742` concurrently. Vite proxies `/api` to the server.

**Run tests:** `npm test` (vitest, single run). Tests live in `tests/` and are pure unit tests — there is **no** jsdom/happy-dom harness configured, so nothing in `tests/` may import React components or anything touching `window`, `document`, `MediaSource`, or the Speech SDK.

**Typecheck:** `npx tsc --noEmit -p tsconfig.app.json` for client code. `npm run build` runs `tsc -b && vite build`.

**Existing Azure flow:** `src/AzureApp.tsx` holds config state, calls `buildSsml()` (`src/utils/ssml.ts`), then `synthesizeSpeech()` or `synthesizeSpeechStreaming()` (`src/utils/azure-tts.ts`), then `saveRecording()` from `src/hooks/useRecordings.ts`, which POSTs multipart form data to `/api/recordings`. The server (`server/routes.ts`) writes the audio file to `audio/` and a row via `server/db.ts`.

**The database has live data.** `tts-recordings.db` exists with rows in it. New columns MUST go through the ALTER-if-missing migration block in `server/db.ts`, not only the `CREATE TABLE` statement.

**Key SDK facts already verified — do not re-derive:**
- `new sdk.SpeechSynthesizer(config, null)` — the `null` is load-bearing. Omitting the argument attaches the default speaker and the audio will play **twice**.
- `e.result.audioData` inside the `synthesizing` handler is an **incremental** MP3 chunk, appendable directly to MediaSource.
- `speechConfig.speechSynthesisOutputFormat` **must** be set explicitly. The browser default is `audio-24khz-48kbitrate-mono-mp3`, which would not match the `output_format` stored in the DB.
- Errors come from `result.errorDetails`. There is no `SpeechSynthesisCancellationDetails` in this SDK's synthesis path.

---

## File Structure

| File | Responsibility |
|---|---|
| `src/utils/viseme-data.ts` | **Create.** Pure data helpers: `VisemeEvent`, `ticksToMs`, `parseVisemes`, `visemeDeltas`, `visemeTimelineMarks`. No DOM, no SDK. |
| `src/utils/viseme-shapes.ts` | **Create.** Viseme ID → phoneme-group label, ID → articulation family, family → colour/label. No DOM, no SDK. |
| `src/utils/mp3-media-source.ts` | **Create.** `createMp3Sink()` — the MediaSource append pump, extracted from `azure-tts.ts` so both streaming paths share it. |
| `src/utils/azure-viseme-tts.ts` | **Create.** Speech SDK glue only. Imports from `viseme-data` and `mp3-media-source`. |
| `src/utils/azure-tts.ts` | **Modify.** `synthesizeSpeechStreaming` uses the extracted sink instead of its inline pump. |
| `src/components/VisemeModal.tsx` | **Create.** Presentational modal: header stats, SVG timeline, legend, event table, Copy JSON. |
| `src/components/RecordingsList.tsx` | **Modify.** `〰` button + `visemes: N` tag, both conditional on `rec.visemes`. |
| `src/components/AzureSettings.tsx` | **Modify.** `Capture viseme events` checkbox. |
| `src/AzureApp.tsx` | **Modify.** Branch both synthesis handlers on the toggle; `notice` state; modal wiring. |
| `src/hooks/useAzureSettings.ts` | **Modify.** Expose `captureVisemes` / `setCaptureVisemes`. |
| `src/utils/storage.ts` | **Modify.** localStorage getter/setter for the toggle. |
| `src/types.ts` | **Modify.** `Recording` gains `visemes` and `audio_duration_ms`. |
| `server/db.ts` | **Modify.** Two new columns, in both `CREATE TABLE` and the migration block; `RecordingRow`; `insertStmt`. |
| `server/routes.ts` | **Modify.** Pass the two new fields through on POST. |
| `tests/viseme-shapes.test.ts` | **Create.** |
| `tests/viseme-data.test.ts` | **Create.** |

---

## Task 1: Add the Speech SDK dependency

**Files:**
- Modify: `package.json`, `package-lock.json`

- [ ] **Step 1: Install the SDK**

```bash
npm install microsoft-cognitiveservices-speech-sdk@1.51.0
```

- [ ] **Step 2: Verify it resolves and the existing build still passes**

Run: `npm run build`
Expected: `✓ built in <N>ms`, no TypeScript errors. (No config changes are needed — the package's `browser` field already stubs out its Node-only dependencies and Vite honours it.)

- [ ] **Step 3: Verify existing tests still pass**

Run: `npm test`
Expected: all existing tests in `tests/ssml.test.ts` and `tests/code-generator.test.ts` pass.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "build: add microsoft-cognitiveservices-speech-sdk for viseme capture"
```

---

## Task 2: Viseme shape and family maps

**Files:**
- Create: `src/utils/viseme-shapes.ts`
- Test: `tests/viseme-shapes.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/viseme-shapes.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  VISEME_SHAPES,
  visemeShape,
  visemeFamily,
  visemeColor,
  FAMILY_COLORS,
  FAMILY_LABELS,
} from '../src/utils/viseme-shapes';

describe('visemeShape', () => {
  it('has exactly 22 shape entries', () => {
    expect(VISEME_SHAPES).toHaveLength(22);
  });

  it('resolves every documented viseme ID to a non-empty label', () => {
    for (let id = 0; id <= 21; id++) {
      expect(visemeShape(id)).toBeTruthy();
    }
  });

  it('maps known IDs to their documented phoneme groups', () => {
    expect(visemeShape(0)).toBe('silence');
    expect(visemeShape(6)).toBe('j i ɪ');
    expect(visemeShape(19)).toBe('d t n θ');
    expect(visemeShape(21)).toBe('p b m');
  });

  it('falls back to "id N" for an out-of-range ID', () => {
    expect(visemeShape(99)).toBe('id 99');
    expect(visemeShape(-1)).toBe('id -1');
  });
});

describe('visemeFamily', () => {
  it('assigns every ID 0-21 to exactly one family', () => {
    for (let id = 0; id <= 21; id++) {
      const family = visemeFamily(id);
      expect(family).not.toBeNull();
      expect(FAMILY_COLORS[family!]).toMatch(/^#[0-9a-f]{6}$/);
      expect(FAMILY_LABELS[family!]).toBeTruthy();
    }
  });

  it('groups IDs into the documented families', () => {
    expect(visemeFamily(0)).toBe('silence');
    expect(visemeFamily(2)).toBe('open-vowel');
    expect(visemeFamily(7)).toBe('close-vowel');
    expect(visemeFamily(10)).toBe('diphthong');
    expect(visemeFamily(14)).toBe('approximant');
    expect(visemeFamily(15)).toBe('fricative');
    expect(visemeFamily(21)).toBe('plosive');
  });

  it('returns null for an unknown ID', () => {
    expect(visemeFamily(99)).toBeNull();
  });

  it('covers all seven families across the 22 IDs', () => {
    const seen = new Set(
      Array.from({ length: 22 }, (_, id) => visemeFamily(id)),
    );
    expect(seen.size).toBe(7);
  });
});

describe('visemeColor', () => {
  it('returns the family colour for a known ID', () => {
    expect(visemeColor(0)).toBe(FAMILY_COLORS.silence);
    expect(visemeColor(21)).toBe(FAMILY_COLORS.plosive);
  });

  it('returns a neutral grey for an unknown ID', () => {
    expect(visemeColor(99)).toBe('#64748b');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/viseme-shapes.test.ts`
Expected: FAIL — `Failed to resolve import "../src/utils/viseme-shapes"`.

- [ ] **Step 3: Write the implementation**

Create `src/utils/viseme-shapes.ts`:

```ts
/**
 * Azure Speech viseme IDs map to phoneme groups, not individual phonemes.
 * Order is significant — the array index IS the viseme ID reported by the SDK.
 */
export const VISEME_SHAPES: readonly string[] = [
  'silence',    // 0
  'æ ə ʌ',      // 1
  'ɑ',          // 2
  'ɔ',          // 3
  'ɛ ʊ',        // 4
  'ɝ',          // 5
  'j i ɪ',      // 6
  'w u',        // 7
  'o',          // 8
  'aʊ',         // 9
  'ɔɪ',         // 10
  'aɪ',         // 11
  'h',          // 12
  'ɹ',          // 13
  'l',          // 14
  's z',        // 15
  'ʃ tʃ dʒ ʒ',  // 16
  'ð',          // 17
  'f v',        // 18
  'd t n θ',    // 19
  'k g ŋ',      // 20
  'p b m',      // 21
];

export function visemeShape(id: number): string {
  return VISEME_SHAPES[id] ?? `id ${id}`;
}

export type VisemeFamily =
  | 'silence'
  | 'open-vowel'
  | 'close-vowel'
  | 'diphthong'
  | 'approximant'
  | 'fricative'
  | 'plosive';

/**
 * Seven families rather than a vowel/consonant split, so the timeline needs seven
 * colours instead of 22 arbitrary hues. IDs 12 (h), 13 (ɹ) and 14 (l) are grouped as
 * 'approximant' because all three are visually open, unclosed mouth shapes.
 */
const FAMILY_BY_ID: Record<number, VisemeFamily> = {
  0: 'silence',
  1: 'open-vowel', 2: 'open-vowel', 3: 'open-vowel', 5: 'open-vowel',
  4: 'close-vowel', 6: 'close-vowel', 7: 'close-vowel', 8: 'close-vowel',
  9: 'diphthong', 10: 'diphthong', 11: 'diphthong',
  12: 'approximant', 13: 'approximant', 14: 'approximant',
  15: 'fricative', 16: 'fricative', 17: 'fricative', 18: 'fricative',
  19: 'plosive', 20: 'plosive', 21: 'plosive',
};

export const FAMILY_COLORS: Record<VisemeFamily, string> = {
  silence: '#cbd5e1',
  'open-vowel': '#f59e0b',
  'close-vowel': '#0ea5e9',
  diphthong: '#ec4899',
  approximant: '#8b5cf6',
  fricative: '#10b981',
  plosive: '#ef4444',
};

export const FAMILY_LABELS: Record<VisemeFamily, string> = {
  silence: 'silence',
  'open-vowel': 'open vowels',
  'close-vowel': 'close / rounded vowels',
  diphthong: 'diphthongs',
  approximant: 'glides & liquids',
  fricative: 'fricatives & sibilants',
  plosive: 'plosives & nasals',
};

const UNKNOWN_COLOR = '#64748b';

export function visemeFamily(id: number): VisemeFamily | null {
  return FAMILY_BY_ID[id] ?? null;
}

export function visemeColor(id: number): string {
  const family = visemeFamily(id);
  return family ? FAMILY_COLORS[family] : UNKNOWN_COLOR;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/viseme-shapes.test.ts`
Expected: PASS — 10 tests passing.

- [ ] **Step 5: Commit**

```bash
git add src/utils/viseme-shapes.ts tests/viseme-shapes.test.ts
git commit -m "feat: add Azure viseme ID to mouth-shape and family maps"
```

---

## Task 3: Pure viseme data helpers

**Files:**
- Create: `src/utils/viseme-data.ts`
- Test: `tests/viseme-data.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/viseme-data.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  ticksToMs,
  parseVisemes,
  visemeDeltas,
  visemeTimelineMarks,
} from '../src/utils/viseme-data';
import type { VisemeEvent } from '../src/utils/viseme-data';

describe('ticksToMs', () => {
  it('converts 100-nanosecond ticks to milliseconds', () => {
    expect(ticksToMs(0)).toBe(0);
    expect(ticksToMs(10_000)).toBe(1);
    expect(ticksToMs(1_370_000)).toBe(137);
    expect(ticksToMs(32_400_000)).toBe(3240);
  });

  it('rounds to the nearest millisecond', () => {
    expect(ticksToMs(14_999)).toBe(1);
    expect(ticksToMs(15_000)).toBe(2);
  });
});

describe('parseVisemes', () => {
  it('returns an empty array for null', () => {
    expect(parseVisemes(null)).toEqual([]);
  });

  it('returns an empty array for an empty string', () => {
    expect(parseVisemes('')).toEqual([]);
  });

  it('parses a valid JSON array', () => {
    expect(parseVisemes('[{"offsetMs":137,"visemeId":6}]')).toEqual([
      { offsetMs: 137, visemeId: 6 },
    ]);
  });

  it('returns an empty array for malformed JSON', () => {
    expect(parseVisemes('{not json')).toEqual([]);
  });

  it('returns an empty array when the JSON is not an array', () => {
    expect(parseVisemes('{"offsetMs":1}')).toEqual([]);
  });
});

describe('visemeDeltas', () => {
  it('returns null for the first event and gaps thereafter', () => {
    const visemes: VisemeEvent[] = [
      { offsetMs: 0, visemeId: 0 },
      { offsetMs: 137, visemeId: 6 },
      { offsetMs: 212, visemeId: 19 },
    ];
    expect(visemeDeltas(visemes)).toEqual([null, 137, 75]);
  });

  it('returns an empty array for no events', () => {
    expect(visemeDeltas([])).toEqual([]);
  });
});

describe('visemeTimelineMarks', () => {
  const visemes: VisemeEvent[] = [
    { offsetMs: 0, visemeId: 0 },
    { offsetMs: 500, visemeId: 6 },
    { offsetMs: 1000, visemeId: 21 },
  ];

  it('maps offsets proportionally across the given width', () => {
    expect(visemeTimelineMarks(visemes, 1000, 100)).toEqual([
      { x: 0, visemeId: 0, offsetMs: 0 },
      { x: 50, visemeId: 6, offsetMs: 500 },
      { x: 100, visemeId: 21, offsetMs: 1000 },
    ]);
  });

  it('produces non-decreasing x positions', () => {
    const marks = visemeTimelineMarks(visemes, 1000, 1000);
    for (let i = 1; i < marks.length; i++) {
      expect(marks[i].x).toBeGreaterThanOrEqual(marks[i - 1].x);
    }
  });

  it('returns an empty array when duration is zero', () => {
    expect(visemeTimelineMarks(visemes, 0, 100)).toEqual([]);
  });

  it('returns an empty array when duration is negative', () => {
    expect(visemeTimelineMarks(visemes, -5, 100)).toEqual([]);
  });

  it('returns an empty array for no events', () => {
    expect(visemeTimelineMarks([], 1000, 100)).toEqual([]);
  });

  it('clamps an offset beyond the reported duration to the full width', () => {
    const overrun: VisemeEvent[] = [{ offsetMs: 2000, visemeId: 0 }];
    expect(visemeTimelineMarks(overrun, 1000, 100)).toEqual([
      { x: 100, visemeId: 0, offsetMs: 2000 },
    ]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/viseme-data.test.ts`
Expected: FAIL — `Failed to resolve import "../src/utils/viseme-data"`.

- [ ] **Step 3: Write the implementation**

Create `src/utils/viseme-data.ts`:

```ts
/** A single Azure `VisemeReceived` event, reduced to what we persist. */
export interface VisemeEvent {
  offsetMs: number;
  visemeId: number;
}

/** A viseme event positioned on the timeline strip. */
export interface TimelineMark {
  x: number;
  visemeId: number;
  offsetMs: number;
}

/** The Speech SDK reports offsets and durations in 100-nanosecond ticks. */
const TICKS_PER_MS = 10_000;

export function ticksToMs(ticks: number): number {
  return Math.round(ticks / TICKS_PER_MS);
}

/** Tolerant parse of the `visemes` DB column, which is nullable and free-form TEXT. */
export function parseVisemes(json: string | null): VisemeEvent[] {
  if (!json) return [];
  try {
    const parsed: unknown = JSON.parse(json);
    return Array.isArray(parsed) ? (parsed as VisemeEvent[]) : [];
  } catch {
    return [];
  }
}

/** Gap in ms from the previous event; null for the first event. */
export function visemeDeltas(visemes: VisemeEvent[]): (number | null)[] {
  return visemes.map((v, i) => (i === 0 ? null : v.offsetMs - visemes[i - 1].offsetMs));
}

/**
 * Positions events along a strip of the given width. Offsets are clamped to the strip:
 * Azure can report a final event marginally past the reported audio duration.
 */
export function visemeTimelineMarks(
  visemes: VisemeEvent[],
  durationMs: number,
  width: number,
): TimelineMark[] {
  if (durationMs <= 0) return [];
  return visemes.map((v) => ({
    x: Math.min(width, Math.max(0, (v.offsetMs / durationMs) * width)),
    visemeId: v.visemeId,
    offsetMs: v.offsetMs,
  }));
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/viseme-data.test.ts`
Expected: PASS — 15 tests passing.

- [ ] **Step 5: Commit**

```bash
git add src/utils/viseme-data.ts tests/viseme-data.test.ts
git commit -m "feat: add pure viseme data helpers"
```

---

## Task 4: Extract the MediaSource sink

**Files:**
- Create: `src/utils/mp3-media-source.ts`
- Modify: `src/utils/azure-tts.ts:45-156`

**No test for this task, deliberately.** `MediaSource` is not implemented by jsdom or happy-dom, and this repo has no DOM test harness at all. Adding one to test a mechanical extraction would be larger than the extraction. This is verified by `tsc` plus manual checks 1 and 3 in Task 12.

- [ ] **Step 1: Create the sink module**

Create `src/utils/mp3-media-source.ts`:

```ts
/** Progressive MP3 playback target backed by a MediaSource. */
export interface Mp3Sink {
  /** Queue a chunk. Safe to call before the MediaSource has opened. */
  append(chunk: Uint8Array): void;
  /** Signal that no more chunks are coming. */
  end(): void;
  /** Resolves once every queued chunk has been appended and the stream closed. */
  done: Promise<void>;
}

export function isMediaSourceSupported(): boolean {
  return typeof MediaSource !== 'undefined' && MediaSource.isTypeSupported('audio/mpeg');
}

/**
 * Wires a MediaSource to `audioElement` and returns a sink for MP3 chunks.
 *
 * `SourceBuffer.appendBuffer` throws if called while `updating` is true, so chunks are
 * queued and drained from the `updateend` event. Chunks that arrive before `sourceopen`
 * fires are held in the same queue.
 */
export function createMp3Sink(audioElement: HTMLAudioElement): Mp3Sink {
  const mediaSource = new MediaSource();
  audioElement.src = URL.createObjectURL(mediaSource);

  const pending: Uint8Array[] = [];
  let sourceBuffer: SourceBuffer | null = null;
  let streamDone = false;
  let settled = false;

  let resolveDone!: () => void;
  let rejectDone!: (reason: unknown) => void;
  const done = new Promise<void>((resolve, reject) => {
    resolveDone = resolve;
    rejectDone = reject;
  });

  const pump = () => {
    if (!sourceBuffer || settled) return;
    try {
      if (pending.length > 0 && !sourceBuffer.updating) {
        sourceBuffer.appendBuffer(pending.shift()!.buffer as ArrayBuffer);
      } else if (streamDone && pending.length === 0 && !sourceBuffer.updating) {
        if (mediaSource.readyState === 'open') mediaSource.endOfStream();
        settled = true;
        resolveDone();
      }
    } catch (err) {
      settled = true;
      rejectDone(err);
    }
  };

  mediaSource.addEventListener(
    'sourceopen',
    () => {
      try {
        sourceBuffer = mediaSource.addSourceBuffer('audio/mpeg');
        sourceBuffer.addEventListener('updateend', pump);
        pump();
      } catch (err) {
        settled = true;
        rejectDone(err);
      }
    },
    { once: true },
  );

  return {
    append(chunk: Uint8Array) {
      pending.push(chunk);
      pump();
    },
    end() {
      streamDone = true;
      pump();
    },
    done,
  };
}
```

- [ ] **Step 2: Rewrite `synthesizeSpeechStreaming` to use the sink**

In `src/utils/azure-tts.ts`, add the import at the top of the file, below the existing `import type` line:

```ts
import { createMp3Sink, isMediaSourceSupported } from './mp3-media-source';
```

Then replace the whole body from `const reader = response.body!.getReader();` through the closing `}` of the `else` fallback block (currently `azure-tts.ts:77-141`) with:

```ts
  const reader = response.body!.getReader();
  const chunks: Uint8Array[] = [];
  let ttfbMs = 0;
  let firstChunk = true;

  if (isMediaSourceSupported()) {
    const sink = createMp3Sink(audioElement);
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (firstChunk) {
        ttfbMs = Math.round(performance.now() - startTime);
        firstChunk = false;
        audioElement.play();
      }
      chunks.push(value);
      sink.append(value);
    }
    sink.end();
    await sink.done;
  } else {
    // Fallback: buffer everything, then play
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (firstChunk) {
        ttfbMs = Math.round(performance.now() - startTime);
        firstChunk = false;
      }
      chunks.push(value);
    }
    const fullBuffer = concatChunks(chunks);
    const blob = new Blob([fullBuffer], { type: 'audio/mpeg' });
    audioElement.src = URL.createObjectURL(blob);
    audioElement.play();
  }
```

Leave `concatChunks` and the `StreamingResult` interface exactly as they are — the final `return { ttfbMs, totalMs, buffer: concatChunks(chunks) };` still applies.

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit -p tsconfig.app.json`
Expected: no output, exit code 0.

- [ ] **Step 4: Confirm no behavioural regression in the existing tests**

Run: `npm test`
Expected: all tests pass. (None of them cover this file — this step confirms the extraction did not break imports elsewhere.)

- [ ] **Step 5: Commit**

```bash
git add src/utils/mp3-media-source.ts src/utils/azure-tts.ts
git commit -m "refactor: extract MediaSource MP3 sink from streaming synthesis"
```

---

## Task 5: Database migration

**Files:**
- Modify: `server/db.ts`

- [ ] **Step 1: Add the columns to the CREATE TABLE statement**

In `server/db.ts`, inside the `CREATE TABLE IF NOT EXISTS recordings (...)` block, insert these two lines immediately after the `deployment_id TEXT,` line:

```sql
    visemes TEXT,
    audio_duration_ms INTEGER,
```

- [ ] **Step 2: Add the columns to the migration block**

`CREATE TABLE IF NOT EXISTS` does nothing to the existing table, so the live database only
gains these columns through the migration block. In `server/db.ts`, immediately after the
existing `stream_duration_ms` migration `if` block (around line 54), append:

```ts
if (!columns.some((c) => c.name === 'visemes')) {
  db.exec('ALTER TABLE recordings ADD COLUMN visemes TEXT');
}
if (!columns.some((c) => c.name === 'audio_duration_ms')) {
  db.exec('ALTER TABLE recordings ADD COLUMN audio_duration_ms INTEGER');
}
```

This is the same shape as the three migration blocks already above it (`server/db.ts:46-56`).
Note `db.exec` here is better-sqlite3's SQL execution method, not `child_process.exec`.

- [ ] **Step 3: Add the fields to `RecordingRow`**

In `server/db.ts`, in the `RecordingRow` interface, add after `deployment_id: string | null;`:

```ts
  visemes: string | null;
  audio_duration_ms: number | null;
```

- [ ] **Step 4: Add the columns to `insertStmt`**

Replace the `insertStmt` declaration in `server/db.ts` with:

```ts
const insertStmt = db.prepare(`
  INSERT INTO recordings (id, voice_name, voice_display_name, language, text, rate, pitch, volume,
    emphasis, style, style_degree, role, break_config, ssml, audio_filename, output_format, api_response_time_ms, stream_duration_ms, deployment_id, visemes, audio_duration_ms, label)
  VALUES (@id, @voice_name, @voice_display_name, @language, @text, @rate, @pitch, @volume,
    @emphasis, @style, @style_degree, @role, @break_config, @ssml, @audio_filename, @output_format, @api_response_time_ms, @stream_duration_ms, @deployment_id, @visemes, @audio_duration_ms, @label)
`);
```

- [ ] **Step 5: Verify the migration ran against the live database**

Importing the module runs the migration as a side effect, then we inspect the schema:

```bash
npx tsx -e "import('./server/db.ts').then((m) => console.log((m.default.pragma('table_info(recordings)')).map((c) => c.name).join(' ')))"
```

Expected: the printed column list includes both `visemes` and `audio_duration_ms`.

- [ ] **Step 6: Verify existing rows survived**

```bash
npx tsx -e "import('./server/db.ts').then((m) => { console.log('rows:', m.default.prepare('SELECT COUNT(*) AS n FROM recordings').get()); console.log('sample:', m.default.prepare('SELECT id, visemes, audio_duration_ms FROM recordings LIMIT 1').get()); })"
```

Expected: the row count is unchanged from before the migration, and the sampled row shows `visemes: null, audio_duration_ms: null`.

- [ ] **Step 7: Commit**

```bash
git add server/db.ts
git commit -m "feat(db): add visemes and audio_duration_ms columns to recordings"
```

---

## Task 6: Persistence plumbing

**Files:**
- Modify: `server/routes.ts:35-54`
- Modify: `src/types.ts:37-59`

- [ ] **Step 1: Pass the new fields through the POST handler**

In `server/routes.ts`, in the `insertRecording({...})` call inside the `POST /recordings` handler, add after the `deployment_id: config.deployment_id || null,` line:

```ts
      visemes: config.visemes || null,
      audio_duration_ms: config.audio_duration_ms ?? null,
```

- [ ] **Step 2: Add the fields to the `Recording` type**

In `src/types.ts`, in the `Recording` interface, add after `deployment_id: string | null;`:

```ts
  visemes: string | null;
  audio_duration_ms: number | null;
```

- [ ] **Step 3: Typecheck both client and server**

Run: `npx tsc --noEmit -p tsconfig.app.json && npx tsc --noEmit -p tsconfig.node.json`
Expected: no output, exit code 0 for both.

- [ ] **Step 4: Verify a round-trip through the API**

Start the dev server in one shell (`npm run dev`), then in another:

```bash
printf 'fake audio bytes' > /tmp/fake.mp3
curl -s -X POST http://localhost:7740/api/recordings \
  -F 'audio=@/tmp/fake.mp3' \
  -F 'config={"voice_name":"test","voice_display_name":"VisemeRoundTripTest","language":"en-US","text":"t","rate":"medium","pitch":"medium","volume":"medium","ssml":"<speak/>","visemes":"[{\"offsetMs\":137,\"visemeId\":6}]","audio_duration_ms":3240}'
```

Expected: HTTP 201 with a JSON body where `visemes` is the string `"[{\"offsetMs\":137,\"visemeId\":6}]"` and `audio_duration_ms` is `3240`.

Then delete the test row so it does not clutter the UI — take the `id` from the response above:

```bash
curl -s -X DELETE http://localhost:7740/api/recordings/<id-from-response>
```

- [ ] **Step 5: Commit**

```bash
git add server/routes.ts src/types.ts
git commit -m "feat: persist viseme data through the recordings API"
```

---

## Task 7: Capture-visemes toggle

**Files:**
- Modify: `src/utils/storage.ts`
- Modify: `src/hooks/useAzureSettings.ts`
- Modify: `src/components/AzureSettings.tsx`
- Modify: `src/AzureApp.tsx`

- [ ] **Step 1: Add the localStorage accessors**

In `src/utils/storage.ts`, add the storage key alongside the existing constants at the top:

```ts
const CAPTURE_VISEMES_STORAGE = 'azure-tts-capture-visemes';
```

and add these functions after `setStoredCustomVoiceName`:

```ts
export function getStoredCaptureVisemes(): boolean {
  return localStorage.getItem(CAPTURE_VISEMES_STORAGE) === 'true';
}

export function setStoredCaptureVisemes(enabled: boolean): void {
  localStorage.setItem(CAPTURE_VISEMES_STORAGE, String(enabled));
}
```

- [ ] **Step 2: Expose it from the settings hook**

Replace the whole contents of `src/hooks/useAzureSettings.ts` with:

```ts
import { useState, useEffect } from 'react';
import {
  getStoredKey, setStoredKey,
  getStoredRegion, setStoredRegion,
  getStoredCaptureVisemes, setStoredCaptureVisemes,
} from '../utils/storage';

export function useAzureSettings() {
  const [key, setKey] = useState(getStoredKey);
  const [region, setRegion] = useState(getStoredRegion);
  const [captureVisemes, setCaptureVisemes] = useState(getStoredCaptureVisemes);

  useEffect(() => {
    setStoredKey(key);
  }, [key]);

  useEffect(() => {
    setStoredRegion(region);
  }, [region]);

  useEffect(() => {
    setStoredCaptureVisemes(captureVisemes);
  }, [captureVisemes]);

  const isConfigured = key.length > 0 && region.length > 0;

  return { key, setKey, region, setRegion, captureVisemes, setCaptureVisemes, isConfigured };
}
```

- [ ] **Step 3: Read the current settings component before editing it**

Run: `cat src/components/AzureSettings.tsx`

This shows the existing props interface and markup conventions. The next step adds to that component rather than replacing it.

- [ ] **Step 4: Add the checkbox to `AzureSettings.tsx`**

Add two props to the component's props interface:

```ts
  captureVisemes: boolean;
  onCaptureVisemesChange: (enabled: boolean) => void;
```

Destructure them in the component signature, then add this block as the last child inside the component's outermost wrapper element:

```tsx
      <label className="flex items-start gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={captureVisemes}
          onChange={(e) => onCaptureVisemesChange(e.target.checked)}
          className="mt-0.5"
        />
        <span className="text-sm">
          <span className="font-medium text-gray-700">Capture viseme events</span>
          <span className="block text-xs text-gray-500">
            Routes synthesis through the Speech SDK (WebSocket) instead of the REST API.
          </span>
        </span>
      </label>
```

- [ ] **Step 5: Wire the props in `AzureApp.tsx`**

In `src/AzureApp.tsx`, change the `useAzureSettings()` destructure on line 48 to include the new values:

```ts
  const { key, setKey, region, setRegion, captureVisemes, setCaptureVisemes, isConfigured } = useAzureSettings();
```

and add the two props to the `<AzureSettings>` element:

```tsx
              captureVisemes={captureVisemes}
              onCaptureVisemesChange={setCaptureVisemes}
```

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit -p tsconfig.app.json`
Expected: no output, exit code 0.

- [ ] **Step 7: Verify the toggle persists**

With `npm run dev` running, open `http://localhost:7742`, expand **Azure Settings**, tick **Capture viseme events**, reload the page.
Expected: the checkbox is still ticked after reload.

- [ ] **Step 8: Commit**

```bash
git add src/utils/storage.ts src/hooks/useAzureSettings.ts src/components/AzureSettings.tsx src/AzureApp.tsx
git commit -m "feat: add capture-visemes toggle to Azure settings"
```

---

## Task 8: Speech SDK synthesis module

**Files:**
- Create: `src/utils/azure-viseme-tts.ts`

**No unit test for this module.** It is pure SDK glue — every branch requires either a live Azure WebSocket connection or a `MediaSource` implementation, neither of which exists in the vitest environment. Its extractable logic already lives in `viseme-data.ts` (Task 3) and `mp3-media-source.ts` (Task 4), which are tested. Verified by `tsc` plus manual checks 2, 3 and 6 in Task 12.

- [ ] **Step 1: Create the module**

Create `src/utils/azure-viseme-tts.ts`:

```ts
import * as sdk from 'microsoft-cognitiveservices-speech-sdk';
import type { VisemeEvent } from './viseme-data';
import { ticksToMs } from './viseme-data';
import { createMp3Sink, isMediaSourceSupported } from './mp3-media-source';

export interface VisemeSynthesisResult {
  buffer: ArrayBuffer;
  visemes: VisemeEvent[];
  audioDurationMs: number;
  ttfbMs: number;
  totalMs: number;
}

/**
 * Synthesizes via the Speech SDK so `visemeReceived` events can be captured. The REST
 * endpoint used by `azure-tts.ts` returns audio bytes only and cannot emit visemes.
 */
export async function synthesizeWithVisemes(
  key: string,
  region: string,
  ssml: string,
  audioElement: HTMLAudioElement,
  opts: { deploymentId?: string; stream: boolean },
): Promise<VisemeSynthesisResult> {
  const speechConfig = sdk.SpeechConfig.fromSubscription(key, region);

  // Mandatory, not cosmetic: the browser default is audio-24khz-48kbitrate-mono-mp3, which
  // would not match the output_format recorded for REST-path recordings.
  speechConfig.speechSynthesisOutputFormat =
    sdk.SpeechSynthesisOutputFormat.Audio16Khz128KBitRateMonoMp3;

  // SDK equivalent of the REST ?deploymentId= query parameter (Custom Neural Voice).
  if (opts.deploymentId) {
    speechConfig.endpointId = opts.deploymentId;
  }

  // The `null` is load-bearing. Omitting this argument makes the SDK attach the default
  // speaker output, which would play the audio a second time alongside `audioElement`.
  const synthesizer = new sdk.SpeechSynthesizer(speechConfig, null);

  const visemes: VisemeEvent[] = [];
  const startTime = performance.now();
  let ttfbMs = 0;
  let firstChunk = true;

  const sink = opts.stream && isMediaSourceSupported() ? createMp3Sink(audioElement) : null;

  synthesizer.visemeReceived = (_sender, e) => {
    visemes.push({ offsetMs: ticksToMs(e.audioOffset), visemeId: e.visemeId });
  };

  synthesizer.synthesizing = (_sender, e) => {
    // `audioData` here is the incremental chunk off the WebSocket, header-free for MP3,
    // so it can go straight into the sink.
    const chunk = new Uint8Array(e.result.audioData);
    if (chunk.length === 0) return;
    if (firstChunk) {
      ttfbMs = Math.round(performance.now() - startTime);
      firstChunk = false;
      if (sink) audioElement.play();
    }
    if (sink) sink.append(chunk);
  };

  try {
    const result = await new Promise<sdk.SpeechSynthesisResult>((resolve, reject) => {
      synthesizer.speakSsmlAsync(ssml, resolve, (e) => reject(new Error(e)));
    });

    if (result.reason !== sdk.ResultReason.SynthesizingAudioCompleted) {
      throw new Error(result.errorDetails || 'Speech SDK synthesis did not complete');
    }

    if (sink) {
      sink.end();
      await sink.done;
    } else {
      const blob = new Blob([result.audioData], { type: 'audio/mpeg' });
      audioElement.src = URL.createObjectURL(blob);
      audioElement.play();
      if (firstChunk) {
        ttfbMs = Math.round(performance.now() - startTime);
      }
    }

    return {
      buffer: result.audioData,
      visemes,
      audioDurationMs: ticksToMs(result.audioDuration),
      ttfbMs,
      totalMs: Math.round(performance.now() - startTime),
    };
  } finally {
    synthesizer.close();
  }
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit -p tsconfig.app.json`
Expected: no output, exit code 0.

- [ ] **Step 3: Verify it still bundles**

Run: `npm run build`
Expected: `✓ built in <N>ms`, no errors.

- [ ] **Step 4: Commit**

```bash
git add src/utils/azure-viseme-tts.ts
git commit -m "feat: add Speech SDK synthesis with viseme capture"
```

---

## Task 9: Branch both synthesis handlers

**Files:**
- Modify: `src/AzureApp.tsx:89-187`

- [ ] **Step 1: Add the imports and notice state**

In `src/AzureApp.tsx`, add to the imports:

```ts
import { synthesizeWithVisemes } from './utils/azure-viseme-tts';
import type { VisemeEvent } from './utils/viseme-data';
```

and add next to the existing `error` state declaration:

```ts
  const [notice, setNotice] = useState<string | null>(null);
```

- [ ] **Step 2: Replace the body of `handleSynthesize`**

In `handleSynthesize`, change the two lines above the `try` from:

```ts
    setIsSynthesizing(true);
    setError(null);
```

to:

```ts
    setIsSynthesizing(true);
    setError(null);
    setNotice(null);
```

Then replace the whole `try { ... } catch { ... } finally { ... }` block with:

```ts
    try {
      if (!audioRef.current) return;
      const synthConfig = { ...config, voiceName: effectiveVoiceName };
      const ssml = buildSsml(synthConfig);

      let audioBuffer: ArrayBuffer;
      let apiResponseTimeMs: number;
      let visemes: VisemeEvent[] = [];
      let audioDurationMs: number | null = null;

      if (captureVisemes) {
        const result = await synthesizeWithVisemes(key, region, ssml, audioRef.current, {
          deploymentId: effectiveDeploymentId,
          stream: false,
        });
        audioBuffer = result.buffer;
        apiResponseTimeMs = result.totalMs;
        visemes = result.visemes;
        audioDurationMs = result.audioDurationMs;
        if (visemes.length === 0) {
          setNotice('Synthesis succeeded but no viseme events were received for this voice.');
        }
      } else {
        const startTime = performance.now();
        audioBuffer = await synthesizeSpeech(key, region, ssml, effectiveDeploymentId);
        apiResponseTimeMs = Math.round(performance.now() - startTime);
        audioRef.current.src = URL.createObjectURL(
          new Blob([audioBuffer], { type: 'audio/mpeg' }),
        );
        audioRef.current.play();
      }

      const blob = new Blob([audioBuffer], { type: 'audio/mpeg' });
      // Auto-save after successful synthesis
      await saveRecording(blob, {
        voice_name: effectiveVoiceName,
        voice_display_name: effectiveDisplayName,
        language: config.language,
        text: config.text,
        rate: config.rate,
        pitch: config.pitch,
        volume: config.volume,
        emphasis: config.emphasis || null,
        style: isCustom ? null : (config.style || null),
        style_degree: isCustom ? null : (config.style ? config.styleDegree : null),
        role: isCustom ? null : (config.role || null),
        break_config: config.breakValue
          ? JSON.stringify({ type: config.breakType, value: config.breakValue })
          : null,
        ssml,
        api_response_time_ms: apiResponseTimeMs,
        deployment_id: isCustom ? customDeploymentId : null,
        visemes: visemes.length > 0 ? JSON.stringify(visemes) : null,
        audio_duration_ms: visemes.length > 0 ? audioDurationMs : null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Synthesis failed');
    } finally {
      setIsSynthesizing(false);
    }
```

- [ ] **Step 3: Replace the body of `handleStreamSynthesize`**

In `handleStreamSynthesize`, add `setNotice(null);` immediately after the existing `setError(null);`. Then replace the whole `try { ... } catch { ... } finally { ... }` block with:

```ts
    try {
      const synthConfig = { ...config, voiceName: effectiveVoiceName };
      const ssml = buildSsml(synthConfig);

      let buffer: ArrayBuffer;
      let ttfbMs: number;
      let totalMs: number;
      let visemes: VisemeEvent[] = [];
      let audioDurationMs: number | null = null;

      if (captureVisemes) {
        const result = await synthesizeWithVisemes(key, region, ssml, audioRef.current, {
          deploymentId: effectiveDeploymentId,
          stream: true,
        });
        buffer = result.buffer;
        ttfbMs = result.ttfbMs;
        totalMs = result.totalMs;
        visemes = result.visemes;
        audioDurationMs = result.audioDurationMs;
        if (visemes.length === 0) {
          setNotice('Synthesis succeeded but no viseme events were received for this voice.');
        }
      } else {
        const result = await synthesizeSpeechStreaming(
          key, region, ssml, audioRef.current, effectiveDeploymentId
        );
        buffer = result.buffer;
        ttfbMs = result.ttfbMs;
        totalMs = result.totalMs;
      }

      const blob = new Blob([buffer], { type: 'audio/mpeg' });
      await saveRecording(blob, {
        voice_name: effectiveVoiceName,
        voice_display_name: effectiveDisplayName,
        language: config.language,
        text: config.text,
        rate: config.rate,
        pitch: config.pitch,
        volume: config.volume,
        emphasis: config.emphasis || null,
        style: isCustom ? null : (config.style || null),
        style_degree: isCustom ? null : (config.style ? config.styleDegree : null),
        role: isCustom ? null : (config.role || null),
        break_config: config.breakValue
          ? JSON.stringify({ type: config.breakType, value: config.breakValue })
          : null,
        ssml,
        api_response_time_ms: ttfbMs,
        stream_duration_ms: totalMs,
        deployment_id: isCustom ? customDeploymentId : null,
        visemes: visemes.length > 0 ? JSON.stringify(visemes) : null,
        audio_duration_ms: visemes.length > 0 ? audioDurationMs : null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Streaming synthesis failed');
    } finally {
      setIsStreaming(false);
    }
```

Note: `handleStreamSynthesize` already guards `!audioRef.current` in its early-return at the top, so `audioRef.current` is non-null here without a second check.

- [ ] **Step 4: Render the notice banner**

In `src/AzureApp.tsx`, immediately after the existing `{error && (...)}` block in the left panel, add:

```tsx
          {notice && (
            <div className="mx-4 p-3 bg-yellow-50 border border-yellow-200 text-yellow-700 rounded-md text-sm">
              {notice}
            </div>
          )}
```

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit -p tsconfig.app.json`
Expected: no output, exit code 0.

- [ ] **Step 6: Verify the REST path is unchanged**

With `npm run dev` running and **Capture viseme events unticked**, enter an API key/region, pick a voice, type text, click **Synthesize**, then click **Stream**.
Expected: both behave exactly as before — audio plays once each, recordings appear in the right panel with timing metrics.

- [ ] **Step 7: Verify the SDK path**

Tick **Capture viseme events**, click **Synthesize**.
Expected: audio plays exactly **once** (if it plays twice, the `null` audioConfig is not taking effect), a recording is saved, and no error banner appears.

- [ ] **Step 8: Confirm visemes reached the database**

```bash
npx tsx -e "import('./server/db.ts').then((m) => console.log(m.default.prepare('SELECT id, audio_duration_ms, length(visemes) AS viseme_bytes FROM recordings ORDER BY created_at DESC LIMIT 1').get()))"
```

Expected: `audio_duration_ms` is a positive integer and `viseme_bytes` is non-null and greater than zero.

- [ ] **Step 9: Commit**

```bash
git add src/AzureApp.tsx
git commit -m "feat: route Azure synthesis through the SDK when capturing visemes"
```

---

## Task 10: Viseme modal

**Files:**
- Create: `src/components/VisemeModal.tsx`

- [ ] **Step 1: Create the component**

Create `src/components/VisemeModal.tsx`:

```tsx
import { useState, useMemo } from 'react';
import type { Recording } from '../types';
import { parseVisemes, visemeDeltas, visemeTimelineMarks } from '../utils/viseme-data';
import type { VisemeFamily } from '../utils/viseme-shapes';
import {
  visemeShape, visemeColor, visemeFamily, FAMILY_COLORS, FAMILY_LABELS,
} from '../utils/viseme-shapes';

/** SVG user units. The strip scales to its container via viewBox + width:100%. */
const TIMELINE_WIDTH = 1000;
const TIMELINE_HEIGHT = 48;
const MARK_WIDTH = 3;

interface VisemeModalProps {
  recording: Recording;
  onClose: () => void;
}

export function VisemeModal({ recording, onClose }: VisemeModalProps) {
  const [copied, setCopied] = useState(false);
  const [hovered, setHovered] = useState<{ offsetMs: number; visemeId: number } | null>(null);

  const visemes = useMemo(() => parseVisemes(recording.visemes), [recording.visemes]);
  const deltas = useMemo(() => visemeDeltas(visemes), [visemes]);
  const durationMs = recording.audio_duration_ms ?? 0;
  const marks = useMemo(
    () => visemeTimelineMarks(visemes, durationMs, TIMELINE_WIDTH),
    [visemes, durationMs],
  );

  const eventsPerSec = durationMs > 0 ? visemes.length / (durationMs / 1000) : 0;

  const familiesPresent = useMemo(() => {
    const set = new Set<VisemeFamily>();
    for (const v of visemes) {
      const family = visemeFamily(v.visemeId);
      if (family) set.add(family);
    }
    return [...set];
  }, [visemes]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(JSON.stringify(visemes, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between p-4 border-b">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold truncate">
              Visemes — {recording.voice_display_name}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {visemes.length} events · {durationMs.toLocaleString()} ms ·{' '}
              {eventsPerSec.toFixed(1)} ev/s
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-xl ml-2 leading-none"
          >
            &times;
          </button>
        </div>

        <div className="flex-1 overflow-auto p-4 space-y-4">
          <div>
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>0 ms</span>
              <span>{durationMs.toLocaleString()} ms</span>
            </div>
            <svg
              viewBox={`0 0 ${TIMELINE_WIDTH} ${TIMELINE_HEIGHT}`}
              preserveAspectRatio="none"
              className="w-full h-12 bg-gray-50 border rounded"
              onMouseLeave={() => setHovered(null)}
            >
              {marks.map((mark, i) => (
                <rect
                  key={i}
                  x={mark.x}
                  y={0}
                  width={MARK_WIDTH}
                  height={TIMELINE_HEIGHT}
                  fill={visemeColor(mark.visemeId)}
                  onMouseEnter={() =>
                    setHovered({ offsetMs: mark.offsetMs, visemeId: mark.visemeId })
                  }
                >
                  <title>
                    {`${mark.offsetMs} ms · id ${mark.visemeId} · ${visemeShape(mark.visemeId)}`}
                  </title>
                </rect>
              ))}
            </svg>
            <p className="text-xs text-gray-500 mt-1 h-4">
              {hovered
                ? `${hovered.offsetMs} ms · id ${hovered.visemeId} · ${visemeShape(hovered.visemeId)}`
                : 'Hover the timeline for event details'}
            </p>
            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
              {familiesPresent.map((family) => (
                <span key={family} className="flex items-center gap-1 text-xs text-gray-600">
                  <span
                    className="inline-block w-2.5 h-2.5 rounded-sm"
                    style={{ backgroundColor: FAMILY_COLORS[family] }}
                  />
                  {FAMILY_LABELS[family]}
                </span>
              ))}
            </div>
          </div>

          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 border-b">
                <th className="py-1 pr-2 font-medium">#</th>
                <th className="py-1 pr-2 font-medium text-right">Offset</th>
                <th className="py-1 pr-2 font-medium text-right">Δms</th>
                <th className="py-1 pr-2 font-medium text-right">ID</th>
                <th className="py-1 font-medium">Mouth shape</th>
              </tr>
            </thead>
            <tbody>
              {visemes.map((viseme, i) => (
                <tr key={i} className="border-b border-gray-100">
                  <td className="py-0.5 pr-2 text-gray-400 tabular-nums">{i + 1}</td>
                  <td className="py-0.5 pr-2 text-right tabular-nums">{viseme.offsetMs} ms</td>
                  <td className="py-0.5 pr-2 text-right tabular-nums text-gray-500">
                    {deltas[i] === null ? '—' : deltas[i]}
                  </td>
                  <td className="py-0.5 pr-2 text-right tabular-nums">
                    <span className="inline-flex items-center gap-1">
                      <span
                        className="inline-block w-2 h-2 rounded-sm"
                        style={{ backgroundColor: visemeColor(viseme.visemeId) }}
                      />
                      {viseme.visemeId}
                    </span>
                  </td>
                  <td className="py-0.5 text-gray-700">{visemeShape(viseme.visemeId)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end p-4 border-t">
          <button
            onClick={handleCopy}
            className="px-4 py-2 bg-gray-600 text-white rounded-md text-sm font-medium hover:bg-gray-700 transition-colors"
          >
            {copied ? 'Copied!' : 'Copy JSON'}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit -p tsconfig.app.json`
Expected: no output, exit code 0. (The component is not referenced anywhere yet — that happens in Task 11.)

- [ ] **Step 3: Commit**

```bash
git add src/components/VisemeModal.tsx
git commit -m "feat: add viseme timeline and event table modal"
```

---

## Task 11: Recordings list button and modal wiring

**Files:**
- Modify: `src/components/RecordingsList.tsx`
- Modify: `src/AzureApp.tsx`

- [ ] **Step 1: Add the prop to `RecordingsList`**

In `src/components/RecordingsList.tsx`, add to the `RecordingsListProps` interface:

```ts
  onShowVisemes: (recording: Recording) => void;
```

and add `onShowVisemes` to the destructured parameter list in the component signature.

- [ ] **Step 2: Add the viseme count lookup**

In `src/components/RecordingsList.tsx`, add after the existing `filtered` `useMemo` block:

```ts
  // Parse each recording's viseme JSON once per list change, not inside the render loop.
  const visemeCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of recordings) {
      if (!r.visemes) continue;
      try {
        const parsed: unknown = JSON.parse(r.visemes);
        if (Array.isArray(parsed)) counts.set(r.id, parsed.length);
      } catch {
        // A malformed value just means no tag for this row.
      }
    }
    return counts;
  }, [recordings]);
```

- [ ] **Step 3: Add the tag and the button**

In `src/components/RecordingsList.tsx`, inside the tag row, after the existing
`{rec.emphasis && <Tag label={`emphasis: ${rec.emphasis}`} />}` line, add:

```tsx
                  {visemeCounts.has(rec.id) && <Tag label={`visemes: ${visemeCounts.get(rec.id)}`} />}
```

And in the button group, after the existing `onShowCode` button, add:

```tsx
                {rec.visemes && (
                  <button
                    onClick={() => onShowVisemes(rec)}
                    className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
                    title="Show visemes"
                  >〰</button>
                )}
```

- [ ] **Step 4: Wire the modal in `AzureApp.tsx`**

Add the import:

```ts
import { VisemeModal } from './components/VisemeModal';
```

Add the state alongside the existing `codeModalConfig` declaration:

```ts
  const [visemeModalRec, setVisemeModalRec] = useState<Recording | null>(null);
```

Add the prop to the `<RecordingsList>` element:

```tsx
            onShowVisemes={setVisemeModalRec}
```

And render the modal after the existing `{codeModalConfig && (...)}` block:

```tsx
      {visemeModalRec && (
        <VisemeModal recording={visemeModalRec} onClose={() => setVisemeModalRec(null)} />
      )}
```

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit -p tsconfig.app.json`
Expected: no output, exit code 0.

- [ ] **Step 6: Verify in the browser**

With `npm run dev` running and at least one viseme-captured recording saved:
1. The card shows a `visemes: N` tag and a `〰` button.
2. Clicking `〰` opens the modal with a coloured timeline and a populated table.
3. The table row count equals the tag count equals the header event count.
4. Hovering the timeline updates the detail line beneath it.
5. Clicking the backdrop or `×` closes the modal.
6. **Copy JSON** puts a valid JSON array on the clipboard.
7. Older recordings (no visemes) show neither the tag nor the button.

- [ ] **Step 7: Commit**

```bash
git add src/components/RecordingsList.tsx src/AzureApp.tsx
git commit -m "feat: surface viseme data from the recordings list"
```

---

## Task 12: Full verification

**Files:** none modified

- [ ] **Step 1: Run the full test suite**

Run: `npm test`
Expected: all suites pass — `ssml.test.ts`, `code-generator.test.ts`, `viseme-shapes.test.ts`, `viseme-data.test.ts`.

- [ ] **Step 2: Typecheck and build**

Run: `npm run build`
Expected: `✓ built in <N>ms`, no TypeScript errors.

- [ ] **Step 3: Work through the manual checklist**

With `npm run dev` running, confirm each of these and record the actual result:

1. Capture **off** → Synthesize and Stream behave exactly as before; no `〰` button on the new recordings.
2. Capture **on** → Synthesize plays the audio **once**, not twice.
3. Capture **on** → Stream plays progressively (audio starts before synthesis finishes); both TTFB and Total appear on the card.
4. Modal timeline mark count, table row count, and card tag count all agree.
5. Same text at `rate=medium` vs `rate=fast` produces visibly different event density in the timeline, and the faster one reports a shorter duration.
6. Custom voice mode with capture on synthesizes successfully.
7. A deliberately wrong API key with capture on shows the red error banner and saves **no** recording.

- [ ] **Step 4: Verify no stray files**

Run: `git status --short`
Expected: clean, or only intended changes. In particular there must be no probe or scratch files under `src/`.

- [ ] **Step 5: Commit any final fixes**

If steps 1–4 surfaced problems, fix them and commit:

```bash
git add -A
git commit -m "fix: <what was actually wrong>"
```

---

## Self-review notes

**Spec coverage** — every spec section maps to a task:

| Spec section | Task |
|---|---|
| Constraint / SDK dependency | 1 |
| `viseme-shapes.ts` + 7 families + colours | 2 |
| `viseme-data.ts` pure helpers | 3 |
| `mp3-media-source.ts` refactor | 4 |
| DB migration (both columns) | 5 |
| `routes.ts` + `types.ts` plumbing | 6 |
| `captureVisemes` toggle + `AzureSettings` | 7 |
| `azure-viseme-tts.ts` | 8 |
| `AzureApp` branching + notice banner | 9 |
| `VisemeModal` | 10 |
| `RecordingsList` button/tag + wiring | 11 |
| Testing + manual checklist | 2, 3, 12 |
| Show Code (deferred) | none — deliberately out of scope |

**Deliberate test gaps**, both stated in-task with reasoning: `mp3-media-source.ts` (Task 4) and `azure-viseme-tts.ts` (Task 8). Both need `MediaSource` or a live Azure WebSocket, and this repo has no DOM test harness. Their extractable logic lives in the two fully-tested pure modules.

**Type consistency check** — names used identically across tasks: `VisemeEvent` / `ticksToMs` / `parseVisemes` / `visemeDeltas` / `visemeTimelineMarks` (Task 3 → 8, 10, 11); `visemeShape` / `visemeFamily` / `visemeColor` / `FAMILY_COLORS` / `FAMILY_LABELS` / `VisemeFamily` (Task 2 → 10); `createMp3Sink` / `isMediaSourceSupported` / `Mp3Sink` (Task 4 → 8); `synthesizeWithVisemes` / `VisemeSynthesisResult` (Task 8 → 9); `visemes` / `audio_duration_ms` column names (Task 5 → 6, 9, 10, 11); `onShowVisemes` (Task 11 only); `captureVisemes` / `setCaptureVisemes` (Task 7 → 9).
