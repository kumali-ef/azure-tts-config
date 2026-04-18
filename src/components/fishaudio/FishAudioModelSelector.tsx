const MODELS = [
  { id: 's2-pro', label: 'S2-Pro (latest, 80+ languages)' },
  { id: 's1', label: 'S1 (previous, 13 languages)' },
];

interface Props {
  model: string;
  onChange: (model: string) => void;
}

export function FishAudioModelSelector({ model, onChange }: Props) {
  return (
    <div className="p-4">
      <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
      <select
        value={model}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
      >
        {MODELS.map((m) => (
          <option key={m.id} value={m.id}>{m.label}</option>
        ))}
      </select>
    </div>
  );
}
