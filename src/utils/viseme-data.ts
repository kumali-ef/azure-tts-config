/** A single Azure `VisemeReceived` event, reduced to what we persist. */
export interface VisemeEvent {
  offsetMs: number;
  visemeId: number;
}

/** A viseme event positioned on the timeline strip. */
export interface TimelineMark {
  x: number;
  visemeId: number;
  offsetMs: number;
}

/** The Speech SDK reports offsets and durations in 100-nanosecond ticks. */
const TICKS_PER_MS = 10_000;

export function ticksToMs(ticks: number): number {
  return Math.round(ticks / TICKS_PER_MS);
}

/** Tolerant parse of the `visemes` DB column, which is nullable and free-form TEXT. */
export function parseVisemes(json: string | null): VisemeEvent[] {
  if (!json) return [];
  try {
    const parsed: unknown = JSON.parse(json);
    return Array.isArray(parsed) ? (parsed as VisemeEvent[]) : [];
  } catch {
    return [];
  }
}

/** Gap in ms from the previous event; null for the first event. */
export function visemeDeltas(visemes: VisemeEvent[]): (number | null)[] {
  return visemes.map((v, i) => (i === 0 ? null : v.offsetMs - visemes[i - 1].offsetMs));
}

/**
 * Positions events along a strip of the given width. Offsets are clamped to the strip:
 * Azure can report a final event marginally past the reported audio duration.
 */
export function visemeTimelineMarks(
  visemes: VisemeEvent[],
  durationMs: number,
  width: number,
): TimelineMark[] {
  if (durationMs <= 0) return [];
  return visemes.map((v) => ({
    x: Math.min(width, Math.max(0, (v.offsetMs / durationMs) * width)),
    visemeId: v.visemeId,
    offsetMs: v.offsetMs,
  }));
}
