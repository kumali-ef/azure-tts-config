const AZURE_KEY_STORAGE = 'azure-tts-key';
const AZURE_REGION_STORAGE = 'azure-tts-region';

export function getStoredKey(): string {
  return localStorage.getItem(AZURE_KEY_STORAGE) || '';
}

export function setStoredKey(key: string): void {
  localStorage.setItem(AZURE_KEY_STORAGE, key);
}

export function getStoredRegion(): string {
  return localStorage.getItem(AZURE_REGION_STORAGE) || '';
}

export function setStoredRegion(region: string): void {
  localStorage.setItem(AZURE_REGION_STORAGE, region);
}
