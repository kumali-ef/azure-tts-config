# DashScope Region Configuration

**Date:** 2026-04-12
**Status:** Draft

## Problem

Both MiniMax@Aliyun and Qwen3@Aliyun TTS proxy through a hardcoded DashScope endpoint (`https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation`). Users on the international (Singapore) region need to hit a different DashScope domain (`dashscope-intl.aliyuncs.com`). There is no way to configure this today.

## Solution

Add a region selector dropdown to both MiniMax and Qwen3 settings panels. The selected region is sent to the Express proxy, which resolves the correct DashScope base URL before forwarding the request.

## Region → URL Mapping

| Region | Label | Base URL |
|---|---|---|
| `cn-beijing` | CN - Beijing | `https://dashscope.aliyuncs.com/api/v1` |
| `intl-singapore` | Intl - Singapore | `https://dashscope-intl.aliyuncs.com/api/v1` |

Both regions use the same API path suffix: `/services/aigc/multimodal-generation/generation`

Default: `cn-beijing` (preserves current behavior).

## Architecture

### Data Flow

```
UI (region dropdown) → localStorage → settings hook
                                          ↓
App component → builds params with region
                                          ↓
Client util → sends { apiKey, region, body } to Express proxy
                                          ↓
Server route → resolves region to base URL → fetch(baseUrl + apiPath, ...)
```

### Affected Files

**Client — Settings hooks** (add `region` state + localStorage persistence):
- `src/hooks/useMiniMaxSettings.ts`
- `src/hooks/useQwen3Settings.ts`

**Client — Settings UI** (add region `<select>` dropdown above API key):
- `src/components/minimax/MiniMaxSettings.tsx`
- `src/components/qwen3/Qwen3Settings.tsx`

**Client — TTS utils** (add `region` to synthesis params, include in proxy request body):
- `src/utils/minimax-tts.ts` — `MiniMaxSynthesisParams.region`, passed in `miniMaxSynthesize()`, `miniMaxSynthesizeStreaming()`, `fetchMiniMaxVoices()`
- `src/utils/qwen3-tts.ts` — `Qwen3SynthesisParams.region`, passed in `qwen3Synthesize()`, `qwen3SynthesizeStreaming()`

**Client — App components** (wire region from hook through to params and settings):
- `src/MiniMaxApp.tsx`
- `src/Qwen3App.tsx`

**Server — Route handlers** (replace hardcoded URL with region-based resolution):
- `server/minimax-routes.ts` — `forwardToDashScope()` and `/voices` handler
- `server/qwen3-routes.ts` — `/synthesize` and `/synthesize-stream` handlers

### Region Type

```typescript
type DashScopeRegion = 'cn-beijing' | 'intl-singapore';
```

Defined once in each settings hook file (client) and each routes file (server). No shared types module needed since client and server don't share TypeScript imports.

### Server-Side URL Resolution

```typescript
const DASHSCOPE_BASE_URLS: Record<string, string> = {
  'cn-beijing': 'https://dashscope.aliyuncs.com/api/v1',
  'intl-singapore': 'https://dashscope-intl.aliyuncs.com/api/v1',
};

const API_PATH = '/services/aigc/multimodal-generation/generation';

function getDashScopeUrl(region?: string): string {
  const base = DASHSCOPE_BASE_URLS[region || 'cn-beijing']
    || DASHSCOPE_BASE_URLS['cn-beijing'];
  return base + API_PATH;
}
```

Falls back to `cn-beijing` if region is missing or unrecognized, ensuring backward compatibility.

### UI Design

Each provider's settings component gets a region dropdown placed **above** the API key input:

```
┌─────────────────────────────────┐
│ Region                          │
│ [CN - Beijing          ▾]      │
│                                 │
│ API Key *                       │
│ [••••••••••••••••••]           │
└─────────────────────────────────┘
```

- MiniMax dropdown uses `purple-500` focus ring (matching existing theme)
- Qwen3 dropdown uses `teal-500` focus ring (matching existing theme)
- Each provider stores its region independently in localStorage (`minimax-region` / `qwen3-region`)

### Settings Hook Changes

Each hook expands from:
```typescript
return { apiKey, setApiKey, isConfigured };
```
to:
```typescript
return { region, setRegion, apiKey, setApiKey, isConfigured };
```

### Client Util Changes

Each synthesis params interface gains a `region` field:
```typescript
interface MiniMaxSynthesisParams {
  region?: string;  // defaults to 'cn-beijing' on server
  apiKey: string;
  // ... existing fields
}
```

The region is included in the JSON body sent to the Express proxy:
```typescript
body: JSON.stringify({
  apiKey: params.apiKey,
  region: params.region,
  body: buildRequestBody(params),
})
```

## Testing

Manual testing:
1. Set region to CN - Beijing, enter a valid Beijing API key, synthesize → works as before
2. Set region to Intl - Singapore, enter a valid Singapore API key, synthesize → hits the international endpoint
3. Verify region persists across page reloads (localStorage)
4. Verify MiniMax and Qwen3 regions are independent
5. Verify MiniMax voice fetching also respects the selected region
