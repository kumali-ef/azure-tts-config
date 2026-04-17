import type { ElevenLabsVoice } from '../types';

export interface ElevenLabsSynthesisParams {
  apiKey: string;
  model: string;
  text: string;
  voiceId: string;
  languageCode?: string;
  stability?: number;
  similarityBoost?: number;
  style?: number;
  useSpeakerBoost?: boolean;
  speed?: number;
}

const SAMPLE_RATE = 24000;
const BITS_PER_SAMPLE = 16;
const NUM_CHANNELS = 1;

function buildRequestBody(params: ElevenLabsSynthesisParams) {
  const body: Record<string, unknown> = {
    text: params.text,
    model_id: params.model,
    voice_settings: {
      stability: params.stability ?? 0.5,
      similarity_boost: params.similarityBoost ?? 0.75,
      style: params.style ?? 0.0,
      use_speaker_boost: params.useSpeakerBoost ?? true,
      speed: params.speed ?? 1.0,
    },
  };

  if (params.languageCode) {
    body.language_code = params.languageCode;
  }

  return body;
}

function pcmS16ToWav(pcmBuffer: ArrayBuffer, sampleRate: number): ArrayBuffer {
  const bitsPerSample = BITS_PER_SAMPLE;
  const numChannels = NUM_CHANNELS;
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const dataSize = pcmBuffer.byteLength;
  const wavBuffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(wavBuffer);

  // RIFF header
  view.setUint32(0, 0x52494646, false); // "RIFF"
  view.setUint32(4, 36 + dataSize, true);
  view.setUint32(8, 0x57415645, false); // "WAVE"

  // fmt chunk
  view.setUint32(12, 0x666d7420, false); // "fmt "
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // 1 = PCM integer
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);

  // data chunk
  view.setUint32(36, 0x64617461, false); // "data"
  view.setUint32(40, dataSize, true);
  new Uint8Array(wavBuffer, 44).set(new Uint8Array(pcmBuffer));

  return wavBuffer;
}

/** Non-streaming synthesis — server proxies to ElevenLabs, returns raw PCM */
export async function elevenLabsSynthesize(params: ElevenLabsSynthesisParams): Promise<ArrayBuffer> {
  const response = await fetch('/api/elevenlabs/synthesize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      apiKey: params.apiKey,
      voiceId: params.voiceId,
      body: buildRequestBody(params),
    }),
  });

  if (!response.ok) {
    let message = `ElevenLabs API error (${response.status})`;
    try {
      const errJson = await response.json();
      message = errJson?.upstreamMessage || errJson?.error || message;
    } catch {
      const text = await response.text();
      if (text) message = `${message}: ${text}`;
    }
    throw new Error(message);
  }

  const rawPcmBuffer = await response.arrayBuffer();
  return pcmS16ToWav(rawPcmBuffer, SAMPLE_RATE);
}

export interface StreamingResult {
  ttfbMs: number;
  totalMs: number;
  buffer: ArrayBuffer;
}

/** Streaming synthesis — reads raw PCM chunks, returns metrics + full WAV buffer */
export async function elevenLabsSynthesizeStreaming(
  params: ElevenLabsSynthesisParams,
  audioElement: HTMLAudioElement,
): Promise<StreamingResult> {
  const startTime = performance.now();
  let ttfbMs = 0;

  const response = await fetch('/api/elevenlabs/synthesize-stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      apiKey: params.apiKey,
      voiceId: params.voiceId,
      body: buildRequestBody(params),
    }),
  });

  if (!response.ok) {
    let message = `ElevenLabs streaming API error (${response.status})`;
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
  const audioChunks: Uint8Array[] = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    if (value && value.byteLength > 0) {
      if (ttfbMs === 0) {
        ttfbMs = Math.round(performance.now() - startTime);
      }
      audioChunks.push(value);
    }
  }

  const totalMs = Math.round(performance.now() - startTime);

  // Concatenate all chunks
  const totalLength = audioChunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
  const fullBuffer = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of audioChunks) {
    fullBuffer.set(chunk, offset);
    offset += chunk.byteLength;
  }

  const wavBuffer = pcmS16ToWav(fullBuffer.buffer as ArrayBuffer, SAMPLE_RATE);

  // Play the full audio as WAV
  const blob = new Blob([wavBuffer], { type: 'audio/wav' });
  const audioUrl = URL.createObjectURL(blob);
  audioElement.src = audioUrl;
  audioElement.play();

  return {
    ttfbMs: ttfbMs || totalMs,
    totalMs,
    buffer: wavBuffer,
  };
}

/** Fetch available voices from ElevenLabs API */
export async function fetchElevenLabsVoices(apiKey: string): Promise<ElevenLabsVoice[]> {
  const response = await fetch(`/api/elevenlabs/voices?apiKey=${encodeURIComponent(apiKey)}`);

  if (!response.ok) {
    let message = `ElevenLabs voices API error (${response.status})`;
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

/** Common languages for the optional language_code field */
export const ELEVENLABS_LANGUAGES: { code: string; name: string }[] = [
  { code: 'en', name: 'English' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'es', name: 'Spanish' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'it', name: 'Italian' },
  { code: 'nl', name: 'Dutch' },
  { code: 'pl', name: 'Polish' },
  { code: 'ru', name: 'Russian' },
  { code: 'sv', name: 'Swedish' },
  { code: 'tr', name: 'Turkish' },
  { code: 'ar', name: 'Arabic' },
  { code: 'hi', name: 'Hindi' },
  { code: 'id', name: 'Indonesian' },
  { code: 'th', name: 'Thai' },
  { code: 'vi', name: 'Vietnamese' },
  { code: 'cs', name: 'Czech' },
  { code: 'el', name: 'Greek' },
  { code: 'fi', name: 'Finnish' },
  { code: 'hu', name: 'Hungarian' },
  { code: 'ro', name: 'Romanian' },
  { code: 'da', name: 'Danish' },
  { code: 'no', name: 'Norwegian' },
  { code: 'uk', name: 'Ukrainian' },
];
