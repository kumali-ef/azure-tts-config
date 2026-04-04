import type { Recording } from '../types';

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
  return (
    <div className="h-full flex flex-col">
      <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide p-4 pb-2">
        Saved Recordings ({recordings.length})
      </h2>

      {error && (
        <div className="mx-4 p-2 bg-red-50 text-red-600 rounded text-sm">{error}</div>
      )}

      {loading && (
        <div className="p-4 text-gray-500 text-sm">Loading recordings...</div>
      )}

      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
        {recordings.length === 0 && !loading && (
          <p className="text-gray-400 text-sm italic">No saved recordings yet.</p>
        )}

        {recordings.map((rec) => (
          <div key={rec.id} className="p-3 bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">
                  {rec.voice_display_name}
                  <span className="text-gray-400 font-normal ml-1">({rec.language})</span>
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
