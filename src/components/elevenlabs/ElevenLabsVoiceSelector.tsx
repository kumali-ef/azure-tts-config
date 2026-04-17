import { useState } from 'react';
import type { ElevenLabsVoice } from '../../types';

interface Props {
  voices: ElevenLabsVoice[];
  selectedVoiceId: string;
  loading: boolean;
  error: string | null;
  onVoiceChange: (voiceId: string, voiceName: string) => void;
  onRetry: () => void;
}

export function ElevenLabsVoiceSelector({
  voices, selectedVoiceId, loading, error,
  onVoiceChange, onRetry,
}: Props) {
  const [search, setSearch] = useState('');

  const filtered = voices.filter((v) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      v.name.toLowerCase().includes(q) ||
      v.voice_id.toLowerCase().includes(q) ||
      v.category.toLowerCase().includes(q) ||
      Object.values(v.labels || {}).some((val) => val.toLowerCase().includes(q))
    );
  });

  return (
    <div className="p-4 space-y-3">
      {loading && <p className="text-sm text-gray-500">Loading voices...</p>}
      {error && (
        <div className="flex items-center gap-2">
          <p className="text-sm text-red-500">{error}</p>
          <button onClick={onRetry} className="text-xs text-amber-600 underline">Retry</button>
        </div>
      )}
      {!loading && !error && (
        <>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="🔍 Search voices by name, category, or labels..."
            className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm"
          />
          <select
            size={8}
            value={selectedVoiceId}
            onChange={(e) => {
              const voice = voices.find((v) => v.voice_id === e.target.value);
              if (voice) onVoiceChange(voice.voice_id, voice.name);
            }}
            className="w-full border border-gray-300 rounded-md text-sm"
          >
            {filtered.map((v) => {
              const accent = v.labels?.accent || '';
              const gender = v.labels?.gender || '';
              const tag = [gender, accent].filter(Boolean).join(', ');
              return (
                <option key={v.voice_id} value={v.voice_id}>
                  {v.name}{tag ? ` — ${tag}` : ''} — {v.voice_id.slice(0, 8)}…
                </option>
              );
            })}
          </select>
          <p className="text-xs text-gray-400">
            {filtered.length} voice{filtered.length !== 1 ? 's' : ''}{search ? ` (of ${voices.length})` : ''}
          </p>
        </>
      )}
    </div>
  );
}
