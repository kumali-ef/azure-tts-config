const EMOTIONS = ['happy', 'sad', 'angry', 'calm', 'fearful', 'disgusted', 'surprised'];

interface Props {
  speed: number;
  vol: number;
  pitch: number;
  emotion: string;
  onSpeedChange: (v: number) => void;
  onVolChange: (v: number) => void;
  onPitchChange: (v: number) => void;
  onEmotionChange: (v: string) => void;
}

export function VoiceSettings({
  speed, vol, pitch, emotion,
  onSpeedChange, onVolChange, onPitchChange, onEmotionChange,
}: Props) {
  return (
    <div className="p-4 space-y-4">
      {/* Speed */}
      <div>
        <div className="flex justify-between text-sm mb-1">
          <span className="font-medium text-gray-700">Speed</span>
          <span className="text-purple-600">{speed.toFixed(1)}</span>
        </div>
        <input
          type="range" min="0.5" max="2.0" step="0.1"
          value={speed}
          onChange={(e) => onSpeedChange(parseFloat(e.target.value))}
          className="w-full accent-purple-500"
        />
        <div className="flex justify-between text-xs text-gray-400">
          <span>0.5</span><span>2.0</span>
        </div>
      </div>

      {/* Volume */}
      <div>
        <div className="flex justify-between text-sm mb-1">
          <span className="font-medium text-gray-700">Volume</span>
          <span className="text-purple-600">{vol.toFixed(1)}</span>
        </div>
        <input
          type="range" min="0" max="10" step="0.1"
          value={vol}
          onChange={(e) => onVolChange(parseFloat(e.target.value))}
          className="w-full accent-purple-500"
        />
        <div className="flex justify-between text-xs text-gray-400">
          <span>0</span><span>10</span>
        </div>
      </div>

      {/* Pitch */}
      <div>
        <div className="flex justify-between text-sm mb-1">
          <span className="font-medium text-gray-700">Pitch</span>
          <span className="text-purple-600">{pitch}</span>
        </div>
        <input
          type="range" min="-12" max="12" step="1"
          value={pitch}
          onChange={(e) => onPitchChange(parseInt(e.target.value))}
          className="w-full accent-purple-500"
        />
        <div className="flex justify-between text-xs text-gray-400">
          <span>-12</span><span>+12</span>
        </div>
      </div>

      {/* Emotion */}
      <div>
        <span className="text-sm font-medium text-gray-700 block mb-2">Emotion</span>
        <div className="flex flex-wrap gap-1.5">
          {EMOTIONS.map((e) => (
            <button
              key={e}
              onClick={() => onEmotionChange(emotion === e ? '' : e)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                emotion === e
                  ? 'bg-purple-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {e}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
