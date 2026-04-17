import { useState, useEffect, useCallback, useRef } from 'react';
import type { InworldVoice } from '../types';
import { fetchInworldVoices } from '../utils/inworld-tts';

export function useInworldVoices(apiKey: string) {
  const [voices, setVoices] = useState<InworldVoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastKey = useRef('');

  const load = useCallback(async (key: string) => {
    if (!key.trim()) {
      setVoices([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await fetchInworldVoices(key);
      setVoices(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load voices');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (apiKey !== lastKey.current) {
      lastKey.current = apiKey;
      load(apiKey);
    }
  }, [apiKey, load]);

  const retry = useCallback(() => load(apiKey), [apiKey, load]);

  return { voices, loading, error, retry };
}
