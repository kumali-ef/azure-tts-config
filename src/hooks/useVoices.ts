import { useState, useEffect, useMemo } from 'react';
import { AzureVoice } from '../types';
import { fetchVoices } from '../utils/azure-tts';

export function useVoices(key: string, region: string) {
  const [voices, setVoices] = useState<AzureVoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [languageFilter, setLanguageFilter] = useState('');

  const loadVoices = async () => {
    if (!key || !region) return;
    setLoading(true);
    setError(null);
    try {
      const result = await fetchVoices(key, region);
      setVoices(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch voices');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (key && region) {
      loadVoices();
    }
  }, [key, region]);

  const languages = useMemo(() => {
    const locales = new Set(voices.map((v) => v.Locale));
    return Array.from(locales).sort();
  }, [voices]);

  const filteredVoices = useMemo(() => {
    return voices.filter((voice) => {
      const matchesLanguage = !languageFilter || voice.Locale === languageFilter;
      const matchesSearch =
        !searchQuery ||
        voice.DisplayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        voice.ShortName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        voice.LocaleName.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesLanguage && matchesSearch;
    });
  }, [voices, languageFilter, searchQuery]);

  return {
    voices: filteredVoices,
    allVoices: voices,
    languages,
    loading,
    error,
    searchQuery,
    setSearchQuery,
    languageFilter,
    setLanguageFilter,
    retry: loadVoices,
  };
}
