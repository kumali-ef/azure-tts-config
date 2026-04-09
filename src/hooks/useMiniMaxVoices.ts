import { useState, useEffect, useCallback } from 'react';
import type { MiniMaxVoice } from '../types';
import { fetchMiniMaxVoices } from '../utils/minimax-tts';

export function useMiniMaxVoices(apiKey: string, groupId: string) {
  const [voices, setVoices] = useState<MiniMaxVoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadVoices = useCallback(async () => {
    if (!apiKey) return;
    setLoading(true);
    setError(null);
    try {
      const result = await fetchMiniMaxVoices(apiKey, groupId || undefined);
      setVoices(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch voices');
    } finally {
      setLoading(false);
    }
  }, [apiKey, groupId]);

  useEffect(() => {
    if (apiKey) {
      loadVoices();
    }
  }, [apiKey, groupId, loadVoices]);

  return { voices, loading, error, retry: loadVoices };
}
