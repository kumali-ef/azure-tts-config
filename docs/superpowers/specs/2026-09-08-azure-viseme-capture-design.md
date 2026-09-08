# Azure Viseme Capture & Display — Design

**Date:** 2026-09-08
**Status:** Approved

## Goal

Capture the Azure TTS `VisemeReceived` event stream during synthesis, persist it with the
recording, and display it for inspection and comparison across voices and prosody settings.

The purpose is **inspection of raw events** — not driving a lip-sync animation. There is no
animated avatar or blendshape preview in this work.

## Constraint that shapes the design

The existing Azure path (`src/utils/azure-tts.ts`) uses the REST endpoint
`https://{region}.tts.speech.microsoft.com/cognitiveservices/v1`, which returns audio bytes
only. `VisemeReceived` is a **Speech SDK** event delivered over Azure's WebSocket protocol.

Capturing visemes therefore requires adding the `microsoft-cognitiveservices-speech-sdk`
dependency and a second synthesis path. This is a new dependency, not a patch to the
existing one.

Azure emits `visemeId` (0–21) and `audioOffset` unconditionally. The optional SSML
`<mstts:viseme>` element only adds an `animation` payload (SVG for `redlips_front`,
~60 fps blendshape frames for `FacialExpression`). We capture **ID + offset only** and emit
no `<mstts:viseme>` element, so `src/utils/ssml.ts` is unchanged and payloads stay ~20 KB.

## Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Transport | Browser Speech SDK, client-side | The app already holds the Azure key in the browser (`useAzureSettings` → localStorage) and synthesizes client-side. Server stays a dumb store. |
| Activation | `Capture viseme events` checkbox in Azure Settings | One toggle; both Synthesize and Stream route through the SDK when on. REST path runs untouched when off, so nothing regresses. No third action button. |
| Storage | `visemes TEXT` JSON column on `recordings` | Matches the existing `break_config` JSON-in-TEXT precedent. One migration line, no new endpoints, no join. |
| Display | Per-recording modal: timeline strip + event table | Reuses the existing modal pattern (`ShowJsonModal`), keeps the recordings list uncluttered. |
| Viseme type | ID + offset only, no `<mstts:viseme>` | Leanest fit for raw-event inspection. Avoids megabyte blendshape payloads that the JSON column could not hold. |

## Architecture

### New: `src/utils/azure-viseme-tts.ts`

```ts
export interface VisemeEvent {
  offsetMs: number;
  visemeId: number;
}

export interface VisemeSynthesisResult {
  buffer: ArrayBuffer;
  visemes: VisemeEvent[];
  audioDurationMs: number;
  ttfbMs: number;
  totalMs: number;
}

export async function synthesizeWithVisemes(
  key: string,
  region: string,
  ssml: string,
  audioElement: HTMLAudioElement,
  opts: { deploymentId?: string; stream: boolean },
): Promise<VisemeSynthesisResult>;
```

Implementation notes:

- `SpeechConfig.fromSubscription(key, region)`.
- `speechConfig.speechSynthesisOutputFormat = Audio16Khz128KBitRateMonoMp3` — matches the
  REST format string `audio-16khz-128kbitrate-mono-mp3` already stored in `output_format`,
  so saved files remain `.mp3`.
- `speechConfig.endpointId = opts.deploymentId` when set — the SDK equivalent of the REST
  `?deploymentId=` query parameter used for Custom Neural Voice.
- `new SpeechSynthesizer(speechConfig, null)` — a `null` audioConfig prevents the SDK from
  opening the default speaker, so playback stays under the existing `audioRef` element.
- `synthesizer.visemeReceived = (_, e) => visemes.push({ offsetMs: ticksToMs(e.audioOffset), visemeId: e.visemeId })`.
  `audioOffset` is in 100-nanosecond ticks; `ticksToMs(t) = Math.round(t / 10000)`.
- `synthesizer.synthesizing` — the first fire stamps `ttfbMs`. When `opts.stream` is true,
  chunks are also appended to the MediaSource sink for progressive playback.
