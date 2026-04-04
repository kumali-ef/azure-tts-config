interface EmphasisControlProps {
  emphasis: string;
  onChange: (emphasis: string) => void;
}

const EMPHASIS_OPTIONS = ['', 'none', 'reduced', 'moderate', 'strong'];

export function EmphasisControl({ emphasis, onChange }: EmphasisControlProps) {
  return (
    <div className="space-y-2 p-4 bg-white rounded-lg shadow-sm border">
      <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Emphasis</h2>
      <select value={emphasis} onChange={(e) => onChange(e.target.value)} className="w-full px-3 py-2 border rounded-md text-sm">
        <option value="">Default (none)</option>
        {EMPHASIS_OPTIONS.filter(Boolean).map((o) => (<option key={o} value={o}>{o}</option>))}
      </select>
    </div>
  );
}
