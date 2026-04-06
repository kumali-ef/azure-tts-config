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
  const [filterStyle, setFilterStyle] = useState(false);
  const [filterRole, setFilterRole] = useState(false);
  const [filterMultiLang, setFilterMultiLang] = useState(false);

  const filteredAllVoices = useMemo(() => {
    if (!filterStyle && !filterRole && !filterMultiLang) return allVoices;
    return allVoices.filter((v) => {
      const hasStyle = v.StyleList && v.StyleList.length > 0;
      const hasRole = v.RolePlayList && v.RolePlayList.length > 0;
      const isMultiLang = v.ShortName.includes('Multilingual');
      if (filterStyle && !hasStyle) return false;
      if (filterRole && !hasRole) return false;
      if (filterMultiLang && !isMultiLang) return false;
      return true;
    });
  }, [allVoices, filterStyle, filterRole, filterMultiLang]);

  const filteredVoices = useMemo(() => {
    if (!filterStyle && !filterRole && !filterMultiLang) return voices;
    return voices.filter((v) => {
      const hasStyle = v.StyleList && v.StyleList.length > 0;
      const hasRole = v.RolePlayList && v.RolePlayList.length > 0;
      const isMultiLang = v.ShortName.includes('Multilingual');
      if (filterStyle && !hasStyle) return false;
      if (filterRole && !hasRole) return false;
      if (filterMultiLang && !isMultiLang) return false;
      return true;
    });
  }, [voices, filterStyle, filterRole, filterMultiLang]);

  const filteredLanguages = useMemo(() => {
    const localesWithVoices = new Set(filteredAllVoices.map((v) => v.Locale));
    let langs = (filterStyle || filterRole || filterMultiLang)
      ? languages.filter((lang) => localesWithVoices.has(lang))
      : languages;
    if (langSearch) {
      langs = langs.filter((lang) =>
        lang.toLowerCase().includes(langSearch.toLowerCase())
      );
    }
    return langs;
  }, [languages, langSearch, filteredAllVoices, filterStyle, filterRole, filterMultiLang]);

  const voiceCountByLang = useMemo(() => {
    const counts = new Map<string, number>();
    for (const v of filteredAllVoices) {
      counts.set(v.Locale, (counts.get(v.Locale) || 0) + 1);
    }
    return counts;
  }, [filteredAllVoices]);

  const langStyleRoleInfo = useMemo(() => {
    const hasStyle = new Set<string>();
    const hasRole = new Set<string>();
    for (const v of filteredAllVoices) {
      if (v.StyleList && v.StyleList.length > 0) hasStyle.add(v.Locale);
      if (v.RolePlayList && v.RolePlayList.length > 0) hasRole.add(v.Locale);
    }
    return { hasStyle, hasRole };
  }, [filteredAllVoices]);

  return (
    <div className="space-y-3 p-4">
      {error && (
        <div className="flex items-center gap-2 text-red-600 text-sm">
          <span>{error}</span>
          <button onClick={onRetry} className="underline hover:no-underline">Retry</button>
        </div>
      )}

      <div className="flex items-center gap-4 text-sm">
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input type="checkbox" checked={filterMultiLang} onChange={(e) => setFilterMultiLang(e.target.checked)} className="rounded" />
          <span className="text-gray-600">multilingual</span>
        </label>
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input type="checkbox" checked={filterStyle} onChange={(e) => setFilterStyle(e.target.checked)} className="rounded" />
          <span className="text-gray-600">with style</span>
        </label>
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input type="checkbox" checked={filterRole} onChange={(e) => setFilterRole(e.target.checked)} className="rounded" />
          <span className="text-gray-600">with role</span>
        </label>
      </div>

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
            disabled={loading || filteredVoices.length === 0}
            className="w-full px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-blue-500"
            size={10}
          >
            {loading && <option>Loading voices...</option>}
            {!loading && filteredVoices.length === 0 && <option>No voices available</option>}
            {filteredVoices.map((voice) => {
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
            {filteredVoices.length} voice{filteredVoices.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>
    </div>
  );
}