- `speakSsmlAsync` wrapped in a Promise. If `result.reason !== ResultReason.SynthesizingAudioCompleted`,
  throw `result.errorDetails`. (`errorDetails` is a getter on `SynthesisResult`, the base class of
  `SpeechSynthesisResult`. There is no `SpeechSynthesisCancellationDetails` in this SDK's
  synthesis path, so the result property is the correct source.)
- `synthesizer.close()` in a `finally`.
- `audioDurationMs = ticksToMs(result.audioDuration)`.

### New: `src/utils/viseme-data.ts`

The pure, SDK-free half of the logic lives in its own module so the tests never import the
Speech SDK (which would drag browser globals into the Node-based vitest run):

```ts
export interface VisemeEvent { offsetMs: number; visemeId: number }
export function ticksToMs(ticks: number): number;
export function parseVisemes(json: string | null): VisemeEvent[];
export function visemeDeltas(visemes: VisemeEvent[]): (number | null)[];
export function visemeTimelineMarks(
  visemes: VisemeEvent[], durationMs: number, width: number,
): { x: number; visemeId: number; offsetMs: number }[];
```

`azure-viseme-tts.ts` imports `ticksToMs` and the `VisemeEvent` type from here.

### Refactor: `src/utils/mp3-media-source.ts`

The MediaSource pump currently inlined in `synthesizeSpeechStreaming`
(`src/utils/azure-tts.ts:83-125`) moves into a reusable sink:

```ts
export function createMp3Sink(audioElement: HTMLAudioElement): {
  append(chunk: Uint8Array): void;
  end(): void;
  done: Promise<void>;
};
```

Both the REST streaming path and the SDK streaming path use it. Without this, the
`updateend` / `pendingChunks` / `endOfStream` sequencing gets copy-pasted into a second
place. This is the only refactor in scope — it is code we are already touching.

### Changed: `src/AzureApp.tsx`

`handleSynthesize` and `handleStreamSynthesize` each gain one branch on `captureVisemes`:

- **off** — existing `synthesizeSpeech` / `synthesizeSpeechStreaming` calls, unchanged.
- **on** — `synthesizeWithVisemes(key, region, ssml, audioRef.current, { deploymentId, stream })`.

Both branches converge on the same `saveRecording` call, which gains two fields:

```ts
visemes: visemes.length > 0 ? JSON.stringify(visemes) : null,
audio_duration_ms: audioDurationMs,
```

New state: `visemeModalRec: Recording | null`, rendering `<VisemeModal>`.

## Data model

### `server/db.ts`

Two nullable columns, added to both the `CREATE TABLE IF NOT EXISTS recordings` statement
and the existing ALTER-if-missing migration block. The live `tts-recordings.db` contains
data, so the migration path is required, not optional.

```
visemes            TEXT      -- JSON: [{"offsetMs":137,"visemeId":6}, ...]
audio_duration_ms  INTEGER   -- from result.audioDuration; timeline axis length
```

Threaded through `RecordingRow` and `insertStmt` (column list and `VALUES`).

Both columns are written only by the SDK path, but **not** together. The invariant is:

- `audio_duration_ms != null` ⟺ the SDK/WebSocket path ran
- `visemes != null` ⟺ the SDK path ran **and** at least one viseme event arrived

So `visemes != null` implies `audio_duration_ms != null`, and the modal never has to handle
the reverse. The asymmetry is deliberate. An earlier draft gated both on
`visemes.length > 0`, which meant a capture-mode run that yielded no events was
indistinguishable from a REST row while still carrying WebSocket-path timings — silently
corrupting the TTFB comparisons this tool exists to make. `audio_duration_ms` is therefore
the transport marker, surfaced in the recordings list as an `SDK` tag.

### `server/routes.ts`

In the `POST /api/recordings` handler's `insertRecording` call:

```ts
visemes: config.visemes || null,
audio_duration_ms: config.audio_duration_ms ?? null,
```

