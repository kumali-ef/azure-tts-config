# Recording Download Button Design

## Overview

Add a download button to every recording item across all 5 TTS tabs (Azure, MiniMax, Qwen3, Cartesia, ElevenLabs). The button triggers a browser-native file download of the audio file using the existing audio endpoint. No server changes required.

## Approach

Use a programmatic anchor element (`<a download="filename" href="url">`) to trigger the download. The `download` attribute forces the browser to save the file with the specified filename rather than navigating to the URL.

## Implementation

### Download Function

Each `*App.tsx` parent component adds a `handleDownloadRecording` function:

```ts
const handleDownloadRecording = (id: string) => {
  const rec = recordings.find((r) => r.id === id);
  if (!rec) return;
  const voiceName = sanitizeFilename(rec.voice_name || rec.voice_id);
  const filename = `{provider}-${voiceName}-${id}.wav`;
  const a = document.createElement('a');
  a.href = `/api/{provider}/recordings/${id}/audio`;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};
```

The `sanitizeFilename` helper converts voice names to safe filenames: lowercase, spaces to hyphens, strip non-alphanumeric characters except hyphens.

### Filename Format

`{provider}-{voiceName}-{id}.wav`

Examples:
- `azure-jenny-a1b2c3d4.wav`
- `minimax-male-1-e5f6g7h8.wav`
- `cartesia-sophia-i9j0k1l2.wav`
- `elevenlabs-rachel-m3n4o5p6.wav`

### Components Modified

#### 5 Recording List Components

Each gets an `onDownload: (id: string) => void` prop added to its Props interface, and a download button added to the action buttons area.

| Component | Button style | Label |
|-----------|-------------|-------|
| `RecordingsList.tsx` (Azure) | Vertical text button: `bg-indigo-100 text-indigo-700` | "Download" |
| `MiniMaxRecordingsList.tsx` | Horizontal icon: `bg-gray-100 hover:bg-gray-200` | "⬇" with title="Download" |
| `Qwen3RecordingsList.tsx` | Horizontal icon: `bg-gray-100 hover:bg-gray-200` | "⬇" with title="Download" |
| `CartesiaRecordingsList.tsx` | Horizontal icon: `bg-gray-100 hover:bg-gray-200` | "⬇" with title="Download" |
| `ElevenLabsRecordingsList.tsx` | Horizontal icon: `bg-gray-100 hover:bg-gray-200` | "⬇" with title="Download" |

Button placement: After the play button, before load config — download is the second-most common action after play.

#### 5 Parent App Components

Each passes `onDownload={handleDownloadRecording}` to its recordings list.

| Parent | Audio URL pattern |
|--------|------------------|
| `AzureApp.tsx` | `/api/recordings/{id}/audio` |
| `MiniMaxApp.tsx` | `/api/minimax/recordings/{id}/audio` |
| `Qwen3App.tsx` | `/api/qwen3/recordings/{id}/audio` |
| `CartesiaApp.tsx` | `/api/cartesia/recordings/{id}/audio` |
| `ElevenLabsApp.tsx` | `/api/elevenlabs/recordings/{id}/audio` |

### Shared Utility

Add a `sanitizeFilename` function to a shared location. Since it's a one-liner, it can go in each App file inline, or be added to a shared utils file.

Place in `src/utils/storage.ts` (already exists as a shared utils file):

```ts
export function sanitizeFilename(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').slice(0, 50);
}
```

## Files Changed

| File | Change |
|------|--------|
| `src/utils/storage.ts` | Add `sanitizeFilename` export |
| `src/components/RecordingsList.tsx` | Add `onDownload` prop + Download button |
| `src/components/minimax/MiniMaxRecordingsList.tsx` | Add `onDownload` prop + ⬇ button |
| `src/components/qwen3/Qwen3RecordingsList.tsx` | Add `onDownload` prop + ⬇ button |
| `src/components/cartesia/CartesiaRecordingsList.tsx` | Add `onDownload` prop + ⬇ button |
| `src/components/elevenlabs/ElevenLabsRecordingsList.tsx` | Add `onDownload` prop + ⬇ button |
| `src/AzureApp.tsx` | Add `handleDownloadRecording` + pass to list |
| `src/MiniMaxApp.tsx` | Add `handleDownloadRecording` + pass to list |
| `src/Qwen3App.tsx` | Add `handleDownloadRecording` + pass to list |
| `src/CartesiaApp.tsx` | Add `handleDownloadRecording` + pass to list |
| `src/ElevenLabsApp.tsx` | Add `handleDownloadRecording` + pass to list |

Total: 11 files modified, 0 files created.

## No Server Changes

All 5 tabs already have `GET /api/{provider}/recordings/:id/audio` endpoints that serve the audio file with the correct MIME type. The browser's `<a download>` mechanism handles the rest.
