import { useState } from 'react';
import { CARTESIA_EMOTIONS } from '../../utils/cartesia-tts';

interface Props {
  speed: number;
  volume: number;
  emotion: string;
  onSpeedChange: (speed: number) => void;
  onVolumeChange: (volume: number) => void;
  onEmotionChange: (emotion: string) => void;
}

export function CartesiaGenerationConfig({
  speed, volume, emotion,
  onSpeedChange, onVolumeChange, onEmotionChange,
}: Props) {
  const [emotionSearch, setEmotionSearch] = useState('');

  const filteredEmotions = CARTESIA_EMOTIONS.filter((e) => {
    if (!emotionSearch) return true;
    return e.toLowerCase().includes(emotionSearch.toLowerCase());
  });

  return (
    <div className="p-4 space-y-4">
      {/* Speed slider */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Speed: {speed.toFixed(2)}x
        </label>
        <input
          type="range"
          min="0.6"
          max="1.5"
          step="0.05"
          value={speed}
          onChange={(e) => onSpeedChange(parseFloat(e.target.value))}
          className="w-full accent-lime-600"
        />
        <div className="flex justify-between text-xs text-gray-400">
          <span>0.6x (slow)</span>
          <span>1.0x</span>
          <span>1.5x (fast)</span>
        </div>
      </div>

      {/* Volume slider */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Volume: {volume.toFixed(2)}x
        </label>
        <input
          type="range"
          min="0.5"
          max="2.0"
          step="0.05"
          value={volume}
          onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
          className="w-full accent-lime-600"
        />
        <div className="flex justify-between text-xs text-gray-400">
          <span>0.5x (quiet)</span>
          <span>1.0x</span>
          <span>2.0x (loud)</span>
        </div>
      </div>

      {/* Emotion dropdown with search */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Emotion</label>
        <input
          type="text"
          value={emotionSearch}
          onChange={(e) => setEmotionSearch(e.target.value)}
          placeholder="🔍 Filter emotions..."
          className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm mb-1"
        />
        <select
          value={emotion}
          onChange={(e) => onEmotionChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-lime-500 focus:border-lime-500"
        >
          <option value="">None (auto)</option>
          {filteredEmotions.map((e) => (
            <option key={e} value={e}>{e}</option>
          ))}
        </select>
        <p className="text-xs text-gray-400 mt-1">
          Primary emotions: neutral, angry, excited, content, sad, scared. Supports [laughter] in text.
        </p>
      </div>
    </div>
  );
}
