import { useState, useEffect } from 'react';
import {
  getStoredKey, setStoredKey,
  getStoredRegion, setStoredRegion,
  getStoredCaptureVisemes, setStoredCaptureVisemes,
} from '../utils/storage';

export function useAzureSettings() {
  const [key, setKey] = useState(getStoredKey);
  const [region, setRegion] = useState(getStoredRegion);
  const [captureVisemes, setCaptureVisemes] = useState(getStoredCaptureVisemes);

  useEffect(() => {
    setStoredKey(key);
  }, [key]);

  useEffect(() => {
    setStoredRegion(region);
  }, [region]);

  useEffect(() => {
    setStoredCaptureVisemes(captureVisemes);
  }, [captureVisemes]);

  const isConfigured = key.length > 0 && region.length > 0;

  return { key, setKey, region, setRegion, captureVisemes, setCaptureVisemes, isConfigured };
}
