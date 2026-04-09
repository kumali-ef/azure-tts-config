import type { MiniMaxVoice } from '../types';

const MINIMAX_API_BASE = 'https://api.minimaxi.com/v1';

export interface MiniMaxSynthesisParams {
  apiKey: string;
  groupId?: string;
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

function buildRequestBody(params: MiniMaxSynthesisParams, stream: boolean) {
  const body: Record<string, unknown> = {
    model: params.model,
    text: params.text,
    stream,
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
    output_format: stream ? 'hex' : 'hex',
  };

  if (params.languageBoost) {
    body.language_boost = params.languageBoost;
  }

  const hasVoiceModify =
    (params.voiceModifyTimbre && params.voiceModifyTimbre !== 0) ||
    (params.voiceModifyIntensity && params.voiceModifyIntensity !== 0) ||
    params.voiceModifySoundEffect;

  if (hasVoiceModify) {
    body.voice_modify = {
      ...(params.voiceModifyTimbre ? { pitch: params.voiceModifyTimbre } : {}),
      ...(params.voiceModifyIntensity ? { intensity: params.voiceModifyIntensity } : {}),
      ...(params.voiceModifySoundEffect ? { sound_effects: params.voiceModifySoundEffect } : {}),
    };
  }

  return body;
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
  const url = params.groupId
    ? `${MINIMAX_API_BASE}/t2a_v2?GroupId=${params.groupId}`
    : `${MINIMAX_API_BASE}/t2a_v2`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${params.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(buildRequestBody(params, false)),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`MiniMax API error (${response.status}): ${text}`);
  }

  const json = await response.json();

  if (json.base_resp?.status_code !== 0) {
    throw new Error(`MiniMax API error: ${json.base_resp?.status_msg || 'Unknown error'}`);
  }

  if (!json.data?.audio) {
    throw new Error('MiniMax API returned no audio data');
  }

  return hexToArrayBuffer(json.data.audio);
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
  const url = params.groupId
    ? `${MINIMAX_API_BASE}/t2a_v2?GroupId=${params.groupId}`
    : `${MINIMAX_API_BASE}/t2a_v2`;

  const startTime = performance.now();
  let ttfbMs = 0;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${params.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(buildRequestBody(params, true)),
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

    // MiniMax streaming returns newline-delimited JSON objects
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed === 'data: [DONE]') continue;

      // Remove "data: " prefix if present
      const jsonStr = trimmed.startsWith('data: ') ? trimmed.slice(6) : trimmed;

      try {
        const chunk = JSON.parse(jsonStr);
        if (chunk.data?.audio) {
          const audioBuffer = hexToArrayBuffer(chunk.data.audio);
          if (ttfbMs === 0) {
            ttfbMs = Math.round(performance.now() - startTime);
          }
          audioChunks.push(audioBuffer);
        }
        if (chunk.base_resp?.status_code !== 0 && chunk.base_resp?.status_code !== undefined) {
          throw new Error(`MiniMax streaming error: ${chunk.base_resp?.status_msg || 'Unknown error'}`);
        }
      } catch (e) {
        if (e instanceof SyntaxError) continue; // skip non-JSON lines
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

/** Fetch available voices from MiniMax Voice Management API */
export async function fetchMiniMaxVoices(apiKey: string, groupId?: string): Promise<MiniMaxVoice[]> {
  const url = groupId
    ? `${MINIMAX_API_BASE}/voice/list?GroupId=${groupId}`
    : `${MINIMAX_API_BASE}/voice/list`;

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`MiniMax Voice API error (${response.status}): ${text}`);
  }

  const json = await response.json();

  if (json.base_resp?.status_code !== 0) {
    throw new Error(`MiniMax Voice API error: ${json.base_resp?.status_msg || 'Unknown error'}`);
  }

  const voices: MiniMaxVoice[] = [];

  if (json.system_voice) {
    for (const v of json.system_voice) {
      voices.push({
        voice_id: v.voice_id,
        voice_name: v.voice_name || v.voice_id,
        description: v.description || [],
        created_time: v.created_time,
        category: 'system',
      });
    }
  }

  if (json.voice_cloning) {
    for (const v of json.voice_cloning) {
      voices.push({
        voice_id: v.voice_id,
        voice_name: v.voice_name || v.voice_id,
        description: v.description || [],
        created_time: v.created_time,
        category: 'cloned',
      });
    }
  }

  if (json.voice_generation) {
    for (const v of json.voice_generation) {
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
