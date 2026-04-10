# Qwen3-TTS Config Tester — Design Spec

## Problem

Add a new "Qwen3 TTS" tab to the existing TTS config tester app. Qwen3-TTS is Alibaba's latest text-to-speech service on the Aliyun DashScope platform. It uses the same API endpoint as the existing MiniMax TTS integration, but with a simpler parameter set and different response formats.

## Approach

Mirror the existing MiniMax TTS implementation pattern (tab + hooks + components + server routes + DB) with Qwen3-specific adaptations. Both services share the DashScope infrastructure, so the proxy pattern and streaming mechanism are reused.

## API Details

### Endpoint

Same DashScope endpoint as MiniMax:
```
POST https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation
```

### Authentication

```
Authorization: Bearer $DASHSCOPE_API_KEY
```

### Non-streaming Request

```json
{
  "model": "qwen3-tts-flash",
  "input": {
    "text": "Hello world",
    "voice": "Cherry",
    "language_type": "English"
  }
}
```

**Response:** Returns a JSON body containing `output.audio.url` — a URL to the generated audio file (valid 24h). The server must download from this URL and return the audio bytes to the client.

### Streaming Request

Add header: `X-DashScope-SSE: enable`

Same request body as non-streaming. Response is SSE with base64-encoded audio chunks in each event's `output.audio.data` field.

### Instruct Model

When using `qwen3-tts-instruct-flash`, two additional parameters are available:

```json
{
  "model": "qwen3-tts-instruct-flash",
  "input": {
    "text": "...",
    "voice": "Cherry",
    "language_type": "Auto",
    "instructions": "语速较快，带有明显的上扬语调，适合介绍时尚产品。",
    "optimize_instructions": true
  }
}
```

- `instructions` (string, optional): Natural language description of desired speech style — tone, speed, emotion, character. Max 1600 tokens. Only Chinese and English supported.
- `optimize_instructions` (boolean, optional, default false): When true, system rewrites the instructions for better synthesis quality.

## Models

| Model ID | Description |
|----------|-------------|
| `qwen3-tts-flash` | Standard TTS, cost-effective, multi-language |
| `qwen3-tts-instruct-flash` | Instruct-controlled TTS with natural language style control |

## Voices

Static hardcoded list of ~35 system voices. Each voice has:
- `voice` parameter value (e.g. `Cherry`)
- Display name in Chinese (e.g. 芊悦)
- Description
- Gender (male/female)
- Supported languages
- Supported models list

Voice selector filters voices by the currently selected model. For example, `Jennifer` is only available on `qwen3-tts-flash`, not `qwen3-tts-instruct-flash`.

### Full Voice List

