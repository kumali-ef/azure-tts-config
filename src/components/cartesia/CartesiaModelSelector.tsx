interface Props {
  model: string;
  onChange: (model: string) => void;
}

const MODELS = [
  { id: 'sonic-3', label: 'sonic-3 (Stable)' },
  { id: 'sonic-3-latest', label: 'sonic-3-latest (Beta)' },
];

export function CartesiaModelSelector({ model, onChange }: Props) {
  return (
    <div className="p-4">
      <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
      <select
        value={model}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-lime-500 focus:border-lime-500"
      >
        {MODELS.map((m) => (
          <option key={m.id} value={m.id}>{m.label}</option>
        ))}
      </select>
    </div>
  );
}
