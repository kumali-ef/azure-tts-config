# Aliyun DashScope Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all MiniMax direct API calls with Aliyun DashScope equivalents, update UI to remove GroupId and show new model names.

**Architecture:** The API client (`minimax-tts.ts`) is the only file that talks to MiniMax. All other changes are configuration/UI plumbing: removing GroupId, updating model names, updating the default config. Server-side recording storage is untouched.

**Tech Stack:** TypeScript, React, Vite, vitest

---

### Task 1: Update API client — endpoint, request body, and sync synthesis

**Files:**
- Modify: `src/utils/minimax-tts.ts:1-101`

- [ ] **Step 1: Update endpoint and params interface**

In `src/utils/minimax-tts.ts`, replace the API base URL and remove `groupId` from the params interface:

```typescript
import type { MiniMaxVoice } from '../types';

const DASHSCOPE_API_URL = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation';

export interface MiniMaxSynthesisParams {
  apiKey: string;
  model: string;
  text: string;
  voiceId: string;
  speed?: number;
  vol?: number;
  pitch?: number;
  emotion?: string;
  languageBoost?: string;
  voiceModifyTimbre?: number;
  voiceModifyIntensity?: number;
  voiceModifySoundEffect?: string;
}
```

- [ ] **Step 2: Rewrite `buildRequestBody` to use Aliyun `input` wrapper**

Replace the `buildRequestBody` function. The key change: all synthesis parameters move inside an `input` object, the `stream` field is removed (streaming is controlled by a header instead), and `output_format`/`language_boost`/`voice_modify` move inside `input`:

```typescript
function buildRequestBody(params: MiniMaxSynthesisParams) {
  const input: Record<string, unknown> = {
    text: params.text,
    voice_setting: {
      voice_id: params.voiceId,
      speed: params.speed ?? 1.0,
      vol: params.vol ?? 1.0,
      pitch: params.pitch ?? 0,
      ...(params.emotion ? { emotion: params.emotion } : {}),
    },
    audio_setting: {
      sample_rate: 32000,
      bitrate: 128000,
      format: 'mp3',
      channel: 1,
    },
    output_format: 'hex',
    subtitle_enable: false,
  };

  if (params.languageBoost) {
    input.language_boost = params.languageBoost;
  }

  const hasVoiceModify =
    (params.voiceModifyTimbre && params.voiceModifyTimbre !== 0) ||
    (params.voiceModifyIntensity && params.voiceModifyIntensity !== 0) ||
    params.voiceModifySoundEffect;

  if (hasVoiceModify) {
    input.voice_modify = {
      ...(params.voiceModifyTimbre ? { pitch: params.voiceModifyTimbre } : {}),
      ...(params.voiceModifyIntensity ? { intensity: params.voiceModifyIntensity } : {}),
      ...(params.voiceModifySoundEffect ? { sound_effects: params.voiceModifySoundEffect } : {}),
    };
  }

  return {
    model: params.model,
    input,
  };
}
```

- [ ] **Step 3: Rewrite `miniMaxSynthesize` for Aliyun response shape**

Replace the `miniMaxSynthesize` function. Changes: single URL (no GroupId), response navigates through `json.output`:

```typescript
/** Synchronous synthesis — returns full audio buffer */
export async function miniMaxSynthesize(params: MiniMaxSynthesisParams): Promise<ArrayBuffer> {
  const response = await fetch(DASHSCOPE_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${params.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(buildRequestBody(params)),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`MiniMax API error (${response.status}): ${text}`);
  }

  const json = await response.json();

  if (json.output?.base_resp?.status_code !== 0) {
    throw new Error(`MiniMax API error: ${json.output?.base_resp?.status_msg || 'Unknown error'}`);
  }

  if (!json.output?.data?.audio) {
    throw new Error('MiniMax API returned no audio data');
  }

  return hexToArrayBuffer(json.output.data.audio);
}
```

- [ ] **Step 4: Verify the project builds**

Run: `cd /Users/kumali/EFProjects/tts-config-test && npx tsc --noEmit`

