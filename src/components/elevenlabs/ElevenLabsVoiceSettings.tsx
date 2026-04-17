interface Props {
  stability: number;
  similarityBoost: number;
  style: number;
  useSpeakerBoost: boolean;
  speed: number;
  onStabilityChange: (v: number) => void;
  onSimilarityBoostChange: (v: number) => void;
  onStyleChange: (v: number) => void;
  onUseSpeakerBoostChange: (v: boolean) => void;
  onSpeedChange: (v: number) => void;
}

export function ElevenLabsVoiceSettings({
  stability, similarityBoost, style, useSpeakerBoost, speed,
  onStabilityChange, onSimilarityBoostChange, onStyleChange,
  onUseSpeakerBoostChange, onSpeedChange,
}: Props) {
  return (
    <div className="p-4 space-y-4">
      {/* Stability slider */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Stability: {stability.toFixed(2)}
        </label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={stability}
          onChange={(e) => onStabilityChange(parseFloat(e.target.value))}
          className="w-full accent-amber-600"
        />
        <div className="flex justify-between text-xs text-gray-400">
          <span>0 (variable)</span>
          <span>0.5</span>
          <span>1 (stable)</span>
        </div>
      </div>

      {/* Similarity Boost slider */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Similarity Boost: {similarityBoost.toFixed(2)}
        </label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={similarityBoost}
          onChange={(e) => onSimilarityBoostChange(parseFloat(e.target.value))}
          className="w-full accent-amber-600"
        />
        <div className="flex justify-between text-xs text-gray-400">
          <span>0 (low)</span>
          <span>0.75</span>
          <span>1 (high)</span>
        </div>
      </div>

      {/* Style slider */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Style: {style.toFixed(2)}
        </label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={style}
          onChange={(e) => onStyleChange(parseFloat(e.target.value))}
          className="w-full accent-amber-600"
        />
        <div className="flex justify-between text-xs text-gray-400">
          <span>0 (neutral)</span>
          <span>0.5</span>
          <span>1 (expressive)</span>
        </div>
      </div>

      {/* Speed slider */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Speed: {speed.toFixed(2)}x
        </label>
        <input
          type="range"
          min="0.25"
          max="4.0"
          step="0.05"
          value={speed}
          onChange={(e) => onSpeedChange(parseFloat(e.target.value))}
          className="w-full accent-amber-600"
        />
        <div className="flex justify-between text-xs text-gray-400">
          <span>0.25x (slow)</span>
          <span>1.0x</span>
          <span>4.0x (fast)</span>
        </div>
      </div>

      {/* Speaker Boost toggle */}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="speaker-boost"
          checked={useSpeakerBoost}
          onChange={(e) => onUseSpeakerBoostChange(e.target.checked)}
          className="accent-amber-600"
        />
        <label htmlFor="speaker-boost" className="text-sm font-medium text-gray-700">
          Use Speaker Boost
        </label>
      </div>
    </div>
  );
}
