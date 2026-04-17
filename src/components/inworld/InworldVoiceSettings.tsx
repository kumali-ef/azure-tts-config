const TEXT_NORM_OPTIONS = [
  { value: 'APPLY_TEXT_NORMALIZATION_UNSPECIFIED', label: 'Auto (default)' },
  { value: 'ON', label: 'On' },
  { value: 'OFF', label: 'Off' },
];

interface Props {
  temperature: number;
  applyTextNormalization: string;
  onTemperatureChange: (value: number) => void;
  onTextNormalizationChange: (value: string) => void;
}

export function InworldVoiceSettings({
  temperature,
  applyTextNormalization,
  onTemperatureChange,
  onTextNormalizationChange,
}: Props) {
  return (
    <div className="p-4 space-y-4">
      <div>
        <div className="flex justify-between items-center mb-1">
          <label className="text-sm font-medium text-gray-700">Temperature</label>
          <span className="text-xs text-gray-500 font-mono">{temperature.toFixed(1)}</span>
        </div>
        <input
          type="range"
          min={0.1}
          max={2.0}
          step={0.1}
          value={temperature}
          onChange={(e) => onTemperatureChange(parseFloat(e.target.value))}
          className="w-full accent-rose-500"
        />
        <p className="text-xs text-gray-400 mt-0.5">
          Higher = more expressive/random. Lower = more deterministic.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Text Normalization</label>
        <select
          value={applyTextNormalization}
          onChange={(e) => onTextNormalizationChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
        >
          {TEXT_NORM_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <p className="text-xs text-gray-400 mt-0.5">
          Expand numbers, dates, abbreviations into spoken form.
        </p>
      </div>
    </div>
  );
}