| voice | name | gender | description | models |
|-------|------|--------|-------------|--------|
| Cherry | 芊悦 | F | 阳光积极、亲切自然小姐姐 | flash, instruct-flash |
| Serena | 苏瑶 | F | 温柔小姐姐 | flash, instruct-flash |
| Ethan | 晨煦 | M | 阳光、温暖、活力、朝气 | flash, instruct-flash |
| Chelsie | 千雪 | F | 二次元虚拟女友 | flash, instruct-flash |
| Momo | 茉兔 | F | 撒娇搞怪 | flash, instruct-flash |
| Vivian | 十三 | F | 拽拽的、可爱的小暴躁 | flash, instruct-flash |
| Moon | 月白 | M | 率性帅气 | flash, instruct-flash |
| Maia | 四月 | F | 知性与温柔的碰撞 | flash, instruct-flash |
| Kai | 凯 | M | 耳朵的一场SPA | flash, instruct-flash |
| Nofish | 不吃鱼 | M | 不会翘舌音的设计师 | flash, instruct-flash |
| Bella | 萌宝 | F | 喝酒不打醉拳的小萝莉 | flash, instruct-flash |
| Eldric Sage | 沧明子 | M | 沉稳睿智的老者 | flash, instruct-flash |
| Mia | 乖小妹 | F | 温顺如春水 | flash, instruct-flash |
| Mochi | 沙小弥 | M | 聪明伶俐的小大人 | flash, instruct-flash |
| Bellona | 燕铮莺 | F | 声音洪亮 | flash, instruct-flash |
| Vincent | 田叔 | M | 沙哑烟嗓 | flash, instruct-flash |
| Bunny | 萌小姬 | F | "萌属性"爆棚的小萝莉 | flash, instruct-flash |
| Neil | 阿闻 | M | 新闻主持人 | flash, instruct-flash |
| Elias | 墨讲师 | F | 讲师 | flash, instruct-flash |
| Arthur | 徐大爷 | M | 质朴嗓音 | flash, instruct-flash |
| Nini | 邻家妹妹 | F | 甜蜜嗓音 | flash, instruct-flash |
| Seren | 小婉 | F | 温和舒缓 | flash, instruct-flash |
| Pip | 顽屁小孩 | M | 调皮捣蛋 | flash, instruct-flash |
| Stella | 少女阿月 | F | 甜到发腻 | flash, instruct-flash |
| Jennifer | 詹妮弗 | F | 电影质感美语女声 | flash only |
| Ryan | 甜茶 | M | 节奏拉满 | flash only |
| Katerina | 卡捷琳娜 | F | 御姐音色 | flash only |
| Aiden | 艾登 | M | 美语大男孩 | flash only |
| Bodega | 博德加 | M | 热情的西班牙大叔 | flash only |
| Sonrisa | 索尼莎 | F | 热情开朗的拉美大姐 | flash only |
| Alek | 阿列克 | M | 战斗民族 | flash only |
| Dolce | 多尔切 | M | 慵懒的意大利大叔 | flash only |
| Sohee | 素熙 | F | 韩国欧尼 | flash only |
| Ono Anna | 小野杏 | F | 鬼灵精怪 | flash only |
| Lenn | 莱恩 | M | 德国青年 | flash only |
| Emilien | 埃米尔安 | M | 浪漫的法国大哥哥 | flash only |
| Andre | 安德雷 | M | 声音磁性 | flash only |
| Radio Gol | 拉迪奥·戈尔 | M | 足球解说 | flash only |
| Jada | 上海-阿珍 | F | 沪上阿姐 (上海话) | flash only |
| Dylan | 北京-晓东 | M | 北京少年 (北京话) | flash only |
| Li | 南京-老李 | M | 瑜伽老师 (南京话) | flash only |
| Marcus | 陕西-秦川 | M | 老陕 (陕西话) | flash only |
| Roy | 闽南-阿杰 | M | 台湾哥仔 (闽南语) | flash only |
| Peter | 天津-李彼得 | M | 天津相声 (天津话) | flash only |
| Sunny | 四川-晴儿 | F | 川妹子 (四川话) | flash only |
| Eric | 四川-程川 | M | 成都男子 (四川话) | flash only |
| Rocky | 粤语-阿强 | M | 幽默风趣 (粤语) | flash only |
| Kiki | 粤语-阿清 | F | 甜美港妹 (粤语) | flash only |

## Architecture

### Frontend

#### New Files

```
src/
├── Qwen3App.tsx                    # Main tab component
├── utils/
│   └── qwen3-tts.ts                # API client functions
├── hooks/
│   ├── useQwen3Settings.ts         # API key (localStorage)
│   ├── useQwen3Voices.ts           # Static voice list + model filtering
│   └── useQwen3Recordings.ts       # CRUD recordings
└── components/
    └── qwen3/
        ├── Qwen3Settings.tsx        # API key input
        ├── Qwen3ModelSelector.tsx    # 2-model selector
        ├── Qwen3VoiceSelector.tsx    # Searchable, model-filtered voice list
        ├── Qwen3LanguageType.tsx     # Auto + 10 language dropdown
        ├── Qwen3Instructions.tsx     # Instructions textarea + optimize toggle (instruct model only)
        └── Qwen3RecordingsList.tsx   # Recording history
```

#### Modified Files

- `src/App.tsx` — Add `'qwen3'` to Tab union type, add tab button + conditional render
- `src/types.ts` — Add `Qwen3Config`, `Qwen3Recording`, `Qwen3Voice` types

### Backend

#### New Files

```
server/
├── qwen3-routes.ts     # Express router with proxy + recording CRUD
└── qwen3-db.ts         # SQLite operations for qwen3_recordings table
```

#### Modified Files

- `server/index.ts` — Register `qwen3Router` at `/api/qwen3`

### Types

