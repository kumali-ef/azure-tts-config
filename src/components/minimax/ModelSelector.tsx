const MODELS = [
  { id: 'speech-2.8-hd', label: 'speech-2.8-hd', desc: 'High quality' },
  { id: 'speech-2.8-turbo', label: 'speech-2.8-turbo', desc: 'Fast' },
  { id: 'speech-2.6-hd', label: 'speech-2.6-hd', desc: 'High quality' },
  { id: 'speech-2.6-turbo', label: 'speech-2.6-turbo', desc: 'Fast' },
];

interface Props {
  model: string;
  onChange: (model: string) => void;
}

export function ModelSelector({ model, onChange }: Props) {
  return (
    <div className="p-4">
      <div className="grid grid-cols-2 gap-2">
        {MODELS.map((m) => (
          <button
            key={m.id}
            onClick={() => onChange(m.id)}
            className={`p-3 rounded-lg border-2 text-center transition-colors ${
              model === m.id
                ? 'border-purple-500 bg-purple-50 text-purple-700'
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
