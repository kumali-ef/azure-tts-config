import { useState, useEffect, useCallback } from 'react';
import type { Recording } from '../types';

export function useRecordings() {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRecordings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/recordings');
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

  const saveRecording = async (audioBlob: Blob, config: Record<string, unknown>) => {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.mp3');
    formData.append('config', JSON.stringify(config));

    const res = await fetch('/api/recordings', {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) throw new Error('Failed to save recording');
    const saved = await res.json();
    setRecordings((prev) => [saved, ...prev]);
    return saved;
  };

  const deleteRecording = async (id: string) => {
    const res = await fetch(`/api/recordings/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete recording');
    setRecordings((prev) => prev.filter((r) => r.id !== id));
  };

  const updateLabel = async (id: string, label: string) => {
    const res = await fetch(`/api/recordings/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label }),
    });
    if (!res.ok) throw new Error('Failed to update label');
    const updated = await res.json();
    setRecordings((prev) => prev.map((r) => (r.id === id ? updated : r)));
  };

  return { recordings, loading, error, saveRecording, deleteRecording, updateLabel, refresh: fetchRecordings };
}
