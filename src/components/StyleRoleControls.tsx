interface StyleRoleControlsProps {
  styles: string[];
  roles: string[];
  style: string;
  styleDegree: number;
  role: string;
  onStyleChange: (style: string) => void;
  onStyleDegreeChange: (degree: number) => void;
  onRoleChange: (role: string) => void;
}

export function StyleRoleControls({
  styles, roles, style, styleDegree, role,
  onStyleChange, onStyleDegreeChange, onRoleChange,
}: StyleRoleControlsProps) {
  const hasStyles = styles.length > 0;
  const hasRoles = roles.length > 0;

  return (
    <div className="space-y-3 p-4 bg-white rounded-lg shadow-sm border">
      <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Style & Role</h2>

      {!hasStyles && !hasRoles && (
        <p className="text-xs text-gray-400 italic">Select a voice that supports styles or roles</p>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-600 mb-1">Style</label>
        <select
          value={style}
          onChange={(e) => onStyleChange(e.target.value)}
          disabled={!hasStyles}
          className="w-full px-3 py-2 border rounded-md text-sm disabled:bg-gray-100 disabled:text-gray-400"
        >
          <option value="">{hasStyles ? 'Default' : 'Not available for this voice'}</option>
          {styles.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {style && (
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">
            Style Degree: {styleDegree.toFixed(2)}
          </label>
          <input
            type="range"
            min="0.01"
            max="2"
            step="0.01"
            value={styleDegree}
            onChange={(e) => onStyleDegreeChange(parseFloat(e.target.value))}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-gray-400">
            <span>0.01</span><span>1.0</span><span>2.0</span>
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-600 mb-1">Role</label>
        <select
          value={role}
          onChange={(e) => onRoleChange(e.target.value)}
          disabled={!hasRoles}
          className="w-full px-3 py-2 border rounded-md text-sm disabled:bg-gray-100 disabled:text-gray-400"
        >
          <option value="">{hasRoles ? 'Default' : 'Not available for this voice'}</option>
          {roles.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
