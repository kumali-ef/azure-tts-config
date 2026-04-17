import { useState, useEffect } from 'react';

const STORAGE_KEY = 'elevenlabs-api-key';

export function useElevenLabsSettings() {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem(STORAGE_KEY) || '');

  useEffect(() => { localStorage.setItem(STORAGE_KEY, apiKey); }, [apiKey]);

  const isConfigured = !!apiKey;

  return { apiKey, setApiKey, isConfigured };
}
