import { useState, useEffect } from 'react';
import { getStoredKey, setStoredKey, getStoredRegion, setStoredRegion } from '../utils/storage';

export function useAzureSettings() {
  const [key, setKey] = useState(getStoredKey);
  const [region, setRegion] = useState(getStoredRegion);

  useEffect(() => {
    setStoredKey(key);
  }, [key]);

  useEffect(() => {
    setStoredRegion(region);
  }, [region]);

  const isConfigured = key.length > 0 && region.length > 0;

  return { key, setKey, region, setRegion, isConfigured };
}
