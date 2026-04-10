import { useState, useEffect, useCallback } from 'react';
import type { CartesiaVoice } from '../types';
import { fetchCartesiaVoices } from '../utils/cartesia-tts';

export function useCartesiaVoices(apiKey: string) {
  const [voices, setVoices] = useState<CartesiaVoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadVoices = useCallback(async () => {
    if (!apiKey) return;
    setLoading(true);
    setError(null);
    try {
      const result = await fetchCartesiaVoices(apiKey);
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
