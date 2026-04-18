import { useState, useEffect, useCallback } from 'react';
import type { FishAudioRecording } from '../types';

export function useFishAudioRecordings() {
  const [recordings, setRecordings] = useState<FishAudioRecording[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRecordings = useCallback(async () => {
    try {
      const res = await fetch('/api/fishaudio/recordings');
      if (!res.ok) throw new Error('Failed to fetch recordings');
      const data = await res.json();
      setRecordings(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load recordings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecordings();
  }, [fetchRecordings]);

  const saveRecording = useCallback(async (audioBlob: Blob, config: Record<string, unknown>) => {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.wav');
    formData.append('config', JSON.stringify(config));

    const res = await fetch('/api/fishaudio/recordings', {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) throw new Error('Failed to save recording');
    const saved = await res.json();
    setRecordings((prev) => [saved, ...prev]);
    return saved;
  }, []);

  const deleteRecording = useCallback(async (id: string) => {
    const res = await fetch(`/api/fishaudio/recordings/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete recording');
    setRecordings((prev) => prev.filter((r) => r.id !== id));
  }, []);

  return { recordings, loading, error, saveRecording, deleteRecording };
}
