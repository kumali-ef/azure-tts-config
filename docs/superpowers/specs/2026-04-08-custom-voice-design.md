# Custom Voice Support — Design Spec

## Problem

The app currently only supports Azure's built-in neural voices. Azure also offers Custom Neural Voice (CNV), which lets users synthesize speech with a custom-trained voice model. Users who have deployed a custom voice in Azure Speech Studio need a way to use it in this app.

## Approach

Add a **Standard / Custom** toggle to the Language & Voice panel. Standard mode works as today. Custom mode replaces the voice list with two input fields: a deployment ID and a custom voice name. The rest of the SSML pipeline (prosody, emphasis, break) works unchanged. Style/Role is hidden for custom voices since they don't expose those capabilities.

## UI Changes

### Language & Voice Panel — Toggle

A tab-like toggle at the top of the Language & Voice accordion:

```
[ Standard ]  [ Custom ]
```

- **Standard** (default): The current voice list, language selector, and filter checkboxes.
- **Custom**: Replaces the voice list area with:
  - **Deployment ID** — text input, placeholder: `Enter deployment ID (GUID from Azure portal)`
  - **Custom Voice Name** — text input, placeholder: `Enter custom voice name`
  - **Language** — a simple text input defaulting to `en-US`, since the SSML `xml:lang` attribute is required. The user can change it to match their custom voice's locale.
  - A brief help note: "Get these from Azure Speech Studio → Custom Voice → Deploy model"

When in custom mode, the language filter, search, and filter checkboxes are hidden since they're irrelevant.

### Style & Role Accordion

When a custom voice is active (custom mode with a voice name entered), the Style & Role accordion is hidden. Custom voices don't expose StyleList or RolePlayList, so there's nothing to configure.

### Recordings List

Custom voice recordings display the custom voice name where the display name normally appears. A small "Custom" badge differentiates them from standard voice recordings.

## API Changes

### `synthesizeSpeech` function (`src/utils/azure-tts.ts`)

Add an optional `deploymentId` parameter. When provided, append it to the API URL:

```
Standard: https://{region}.tts.speech.microsoft.com/cognitiveservices/v1
Custom:   https://{region}.tts.speech.microsoft.com/cognitiveservices/v1?deploymentId={deploymentId}
```

Everything else (auth headers, output format, SSML body) stays the same.

### SSML Generation (`src/utils/ssml.ts`)

No changes needed. The `buildSsml` function already uses `config.voiceName` in the `<voice name="...">` attribute. For custom voices, this will simply be the custom voice name instead of a built-in ShortName.

## Data Model Changes

### Frontend Types (`src/types.ts`)

Add to `TtsConfig`:
```ts
customVoiceMode: boolean;  // false = standard, true = custom
deploymentId: string;       // GUID from Azure portal
```

Add to `Recording`:
```ts
deployment_id: string | null;  // null for standard voices
```

### Database (`server/db.ts`)

Add column to `recordings` table:
```sql
deployment_id TEXT
```

With a migration for existing databases (same pattern as `api_response_time_ms`):
```ts
if (!columns.some((c) => c.name === 'deployment_id')) {
  db.exec('ALTER TABLE recordings ADD COLUMN deployment_id TEXT');
}
```

### Backend Route (`server/routes.ts`)

Accept `deployment_id` from the POST config and include it in the insert.

## Persistence

Custom voice settings (deployment ID, custom voice name) are persisted in localStorage, following the same pattern as the API key and region. This uses the existing `storage.ts` utility with two new key/value pairs.

## State Flow

1. User toggles to "Custom" mode
2. Enters deployment ID and custom voice name (persisted to localStorage)
3. Enters text and adjusts prosody/emphasis/break as desired
4. Clicks Synthesize → `buildSsml` uses the custom voice name → `synthesizeSpeech` appends `?deploymentId=...` to the URL
5. Audio plays and recording is auto-saved with `deployment_id` in the database

## Files Changed

| File | Change |
|---|---|
| `src/types.ts` | Add `customVoiceMode`, `deploymentId` to `TtsConfig`; `deployment_id` to `Recording` |
| `src/utils/storage.ts` | Add get/set for deployment ID and custom voice name |
| `src/utils/azure-tts.ts` | Accept optional `deploymentId` param, modify URL |
| `src/components/VoiceSelector.tsx` | Add Standard/Custom toggle; show input fields in custom mode |
| `src/App.tsx` | Wire custom voice state, pass `deploymentId` to synthesize and save |
| `src/components/RecordingsList.tsx` | Show "Custom" badge for custom voice recordings |
| `server/db.ts` | Add `deployment_id` column + migration |
| `server/routes.ts` | Accept `deployment_id` in POST config |

## Out of Scope

- Custom voice training or management (handled by Azure Speech Studio)
- Custom voice endpoint validation (we trust the user's input)
- Personal Voice feature (different Azure feature with separate API)
