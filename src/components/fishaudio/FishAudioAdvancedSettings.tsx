interface Props {
  temperature: number;
  topP: number;
  chunkLength: number;
  normalize: boolean;
  latency: string;
  speed: number;
  volume: number;
  onTemperatureChange: (v: number) => void;
  onTopPChange: (v: number) => void;
  onChunkLengthChange: (v: number) => void;
  onNormalizeChange: (v: boolean) => void;
  onLatencyChange: (v: string) => void;
  onSpeedChange: (v: number) => void;
  onVolumeChange: (v: number) => void;
}

export function FishAudioAdvancedSettings({
  temperature, topP, chunkLength, normalize, latency, speed, volume,
  onTemperatureChange, onTopPChange, onChunkLengthChange, onNormalizeChange,
  onLatencyChange, onSpeedChange, onVolumeChange,
}: Props) {
  return (
    <div className="p-4 space-y-4">
      {/* Prosody */}
      <div>
        <div className="flex justify-between items-center mb-1">
          <label className="text-sm font-medium text-gray-700">Speed</label>
          <span className="text-xs text-gray-500 font-mono">{speed.toFixed(1)}</span>
        </div>
        <input
          type="range" min={0.5} max={2.0} step={0.1} value={speed}
          onChange={(e) => onSpeedChange(parseFloat(e.target.value))}
          className="w-full accent-cyan-500"
        />
      </div>

      <div>
        <div className="flex justify-between items-center mb-1">
          <label className="text-sm font-medium text-gray-700">Volume</label>
          <span className="text-xs text-gray-500 font-mono">{volume}</span>
        </div>
        <input
          type="range" min={-20} max={20} step={1} value={volume}
          onChange={(e) => onVolumeChange(parseInt(e.target.value))}
          className="w-full accent-cyan-500"
        />
        <p className="text-xs text-gray-400 mt-0.5">-20 (quieter) to +20 (louder), 0 = default</p>
      </div>

      {/* Generation parameters */}
      <div>
        <div className="flex justify-between items-center mb-1">
          <label className="text-sm font-medium text-gray-700">Temperature</label>
          <span className="text-xs text-gray-500 font-mono">{temperature.toFixed(1)}</span>
        </div>
        <input
          type="range" min={0.0} max={1.0} step={0.1} value={temperature}
          onChange={(e) => onTemperatureChange(parseFloat(e.target.value))}
          className="w-full accent-cyan-500"
        />
      </div>

      <div>
        <div className="flex justify-between items-center mb-1">
          <label className="text-sm font-medium text-gray-700">Top P</label>
          <span className="text-xs text-gray-500 font-mono">{topP.toFixed(1)}</span>
        </div>
        <input
          type="range" min={0.0} max={1.0} step={0.1} value={topP}
          onChange={(e) => onTopPChange(parseFloat(e.target.value))}
          className="w-full accent-cyan-500"
        />
      </div>

      <div>
        <div className="flex justify-between items-center mb-1">
          <label className="text-sm font-medium text-gray-700">Chunk Length</label>
          <span className="text-xs text-gray-500 font-mono">{chunkLength}</span>
        </div>
        <input
          type="range" min={100} max={300} step={10} value={chunkLength}
          onChange={(e) => onChunkLengthChange(parseInt(e.target.value))}
          className="w-full accent-cyan-500"
        />
      </div>

      {/* Dropdowns & toggles */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Latency</label>
        <select
          value={latency}
          onChange={(e) => onLatencyChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
        >
          <option value="balanced">Balanced (faster)</option>
          <option value="normal">Normal (higher quality)</option>
        </select>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="fa-normalize"
          checked={normalize}
          onChange={(e) => onNormalizeChange(e.target.checked)}
          className="accent-cyan-500"
        />
        <label htmlFor="fa-normalize" className="text-sm text-gray-700">
          Text Normalization
        </label>
        <span className="text-xs text-gray-400">(expand numbers, abbreviations)</span>
      </div>
    </div>
  );
}
