const CUSTOM = '__custom__';

interface ProsodyFieldProps {
  label: string;
  presets: string[];
  /** Helper line describing accepted custom formats, e.g. "e.g. +20%, -10%, 0.5, 1.5" */
  customHint: string;
  /** Regex the custom value must match; a non-empty value that fails shows a soft warning. */
  customPattern: RegExp;
  value: string;
  onChange: (value: string) => void;
}

/**
 * A labeled prosody control that lets the user pick a preset level OR enter a
 * custom value (percentage / number / relative change). The mode is derived
 * purely from `value`: any value that is not one of the presets is treated as
 * custom (including the empty string, which is the just-switched-to-custom
 * state). This means loading a saved value like "+20%" renders in custom mode
 * automatically, with no extra state to keep in sync.
 */
export function ProsodyField({
  label, presets, customHint, customPattern, value, onChange,
}: ProsodyFieldProps) {
  const isCustom = !presets.includes(value);
  const trimmed = value.trim();
  const showWarning = isCustom && trimmed !== '' && !customPattern.test(trimmed);

  const handleSelect = (selected: string) => {
    // Switching to Custom clears the value so the text field starts empty.
    onChange(selected === CUSTOM ? '' : selected);
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-600 mb-1">{label}</label>
      <select
        value={isCustom ? CUSTOM : value}
        onChange={(e) => handleSelect(e.target.value)}
        className="w-full px-2 py-1.5 border rounded-md text-sm"
      >
        {presets.map((o) => (<option key={o} value={o}>{o}</option>))}
        <option value={CUSTOM}>Custom (% or number)</option>
      </select>
      {isCustom && (
        <div className="mt-1">
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={customHint}
            className={`w-full px-2 py-1.5 border rounded-md text-sm ${
              showWarning ? 'border-red-400 focus:ring-red-500' : ''
            }`}
          />
          <p className={`mt-0.5 text-xs ${showWarning ? 'text-red-600' : 'text-gray-400'}`}>
            {showWarning ? `Unexpected format — ${customHint}` : customHint}
          </p>
        </div>
      )}
    </div>
  );
}
