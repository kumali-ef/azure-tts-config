import { useState, useMemo } from 'react';
import type { Recording } from '../types';

interface RecordingFilters {
  language: string;
  voice: string;
  rate: string;
  pitch: string;
  volume: string;
  style: string;
  emphasis: string;
  role: string;
}

const EMPTY_FILTERS: RecordingFilters = {
  language: '', voice: '', rate: '', pitch: '', volume: '',
  style: '', emphasis: '', role: '',
};

interface RecordingsListProps {
  recordings: Recording[];
  loading: boolean;
  error: string | null;
  onPlay: (id: string) => void;
  onDelete: (id: string) => void;
  onShowCode: (recording: Recording) => void;
  onLoad: (recording: Recording) => void;
}

export function RecordingsList({ recordings, loading, error, onPlay, onDelete, onShowCode, onLoad }: RecordingsListProps) {
  const [filters, setFilters] = useState<RecordingFilters>(EMPTY_FILTERS);
  const [showFilters, setShowFilters] = useState(false);

  const filterOptions = useMemo(() => {
    const collect = (fn: (r: Recording) => string | null) => {
      const vals = new Set<string>();
      for (const r of recordings) {
        const v = fn(r);
        if (v) vals.add(v);
      }
      return [...vals].sort();
    };
    return {
      languages: collect((r) => r.language),
      voices: collect((r) => r.voice_display_name),
      rates: collect((r) => r.rate),
      pitches: collect((r) => r.pitch),
      volumes: collect((r) => r.volume),
      styles: collect((r) => r.style),
      emphases: collect((r) => r.emphasis),
      roles: collect((r) => r.role),
    };
  }, [recordings]);

  const filtered = useMemo(() => {
    return recordings.filter((r) => {
      if (filters.language && r.language !== filters.language) return false;
      if (filters.voice && r.voice_display_name !== filters.voice) return false;
      if (filters.rate && r.rate !== filters.rate) return false;
      if (filters.pitch && r.pitch !== filters.pitch) return false;
      if (filters.volume && r.volume !== filters.volume) return false;
      if (filters.style && (r.style || '') !== filters.style) return false;
      if (filters.emphasis && (r.emphasis || '') !== filters.emphasis) return false;
      if (filters.role && (r.role || '') !== filters.role) return false;
      return true;
    });
  }, [recordings, filters]);

  const activeCount = Object.values(filters).filter(Boolean).length;

  const updateFilter = (key: keyof RecordingFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-4 pb-2">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
          Saved Recordings ({filtered.length}{filtered.length !== recordings.length ? ` / ${recordings.length}` : ''})
        </h2>
        <div className="flex items-center gap-2">
          {activeCount > 0 && (
            <button
              onClick={() => setFilters(EMPTY_FILTERS)}
              className="text-xs text-red-500 hover:text-red-700"
            >
              Clear
            </button>
          )}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`text-xs px-2 py-1 rounded transition-colors ${showFilters ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            Filter{activeCount > 0 ? ` (${activeCount})` : ''}
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="mx-4 mb-2 p-3 bg-white border rounded-lg grid grid-cols-2 gap-2">
          <FilterSelect label="Language" value={filters.language} options={filterOptions.languages} onChange={(v) => updateFilter('language', v)} />
          <FilterSelect label="Voice" value={filters.voice} options={filterOptions.voices} onChange={(v) => updateFilter('voice', v)} />
          <FilterSelect label="Rate" value={filters.rate} options={filterOptions.rates} onChange={(v) => updateFilter('rate', v)} />
          <FilterSelect label="Pitch" value={filters.pitch} options={filterOptions.pitches} onChange={(v) => updateFilter('pitch', v)} />
          <FilterSelect label="Volume" value={filters.volume} options={filterOptions.volumes} onChange={(v) => updateFilter('volume', v)} />
          <FilterSelect label="Style" value={filters.style} options={filterOptions.styles} onChange={(v) => updateFilter('style', v)} />
          <FilterSelect label="Emphasis" value={filters.emphasis} options={filterOptions.emphases} onChange={(v) => updateFilter('emphasis', v)} />
          <FilterSelect label="Role" value={filters.role} options={filterOptions.roles} onChange={(v) => updateFilter('role', v)} />
        </div>
      )}

      {error && (
        <div className="mx-4 p-2 bg-red-50 text-red-600 rounded text-sm">{error}</div>
      )}

      {loading && (
        <div className="p-4 text-gray-500 text-sm">Loading recordings...</div>
      )}

      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
        {filtered.length === 0 && !loading && (
          <p className="text-gray-400 text-sm italic">
            {recordings.length === 0 ? 'No saved recordings yet.' : 'No recordings match the filters.'}
          </p>
        )}

        {filtered.map((rec) => (
          <div key={rec.id} className="p-3 bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">
                  {rec.voice_display_name}
                  <span className="text-gray-400 font-normal ml-1">({rec.language})</span>
                  {rec.deployment_id && (
                    <span className="ml-1.5 px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded text-xs font-normal">Custom</span>
                  )}
                </p>
                <p className="text-xs text-gray-500 truncate mt-0.5">{rec.text}</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {rec.rate !== 'medium' && <Tag label={`rate: ${rec.rate}`} />}
                  {rec.pitch !== 'medium' && <Tag label={`pitch: ${rec.pitch}`} />}
                  {rec.volume !== 'medium' && <Tag label={`vol: ${rec.volume}`} />}
                  {rec.style && <Tag label={rec.style} />}
                  {rec.emphasis && <Tag label={`emphasis: ${rec.emphasis}`} />}
                </div>
                {rec.label && (
                  <p className="text-xs text-blue-600 mt-1">{rec.label}</p>
                )}
                <p className="text-xs text-gray-400 mt-1">
                  {new Date(rec.created_at).toLocaleString()}
                  {rec.stream_duration_ms != null ? (
                    <span className="ml-2 text-indigo-500">⏱ TTFB {rec.api_response_time_ms}ms | Total {rec.stream_duration_ms}ms</span>
                  ) : rec.api_response_time_ms != null ? (
                    <span className="ml-2 text-indigo-500">⏱ Take {rec.api_response_time_ms}ms</span>
                  ) : null}
                </p>
              </div>

              <div className="flex flex-col gap-1">
                <button
                  onClick={() => onPlay(rec.id)}
                  className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200 transition-colors"
                >
                  ▶ Play
                </button>
                <button
                  onClick={() => onDelete(rec.id)}
                  className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs hover:bg-red-200 transition-colors"
                >
                  Delete
                </button>
                <button
                  onClick={() => onLoad(rec)}
                  className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs hover:bg-green-200 transition-colors"
                >
                  Load config
                </button>
                <button
                  onClick={() => onShowCode(rec)}
                  className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs hover:bg-gray-200 transition-colors"
                >
                  Code
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Tag({ label }: { label: string }) {
  return (
    <span className="inline-block px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
      {label}
    </span>
  );
}

function FilterSelect({ label, value, options, onChange }: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  if (options.length === 0) return null;
  return (
    <div>
      <label className="text-xs text-gray-500">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-2 py-1 border rounded text-xs focus:ring-1 focus:ring-blue-500"
      >
        <option value="">All ({options.length})</option>
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </div>
  );
}
