import { useState, useEffect, useCallback } from 'react';
import type { ElevenLabsVoice } from '../types';
import { fetchElevenLabsVoices } from '../utils/elevenlabs-tts';

export function useElevenLabsVoices(apiKey: string) {
  const [voices, setVoices] = useState<ElevenLabsVoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadVoices = useCallback(async () => {
    if (!apiKey) return;
    setLoading(true);
    setError(null);
    try {
      const result = await fetchElevenLabsVoices(apiKey);
      setVoices(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch voices');
    } finally {
      setLoading(false);
    }
  }, [apiKey]);

  useEffect(() => {
    if (apiKey) {
      loadVoices();
    }
  }, [apiKey, loadVoices]);

  return { voices, loading, error, retry: loadVoices };
}
