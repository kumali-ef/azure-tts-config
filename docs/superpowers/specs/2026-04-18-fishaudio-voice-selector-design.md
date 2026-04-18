# Fish Audio Voice Selector — Design Spec

**Date:** 2026-04-18  
**Scope:** Replace manual reference_id text input with a searchable voice selector fetching from Fish Audio API.

## Problem

The current `FishAudioVoiceInput` component requires users to manually enter a `reference_id` (voice model ID) — a 32-character hex string they need to copy from fish.audio. This is error-prone and has poor discoverability. Other tabs (ElevenLabs, Cartesia) have searchable voice selectors.

## API

**Endpoint:** `GET https://api.fish.audio/model`  
**Auth:** `Authorization: Bearer <token>`  
**Query Parameters:**
- `page_size` (int, default 10) — results per page
- `page_number` (int, default 1) — pagination
- `title` (string | null) — search by title
- `self` (bool, default false) — only user's own voices
- `sort_by` (enum: `score` | `task_count` | `created_at`, default `score`)

**Response:**
```json
{
  "total": 123,
  "items": [{
    "_id": "string",
    "title": "string",
    "description": "string",
    "cover_image": "string",
    "tags": ["string"],
    "languages": ["string"],
    "visibility": "public",
    "author": { "_id": "string", "nickname": "string" },
    "created_at": "ISO-8601",
    "like_count": 123,
    "task_count": 123
  }]
}
```

## Architecture

### Server Route

**`GET /api/fishaudio/voices`** — proxy to Fish Audio model list API.

Query params forwarded: `apiKey` (from header or query), `search` (mapped to `title`), `page` (mapped to `page_number`), `pageSize` (mapped to `page_size`), `self` (boolean).

Returns the JSON response directly (items + total).

### Type Additions

```typescript
export interface FishAudioVoice {
  _id: string;
  title: string;
  description: string;
  tags: string[];
  languages: string[];
  author: { _id: string; nickname: string };
  like_count: number;
  task_count: number;
}
```

### Hook: `useFishAudioVoices(apiKey)`

- State: `voices`, `loading`, `error`, `search`, `selfOnly`, `total`
- On mount with API key: fetches user's own voices (`self=true`) as initial list
- `setSearch(query)`: debounced (300ms), fetches with `title=query`
- `setSelfOnly(bool)`: toggles between user's and public voices, re-fetches
- `retry()`: re-fetch current query
- Fetches from `/api/fishaudio/voices` via GET with query params

### Component: `FishAudioVoiceSelector`

Replaces `FishAudioVoiceInput`. Layout:

1. **Search input** — text input with 🔍 placeholder, cyan focus ring
2. **Toggle** — "My Voices" / "Discovery" small button group
3. **Voice list** — `<select size={8}>` showing filtered voices
   - Format: `{title} — by {author.nickname} — {_id.slice(0,8)}…`
   - Selected voice auto-fills both `referenceId` and `voiceName`
4. **Count** — "{N} voices" / "{N} of {total}" text
5. **Manual ID fallback** — Collapsible "Enter ID manually" with text input (for users who already have a specific reference_id)

### Props (same interface, backward compatible)

```typescript
interface Props {
  apiKey: string;
  voices: FishAudioVoice[];
  loading: boolean;
  error: string | null;
  selfOnly: boolean;
  search: string;
  selectedReferenceId: string;
  voiceName: string;
  onSearchChange: (q: string) => void;
  onSelfOnlyChange: (v: boolean) => void;
  onVoiceChange: (referenceId: string, voiceName: string) => void;
  onManualIdChange: (id: string) => void;
  onVoiceNameChange: (name: string) => void;
  onRetry: () => void;
}
```

## Files Changed

| File | Action | Description |
|------|--------|-------------|
| `server/fishaudio-routes.ts` | Modify | Add `GET /voices` proxy route |
| `src/types.ts` | Modify | Add `FishAudioVoice` interface |
| `src/hooks/useFishAudioVoices.ts` | Create | Voice list hook with search/toggle |
| `src/components/fishaudio/FishAudioVoiceSelector.tsx` | Create | Searchable voice selector component |
| `src/components/fishaudio/FishAudioVoiceInput.tsx` | Delete | Replaced by FishAudioVoiceSelector |
| `src/FishAudioApp.tsx` | Modify | Wire up new hook + component |

## Decisions

- **Default to "My Voices" on load** — user's own voices are the most relevant starting point, and it's a small list
- **Discovery uses server-side search** — Fish Audio has thousands of public voices; client-side filtering won't scale
- **20 results per page** — reasonable default, no pagination UI needed (search narrows results)
- **Debounce 300ms** — prevents excessive API calls while typing
- **Keep manual ID fallback** — power users may have a specific reference_id from fish.audio URL
- **No cover_image display** — keep it text-only to match other voice selectors in the app
