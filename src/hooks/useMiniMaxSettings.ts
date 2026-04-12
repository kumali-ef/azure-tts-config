import { useState, useEffect } from 'react';

const STORAGE_KEY_API_KEY = 'minimax-api-key';
const STORAGE_KEY_REGION = 'minimax-region';

export function useMiniMaxSettings() {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem(STORAGE_KEY_API_KEY) || '');
  const [region, setRegion] = useState(() => localStorage.getItem(STORAGE_KEY_REGION) || 'cn-beijing');

  useEffect(() => { localStorage.setItem(STORAGE_KEY_API_KEY, apiKey); }, [apiKey]);
  useEffect(() => { localStorage.setItem(STORAGE_KEY_REGION, region); }, [region]);

  const isConfigured = !!apiKey;

  return { region, setRegion, apiKey, setApiKey, isConfigured };
}
