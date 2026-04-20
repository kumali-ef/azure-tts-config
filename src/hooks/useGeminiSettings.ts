import { useState, useCallback } from 'react';

const STORAGE_KEY = 'gemini_api_key';

export function useGeminiSettings() {
  const [apiKey, setApiKeyState] = useState<string>(() => localStorage.getItem(STORAGE_KEY) || '');

  const setApiKey = useCallback((key: string) => {
    setApiKeyState(key);
    if (key) {
      localStorage.setItem(STORAGE_KEY, key);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  return {
    apiKey,
    setApiKey,
    isConfigured: !!apiKey.trim(),
  };
}
