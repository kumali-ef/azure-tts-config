import { useState, useMemo } from 'react';
import type { GeminiVoice } from '../../types';

interface Props {
  voices: GeminiVoice[];
  selectedVoiceName: string;
  onVoiceChange: (voiceName: string, displayName: string) => void;
}

export function GeminiVoiceSelector({ voices, selectedVoiceName, onVoiceChange }: Props) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search) return voices;
    const q = search.toLowerCase();
    return voices.filter(
      (v) =>
        v.name.toLowerCase().includes(q) ||
        v.gender.toLowerCase().includes(q) ||
        v.style.toLowerCase().includes(q)
    );
  }, [voices, search]);

  return (
    <div className="p-4 space-y-2">
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="🔍 Search voices..."
        className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
      />
      <div className="max-h-60 overflow-y-auto border rounded-md">
        {filtered.map((voice) => (
          <button
            key={voice.name}
            onClick={() => onVoiceChange(voice.name, voice.displayName)}
            className={`w-full text-left px-3 py-2 text-sm border-b last:border-b-0 hover:bg-emerald-50 transition-colors ${
              selectedVoiceName === voice.name ? 'bg-emerald-100 text-emerald-800' : 'text-gray-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="font-medium">{voice.displayName}</span>
              <span className="text-xs text-gray-400">{voice.gender}</span>
              <span className="text-[10px] px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded-full">
                {voice.style}
              </span>
            </div>
          </button>
        ))}
        {filtered.length === 0 && (
          <p className="p-3 text-sm text-gray-400">No voices match "{search}"</p>
        )}
      </div>
    </div>
  );
}
