import { useState, useMemo } from 'react';
import type { InworldVoice } from '../../types';

interface Props {
  voices: InworldVoice[];
  selectedVoiceId: string;
  loading: boolean;
  error: string | null;
  onVoiceChange: (voiceId: string, voiceName: string) => void;
  onRetry: () => void;
}

export function InworldVoiceSelector({ voices, selectedVoiceId, loading, error, onVoiceChange, onRetry }: Props) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search) return voices;
    const q = search.toLowerCase();
    return voices.filter(
      (v) =>
        v.displayName.toLowerCase().includes(q) ||
        v.voiceId.toLowerCase().includes(q) ||
        v.description.toLowerCase().includes(q) ||
        v.tags.some((t) => t.toLowerCase().includes(q))
    );
  }, [voices, search]);

  return (
    <div className="p-4 space-y-2">
      {error && (
        <div className="flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
          <span className="flex-1">{error}</span>
          <button onClick={onRetry} className="text-xs px-2 py-1 bg-red-100 hover:bg-red-200 rounded">
            Retry
          </button>
        </div>
      )}

      {loading && <p className="text-sm text-gray-500">Loading voices...</p>}

      {!loading && voices.length > 0 && (
        <>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="🔍 Search voices..."
            className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
          />
          <div className="max-h-60 overflow-y-auto border rounded-md">
            {filtered.map((voice) => (
              <button
                key={voice.voiceId}
                onClick={() => onVoiceChange(voice.voiceId, voice.displayName)}
                className={`w-full text-left px-3 py-2 text-sm border-b last:border-b-0 hover:bg-rose-50 transition-colors ${
                  selectedVoiceId === voice.voiceId ? 'bg-rose-100 text-rose-800' : 'text-gray-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium">{voice.displayName}</span>
                  <span className="text-xs text-gray-400">{voice.langCode}</span>
                  {voice.source === 'IVC' && (
                    <span className="text-[10px] px-1.5 py-0.5 bg-rose-200 text-rose-700 rounded-full">Clone</span>
                  )}
                </div>
                {voice.description && (
                  <p className="text-xs text-gray-500 mt-0.5 truncate">{voice.description}</p>
                )}
                {voice.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {voice.tags.map((tag) => (
                      <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="p-3 text-sm text-gray-400">No voices match "{search}"</p>
            )}
          </div>
        </>
      )}

      {!loading && voices.length === 0 && !error && (
        <p className="text-sm text-gray-400">Enter your API key to load voices.</p>
      )}
    </div>
  );
}
