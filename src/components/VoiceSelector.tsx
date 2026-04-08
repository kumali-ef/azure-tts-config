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
  customVoiceMode: boolean;
  customVoiceName: string;
  customDeploymentId: string;
  customLanguage: string;
  onVoiceChange: (voice: AzureVoice | null) => void;
  onSearchChange: (query: string) => void;
  onLanguageChange: (language: string) => void;
  onRetry: () => void;
  onCustomVoiceModeChange: (enabled: boolean) => void;
  onCustomVoiceNameChange: (name: string) => void;
  onCustomDeploymentIdChange: (id: string) => void;
  onCustomLanguageChange: (language: string) => void;
}

export function VoiceSelector({
  voices, allVoices, languages, selectedVoice, searchQuery, languageFilter,
  loading, error, onVoiceChange, onSearchChange, onLanguageChange, onRetry,
  customVoiceMode, customVoiceName, customDeploymentId, customLanguage,
  onCustomVoiceModeChange, onCustomVoiceNameChange, onCustomDeploymentIdChange, onCustomLanguageChange,
}: VoiceSelectorProps) {
  const [langSearch, setLangSearch] = useState('');
  const [filterStyle, setFilterStyle] = useState(false);
  const [filterRole, setFilterRole] = useState(false);
  const [filterMultiLang, setFilterMultiLang] = useState(false);
  const [filterDragonHD, setFilterDragonHD] = useState(false);
  const [filterMale, setFilterMale] = useState(false);
  const [filterFemale, setFilterFemale] = useState(false);

  const applyFilters = (list: AzureVoice[]) => {
    return list.filter((v) => {
      if (filterStyle && !(v.StyleList && v.StyleList.length > 0)) return false;
      if (filterRole && !(v.RolePlayList && v.RolePlayList.length > 0)) return false;
      if (filterMultiLang && !v.ShortName.includes('Multilingual')) return false;
      if (filterDragonHD && !v.ShortName.includes('DragonHD')) return false;
      // Gender: if only one is checked, filter to that gender; both or neither = no filter
      if (filterMale !== filterFemale) {
        if (filterMale && v.Gender !== 'Male') return false;
        if (filterFemale && v.Gender !== 'Female') return false;
      }
      return true;
    });
  };

  const anyFilter = filterStyle || filterRole || filterMultiLang || filterDragonHD || filterMale !== filterFemale;

  const filteredAllVoices = useMemo(() => {
    if (!anyFilter) return allVoices;
    return applyFilters(allVoices);
  }, [allVoices, filterStyle, filterRole, filterMultiLang, filterDragonHD, filterMale, filterFemale]);

  const filteredVoices = useMemo(() => {
    if (!anyFilter) return voices;
    return applyFilters(voices);
  }, [voices, filterStyle, filterRole, filterMultiLang, filterDragonHD, filterMale, filterFemale]);

  const filteredLanguages = useMemo(() => {
    const localesWithVoices = new Set(filteredAllVoices.map((v) => v.Locale));
    let langs = anyFilter
      ? languages.filter((lang) => localesWithVoices.has(lang))
      : languages;
    if (langSearch) {
      langs = langs.filter((lang) =>
        lang.toLowerCase().includes(langSearch.toLowerCase())
      );
    }
    return langs;
  }, [languages, langSearch, filteredAllVoices, anyFilter]);

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
      {/* Standard / Custom toggle */}
      <div className="flex rounded-md overflow-hidden border w-fit">
        <button
          onClick={() => onCustomVoiceModeChange(false)}
          className={`px-4 py-1.5 text-sm font-medium transition-colors ${
            !customVoiceMode ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
          }`}
        >
          Standard
        </button>
        <button
          onClick={() => onCustomVoiceModeChange(true)}
          className={`px-4 py-1.5 text-sm font-medium transition-colors ${
            customVoiceMode ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
          }`}
        >
          Custom
        </button>
      </div>

      {customVoiceMode ? (
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Deployment ID</label>
            <input
              type="text"
              value={customDeploymentId}
              onChange={(e) => onCustomDeploymentIdChange(e.target.value)}
              placeholder="Enter deployment ID (GUID from Azure portal)"
              className="w-full px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Custom Voice Name</label>
            <input
              type="text"
              value={customVoiceName}
              onChange={(e) => onCustomVoiceNameChange(e.target.value)}
              placeholder="Enter custom voice name"
              className="w-full px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Language</label>
            <input
              type="text"
              value={customLanguage}
              onChange={(e) => onCustomLanguageChange(e.target.value)}
              placeholder="e.g. en-US"
              className="w-full px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <p className="text-xs text-gray-400">
            Get these from Azure Speech Studio → Custom Voice → Deploy model
          </p>
        </div>
      ) : (
        <>
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
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input type="checkbox" checked={filterDragonHD} onChange={(e) => setFilterDragonHD(e.target.checked)} className="rounded" />
          <span className="text-gray-600">Dragon HD</span>
        </label>
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input type="checkbox" checked={filterMale} onChange={(e) => setFilterMale(e.target.checked)} className="rounded" />
          <span className="text-gray-600">Male</span>
        </label>
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input type="checkbox" checked={filterFemale} onChange={(e) => setFilterFemale(e.target.checked)} className="rounded" />
          <span className="text-gray-600">Female</span>
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
            <option value="">All ({filteredAllVoices.length})</option>
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
              const voice = filteredVoices.find((v) => v.ShortName === e.target.value) || null;
              onVoiceChange(voice);
            }}
            onClick={(e) => {
              const target = e.target as HTMLElement;
              if (target.tagName === 'OPTION') {
                const value = (target as HTMLOptionElement).value;
                if (value !== selectedVoice) {
                  const voice = filteredVoices.find((v) => v.ShortName === value) || null;
                  onVoiceChange(voice);
                }
              }
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
        </>
      )}
    </div>
  );
}