```typescript
interface Qwen3Config {
  model: string;           // 'qwen3-tts-flash' | 'qwen3-tts-instruct-flash'
  voice: string;           // Voice parameter value (e.g. 'Cherry')
  voiceDisplayName: string;// Display name (e.g. '芊悦')
  text: string;            // Text to synthesize (max 512 tokens)
  languageType: string;    // 'Auto' | 'Chinese' | 'English' | ...
  instructions: string;    // Only for instruct model
  optimizeInstructions: boolean; // Only for instruct model
}

interface Qwen3Voice {
  voice: string;           // API parameter value
  name: string;            // Chinese display name
  gender: 'M' | 'F';
  description: string;
  supportedModels: string[]; // ['qwen3-tts-flash', 'qwen3-tts-instruct-flash']
}

interface Qwen3Recording {
  id: string;
  model: string;
  voice: string;
  voice_display_name: string | null;
  text: string;
  language_type: string;
  instructions: string | null;
  optimize_instructions: boolean | null;
  audio_filename: string;
  api_response_time_ms: number | null;
  stream_duration_ms: number | null;
  created_at: string;
  label: string | null;
}
```

### Database Schema

```sql
CREATE TABLE IF NOT EXISTS qwen3_recordings (
  id TEXT PRIMARY KEY,
  model TEXT NOT NULL,
  voice TEXT NOT NULL,
  voice_display_name TEXT,
  text TEXT NOT NULL,
  language_type TEXT NOT NULL DEFAULT 'Auto',
  instructions TEXT,
  optimize_instructions INTEGER,
  audio_filename TEXT NOT NULL,
  api_response_time_ms INTEGER,
  stream_duration_ms INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  label TEXT
);
```

### Server Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/qwen3/synthesize` | POST | Proxy to DashScope, download audio from returned URL, return bytes |
| `/api/qwen3/synthesize-stream` | POST | Proxy streaming SSE to client |
| `/api/qwen3/recordings` | POST | Save recording (multipart/form-data) |
| `/api/qwen3/recordings` | GET | List all recordings |
| `/api/qwen3/recordings/:id` | GET | Get single recording |
| `/api/qwen3/recordings/:id/audio` | GET | Stream audio file |
| `/api/qwen3/recordings/:id` | DELETE | Delete recording + audio file |
| `/api/qwen3/recordings/:id` | PATCH | Update label |

### Key Differences from MiniMax

1. **Non-streaming synthesis flow**: DashScope returns a JSON with `output.audio.url`. The server must fetch the audio from that URL and pipe it back to the client (vs MiniMax returning hex inline).

2. **Streaming audio format**: Base64-encoded chunks (vs hex for MiniMax). Client decodes base64 instead of hex.

3. **No voice fetch API**: Voices are hardcoded in `useQwen3Voices.ts` with model compatibility metadata. The hook filters by selected model.

4. **Simpler parameters**: No speed/vol/pitch/emotion/voiceModify controls. The instruct model replaces fine-grained controls with natural language instructions.

5. **Instructions field**: Conditionally shown only when `qwen3-tts-instruct-flash` is selected. Includes a textarea and an "Optimize Instructions" checkbox.

### Data Flow

#### Non-streaming Synthesis
```
User clicks "Synthesize"
  → buildRequestBody(config)
  → POST /api/qwen3/synthesize { apiKey, body: { model, input: { text, voice, language_type, ... } } }
  → Server forwards to DashScope
  → DashScope returns { output: { audio: { url: "..." } } }
  → Server fetches audio from URL
  → Server returns audio bytes to client
  → Client creates Blob, plays audio
  → Client saves recording via POST /api/qwen3/recordings (multipart)
```

#### Streaming Synthesis
```
User clicks "Stream & Play"
  → POST /api/qwen3/synthesize-stream { apiKey, body: { ... } }
  → Server forwards with X-DashScope-SSE: enable
  → Server pipes SSE stream to client
  → Client reads base64 chunks from output.audio.data
  → Client decodes base64, accumulates ArrayBuffer chunks
  → Client creates Blob from accumulated chunks, plays audio
  → Client saves recording
```

### UI Layout

The Qwen3App tab mirrors MiniMaxApp's layout with these sections (each in an Accordion):

1. **Settings** — API key (DashScope)
2. **Model** — 2 buttons: qwen3-tts-flash / qwen3-tts-instruct-flash
3. **Voice** — Searchable list showing voice name + Chinese name + description, filtered by selected model
4. **Language** — Dropdown: Auto, Chinese, English, German, Italian, Portuguese, Spanish, Japanese, Korean, French, Russian
5. **Instructions** — (visible only for instruct model) Textarea + "Optimize Instructions" checkbox
6. **Text Input** — Textarea for text to synthesize
7. **Actions** — "Synthesize" + "Stream & Play" buttons
8. **Recordings** — History list with playback, label, delete

### Audio File Storage

Same as MiniMax: files stored in `audio/` directory with naming pattern `qwen3-{uuid}.mp3`.
