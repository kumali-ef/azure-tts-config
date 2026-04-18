import { useState } from 'react';
import type { FishAudioVoice } from '../../types';

interface Props {
  voices: FishAudioVoice[];
  loading: boolean;
  error: string | null;
  search: string;
  selfOnly: boolean;
  total: number;
  selectedReferenceId: string;
  voiceName: string;
  onSearchChange: (q: string) => void;
  onSelfOnlyChange: (v: boolean) => void;
  onVoiceChange: (referenceId: string, voiceName: string) => void;
  onManualIdChange: (id: string) => void;
  onVoiceNameChange: (name: string) => void;
  onRetry: () => void;
}

export function FishAudioVoiceSelector({
  voices, loading, error, search, selfOnly, total,
  selectedReferenceId, voiceName,
  onSearchChange, onSelfOnlyChange, onVoiceChange,
  onManualIdChange, onVoiceNameChange, onRetry,
}: Props) {
  const [showManual, setShowManual] = useState(false);

  return (
    <div className="p-4 space-y-3">
      {/* Toggle: My Voices / Discovery */}
      <div className="flex rounded-md overflow-hidden border border-gray-300 text-sm">
        <button
          onClick={() => onSelfOnlyChange(true)}
          className={`flex-1 px-3 py-1.5 font-medium transition-colors ${
            selfOnly
              ? 'bg-cyan-500 text-white'
              : 'bg-white text-gray-600 hover:bg-gray-50'
          }`}
        >
          My Voices
        </button>
        <button
          onClick={() => onSelfOnlyChange(false)}
          className={`flex-1 px-3 py-1.5 font-medium transition-colors ${
            !selfOnly
              ? 'bg-cyan-500 text-white'
              : 'bg-white text-gray-600 hover:bg-gray-50'
          }`}
        >
          Discovery
        </button>
      </div>

      {/* Search input */}
      <input
        type="text"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder={selfOnly ? '🔍 Search your voices...' : '🔍 Search all voices...'}
        className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
      />

      {/* Loading / Error */}
      {loading && <p className="text-sm text-gray-500">Loading voices...</p>}
      {error && (
        <div className="flex items-center gap-2">
          <p className="text-sm text-red-500">{error}</p>
          <button onClick={onRetry} className="text-xs text-cyan-600 underline">Retry</button>
        </div>
      )}

      {/* Voice list */}
      {!loading && !error && (
        <>
          <select
            size={8}
            value={selectedReferenceId}
            onChange={(e) => {
              const voice = voices.find((v) => v._id === e.target.value);
              if (voice) onVoiceChange(voice._id, voice.title);
            }}
            className="w-full border border-gray-300 rounded-md text-sm"
          >
            {voices.map((v) => (
              <option key={v._id} value={v._id}>
                {v.title} — by {v.author?.nickname || 'unknown'} — {v._id.slice(0, 8)}…
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-400">
            {voices.length} voice{voices.length !== 1 ? 's' : ''}{total > voices.length ? ` (of ${total})` : ''}
          </p>
        </>
      )}

      {/* Manual ID fallback */}
      <button
        onClick={() => setShowManual(!showManual)}
        className="text-xs text-cyan-500 hover:underline"
      >
        {showManual ? 'Hide manual input' : 'Or enter reference ID manually…'}
      </button>
      {showManual && (
        <div className="space-y-2 pl-2 border-l-2 border-cyan-200">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-0.5">Reference ID</label>
            <input
              type="text"
              value={selectedReferenceId}
              onChange={(e) => onManualIdChange(e.target.value)}
              placeholder="e.g. 802e3bc2b27e49c2995d23ef70e6ac89"
              className="w-full px-2 py-1 border border-gray-300 rounded text-xs font-mono focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-0.5">Voice Label</label>
            <input
              type="text"
              value={voiceName}
              onChange={(e) => onVoiceNameChange(e.target.value)}
              placeholder="e.g. E-Girl Voice"
              className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
            />
          </div>
        </div>
      )}
    </div>
  );
}
