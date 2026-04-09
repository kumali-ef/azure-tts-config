import { useState, useEffect } from 'react';

const STORAGE_KEY_API_KEY = 'minimax-api-key';
const STORAGE_KEY_GROUP_ID = 'minimax-group-id';

export function useMiniMaxSettings() {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem(STORAGE_KEY_API_KEY) || '');
  const [groupId, setGroupId] = useState(() => localStorage.getItem(STORAGE_KEY_GROUP_ID) || '');

  useEffect(() => { localStorage.setItem(STORAGE_KEY_API_KEY, apiKey); }, [apiKey]);
  useEffect(() => { localStorage.setItem(STORAGE_KEY_GROUP_ID, groupId); }, [groupId]);

  const isConfigured = !!apiKey;

  return { apiKey, setApiKey, groupId, setGroupId, isConfigured };
}
