const AZURE_KEY_STORAGE = 'azure-tts-key';
const AZURE_REGION_STORAGE = 'azure-tts-region';
const CUSTOM_DEPLOYMENT_ID_STORAGE = 'azure-tts-custom-deployment-id';
const CUSTOM_VOICE_NAME_STORAGE = 'azure-tts-custom-voice-name';

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

export function getStoredDeploymentId(): string {
  return localStorage.getItem(CUSTOM_DEPLOYMENT_ID_STORAGE) || '';
}

export function setStoredDeploymentId(id: string): void {
  localStorage.setItem(CUSTOM_DEPLOYMENT_ID_STORAGE, id);
}

export function getStoredCustomVoiceName(): string {
  return localStorage.getItem(CUSTOM_VOICE_NAME_STORAGE) || '';
}

export function setStoredCustomVoiceName(name: string): void {
  localStorage.setItem(CUSTOM_VOICE_NAME_STORAGE, name);
}

export function sanitizeFilename(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').slice(0, 50);
}
