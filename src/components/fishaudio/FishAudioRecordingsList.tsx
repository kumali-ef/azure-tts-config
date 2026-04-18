import { useState } from 'react';
import type { FishAudioRecording } from '../../types';

interface Props {
  recordings: FishAudioRecording[];
  loading: boolean;
  error: string | null;
  onPlay: (id: string) => void;
  onDownload: (id: string) => void;
  onDelete: (id: string) => void;
  onLoad: (rec: FishAudioRecording) => void;
  onShowCode: (rec: FishAudioRecording) => void;
}

function modelBadge(model: string) {
  if (model === 's2-pro') return { label: 'S2-Pro', color: 'bg-cyan-500' };
  if (model === 's1') return { label: 'S1', color: 'bg-sky-500' };
  return { label: model, color: 'bg-gray-500' };
}

export function FishAudioRecordingsList({ recordings, loading, error, onPlay, onDownload, onDelete, onLoad, onShowCode }: Props) {
  const [filter, setFilter] = useState('');

  const filtered = recordings.filter((rec) => {
    if (!filter) return true;
    const q = filter.toLowerCase();
    return (
      rec.text.toLowerCase().includes(q) ||
      (rec.reference_id || '').toLowerCase().includes(q) ||
      (rec.voice_name || '').toLowerCase().includes(q) ||
      rec.model.toLowerCase().includes(q)
    );
  });

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b bg-white">
        <h2 className="text-lg font-bold text-gray-800 mb-2">Fish Audio Recordings</h2>
        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="🔍 Filter recordings..."
          className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm"
        />
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading && <p className="p-4 text-sm text-gray-500">Loading recordings...</p>}
        {error && <p className="p-4 text-sm text-red-500">{error}</p>}
        {!loading && filtered.length === 0 && (
          <p className="p-4 text-sm text-gray-400">No recordings yet. Synthesize some audio!</p>
        )}
        {filtered.map((rec) => {
          const badge = modelBadge(rec.model);
          return (
            <div key={rec.id} className="px-4 py-3 border-b border-gray-100 hover:bg-gray-50">
              <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className={`${badge.color} text-white text-[10px] px-1.5 py-0.5 rounded-full font-medium`}>
                      {badge.label}
                    </span>
                    <span className="text-sm font-medium text-gray-700 truncate">
                      {rec.voice_name || rec.reference_id || 'Default voice'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1 truncate">{rec.text}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(rec.created_at).toLocaleString()}
                    {rec.stream_duration_ms != null ? (
                      <span className="ml-2 text-cyan-500">⏱ TTFB {rec.api_response_time_ms}ms | Total {rec.stream_duration_ms}ms</span>
                    ) : rec.api_response_time_ms != null ? (
                      <span className="ml-2 text-cyan-500">⏱ Take {rec.api_response_time_ms}ms</span>
                    ) : null}
                  </p>
                </div>
                <div className="flex gap-1 ml-2">
                  <button
                    onClick={() => onPlay(rec.id)}
                    className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
                    title="Play"
                  >▶</button>
                  <button
                    onClick={() => onDownload(rec.id)}
                    className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
                    title="Download"
                  >⬇</button>
                  <button
                    onClick={() => onLoad(rec)}
                    className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
                    title="Load config"
                  >↩</button>
                  <button
                    onClick={() => onDelete(rec.id)}
                    className="px-2 py-1 text-xs bg-gray-100 hover:bg-red-100 text-red-500 rounded"
                    title="Delete"
                  >🗑</button>
                  <button
                    onClick={() => onShowCode(rec)}
                    className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
                    title="Show config JSON"
                  >{'{}'}</button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
