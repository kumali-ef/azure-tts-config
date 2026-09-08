import { describe, it, expect } from 'vitest';
import {
  ticksToMs,
  parseVisemes,
  visemeDeltas,
  visemeTimelineMarks,
} from '../src/utils/viseme-data';
import type { VisemeEvent } from '../src/utils/viseme-data';

describe('ticksToMs', () => {
  it('converts 100-nanosecond ticks to milliseconds', () => {
    expect(ticksToMs(0)).toBe(0);
    expect(ticksToMs(10_000)).toBe(1);
    expect(ticksToMs(1_370_000)).toBe(137);
    expect(ticksToMs(32_400_000)).toBe(3240);
  });

  it('rounds to the nearest millisecond', () => {
    expect(ticksToMs(14_999)).toBe(1);
    expect(ticksToMs(15_000)).toBe(2);
  });
});

describe('parseVisemes', () => {
  it('returns an empty array for null', () => {
    expect(parseVisemes(null)).toEqual([]);
  });

  it('returns an empty array for an empty string', () => {
    expect(parseVisemes('')).toEqual([]);
  });

  it('parses a valid JSON array', () => {
    expect(parseVisemes('[{"offsetMs":137,"visemeId":6}]')).toEqual([
      { offsetMs: 137, visemeId: 6 },
    ]);
  });

  it('returns an empty array for malformed JSON', () => {
    expect(parseVisemes('{not json')).toEqual([]);
  });

  it('returns an empty array when the JSON is not an array', () => {
    expect(parseVisemes('{"offsetMs":1}')).toEqual([]);
  });
});

describe('visemeDeltas', () => {
  it('returns null for the first event and gaps thereafter', () => {
    const visemes: VisemeEvent[] = [
      { offsetMs: 0, visemeId: 0 },
      { offsetMs: 137, visemeId: 6 },
      { offsetMs: 212, visemeId: 19 },
    ];
    expect(visemeDeltas(visemes)).toEqual([null, 137, 75]);
  });

  it('returns an empty array for no events', () => {
    expect(visemeDeltas([])).toEqual([]);
  });
});

describe('visemeTimelineMarks', () => {
  const visemes: VisemeEvent[] = [
    { offsetMs: 0, visemeId: 0 },
    { offsetMs: 500, visemeId: 6 },
    { offsetMs: 1000, visemeId: 21 },
  ];

  it('maps offsets proportionally across the given width', () => {
    expect(visemeTimelineMarks(visemes, 1000, 100)).toEqual([
      { x: 0, visemeId: 0, offsetMs: 0 },
      { x: 50, visemeId: 6, offsetMs: 500 },
      { x: 100, visemeId: 21, offsetMs: 1000 },
    ]);
  });

  it('produces non-decreasing x positions', () => {
    const marks = visemeTimelineMarks(visemes, 1000, 1000);
    for (let i = 1; i < marks.length; i++) {
      expect(marks[i].x).toBeGreaterThanOrEqual(marks[i - 1].x);
    }
  });

  it('returns an empty array when duration is zero', () => {
    expect(visemeTimelineMarks(visemes, 0, 100)).toEqual([]);
  });

  it('returns an empty array when duration is negative', () => {
    expect(visemeTimelineMarks(visemes, -5, 100)).toEqual([]);
  });

  it('returns an empty array for no events', () => {
    expect(visemeTimelineMarks([], 1000, 100)).toEqual([]);
  });

  it('clamps an offset beyond the reported duration to the full width', () => {
    const overrun: VisemeEvent[] = [{ offsetMs: 2000, visemeId: 0 }];
    expect(visemeTimelineMarks(overrun, 1000, 100)).toEqual([
      { x: 100, visemeId: 0, offsetMs: 2000 },
    ]);
  });
});
