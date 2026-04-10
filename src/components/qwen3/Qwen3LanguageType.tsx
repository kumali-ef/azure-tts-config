const LANGUAGES = [
  'Auto',
  'Chinese',
  'English',
  'French',
  'German',
  'Italian',
  'Japanese',
  'Korean',
  'Portuguese',
  'Russian',
  'Spanish',
];

interface Props {
  value: string;
  onChange: (value: string) => void;
}

export function Qwen3LanguageType({ value, onChange }: Props) {
  return (
    <div className="p-4">
      <label className="block text-sm font-medium text-gray-700 mb-1">Language Type</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
      >
        {LANGUAGES.map((lang) => (
          <option key={lang} value={lang}>
            {lang === 'Auto' ? 'Auto (detect language)' : lang}
          </option>
        ))}
      </select>
    </div>
  );
}
