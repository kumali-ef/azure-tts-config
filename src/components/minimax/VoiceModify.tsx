const SOUND_EFFECTS = ['', 'spacious_echo', 'bathroom', 'bedroom', 'machine', 'cave'];

interface Props {
  timbre: number;
  intensity: number;
  soundEffect: string;
  onTimbreChange: (v: number) => void;
  onIntensityChange: (v: number) => void;
  onSoundEffectChange: (v: string) => void;
}

export function VoiceModify({
  timbre, intensity, soundEffect,
  onTimbreChange, onIntensityChange, onSoundEffectChange,
}: Props) {
  return (
    <div className="p-4 space-y-4">
      {/* Timbre (pitch modification) */}
      <div>
        <div className="flex justify-between text-sm mb-1">
          <span className="font-medium text-gray-700">Timbre</span>
          <span className="text-purple-600">{timbre}</span>
        </div>
        <input
          type="range" min="-12" max="12" step="1"
          value={timbre}
          onChange={(e) => onTimbreChange(parseInt(e.target.value))}
          className="w-full accent-purple-500"
        />
        <div className="flex justify-between text-xs text-gray-400">
          <span>-12</span><span>+12</span>
        </div>
      </div>

      {/* Intensity */}
      <div>
        <div className="flex justify-between text-sm mb-1">
          <span className="font-medium text-gray-700">Intensity</span>
          <span className="text-purple-600">{intensity}</span>
        </div>
        <input
          type="range" min="-100" max="100" step="1"
          value={intensity}
          onChange={(e) => onIntensityChange(parseInt(e.target.value))}
          className="w-full accent-purple-500"
        />
        <div className="flex justify-between text-xs text-gray-400">
          <span>-100</span><span>+100</span>
        </div>
      </div>

      {/* Sound Effect */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Sound Effect</label>
        <select
          value={soundEffect}
          onChange={(e) => onSoundEffectChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
        >
          <option value="">None</option>
          {SOUND_EFFECTS.filter(Boolean).map((e) => (
            <option key={e} value={e}>{e}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
