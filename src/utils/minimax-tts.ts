import type { MiniMaxVoice } from '../types';

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

function hexToArrayBuffer(hex: string): ArrayBuffer {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes.buffer as ArrayBuffer;
}

/** Synchronous synthesis — returns full audio buffer */
export async function miniMaxSynthesize(params: MiniMaxSynthesisParams): Promise<ArrayBuffer> {
  const response = await fetch('/api/minimax/synthesize', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      apiKey: params.apiKey,
      body: buildRequestBody(params),
    }),
  });

  if (!response.ok) {
    let message = `MiniMax API error (${response.status})`;
    try {
      const errJson = await response.json();
      const upstreamCode = errJson?.upstreamCode ? ` [${errJson.upstreamCode}]` : '';
      const upstreamMessage = errJson?.upstreamMessage;
      message = upstreamMessage
        ? `${errJson?.error || message}${upstreamCode}: ${upstreamMessage}`
        : (errJson?.error || message);
    } catch {
      const text = await response.text();
      if (text) message = `${message}: ${text}`;
    }
    throw new Error(message);
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

export interface StreamingResult {
  ttfbMs: number;
  totalMs: number;
  buffer: ArrayBuffer;
}

/** Streaming synthesis — plays audio as it arrives, returns metrics + full buffer */
export async function miniMaxSynthesizeStreaming(
  params: MiniMaxSynthesisParams,
  audioElement: HTMLAudioElement,
): Promise<StreamingResult> {
  const startTime = performance.now();
  let ttfbMs = 0;

  const response = await fetch('/api/minimax/synthesize-stream', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      apiKey: params.apiKey,
      body: buildRequestBody(params),
    }),
  });

  if (!response.ok) {
    let message = `MiniMax streaming API error (${response.status})`;
    try {
      const errJson = await response.json();
      const upstreamCode = errJson?.upstreamCode ? ` [${errJson.upstreamCode}]` : '';
      const upstreamMessage = errJson?.upstreamMessage;
      message = upstreamMessage
        ? `${errJson?.error || message}${upstreamCode}: ${upstreamMessage}`
        : (errJson?.error || message);
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

  // DashScope SSE for MiniMax may send accumulated output (each event contains
  // all audio up to that point) rather than incremental chunks. Detect this by
  // checking if the last chunk alone is >= half the total — if so, the last
  // chunk already contains the complete audio; use it instead of the concatenation.
  let finalBuffer = fullBuffer;
  if (audioChunks.length > 1) {
    const lastChunkSize = audioChunks[audioChunks.length - 1].byteLength;
    if (lastChunkSize >= totalLength / 2) {
      console.warn(
        `[MiniMax] Detected accumulated SSE output: ${audioChunks.length} chunks, ` +
        `last chunk ${lastChunkSize}B of total ${totalLength}B — using last chunk only`
      );
      finalBuffer = new Uint8Array(audioChunks[audioChunks.length - 1]);
    }
  }

  // Play the full audio
  const blob = new Blob([finalBuffer], { type: 'audio/mpeg' });
  const audioUrl = URL.createObjectURL(blob);
  audioElement.src = audioUrl;
  audioElement.play();

  return {
    ttfbMs: ttfbMs || totalMs,
    totalMs,
    buffer: finalBuffer.buffer as ArrayBuffer,
  };
}

/** Fetch available voices from Aliyun DashScope Voice Management API */
export async function fetchMiniMaxVoices(apiKey: string): Promise<MiniMaxVoice[]> {
  const response = await fetch('/api/minimax/voices', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      apiKey,
      model: 'MiniMax/speech-2.8-turbo',
    }),
  });

  if (!response.ok) {
    let message = `Voice API error (${response.status})`;
    try {
      const errJson = await response.json();
      const upstreamCode = errJson?.upstreamCode ? ` [${errJson.upstreamCode}]` : '';
      const upstreamMessage = errJson?.upstreamMessage || errJson?.details?.output?.base_resp?.status_msg;
      message = upstreamMessage
        ? `${errJson?.error || message}${upstreamCode}: ${upstreamMessage}`
        : (errJson?.error || message);
    } catch {
      const text = await response.text();
      if (text) message = `${message}: ${text}`;
    }
    throw new Error(message);
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
