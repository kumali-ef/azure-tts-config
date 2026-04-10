import { useState } from 'react';
import { CARTESIA_LANGUAGES } from '../../utils/cartesia-tts';

interface Props {
  value: string;
  onChange: (language: string) => void;
}

export function CartesiaLanguage({ value, onChange }: Props) {
  const [search, setSearch] = useState('');

  const filtered = CARTESIA_LANGUAGES.filter((lang) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return lang.name.toLowerCase().includes(q) || lang.code.toLowerCase().includes(q);
  });

  return (
    <div className="p-4 space-y-2">
      <label className="block text-sm font-medium text-gray-700">Language (optional)</label>
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="🔍 Search languages..."
        className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm"
      />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-lime-500 focus:border-lime-500"
      >
        <option value="">Auto-detect</option>
        {filtered.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.name} ({lang.code})
          </option>
        ))}
      </select>
      <p className="text-xs text-gray-400">Leave empty to let Cartesia auto-detect the language.</p>
    </div>
  );
}
