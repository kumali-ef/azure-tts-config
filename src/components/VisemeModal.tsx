import { useState, useMemo } from 'react';
import type { Recording } from '../types';
import { parseVisemes, visemeDeltas, visemeTimelineMarks } from '../utils/viseme-data';
import type { VisemeFamily } from '../utils/viseme-shapes';
import {
  visemeShape, visemeColor, visemeFamily, FAMILY_COLORS, FAMILY_LABELS, FAMILY_ORDER,
} from '../utils/viseme-shapes';

/** SVG user units. The strip scales to its container via viewBox + width:100%. */
const TIMELINE_WIDTH = 1000;
const TIMELINE_HEIGHT = 48;
const MARK_WIDTH = 3;

/**
 * The viewport is MARK_WIDTH wider than the timeline so a mark clamped to TIMELINE_WIDTH
 * is still drawn. An SVG root clips to its viewport, so without the extra width a rect at
 * x = TIMELINE_WIDTH spans [1000, 1003] and renders nothing — silently hiding the exact
 * case the clamp in visemeTimelineMarks exists for, namely Azure reporting a final event
 * marginally past the reported audio duration.
 */
const VIEWBOX_WIDTH = TIMELINE_WIDTH + MARK_WIDTH;

interface VisemeModalProps {
  recording: Recording;
  onClose: () => void;
}

export function VisemeModal({ recording, onClose }: VisemeModalProps) {
  const [copied, setCopied] = useState(false);
  const [hovered, setHovered] = useState<{ offsetMs: number; visemeId: number } | null>(null);

  const visemes = useMemo(() => parseVisemes(recording.visemes), [recording.visemes]);
  const deltas = useMemo(() => visemeDeltas(visemes), [visemes]);
  const durationMs = recording.audio_duration_ms ?? 0;
  const marks = useMemo(
    () => visemeTimelineMarks(visemes, durationMs, TIMELINE_WIDTH),
    [visemes, durationMs],
  );

  const eventsPerSec = durationMs > 0 ? visemes.length / (durationMs / 1000) : 0;

  // Fixed articulation order, not first-occurrence order, so the legend reads the same
  // across recordings — the whole point of the feature is comparing them side by side.
  const familiesPresent = useMemo(() => {
    const present = new Set<VisemeFamily>();
    for (const v of visemes) {
      const family = visemeFamily(v.visemeId);
      if (family) present.add(family);
    }
    return FAMILY_ORDER.filter((family) => present.has(family));
  }, [visemes]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(JSON.stringify(visemes, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between p-4 border-b">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold truncate">
              Visemes — {recording.voice_display_name}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {visemes.length} events · {durationMs.toLocaleString()} ms ·{' '}
              {eventsPerSec.toFixed(1)} ev/s
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-xl ml-2 leading-none"
          >
            &times;
          </button>
        </div>

        <div className="flex-1 overflow-auto p-4 space-y-4">
          <div>
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>0 ms</span>
              <span>{durationMs.toLocaleString()} ms</span>
            </div>
            <svg
              viewBox={`0 0 ${VIEWBOX_WIDTH} ${TIMELINE_HEIGHT}`}
              preserveAspectRatio="none"
              className="w-full h-12 bg-gray-50 border rounded"
              onMouseLeave={() => setHovered(null)}
            >
              {marks.map((mark, i) => (
                <rect
                  key={i}
                  x={mark.x}
                  y={0}
                  width={MARK_WIDTH}
                  height={TIMELINE_HEIGHT}
                  fill={visemeColor(mark.visemeId)}
                  onMouseEnter={() =>
                    setHovered({ offsetMs: mark.offsetMs, visemeId: mark.visemeId })
                  }
                >
                  <title>
                    {`${mark.offsetMs} ms · id ${mark.visemeId} · ${visemeShape(mark.visemeId)}`}
                  </title>
                </rect>
              ))}
            </svg>
            <p className="text-xs text-gray-500 mt-1 h-4">
              {hovered
                ? `${hovered.offsetMs} ms · id ${hovered.visemeId} · ${visemeShape(hovered.visemeId)}`
                : 'Hover the timeline for event details'}
            </p>
            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
              {familiesPresent.map((family) => (
                <span key={family} className="flex items-center gap-1 text-xs text-gray-600">
                  <span
                    className="inline-block w-2.5 h-2.5 rounded-sm"
                    style={{ backgroundColor: FAMILY_COLORS[family] }}
                  />
                  {FAMILY_LABELS[family]}
                </span>
              ))}
            </div>
          </div>

          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 border-b">
                <th className="py-1 pr-2 font-medium">#</th>
                <th className="py-1 pr-2 font-medium text-right">Offset</th>
                <th className="py-1 pr-2 font-medium text-right">Δms</th>
                <th className="py-1 pr-2 font-medium text-right">ID</th>
                <th className="py-1 font-medium">Mouth shape</th>
              </tr>
            </thead>
            <tbody>
              {visemes.map((viseme, i) => (
                <tr key={i} className="border-b border-gray-100">
                  <td className="py-0.5 pr-2 text-gray-400 tabular-nums">{i + 1}</td>
                  <td className="py-0.5 pr-2 text-right tabular-nums">{viseme.offsetMs} ms</td>
                  <td className="py-0.5 pr-2 text-right tabular-nums text-gray-500">
                    {deltas[i] === null ? '—' : deltas[i]}
                  </td>
                  <td className="py-0.5 pr-2 text-right tabular-nums">
                    <span className="inline-flex items-center gap-1">
                      <span
                        className="inline-block w-2 h-2 rounded-sm"
                        style={{ backgroundColor: visemeColor(viseme.visemeId) }}
                      />
                      {viseme.visemeId}
                    </span>
                  </td>
                  <td className="py-0.5 text-gray-700">{visemeShape(viseme.visemeId)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end p-4 border-t">
          <button
            onClick={handleCopy}
            className="px-4 py-2 bg-gray-600 text-white rounded-md text-sm font-medium hover:bg-gray-700 transition-colors"
          >
            {copied ? 'Copied!' : 'Copy JSON'}
          </button>
        </div>
      </div>
    </div>
  );
}
