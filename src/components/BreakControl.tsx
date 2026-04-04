interface BreakControlProps {
  breakType: 'duration' | 'strength';
  breakValue: string;
  onBreakTypeChange: (type: 'duration' | 'strength') => void;
  onBreakValueChange: (value: string) => void;
}

const STRENGTH_OPTIONS = ['', 'none', 'x-weak', 'weak', 'medium', 'strong', 'x-strong'];

export function BreakControl({ breakType, breakValue, onBreakTypeChange, onBreakValueChange }: BreakControlProps) {
  return (
    <div className="space-y-3 p-4 bg-white rounded-lg shadow-sm border">
      <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Break (Pause)</h2>
      <div className="flex gap-3">
        <label className="flex items-center gap-1 text-sm">
          <input type="radio" checked={breakType === 'strength'}
            onChange={() => { onBreakTypeChange('strength'); onBreakValueChange(''); }} />
          Strength
        </label>
        <label className="flex items-center gap-1 text-sm">
          <input type="radio" checked={breakType === 'duration'}
            onChange={() => { onBreakTypeChange('duration'); onBreakValueChange(''); }} />
          Duration (ms)
        </label>
      </div>
      {breakType === 'strength' ? (
        <select value={breakValue} onChange={(e) => onBreakValueChange(e.target.value)} className="w-full px-3 py-2 border rounded-md text-sm">
          <option value="">No break</option>
          {STRENGTH_OPTIONS.filter(Boolean).map((s) => (<option key={s} value={s}>{s}</option>))}
        </select>
      ) : (
        <input type="number" value={breakValue.replace('ms', '')}
          onChange={(e) => onBreakValueChange(e.target.value ? `${e.target.value}ms` : '')}
          placeholder="e.g. 500" min="0" max="5000" className="w-full px-3 py-2 border rounded-md text-sm" />
      )}
    </div>
  );
}
