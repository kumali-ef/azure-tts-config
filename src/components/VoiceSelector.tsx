import { useState, useMemo } from 'react';
import type { AzureVoice } from '../types';

interface VoiceSelectorProps {
  voices: AzureVoice[];
  languages: string[];
  selectedVoice: string;
  searchQuery: string;
  languageFilter: string;
  loading: boolean;
  error: string | null;
  onVoiceChange: (voice: AzureVoice | null) => void;
  onSearchChange: (query: string) => void;
  onLanguageChange: (language: string) => void;
  onRetry: () => void;
}

export function VoiceSelector({
  voices, languages, selectedVoice, searchQuery, languageFilter,
  loading, error, onVoiceChange, onSearchChange, onLanguageChange, onRetry,
}: VoiceSelectorProps) {
  const [langSearch, setLangSearch] = useState('');

  const filteredLanguages = useMemo(() => {
    if (!langSearch) return languages;
    return languages.filter((lang) =>
      lang.toLowerCase().includes(langSearch.toLowerCase())
    );
  }, [languages, langSearch]);

  return (
    <div className="space-y-3 p-4 bg-white rounded-lg shadow-sm border">
      <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Language & Voice</h2>
      {error && (
        <div className="flex items-center gap-2 text-red-600 text-sm">
          <span>{error}</span>
          <button onClick={onRetry} className="underline hover:no-underline">Retry</button>
        </div>
      )}

      <div className="flex gap-3">
        {/* Left: Language selector */}
        <div className="w-1/3 space-y-1.5">
          <input
            type="text"
            value={langSearch}
            onChange={(e) => setLangSearch(e.target.value)}
            placeholder="Search languages..."
            className="w-full px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={languageFilter}
            onChange={(e) => onLanguageChange(e.target.value)}
            className="w-full px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-blue-500"
            size={10}
          >
            <option value="">All ({languages.length})</option>
            {filteredLanguages.map((lang) => (
              <option key={lang} value={lang}>{lang}</option>
            ))}
          </select>
          <p className="text-xs text-gray-500">
            {filteredLanguages.length} language{filteredLanguages.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Right: Voice selector */}
        <div className="w-2/3 space-y-1.5">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search voices..."
            className="w-full px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={selectedVoice}
            onChange={(e) => {
              const voice = voices.find((v) => v.ShortName === e.target.value) || null;
              onVoiceChange(voice);
            }}
            disabled={loading || voices.length === 0}
            className="w-full px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-blue-500"
            size={10}
          >
            {loading && <option>Loading voices...</option>}
            {!loading && voices.length === 0 && <option>No voices available</option>}
            {voices.map((voice) => (
              <option key={voice.ShortName} value={voice.ShortName}>
                {voice.DisplayName} ({voice.Locale}) - {voice.Gender}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-500">
            {voices.length} voice{voices.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>
    </div>
  );
}
