import { useState, useMemo } from 'react';
import type { AzureVoice } from '../types';

interface VoiceSelectorProps {
  voices: AzureVoice[];
  allVoices: AzureVoice[];
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
  voices, allVoices, languages, selectedVoice, searchQuery, languageFilter,
  loading, error, onVoiceChange, onSearchChange, onLanguageChange, onRetry,
}: VoiceSelectorProps) {
  const [langSearch, setLangSearch] = useState('');

  const voiceCountByLang = useMemo(() => {
    const counts = new Map<string, number>();
    for (const v of allVoices) {
      counts.set(v.Locale, (counts.get(v.Locale) || 0) + 1);
    }
    return counts;
  }, [allVoices]);

  const langStyleRoleInfo = useMemo(() => {
    const hasStyle = new Set<string>();
    const hasRole = new Set<string>();
    for (const v of allVoices) {
      if (v.StyleList && v.StyleList.length > 0) hasStyle.add(v.Locale);
      if (v.RolePlayList && v.RolePlayList.length > 0) hasRole.add(v.Locale);
    }
    return { hasStyle, hasRole };
  }, [allVoices]);

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
            {filteredLanguages.map((lang) => {
              const s = langStyleRoleInfo.hasStyle.has(lang);
              const r = langStyleRoleInfo.hasRole.has(lang);
              const suffix = s && r ? ' - with style|role'
                : s ? ' - with style'
                : r ? ' - with role'
                : '';
              return (
                <option key={lang} value={lang}>{lang} ({voiceCountByLang.get(lang) || 0}){suffix}</option>
              );
            })}
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
            {voices.map((voice) => {
              const hasStyle = voice.StyleList && voice.StyleList.length > 0;
              const hasRole = voice.RolePlayList && voice.RolePlayList.length > 0;
              const suffix = hasStyle && hasRole ? ' - with style|role'
                : hasStyle ? ' - with style'
                : hasRole ? ' - with role'
                : '';
              return (
                <option key={voice.ShortName} value={voice.ShortName}>
                  {voice.DisplayName} ({voice.Locale}) - {voice.Gender}{suffix}
                </option>
              );
            })}
          </select>
          <p className="text-xs text-gray-500">
            {voices.length} voice{voices.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>
    </div>
  );
}
