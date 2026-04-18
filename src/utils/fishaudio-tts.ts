export interface FishAudioSynthesisParams {
  apiKey: string;
  model: string;
  text: string;
  referenceId?: string;
  chunkLength?: number;
  normalize?: boolean;
  latency?: string;
  temperature?: number;
  topP?: number;
  speed?: number;
  volume?: number;
}

function buildRequestBody(params: FishAudioSynthesisParams) {
  const body: Record<string, unknown> = {
    text: params.text,
  };

  if (params.referenceId) {
    body.reference_id = params.referenceId;
  }
  if (params.chunkLength != null) {
    body.chunk_length = params.chunkLength;
  }
  if (params.normalize != null) {
    body.normalize = params.normalize;
  }
  if (params.latency) {
    body.latency = params.latency;
  }
  if (params.temperature != null) {
    body.temperature = params.temperature;
  }
  if (params.topP != null) {
    body.top_p = params.topP;
  }

  const hasProsody = (params.speed != null && params.speed !== 1.0) ||
    (params.volume != null && params.volume !== 0);
  if (hasProsody) {
    body.prosody = {
      speed: params.speed ?? 1.0,
      volume: params.volume ?? 0,
    };
  }

  return body;
}

/** Non-streaming synthesis — server proxies to Fish Audio, returns WAV bytes */
export async function fishAudioSynthesize(params: FishAudioSynthesisParams): Promise<ArrayBuffer> {
  const response = await fetch('/api/fishaudio/synthesize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      apiKey: params.apiKey,
      model: params.model,
      body: buildRequestBody(params),
    }),
  });

  if (!response.ok) {
    let message = `Fish Audio API error (${response.status})`;
    try {
      const errJson = await response.json();
      message = errJson?.upstreamMessage || errJson?.error || message;
    } catch {
      const text = await response.text();
      if (text) message = `${message}: ${text}`;
    }
    throw new Error(message);
  }

  return response.arrayBuffer();
}

export interface StreamingResult {
  ttfbMs: number;
  totalMs: number;
  buffer: ArrayBuffer;
}

/** Streaming synthesis — reads WAV stream, tracks TTFB, returns full buffer */
export async function fishAudioSynthesizeStreaming(
  params: FishAudioSynthesisParams,
  audioElement: HTMLAudioElement,
): Promise<StreamingResult> {
  const startTime = performance.now();
  let ttfbMs = 0;

  const response = await fetch('/api/fishaudio/synthesize-stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      apiKey: params.apiKey,
      model: params.model,
      body: buildRequestBody(params),
    }),
  });

  if (!response.ok) {
    let message = `Fish Audio streaming API error (${response.status})`;
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
  const chunks: Uint8Array[] = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    if (value && value.byteLength > 0) {
      if (ttfbMs === 0) {
        ttfbMs = Math.round(performance.now() - startTime);
      }
      chunks.push(value);
    }
  }

  const totalMs = Math.round(performance.now() - startTime);

  // Concatenate all chunks — Fish Audio returns complete WAV
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
  const fullBuffer = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    fullBuffer.set(chunk, offset);
    offset += chunk.byteLength;
  }

  const wavBuffer = fullBuffer.buffer as ArrayBuffer;
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
