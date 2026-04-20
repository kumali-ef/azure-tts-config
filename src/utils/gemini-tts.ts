import type { GeminiVoice } from '../types';

export const GEMINI_VOICES: GeminiVoice[] = [
  { name: 'Zephyr', displayName: 'Zephyr', gender: 'Female', style: 'Bright' },
  { name: 'Puck', displayName: 'Puck', gender: 'Male', style: 'Upbeat' },
  { name: 'Charon', displayName: 'Charon', gender: 'Male', style: 'Informative' },
  { name: 'Kore', displayName: 'Kore', gender: 'Female', style: 'Firm' },
  { name: 'Fenrir', displayName: 'Fenrir', gender: 'Male', style: 'Excitable' },
  { name: 'Leda', displayName: 'Leda', gender: 'Female', style: 'Youthful' },
  { name: 'Orus', displayName: 'Orus', gender: 'Male', style: 'Firm' },
  { name: 'Aoede', displayName: 'Aoede', gender: 'Female', style: 'Breezy' },
  { name: 'Callirrhoe', displayName: 'Callirrhoe', gender: 'Female', style: 'Casual' },
  { name: 'Autonoe', displayName: 'Autonoe', gender: 'Female', style: 'Bright' },
  { name: 'Enceladus', displayName: 'Enceladus', gender: 'Male', style: 'Breathy' },
  { name: 'Iapetus', displayName: 'Iapetus', gender: 'Male', style: 'Clear' },
  { name: 'Umbriel', displayName: 'Umbriel', gender: 'Male', style: 'Easy-going' },
  { name: 'Algieba', displayName: 'Algieba', gender: 'Male', style: 'Informative' },
  { name: 'Despina', displayName: 'Despina', gender: 'Female', style: 'Smooth' },
  { name: 'Erinome', displayName: 'Erinome', gender: 'Female', style: 'Clear' },
  { name: 'Algenib', displayName: 'Algenib', gender: 'Male', style: 'Gravelly' },
  { name: 'Rasalgethi', displayName: 'Rasalgethi', gender: 'Male', style: 'Informative' },
  { name: 'Laomedeia', displayName: 'Laomedeia', gender: 'Female', style: 'Upbeat' },
  { name: 'Achernar', displayName: 'Achernar', gender: 'Male', style: 'Soft' },
  { name: 'Alnilam', displayName: 'Alnilam', gender: 'Male', style: 'Firm' },
  { name: 'Schedar', displayName: 'Schedar', gender: 'Male', style: 'Even' },
  { name: 'Gacrux', displayName: 'Gacrux', gender: 'Male', style: 'Mature' },
  { name: 'Pulcherrima', displayName: 'Pulcherrima', gender: 'Female', style: 'Forward' },
  { name: 'Achird', displayName: 'Achird', gender: 'Male', style: 'Friendly' },
  { name: 'Zubenelgenubi', displayName: 'Zubenelgenubi', gender: 'Male', style: 'Casual' },
  { name: 'Vindemiatrix', displayName: 'Vindemiatrix', gender: 'Female', style: 'Gentle' },
  { name: 'Sadachbia', displayName: 'Sadachbia', gender: 'Male', style: 'Lively' },
  { name: 'Sadaltager', displayName: 'Sadaltager', gender: 'Male', style: 'Knowledgeable' },
  { name: 'Sulafat', displayName: 'Sulafat', gender: 'Female', style: 'Warm' },
];

export interface GeminiSynthesisParams {
  apiKey: string;
  model: string;
  voiceName: string;
  text: string;
}

export interface GeminiSynthesisResult {
  audioBuffer: ArrayBuffer;
  mimeType: string;
}

/** Non-streaming synthesis — server proxies to Gemini generateContent API */
export async function geminiSynthesize(params: GeminiSynthesisParams): Promise<GeminiSynthesisResult> {
  const response = await fetch('/api/gemini/synthesize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      apiKey: params.apiKey,
      model: params.model,
      voiceName: params.voiceName,
      text: params.text,
    }),
  });

  if (!response.ok) {
    let message = `Gemini API error (${response.status})`;
    try {
      const errJson = await response.json();
      message = errJson?.upstreamMessage || errJson?.error || message;
    } catch {
      const text = await response.text();
      if (text) message = `${message}: ${text}`;
    }
    throw new Error(message);
  }

  const mimeType = response.headers.get('X-Audio-Mime-Type') || response.headers.get('Content-Type') || 'audio/wav';
  const audioBuffer = await response.arrayBuffer();

  return { audioBuffer, mimeType };
}