`useRecordings.saveRecording` needs no change — it already forwards an arbitrary config
object as JSON.

### `src/types.ts`

`Recording` gains:

```ts
visemes: string | null;
audio_duration_ms: number | null;
```

### New: `src/utils/viseme-shapes.ts`

The documented Azure viseme ID → phoneme-group map, 22 entries:

| ID | Shape | ID | Shape | ID | Shape |
|---|---|---|---|---|---|
| 0 | silence | 8 | `o` | 16 | `ʃ tʃ dʒ ʒ` |
| 1 | `æ ə ʌ` | 9 | `aʊ` | 17 | `ð` |
| 2 | `ɑ` | 10 | `ɔɪ` | 18 | `f v` |
| 3 | `ɔ` | 11 | `aɪ` | 19 | `d t n θ` |
| 4 | `ɛ ʊ` | 12 | `h` | 20 | `k g ŋ` |
| 5 | `ɝ` | 13 | `ɹ` | 21 | `p b m` |
| 6 | `j i ɪ` | 14 | `l` | | |
| 7 | `w u` | 15 | `s z` | | |

An unknown ID falls back to the literal string `id N`.

The module also groups the 22 IDs into **seven** articulation families so the timeline uses
a seven-colour scale rather than 22 arbitrary hues. Seven rather than six because IDs 12
(`h`), 13 (`ɹ`) and 14 (`l`) have no home in a vowel/fricative/plosive split; they are
grouped as "glides & liquids" on the grounds that all three are visually open, unclosed
mouth shapes.

| Family | IDs | Colour |
|---|---|---|
| silence | 0 | `#cbd5e1` |
| open vowels | 1, 2, 3, 5 | `#f59e0b` |
| close / rounded vowels | 4, 6, 7, 8 | `#0ea5e9` |
| diphthongs | 9, 10, 11 | `#ec4899` |
| glides & liquids | 12, 13, 14 | `#8b5cf6` |
| fricatives & sibilants | 15, 16, 17, 18 | `#10b981` |
| plosives & nasals | 19, 20, 21 | `#ef4444` |

An ID outside 0–21 has no family and renders in `#64748b`.

### `src/utils/storage.ts` and `src/hooks/useAzureSettings.ts`

New `getStoredCaptureVisemes` / `setStoredCaptureVisemes` following the existing
`getStoredDeploymentId` pattern. `useAzureSettings` exposes `captureVisemes` /
`setCaptureVisemes` alongside `key` and `region`.

## UI

### `src/components/AzureSettings.tsx`

```
Azure Settings
──────────────────────────────
 Key    [••••••••••••••]
 Region [eastus        ]

 [x] Capture viseme events
     Routes synthesis through the
     Speech SDK (WebSocket).
```

### `src/components/RecordingsList.tsx`

- A `〰` button in the per-card button row, rendered **only** when `rec.visemes != null`,
  calling a new `onShowVisemes(rec)` prop.
- A `visemes: 142` entry in the existing `<Tag>` row. The count comes from a
  `useMemo`-built `Map<recordingId, number>` that parses each non-null `visemes` string
  once per `recordings` change — not a `JSON.parse` inside the render loop.

### New: `src/components/VisemeModal.tsx`

Reuses the `ShowJsonModal` shell: fixed overlay, click-outside close, `max-w-3xl`,
`max-h-[80vh]`, flex column with a bordered header and footer.

```
┌─ Visemes — en-US-AvaNeural ──────── × ┐
│ 142 events · 3,240 ms · 43.8 ev/s     │
│                                       │
│ 0ms                             3240ms│
│ ▏█▏▊█▏█▎▏█▊▏█▏▊█▎▏█▏▊█▏█▎▏█▊▏█▏▊█▎    │
│  ↑ hover: 212ms · id 19 · d t n θ     │
│                                       │
│  #   Offset    Δms   ID   Mouth shape │
│  1     0 ms      —    0   silence     │
│  2   137 ms    137    6   j i ɪ       │
│  3   212 ms     75   19   d t n θ     │
│  4   287 ms     75    1   æ ə ʌ       │
│  ⋮                                    │
│                       [ Copy JSON ]   │
└───────────────────────────────────────┘
```

