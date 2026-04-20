const MODELS = [
  { id: 'gemini-3.1-flash-tts-preview', label: 'Gemini 3.1 Flash TTS (preview)' },
];

interface Props {
  model: string;
  onChange: (model: string) => void;
}

export function GeminiModelSelector({ model, onChange }: Props) {
  return (
    <div className="p-4">
      <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
      <select
        value={model}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
      >
        {MODELS.map((m) => (
          <option key={m.id} value={m.id}>{m.label}</option>
        ))}
      </select>
    </div>
  );
}
