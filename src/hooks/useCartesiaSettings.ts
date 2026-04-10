import { useState, useEffect } from 'react';

const STORAGE_KEY = 'cartesia-api-key';

export function useCartesiaSettings() {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem(STORAGE_KEY) || '');

  useEffect(() => { localStorage.setItem(STORAGE_KEY, apiKey); }, [apiKey]);

  const isConfigured = !!apiKey;

  return { apiKey, setApiKey, isConfigured };
}
