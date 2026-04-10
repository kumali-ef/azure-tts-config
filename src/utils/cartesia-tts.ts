import type { CartesiaVoice } from '../types';

export interface CartesiaSynthesisParams {
  apiKey: string;
  model: string;
  text: string;
  voiceId: string;
  language?: string;
  speed?: number;
  volume?: number;
  emotion?: string;
}

const MP3_OUTPUT_FORMAT = {
  container: 'mp3',
  bit_rate: 128000,
  sample_rate: 44100,
};

function buildRequestBody(params: CartesiaSynthesisParams) {
  const body: Record<string, unknown> = {
    model_id: params.model,
    transcript: params.text,
    voice: { mode: 'id', id: params.voiceId },
    output_format: MP3_OUTPUT_FORMAT,
  };

  if (params.language) {
    body.language = params.language;
  }

  const generationConfig: Record<string, unknown> = {};
  if (params.speed != null && params.speed !== 1.0) generationConfig.speed = params.speed;
  if (params.volume != null && params.volume !== 1.0) generationConfig.volume = params.volume;
  if (params.emotion) generationConfig.emotion = params.emotion;

  if (Object.keys(generationConfig).length > 0) {
    body.generation_config = generationConfig;
  }

  return body;
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer as ArrayBuffer;
}

/** Non-streaming synthesis — server proxies to Cartesia /tts/bytes, returns raw audio */
export async function cartesiaSynthesize(params: CartesiaSynthesisParams): Promise<ArrayBuffer> {
  const response = await fetch('/api/cartesia/synthesize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      apiKey: params.apiKey,
      body: buildRequestBody(params),
    }),
  });

  if (!response.ok) {
    let message = `Cartesia API error (${response.status})`;
    try {
      const errJson = await response.json();
      message = errJson?.upstreamMessage || errJson?.error || message;
    } catch {
      const text = await response.text();
      if (text) message = `${message}: ${text}`;
    }
    throw new Error(message);
  }

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('audio/')) {
    return response.arrayBuffer();
  }

  const json = await response.json();
  throw new Error(`Unexpected response format: ${JSON.stringify(json).slice(0, 200)}`);
}

export interface StreamingResult {
  ttfbMs: number;
  totalMs: number;
  buffer: ArrayBuffer;
}

/** Streaming synthesis — parses base64 SSE chunks, returns metrics + full buffer */
export async function cartesiaSynthesizeStreaming(
  params: CartesiaSynthesisParams,
  audioElement: HTMLAudioElement,
): Promise<StreamingResult> {
  const startTime = performance.now();
  let ttfbMs = 0;

  const response = await fetch('/api/cartesia/synthesize-stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      apiKey: params.apiKey,
      body: buildRequestBody(params),
    }),
  });

  if (!response.ok) {
    let message = `Cartesia streaming API error (${response.status})`;
    try {
      const errJson = await response.json();
      message = errJson?.upstreamMessage || errJson?.error || message;
    } catch {
      const text = await response.text();
      if (text) message = `${message}: ${text}`;
    }
    throw new Error(message);
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
      if (!trimmed || trimmed === 'event: done' || trimmed.startsWith('event:')) continue;

      const jsonStr = trimmed.startsWith('data:') ? trimmed.slice(5).trim() : null;
      if (!jsonStr || jsonStr === '{}') continue;

      try {
        const chunk = JSON.parse(jsonStr);
        // Cartesia SSE returns { data: "<base64-audio>", ... }
        if (chunk.data && typeof chunk.data === 'string') {
          const audioBuffer = base64ToArrayBuffer(chunk.data);
          if (ttfbMs === 0) {
            ttfbMs = Math.round(performance.now() - startTime);
          }
          audioChunks.push(audioBuffer);
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

/** Fetch available voices from Cartesia API */
export async function fetchCartesiaVoices(apiKey: string): Promise<CartesiaVoice[]> {
  const response = await fetch(`/api/cartesia/voices?apiKey=${encodeURIComponent(apiKey)}`);

  if (!response.ok) {
    let message = `Cartesia voices API error (${response.status})`;
    try {
      const errJson = await response.json();
      message = errJson?.upstreamMessage || errJson?.error || message;
    } catch {
      const text = await response.text();
      if (text) message = `${message}: ${text}`;
    }
    throw new Error(message);
  }

  return response.json();
}

/** All available emotion values for Cartesia sonic-3 */
export const CARTESIA_EMOTIONS = [
  'neutral', 'angry', 'excited', 'content', 'sad', 'scared',
  'happy', 'enthusiastic', 'elated', 'euphoric', 'triumphant',
  'amazed', 'surprised', 'flirtatious', 'joking/comedic', 'curious',
  'peaceful', 'serene', 'calm', 'grateful', 'affectionate',
  'trust', 'sympathetic', 'anticipation', 'mysterious',
  'mad', 'outraged', 'frustrated', 'agitated', 'threatened',
  'disgusted', 'contempt', 'envious', 'sarcastic', 'ironic',
  'dejected', 'melancholic', 'disappointed', 'hurt', 'guilty',
  'bored', 'tired', 'rejected', 'nostalgic', 'wistful',
  'apologetic', 'hesitant', 'insecure', 'confused', 'resigned',
  'anxious', 'panicked', 'alarmed',
  'proud', 'confident', 'distant', 'skeptical', 'contemplative', 'determined',
];

/** All 42 supported languages with display names */
export const CARTESIA_LANGUAGES: { code: string; name: string }[] = [
  { code: 'en', name: 'English' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'es', name: 'Spanish' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ja', name: 'Japanese' },
  { code: 'hi', name: 'Hindi' },
  { code: 'it', name: 'Italian' },
  { code: 'ko', name: 'Korean' },
  { code: 'nl', name: 'Dutch' },
  { code: 'pl', name: 'Polish' },
  { code: 'ru', name: 'Russian' },
  { code: 'sv', name: 'Swedish' },
  { code: 'tr', name: 'Turkish' },
  { code: 'tl', name: 'Tagalog' },
  { code: 'bg', name: 'Bulgarian' },
  { code: 'ro', name: 'Romanian' },
  { code: 'ar', name: 'Arabic' },
  { code: 'cs', name: 'Czech' },
  { code: 'el', name: 'Greek' },
  { code: 'fi', name: 'Finnish' },
  { code: 'hr', name: 'Croatian' },
  { code: 'ms', name: 'Malay' },
  { code: 'sk', name: 'Slovak' },
  { code: 'da', name: 'Danish' },
  { code: 'ta', name: 'Tamil' },
  { code: 'uk', name: 'Ukrainian' },
  { code: 'hu', name: 'Hungarian' },
  { code: 'no', name: 'Norwegian' },
  { code: 'vi', name: 'Vietnamese' },
  { code: 'bn', name: 'Bengali' },
  { code: 'th', name: 'Thai' },
  { code: 'he', name: 'Hebrew' },
  { code: 'ka', name: 'Georgian' },
  { code: 'id', name: 'Indonesian' },
  { code: 'te', name: 'Telugu' },
  { code: 'gu', name: 'Gujarati' },
  { code: 'kn', name: 'Kannada' },
  { code: 'ml', name: 'Malayalam' },
  { code: 'mr', name: 'Marathi' },
  { code: 'pa', name: 'Punjabi' },
];
