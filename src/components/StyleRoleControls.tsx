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
  if (styles.length === 0 && roles.length === 0) return null;

  return (
    <div className="space-y-3 p-4">
      {styles.length > 0 && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Style</label>
            <select value={style} onChange={(e) => onStyleChange(e.target.value)} className="w-full px-3 py-2 border rounded-md text-sm">
              <option value="">Default</option>
              {styles.map((s) => (<option key={s} value={s}>{s}</option>))}
            </select>
          </div>
          {style && (
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Style Degree: {styleDegree.toFixed(2)}
              </label>
              <input type="range" min="0.01" max="2" step="0.01" value={styleDegree}
                onChange={(e) => onStyleDegreeChange(parseFloat(e.target.value))} className="w-full" />
              <div className="flex justify-between text-xs text-gray-400">
                <span>0.01</span><span>1.0</span><span>2.0</span>
              </div>
            </div>
          )}
        </>
      )}
      {roles.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">Role</label>
          <select value={role} onChange={(e) => onRoleChange(e.target.value)} className="w-full px-3 py-2 border rounded-md text-sm">
            <option value="">Default</option>
            {roles.map((r) => (<option key={r} value={r}>{r}</option>))}
          </select>
        </div>
      )}
    </div>
  );
}
