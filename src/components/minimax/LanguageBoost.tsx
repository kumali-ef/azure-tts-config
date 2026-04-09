const LANGUAGES = [
  '', 'auto', 'Chinese', 'Chinese,Yue', 'English', 'Arabic', 'Russian', 'Spanish',
  'French', 'Portuguese', 'German', 'Turkish', 'Dutch', 'Ukrainian', 'Vietnamese',
  'Indonesian', 'Japanese', 'Italian', 'Korean', 'Thai', 'Polish', 'Romanian',
  'Greek', 'Czech', 'Finnish', 'Hindi', 'Bulgarian', 'Danish', 'Hebrew', 'Malay',
  'Persian', 'Slovak', 'Swedish', 'Croatian', 'Filipino', 'Hungarian', 'Norwegian',
  'Slovenian', 'Catalan', 'Nynorsk', 'Tamil', 'Afrikaans',
];

interface Props {
  value: string;
  onChange: (value: string) => void;
}

export function LanguageBoost({ value, onChange }: Props) {
  return (
    <div className="p-4">
      <label className="block text-sm font-medium text-gray-700 mb-1">Language Boost</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
      >
        <option value="">None (default)</option>
        {LANGUAGES.filter(Boolean).map((lang) => (
          <option key={lang} value={lang}>{lang === 'auto' ? 'auto (let model decide)' : lang}</option>
        ))}
      </select>
    </div>
  );
}
