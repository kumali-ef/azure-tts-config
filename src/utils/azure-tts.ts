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

// Plain text synthesis: uses text/plain for custom voices, minimal SSML for standard voices
export async function synthesizePlainText(
  key: string,
  region: string,
  text: string,
  voiceName: string,
  language: string,
  deploymentId?: string
): Promise<ArrayBuffer> {
  const baseUrl = `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`;
  const url = deploymentId ? `${baseUrl}?deploymentId=${encodeURIComponent(deploymentId)}` : baseUrl;

  // Azure only supports text/plain for custom voices (with deploymentId).
  // Standard voices require SSML, so we wrap plain text in a minimal SSML envelope.
  const isCustomVoice = !!deploymentId;
  const headers: Record<string, string> = {
    'Ocp-Apim-Subscription-Key': key,
    'X-Microsoft-OutputFormat': 'audio-16khz-128kbitrate-mono-mp3',
  };

  let body: string;
  if (isCustomVoice) {
    headers['Content-Type'] = 'text/plain';
    headers['X-Microsoft-VoiceName'] = voiceName;
    body = text;
  } else {
    headers['Content-Type'] = 'application/ssml+xml';
    body = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${language}"><voice name="${voiceName}">${text}</voice></speak>`;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Synthesis failed: ${response.status} - ${errorText}`);
  }

  return response.arrayBuffer();
}
