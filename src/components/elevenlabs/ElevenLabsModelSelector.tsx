interface Props {
  model: string;
  onChange: (model: string) => void;
}

const MODELS = [
  { id: 'eleven_flash_v2_5', label: 'eleven_flash_v2_5 (Flash, low latency)' },
  { id: 'eleven_turbo_v2_5', label: 'eleven_turbo_v2_5 (Turbo)' },
];

export function ElevenLabsModelSelector({ model, onChange }: Props) {
  return (
    <div className="p-4">
      <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
      <select
        value={model}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
      >
        {MODELS.map((m) => (
          <option key={m.id} value={m.id}>{m.label}</option>
        ))}
      </select>
    </div>
  );
}
