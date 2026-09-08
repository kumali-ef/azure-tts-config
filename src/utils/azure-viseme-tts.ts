// Type-only: erased at compile time, so it does NOT pull the SDK into the main bundle.
import type { SpeechSynthesisResult } from 'microsoft-cognitiveservices-speech-sdk';
import type { VisemeEvent } from './viseme-data';
import { ticksToMs } from './viseme-data';
import { createMp3Sink, isMediaSourceSupported } from './mp3-media-source';

export interface VisemeSynthesisResult {
  buffer: ArrayBuffer;
  visemes: VisemeEvent[];
  audioDurationMs: number;
  ttfbMs: number;
  totalMs: number;
}

/**
 * Synthesizes via the Speech SDK so `visemeReceived` events can be captured. The REST
 * endpoint used by `azure-tts.ts` returns audio bytes only and cannot emit visemes.
 */
export async function synthesizeWithVisemes(
  key: string,
  region: string,
  ssml: string,
  audioElement: HTMLAudioElement,
  opts: { deploymentId?: string; stream: boolean },
): Promise<VisemeSynthesisResult> {
  // Loaded on demand: a static import adds ~389 kB raw / ~85 kB gzip to the main bundle,
  // and the capture toggle defaults to off, so most sessions never need it. Vite
  // code-splits this into its own chunk automatically.
  const sdk = await import('microsoft-cognitiveservices-speech-sdk');

  const speechConfig = sdk.SpeechConfig.fromSubscription(key, region);

  // Mandatory, not cosmetic: the browser default is audio-24khz-48kbitrate-mono-mp3, which
  // would not match the output_format recorded for REST-path recordings.
  speechConfig.speechSynthesisOutputFormat =
    sdk.SpeechSynthesisOutputFormat.Audio16Khz128KBitRateMonoMp3;

  // SDK equivalent of the REST ?deploymentId= query parameter (Custom Neural Voice).
  if (opts.deploymentId) {
    speechConfig.endpointId = opts.deploymentId;
  }

  // The `null` is load-bearing. Omitting this argument makes the SDK attach the default
  // speaker output, which would play the audio a second time alongside `audioElement`.
  const synthesizer = new sdk.SpeechSynthesizer(speechConfig, null);

  const visemes: VisemeEvent[] = [];
  const startTime = performance.now();
  let ttfbMs = 0;
  let firstChunk = true;

  const sink = opts.stream && isMediaSourceSupported() ? createMp3Sink(audioElement) : null;

  synthesizer.visemeReceived = (_sender, e) => {
    visemes.push({ offsetMs: ticksToMs(e.audioOffset), visemeId: e.visemeId });
  };

  synthesizer.synthesizing = (_sender, e) => {
    // `audioData` here is the incremental chunk off the WebSocket, header-free for MP3,
    // so it can go straight into the sink.
    const chunk = new Uint8Array(e.result.audioData);
    if (chunk.length === 0) return;
    if (firstChunk) {
      ttfbMs = Math.round(performance.now() - startTime);
      firstChunk = false;
      if (sink) audioElement.play();
    }
    if (sink) sink.append(chunk);
  };

  try {
    const result = await new Promise<SpeechSynthesisResult>((resolve, reject) => {
      synthesizer.speakSsmlAsync(ssml, resolve, (e) => reject(new Error(e)));
    });

    if (result.reason !== sdk.ResultReason.SynthesizingAudioCompleted) {
      throw new Error(result.errorDetails || 'Speech SDK synthesis did not complete');
    }

    if (sink) {
      sink.end();
      await sink.done;
    } else {
      const blob = new Blob([result.audioData], { type: 'audio/mpeg' });
      audioElement.src = URL.createObjectURL(blob);
      audioElement.play();
      if (firstChunk) {
        ttfbMs = Math.round(performance.now() - startTime);
      }
    }

    return {
      buffer: result.audioData,
      visemes,
      audioDurationMs: ticksToMs(result.audioDuration),
      ttfbMs,
      totalMs: Math.round(performance.now() - startTime),
    };
  } finally {
    synthesizer.close();
  }
}