Expected: Build succeeds (there will be no callers of `groupId` yet since MiniMaxApp still passes it — that's fixed in Task 5).

Note: The build may show errors about `groupId` being passed from `MiniMaxApp.tsx`. That's expected and will be resolved in Task 5. As long as the `minimax-tts.ts` file itself has no internal type errors, this step is fine.

- [ ] **Step 5: Commit**

```bash
git add src/utils/minimax-tts.ts
git commit -m "refactor: update sync synthesis to use Aliyun DashScope endpoint

- Replace api.minimaxi.com with dashscope.aliyuncs.com
- Wrap synthesis params in input object per Aliyun API spec
- Navigate response through output.data.audio and output.base_resp
- Remove groupId from MiniMaxSynthesisParams

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 2: Update streaming synthesis and voice fetching

**Files:**
- Modify: `src/utils/minimax-tts.ts:103-267`

- [ ] **Step 1: Rewrite `miniMaxSynthesizeStreaming` for Aliyun**

Replace the `miniMaxSynthesizeStreaming` function. Changes: single URL (no GroupId), streaming controlled by `X-DashScope-SSE: enable` header instead of `stream: true` in body, response chunks navigate through `chunk.output`:

```typescript
/** Streaming synthesis — plays audio as it arrives, returns metrics + full buffer */
export async function miniMaxSynthesizeStreaming(
  params: MiniMaxSynthesisParams,
  audioElement: HTMLAudioElement,
): Promise<StreamingResult> {
  const startTime = performance.now();
  let ttfbMs = 0;

  const response = await fetch(DASHSCOPE_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${params.apiKey}`,
      'Content-Type': 'application/json',
      'X-DashScope-SSE': 'enable',
    },
    body: JSON.stringify(buildRequestBody(params)),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`MiniMax API error (${response.status}): ${text}`);
  }

  if (!response.body) {
    throw new Error('No response body for streaming');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const audioChunks: ArrayBuffer[] = [];
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed === 'data: [DONE]') continue;

      // Remove SSE "data:" prefix
      const jsonStr = trimmed.startsWith('data:') ? trimmed.slice(5).trim() : trimmed;

      try {
        const chunk = JSON.parse(jsonStr);
        if (chunk.output?.data?.audio) {
          const audioBuffer = hexToArrayBuffer(chunk.output.data.audio);
          if (ttfbMs === 0) {
            ttfbMs = Math.round(performance.now() - startTime);
          }
          audioChunks.push(audioBuffer);
        }
        if (chunk.output?.base_resp?.status_code !== 0 && chunk.output?.base_resp?.status_code !== undefined) {
          throw new Error(`MiniMax streaming error: ${chunk.output?.base_resp?.status_msg || 'Unknown error'}`);
        }
      } catch (e) {
        if (e instanceof SyntaxError) continue;
        throw e;
      }
    }
  }

  const totalMs = Math.round(performance.now() - startTime);

  // Concatenate all chunks
  const totalLength = audioChunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
  const fullBuffer = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of audioChunks) {
    fullBuffer.set(new Uint8Array(chunk), offset);
    offset += chunk.byteLength;
  }

  // Play the full audio
  const blob = new Blob([fullBuffer], { type: 'audio/mpeg' });
  const audioUrl = URL.createObjectURL(blob);
  audioElement.src = audioUrl;
  audioElement.play();

  return {
    ttfbMs: ttfbMs || totalMs,
    totalMs,
    buffer: fullBuffer.buffer as ArrayBuffer,
  };
}
```

- [ ] **Step 2: Rewrite `fetchMiniMaxVoices` for Aliyun**

Replace the `fetchMiniMaxVoices` function. Changes: uses the unified endpoint with `action: "get_voice"` inside `input`, response navigates through `json.output`, no `groupId` parameter:

```typescript
/** Fetch available voices from Aliyun DashScope Voice Management API */
export async function fetchMiniMaxVoices(apiKey: string): Promise<MiniMaxVoice[]> {
  const response = await fetch(DASHSCOPE_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'MiniMax/speech-2.8-turbo',
      input: {
        action: 'get_voice',
        voice_type: 'all',
      },
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Voice API error (${response.status}): ${text}`);
  }

  const json = await response.json();

  if (json.output?.base_resp?.status_code !== 0) {
    throw new Error(`Voice API error: ${json.output?.base_resp?.status_msg || 'Unknown error'}`);
  }

  const voices: MiniMaxVoice[] = [];

  if (json.output?.system_voice) {
    for (const v of json.output.system_voice) {
      voices.push({
        voice_id: v.voice_id,
        voice_name: v.voice_name || v.voice_id,
        description: v.description || [],
        created_time: v.created_time,
        category: 'system',
      });
    }
  }

  if (json.output?.voice_cloning) {
    for (const v of json.output.voice_cloning) {
      voices.push({
        voice_id: v.voice_id,
        voice_name: v.voice_name || v.voice_id,
        description: v.description || [],
        created_time: v.created_time,
        category: 'cloned',
      });
    }
  }

  if (json.output?.voice_generation) {
    for (const v of json.output.voice_generation) {
      voices.push({
        voice_id: v.voice_id,
        voice_name: v.voice_name || v.voice_id,
        description: v.description || [],
        created_time: v.created_time,
        category: 'generated',
      });
    }
  }

  return voices;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/utils/minimax-tts.ts
git commit -m "refactor: update streaming synthesis and voice fetching for Aliyun DashScope

- Use X-DashScope-SSE header for streaming instead of stream:true in body
- Navigate streaming chunks through output.data.audio
- Rewrite fetchMiniMaxVoices to use unified endpoint with action:get_voice
- Remove groupId parameter from fetchMiniMaxVoices

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 3: Update settings hook and UI — remove GroupId

**Files:**
- Modify: `src/hooks/useMiniMaxSettings.ts:1-16`
- Modify: `src/components/minimax/MiniMaxSettings.tsx:1-37`

- [ ] **Step 1: Simplify `useMiniMaxSettings` — remove groupId**

Replace the entire file content of `src/hooks/useMiniMaxSettings.ts`:

```typescript
import { useState, useEffect } from 'react';

const STORAGE_KEY_API_KEY = 'minimax-api-key';

export function useMiniMaxSettings() {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem(STORAGE_KEY_API_KEY) || '');

  useEffect(() => { localStorage.setItem(STORAGE_KEY_API_KEY, apiKey); }, [apiKey]);

  const isConfigured = !!apiKey;

  return { apiKey, setApiKey, isConfigured };
}
```

- [ ] **Step 2: Simplify `MiniMaxSettings.tsx` — remove GroupId field, update label**

Replace the entire file content of `src/components/minimax/MiniMaxSettings.tsx`:

```tsx
interface Props {
  apiKey: string;
  onApiKeyChange: (value: string) => void;
}

export function MiniMaxSettings({ apiKey, onApiKeyChange }: Props) {
  return (
    <div className="p-4 space-y-3">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          API Key <span className="text-red-500">*</span>
        </label>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => onApiKeyChange(e.target.value)}
          placeholder="Enter DashScope API Key"
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useMiniMaxSettings.ts src/components/minimax/MiniMaxSettings.tsx
git commit -m "refactor: remove GroupId from settings, update label for Minimax@Aliyun

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 4: Update voices hook — remove groupId parameter

**Files:**
- Modify: `src/hooks/useMiniMaxVoices.ts:1-31`

- [ ] **Step 1: Remove groupId from hook**

Replace the entire file content of `src/hooks/useMiniMaxVoices.ts`:

```typescript
import { useState, useEffect, useCallback } from 'react';
import type { MiniMaxVoice } from '../types';
import { fetchMiniMaxVoices } from '../utils/minimax-tts';

export function useMiniMaxVoices(apiKey: string) {
  const [voices, setVoices] = useState<MiniMaxVoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadVoices = useCallback(async () => {
    if (!apiKey) return;
    setLoading(true);
    setError(null);
    try {
      const result = await fetchMiniMaxVoices(apiKey);
      setVoices(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch voices');
    } finally {
      setLoading(false);
    }
  }, [apiKey]);

  useEffect(() => {
    if (apiKey) {
      loadVoices();
    }
  }, [apiKey, loadVoices]);

  return { voices, loading, error, retry: loadVoices };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useMiniMaxVoices.ts
git commit -m "refactor: remove groupId from useMiniMaxVoices hook

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 5: Update model selector and default config

**Files:**
- Modify: `src/components/minimax/ModelSelector.tsx:1-6`
- Modify: `src/types.ts:109-124`

- [ ] **Step 1: Update model list in `ModelSelector.tsx`**

Replace the `MODELS` array at the top of `src/components/minimax/ModelSelector.tsx` (lines 1-6):

```typescript
const MODELS = [
  { id: 'MiniMax/speech-2.8-hd', label: 'MiniMax/speech-2.8-hd', desc: 'High quality (2.8)' },
  { id: 'MiniMax/speech-2.8-turbo', label: 'MiniMax/speech-2.8-turbo', desc: 'Fast (2.8)' },
  { id: 'MiniMax/speech-02-hd', label: 'MiniMax/speech-02-hd', desc: 'High quality (02)' },
  { id: 'MiniMax/speech-02-turbo', label: 'MiniMax/speech-02-turbo', desc: 'Fast (02)' },
];
```

- [ ] **Step 2: Update default model in `types.ts`**

In `src/types.ts`, change the `DEFAULT_MINIMAX_CONFIG` model value from `'speech-2.8-hd'` to `'MiniMax/speech-2.8-turbo'`:

```typescript
export const DEFAULT_MINIMAX_CONFIG: MiniMaxConfig = {
  model: 'MiniMax/speech-2.8-turbo',
  voiceId: '',
  voiceName: '',
  text: '',
  speed: 1.0,
  vol: 1.0,
  pitch: 0,
  emotion: '',
  languageBoost: '',
  voiceModifyTimbre: 0,
  voiceModifyIntensity: 0,
  voiceModifySoundEffect: '',
  customVoiceId: '',
  useCustomVoice: false,
};
```

- [ ] **Step 3: Commit**

```bash
git add src/components/minimax/ModelSelector.tsx src/types.ts
git commit -m "refactor: update model list and default to MiniMax/speech-2.8-turbo

- Replace 2.6 models with speech-02 variants
- Add MiniMax/ prefix to all model IDs
- Default model is now MiniMax/speech-2.8-turbo

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 6: Update MiniMaxApp — wire up all changes

**Files:**
- Modify: `src/MiniMaxApp.tsx`

- [ ] **Step 1: Remove groupId from settings destructuring (line 38)**

Change line 38 from:
```typescript
  const { apiKey, setApiKey, groupId, setGroupId, isConfigured } = useMiniMaxSettings();
```
to:
```typescript
  const { apiKey, setApiKey, isConfigured } = useMiniMaxSettings();
```

- [ ] **Step 2: Remove groupId from useMiniMaxVoices call (line 39)**

Change line 39 from:
```typescript
  const { voices, loading: voicesLoading, error: voicesError, retry } = useMiniMaxVoices(apiKey, groupId);
```
to:
```typescript
  const { voices, loading: voicesLoading, error: voicesError, retry } = useMiniMaxVoices(apiKey);
```

- [ ] **Step 3: Remove groupId from buildParams (lines 52-66)**

Replace the `buildParams` function:
```typescript
  const buildParams = (): MiniMaxSynthesisParams => ({
    apiKey,
    model: config.model,
    text: config.text,
    voiceId: config.useCustomVoice ? config.customVoiceId : config.voiceId,
    speed: config.speed,
    vol: config.vol,
    pitch: config.pitch,
    emotion: config.emotion || undefined,
    languageBoost: config.languageBoost || undefined,
    voiceModifyTimbre: config.voiceModifyTimbre || undefined,
    voiceModifyIntensity: config.voiceModifyIntensity || undefined,
    voiceModifySoundEffect: config.voiceModifySoundEffect || undefined,
  });
```

- [ ] **Step 4: Update Accordion title and MiniMaxSettings props (lines 142-149)**

Change the settings Accordion from:
```tsx
        <Accordion title="MiniMax Settings">
          <MiniMaxSettings
            apiKey={apiKey}
            groupId={groupId}
            onApiKeyChange={setApiKey}
            onGroupIdChange={setGroupId}
          />
        </Accordion>
```
to:
```tsx
        <Accordion title="Minimax@Aliyun">
          <MiniMaxSettings
            apiKey={apiKey}
            onApiKeyChange={setApiKey}
          />
        </Accordion>
```

- [ ] **Step 5: Update `is28Model` check (line 136)**

The model names now start with `MiniMax/`, so `startsWith('speech-2.8')` no longer matches. Change:
```typescript
  const is28Model = config.model.startsWith('speech-2.8');
```
to:
```typescript
  const is28Model = config.model.includes('speech-2.8');
```

- [ ] **Step 6: Verify the full project builds**

Run: `cd /Users/kumali/EFProjects/tts-config-test && npx tsc --noEmit`

Expected: No errors. All groupId references are now removed across the entire codebase.

- [ ] **Step 7: Run existing tests**

Run: `cd /Users/kumali/EFProjects/tts-config-test && npm test`

Expected: All existing tests pass (the existing tests are for Azure TTS SSML, not MiniMax).

- [ ] **Step 8: Commit**

```bash
git add src/MiniMaxApp.tsx
git commit -m "refactor: wire MiniMaxApp to Aliyun DashScope, remove all groupId references

- Remove groupId from settings, voices hook, and buildParams
- Update Accordion title to Minimax@Aliyun
- Remove groupId/setGroupId props from MiniMaxSettings

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```
