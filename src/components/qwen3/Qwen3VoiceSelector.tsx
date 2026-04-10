import { useState } from 'react';
import type { Qwen3Voice } from '../../types';

interface Props {
  voices: Qwen3Voice[];
  selectedVoice: string;
  onVoiceChange: (voice: string, displayName: string) => void;
}

export function Qwen3VoiceSelector({ voices, selectedVoice, onVoiceChange }: Props) {
  const [search, setSearch] = useState('');

  const filtered = voices.filter((v) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      v.voice.toLowerCase().includes(q) ||
      v.name.toLowerCase().includes(q) ||
      v.description.toLowerCase().includes(q)
    );
  });

  const handleVoiceClick = (e: React.MouseEvent<HTMLSelectElement>) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'OPTION') {
      const voiceParam = (target as HTMLOptionElement).value;
      const voice = voices.find((v) => v.voice === voiceParam);
      if (voice) {
        onVoiceChange(voice.voice, voice.name);
      }
    }
  };

  return (
    <div className="p-4 space-y-3">
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="🔍 Search voices..."
        className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm"
      />
      <select
        size={8}
        value={selectedVoice}
        onClick={handleVoiceClick}
        onChange={(e) => {
          const voice = voices.find((v) => v.voice === e.target.value);
          if (voice) onVoiceChange(voice.voice, voice.name);
        }}
        className="w-full border border-gray-300 rounded-md text-sm"
      >
        {filtered.map((v) => (
          <option key={v.voice} value={v.voice}>
            {v.voice} — {v.name} ({v.gender === 'F' ? '♀' : '♂'}) {v.description}
          </option>
        ))}
      </select>
      <p className="text-xs text-gray-400">
        {filtered.length} voice{filtered.length !== 1 ? 's' : ''}
      </p>
    </div>
  );
}
