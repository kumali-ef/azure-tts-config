import { useState, useEffect } from 'react';

const STORAGE_KEY_API_KEY = 'qwen3-api-key';

export function useQwen3Settings() {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem(STORAGE_KEY_API_KEY) || '');

  useEffect(() => { localStorage.setItem(STORAGE_KEY_API_KEY, apiKey); }, [apiKey]);

  const isConfigured = !!apiKey;

  return { apiKey, setApiKey, isConfigured };
}
