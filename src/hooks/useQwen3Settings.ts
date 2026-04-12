import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY_REGION = 'qwen3-region';
const OLD_STORAGE_KEY_API_KEY = 'qwen3-api-key';

function apiKeyStorageKey(region: string) {
  return `qwen3-api-key-${region}`;
}

function loadApiKeyForRegion(region: string): string {
  const key = localStorage.getItem(apiKeyStorageKey(region));
  if (key) return key;
  // Migrate: old single-key users were always on cn-beijing
  if (region === 'cn-beijing') {
    const legacy = localStorage.getItem(OLD_STORAGE_KEY_API_KEY);
    if (legacy) {
      localStorage.setItem(apiKeyStorageKey(region), legacy);
      localStorage.removeItem(OLD_STORAGE_KEY_API_KEY);
      return legacy;
    }
  }
  return '';
}

export function useQwen3Settings() {
  const [region, setRegionState] = useState(() => localStorage.getItem(STORAGE_KEY_REGION) || 'cn-beijing');
  const [apiKey, setApiKey] = useState(() => loadApiKeyForRegion(localStorage.getItem(STORAGE_KEY_REGION) || 'cn-beijing'));

  useEffect(() => { localStorage.setItem(apiKeyStorageKey(region), apiKey); }, [apiKey, region]);

  const setRegion = useCallback((newRegion: string) => {
    localStorage.setItem(STORAGE_KEY_REGION, newRegion);
    setRegionState(newRegion);
    setApiKey(loadApiKeyForRegion(newRegion));
  }, []);

  const isConfigured = !!apiKey;

  return { region, setRegion, apiKey, setApiKey, isConfigured };
}
