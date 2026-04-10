const MODELS = [
  { id: 'qwen3-tts-flash', label: 'qwen3-tts-flash', desc: 'Standard TTS' },
  { id: 'qwen3-tts-instruct-flash', label: 'qwen3-tts-instruct-flash', desc: 'Instruct-controlled' },
];

interface Props {
  model: string;
  onChange: (model: string) => void;
}

export function Qwen3ModelSelector({ model, onChange }: Props) {
  return (
    <div className="p-4">
      <div className="grid grid-cols-2 gap-2">
        {MODELS.map((m) => (
          <button
            key={m.id}
            onClick={() => onChange(m.id)}
            className={`p-3 rounded-lg border-2 text-center transition-colors ${
              model === m.id
                ? 'border-teal-500 bg-teal-50 text-teal-700'
                : 'border-gray-200 hover:border-gray-300 text-gray-600'
            }`}
          >
            <div className="font-semibold text-sm">{m.label}</div>
            <div className="text-xs text-gray-500 mt-0.5">{m.desc}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
