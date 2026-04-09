import { useState } from 'react';
import type { MiniMaxVoice } from '../../types';

type VoiceTab = 'system' | 'cloned' | 'custom';

interface Props {
  voices: MiniMaxVoice[];
  selectedVoiceId: string;
  customVoiceId: string;
  useCustomVoice: boolean;
  loading: boolean;
  error: string | null;
  onVoiceChange: (voiceId: string, voiceName: string) => void;
  onCustomVoiceIdChange: (voiceId: string) => void;
  onUseCustomVoiceChange: (useCustom: boolean) => void;
  onRetry: () => void;
}

export function MiniMaxVoiceSelector({
  voices, selectedVoiceId, customVoiceId, useCustomVoice,
  loading, error,
  onVoiceChange, onCustomVoiceIdChange, onUseCustomVoiceChange, onRetry,
}: Props) {
  const [tab, setTab] = useState<VoiceTab>(useCustomVoice ? 'custom' : 'system');
  const [search, setSearch] = useState('');

  const systemVoices = voices.filter((v) => v.category === 'system');
  const clonedVoices = voices.filter((v) => v.category === 'cloned' || v.category === 'generated');

  const handleTabChange = (newTab: VoiceTab) => {
    setTab(newTab);
    onUseCustomVoiceChange(newTab === 'custom');
  };

  const filteredVoices = (newTab: VoiceTab) => {
    const list = newTab === 'system' ? systemVoices : clonedVoices;
    if (!search) return list;
    const q = search.toLowerCase();
    return list.filter(
      (v) => v.voice_id.toLowerCase().includes(q) || v.voice_name.toLowerCase().includes(q)
    );
  };

  const handleVoiceClick = (e: React.MouseEvent<HTMLSelectElement>) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'OPTION') {
      const voiceId = (target as HTMLOptionElement).value;
      const voice = voices.find((v) => v.voice_id === voiceId);
      if (voice) {
        onVoiceChange(voice.voice_id, voice.voice_name);
      }
    }
  };

  return (
    <div className="p-4 space-y-3">
      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
        {(['system', 'cloned', 'custom'] as VoiceTab[]).map((t) => (
          <button
            key={t}
            onClick={() => handleTabChange(t)}
            className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              tab === t
                ? 'bg-white text-purple-700 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t === 'system' ? 'System' : t === 'cloned' ? 'Cloned' : 'Custom ID'}
          </button>
        ))}
      </div>

      {tab === 'custom' ? (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Voice ID</label>
          <input
            type="text"
            value={customVoiceId}
            onChange={(e) => {
              onCustomVoiceIdChange(e.target.value);
              onVoiceChange(e.target.value, e.target.value);
            }}
            placeholder="Enter custom voice ID"
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          />
        </div>
      ) : (
        <>
          {loading && <p className="text-sm text-gray-500">Loading voices...</p>}
          {error && (
            <div className="flex items-center gap-2">
              <p className="text-sm text-red-500">{error}</p>
              <button onClick={onRetry} className="text-xs text-purple-600 underline">Retry</button>
            </div>
          )}
          {!loading && !error && (
            <>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="🔍 Search voices..."
                className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm"
              />
              <select
                size={8}
                value={selectedVoiceId}
                onClick={handleVoiceClick}
                onChange={(e) => {
                  const voice = voices.find((v) => v.voice_id === e.target.value);
                  if (voice) onVoiceChange(voice.voice_id, voice.voice_name);
                }}
                className="w-full border border-gray-300 rounded-md text-sm"
              >
                {filteredVoices(tab).map((v) => (
                  <option key={v.voice_id} value={v.voice_id}>
                    {v.voice_name} — {v.voice_id}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-400">
                {filteredVoices(tab).length} voice{filteredVoices(tab).length !== 1 ? 's' : ''}
              </p>
            </>
          )}
        </>
      )}
    </div>
  );
}
