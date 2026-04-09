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
