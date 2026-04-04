import { AzureVoice } from '../types';

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
  ssml: string
): Promise<ArrayBuffer> {
  const url = `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`;
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
