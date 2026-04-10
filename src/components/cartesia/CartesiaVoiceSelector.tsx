import { useState } from 'react';
import type { CartesiaVoice } from '../../types';

interface Props {
  voices: CartesiaVoice[];
  selectedVoiceId: string;
  loading: boolean;
  error: string | null;
  onVoiceChange: (voiceId: string, voiceName: string) => void;
  onRetry: () => void;
}

export function CartesiaVoiceSelector({
  voices, selectedVoiceId, loading, error,
  onVoiceChange, onRetry,
}: Props) {
  const [search, setSearch] = useState('');

  const filtered = voices.filter((v) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      v.name.toLowerCase().includes(q) ||
      v.id.toLowerCase().includes(q) ||
      (v.language || '').toLowerCase().includes(q) ||
      (v.description || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-4 space-y-3">
      {loading && <p className="text-sm text-gray-500">Loading voices...</p>}
      {error && (
        <div className="flex items-center gap-2">
          <p className="text-sm text-red-500">{error}</p>
          <button onClick={onRetry} className="text-xs text-lime-600 underline">Retry</button>
        </div>
      )}
      {!loading && !error && (
        <>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="🔍 Search voices by name, language, or description..."
            className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm"
          />
          <select
            size={8}
            value={selectedVoiceId}
            onChange={(e) => {
              const voice = voices.find((v) => v.id === e.target.value);
              if (voice) onVoiceChange(voice.id, voice.name);
            }}
            className="w-full border border-gray-300 rounded-md text-sm"
          >
            {filtered.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name} — {v.language || '?'} — {v.id.slice(0, 8)}…
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-400">
            {filtered.length} voice{filtered.length !== 1 ? 's' : ''}{search ? ` (of ${voices.length})` : ''}
          </p>
        </>
      )}
    </div>
  );
}
