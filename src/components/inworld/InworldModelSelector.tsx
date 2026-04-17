const MODELS = [
  { id: 'inworld-tts-1.5-max', label: 'Inworld TTS 1.5 Max (flagship)' },
  { id: 'inworld-tts-1.5-mini', label: 'Inworld TTS 1.5 Mini (ultra-fast)' },
];

interface Props {
  model: string;
  onChange: (model: string) => void;
}

export function InworldModelSelector({ model, onChange }: Props) {
  return (
    <div className="p-4">
      <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
      <select
        value={model}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
      >
        {MODELS.map((m) => (
          <option key={m.id} value={m.id}>{m.label}</option>
        ))}
      </select>
    </div>
  );
}