- Header stats: event count, audio duration, events per second.
- Timeline: inline SVG, one 2 px rect per event positioned by `visemeTimelineMarks`, filled
  from the articulation-family colour scale, with a `<title>` child for native hover
  tooltips.
- Table: scrollable, columns #, offset, Δms from previous event, ID, mouth shape.
- Copy JSON button, mirroring `ShowJsonModal`'s copy-with-confirmation behaviour.

All positioning math lives in `visemeTimelineMarks`, keeping the component presentational.
The `dataviz` skill governs the timeline's colour and axis treatment during implementation.

## Error handling

| Case | Behaviour |
|---|---|
| SDK error, bad credentials, WebSocket blocked | Reject with `errorDetails`; surface in the existing red banner in `AzureApp`. **No** recording saved. |
| Synthesis succeeds, zero viseme events received | Save the audio with `visemes = null` and `audio_duration_ms = null`. No `〰` button on the card. Set a new `notice` state in `AzureApp`, rendered in a yellow banner reusing the `bg-yellow-50 border-yellow-200 text-yellow-700` styling of the existing "Enter your Azure API key" message — *not* the red `error` banner, since synthesis did succeed. Text: "Synthesis succeeded but no viseme events were received for this voice." Cleared at the start of the next synthesis. |
| Recordings created before this feature | `visemes` is `null`, button hidden. No backfill. |
| Custom voice with capture on | Routed via `speechConfig.endpointId`; any failure surfaces through the normal error path. |
| Synthesizer lifecycle | `close()` always called in `finally`. Modal unmount performs no async work. |

## Testing

The repo's existing tests (`tests/ssml.test.ts`, `tests/code-generator.test.ts`) are pure
unit tests under vitest with no DOM harness. This work keeps that shape.

- `tests/viseme-shapes.test.ts` — the map has 22 entries; IDs 0–21 all resolve to a
  non-empty label; an out-of-range ID falls back to `id N`; every ID maps to exactly one
  articulation family.
- `tests/visemes.test.ts` — `ticksToMs` rounding (including the 100 ns boundary);
  `visemeTimelineMarks` x-positions for a known input, monotonic ordering, and the
  `durationMs === 0` and empty-array edge cases; Δms computation used by the table,
  including the first row's `—`.

No SDK integration test — that requires live Azure credentials. Manual verification
checklist instead:

1. Capture off → Synthesize and Stream behave exactly as before; no `〰` button appears.
2. Capture on → Synthesize plays once (not twice), recording saves, `〰` button appears.
3. Capture on → Stream plays progressively; TTFB and Total both recorded.
4. Modal timeline event count matches the table row count and the card tag.
5. Same text at `rate=medium` vs `rate=fast` produces visibly different event density.
6. Custom voice mode with capture on synthesizes successfully.

## Explicitly out of scope

- **Show Code / `code-generator.ts` (deferred, to be done later).** `Show Code` does not
  mention visemes regardless of the toggle.

  **Correction:** an earlier draft of this spec claimed the generators emit REST `fetch`
  code. They do not. `code-generator.ts` has exactly two generators — `generatePythonCode`
  (emitting `azure.cognitiveservices.speech`) and `generateNodeCode` (emitting
  `require("microsoft-cognitiveservices-speech-sdk")`) — and `ShowCodeModal` offers
  `json | python | nodejs | ssml`. There is no REST tab. So the generated examples already
  use the same transport as the capture path; what they lack is a
  `synthesizer.visemeReceived = …` assignment, roughly three lines per generator behind the
  existing flag. The gap is much cheaper to close than first assumed.

  Related pre-existing inconsistency, outside this change but now worth recording: neither
  generator sets `speechSynthesisOutputFormat`, so copied example code produces
  `audio-24khz-48kbitrate-mono-mp3` while the recording is labelled
  `audio-16khz-128kbitrate-mono-mp3`. That directly contradicts the "mandatory, not
  cosmetic" comment this change adds to `azure-viseme-tts.ts`. Worth fixing alongside the
  viseme lines.
