import { useState, useEffect, useCallback, useRef } from 'react';
import type { FishAudioVoice } from '../types';

export function useFishAudioVoices(apiKey: string) {
  const [voices, setVoices] = useState<FishAudioVoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selfOnly, setSelfOnly] = useState(true);
  const [total, setTotal] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  const fetchVoices = useCallback(async (query: string, self: boolean) => {
    if (!apiKey) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        apiKey,
        pageSize: '20',
        page: '1',
        self: String(self),
      });
      if (query) params.set('search', query);

      const res = await fetch(`/api/fishaudio/voices?${params.toString()}`);
      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.error || `Failed to fetch voices (${res.status})`);
      }
      const data = await res.json();
      setVoices(data.items || []);
      setTotal(data.total || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch voices');
      setVoices([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [apiKey]);

  // Fetch on mount and when selfOnly changes
  useEffect(() => {
    if (apiKey) {
      fetchVoices(search, selfOnly);
    }
  }, [apiKey, selfOnly]); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced search
  const handleSearchChange = useCallback((query: string) => {
    setSearch(query);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchVoices(query, selfOnly);
    }, 300);
  }, [fetchVoices, selfOnly]);

  const handleSelfOnlyChange = useCallback((val: boolean) => {
    setSelfOnly(val);
    setSearch('');
  }, []);

  const retry = useCallback(() => {
    fetchVoices(search, selfOnly);
  }, [fetchVoices, search, selfOnly]);

  return {
    voices,
    loading,
    error,
    search,
    selfOnly,
    total,
    setSearch: handleSearchChange,
    setSelfOnly: handleSelfOnlyChange,
    retry,
  };
}
