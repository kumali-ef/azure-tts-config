import type { AzureVoice } from '../types';

export async function fetchVoices(key: string, region: string): Promise<AzureVoice[]> {
  const url = `https://${region}.tts.speech.microsoft.com/cognitiveservices/voices/list`;
  const response = await fetch(url, {
    headers: {
      'Ocp-Apim-Subscription-Key': key,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch voices: ${response.status} - ${errorText}`);
  }

  return response.json();
}

export async function synthesizeSpeech(
  key: string,
  region: string,
  ssml: string,
  deploymentId?: string
): Promise<ArrayBuffer> {
  const baseUrl = `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`;
  const url = deploymentId ? `${baseUrl}?deploymentId=${encodeURIComponent(deploymentId)}` : baseUrl;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': key,
      'Content-Type': 'application/ssml+xml',
      'X-Microsoft-OutputFormat': 'audio-16khz-128kbitrate-mono-mp3',
    },
    body: ssml,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Synthesis failed: ${response.status} - ${errorText}`);
  }

  return response.arrayBuffer();
}

export interface StreamingResult {
  ttfbMs: number;
  totalMs: number;
  buffer: ArrayBuffer;
}

export async function synthesizeSpeechStreaming(
  key: string,
  region: string,
  ssml: string,
  audioElement: HTMLAudioElement,
  deploymentId?: string
): Promise<StreamingResult> {
  const baseUrl = `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`;
  const url = deploymentId ? `${baseUrl}?deploymentId=${encodeURIComponent(deploymentId)}` : baseUrl;
  const startTime = performance.now();

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': key,
      'Content-Type': 'application/ssml+xml',
      'X-Microsoft-OutputFormat': 'audio-16khz-128kbitrate-mono-mp3',
    },
    body: ssml,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Synthesis failed: ${response.status} - ${errorText}`);
  }

  const reader = response.body!.getReader();
  const chunks: Uint8Array[] = [];
  let ttfbMs = 0;
  let firstChunk = true;

  // Try MediaSource for streaming playback
  if (typeof MediaSource !== 'undefined' && MediaSource.isTypeSupported('audio/mpeg')) {
    const mediaSource = new MediaSource();
    audioElement.src = URL.createObjectURL(mediaSource);

    await new Promise<void>((resolve, reject) => {
      mediaSource.addEventListener('sourceopen', async () => {
        const sourceBuffer = mediaSource.addSourceBuffer('audio/mpeg');
        const pendingChunks: Uint8Array[] = [];
        let streamDone = false;

        const appendNext = () => {
          if (pendingChunks.length > 0 && !sourceBuffer.updating) {
            sourceBuffer.appendBuffer(pendingChunks.shift()!.buffer as ArrayBuffer);
          } else if (streamDone && pendingChunks.length === 0 && !sourceBuffer.updating) {
            if (mediaSource.readyState === 'open') {
              mediaSource.endOfStream();
            }
            resolve();
          }
        };

        sourceBuffer.addEventListener('updateend', appendNext);

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            if (firstChunk) {
              ttfbMs = Math.round(performance.now() - startTime);
              firstChunk = false;
              audioElement.play();
            }
            chunks.push(value);
            pendingChunks.push(value);
            appendNext();
          }
          streamDone = true;
          appendNext();
        } catch (err) {
          reject(err);
        }
      }, { once: true });
    });
  } else {
    // Fallback: buffer everything, then play
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (firstChunk) {
        ttfbMs = Math.round(performance.now() - startTime);
        firstChunk = false;
      }
      chunks.push(value);
    }
    const fullBuffer = concatChunks(chunks);
    const blob = new Blob([fullBuffer], { type: 'audio/mpeg' });
    audioElement.src = URL.createObjectURL(blob);
    audioElement.play();
  }

  const totalMs = Math.round(performance.now() - startTime);
  return { ttfbMs, totalMs, buffer: concatChunks(chunks) };
}

function concatChunks(chunks: Uint8Array[]): ArrayBuffer {
  const totalLength = chunks.reduce((sum, c) => sum + c.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result.buffer;
}