- Lip-sync or avatar animation preview.
- The `<mstts:viseme>` SSML control and its `animation` payloads (`redlips_front`,
  `FacialExpression`).
- Side-by-side comparison of multiple recordings' timelines.
- Viseme capture for any provider other than Azure.

## Risks — all resolved before planning

Verified against `microsoft-cognitiveservices-speech-sdk@1.51.0` source, not assumed.

1. **`new SpeechSynthesizer(cfg, null)` suppresses default speaker output — confirmed.**
   `distrib/lib/src/sdk/SpeechSynthesizer.js:28-33`:
   ```js
   if (audioConfig !== null) {
       if (audioConfig === undefined) {
           this.audioConfig = (typeof window === "undefined")
               ? undefined : AudioConfig.fromDefaultSpeakerOutput();
       } else { this.audioConfig = audioConfig; }
   }
   ```
   Passing `undefined` (i.e. omitting the argument) would attach the default speaker and
   double-play against `audioRef`. `null` leaves `audioConfig` unset. The `null` is also
   explicitly in the public type: `constructor(speechConfig, audioConfig?: AudioConfig | null)`.
   `result.audioData` is still populated, because audio accumulates on the synthesis turn
   independently of the speaker destination.

2. **`synthesizing`'s `e.result.audioData` is the incremental chunk — confirmed.**
   `SynthesisAdapterBase.js:227` calls `onSynthesizing(connectionMessage.binaryBody)`, the
   raw per-message WebSocket payload. `SpeechSynthesisAdapter.js:26` wraps it with
   `audioOutputFormat.addHeader(audio)`, which is a no-op for MP3 (`AudioOutputFormat.js:183`
   returns `audio` unchanged when `!hasHeader`; only RIFF/WAV formats carry a header). So
   chunks can be appended straight to the MediaSource sink with no slicing.

3. **Vite bundling — non-issue, but the SDK is lazy-loaded.** `vite build` succeeds with no
   config changes. The package's `browser` field already maps `ws`, `fs`, `net`, `tls`,
   `https-proxy-agent` etc. to `false`, which Vite honours, so no `optimizeDeps` entry or
   resolve alias is needed. Presence in the output was confirmed with SDK-unique markers
   (`SpeechSynthesisVisemeEventArgs`, `cognitiveservices/websocket`, `X-ConnectionId`) —
   note that grepping for `SynthesizingAudioCompleted` is a **false positive**, because
   `src/utils/code-generator.ts:40` emits that string in a Show Code template.

   Measured cost of a static import: **372.66 kB → 761.76 kB raw (+389 kB, +104%)** and
   **93.83 kB → 179.16 kB gzip (+85 kB, +91%)**, which also trips Vite's 500 kB chunk
   warning. Because the capture toggle defaults to off, most sessions never need the SDK,
   so `azure-viseme-tts.ts` loads it with a **dynamic `await import(...)`** inside
   `synthesizeWithVisemes`. Vite code-splits it into its own chunk, the main bundle stays
   at 372 kB, and only the first viseme synthesis pays a one-time chunk fetch.

4. **`Audio16Khz128KBitRateMonoMp3` — exact match.** `AudioOutputFormat.js` maps it to
   `"audio-16khz-128kbitrate-mono-mp3"`, identical to the REST `X-Microsoft-OutputFormat`
   header and the stored `output_format`. **Setting it explicitly is mandatory, not
   cosmetic:** `getDefaultOutputFormat()` returns `audio-24khz-48kbitrate-mono-mp3` in a
   browser, so omitting it would silently change the bitrate of SDK-path recordings.
