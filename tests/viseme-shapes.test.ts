import { describe, it, expect } from 'vitest';
import {
  VISEME_SHAPES,
  visemeShape,
  visemeFamily,
  visemeColor,
  FAMILY_COLORS,
  FAMILY_LABELS,
  FAMILY_ORDER,
} from '../src/utils/viseme-shapes';

describe('visemeShape', () => {
  it('has exactly 22 shape entries', () => {
    expect(VISEME_SHAPES).toHaveLength(22);
  });

  it('resolves every documented viseme ID to a non-empty label', () => {
    for (let id = 0; id <= 21; id++) {
      expect(visemeShape(id)).toBeTruthy();
    }
  });

  it('maps known IDs to their documented phoneme groups', () => {
    expect(visemeShape(0)).toBe('silence');
    expect(visemeShape(6)).toBe('j i ɪ');
    expect(visemeShape(19)).toBe('d t n θ');
    expect(visemeShape(21)).toBe('p b m');
  });

  it('falls back to "id N" for an out-of-range ID', () => {
    expect(visemeShape(99)).toBe('id 99');
    expect(visemeShape(-1)).toBe('id -1');
  });
});

describe('visemeFamily', () => {
  it('assigns every ID 0-21 to exactly one family', () => {
    for (let id = 0; id <= 21; id++) {
      const family = visemeFamily(id);
      expect(family).not.toBeNull();
      expect(FAMILY_COLORS[family!]).toMatch(/^#[0-9a-f]{6}$/);
      expect(FAMILY_LABELS[family!]).toBeTruthy();
    }
  });

  it('groups IDs into the documented families', () => {
    expect(visemeFamily(0)).toBe('silence');
    expect(visemeFamily(2)).toBe('open-vowel');
    expect(visemeFamily(7)).toBe('close-vowel');
    expect(visemeFamily(10)).toBe('diphthong');
    expect(visemeFamily(14)).toBe('approximant');
    expect(visemeFamily(15)).toBe('fricative');
    expect(visemeFamily(21)).toBe('plosive');
  });

  it('returns null for an unknown ID', () => {
    expect(visemeFamily(99)).toBeNull();
  });

  it('covers all seven families across the 22 IDs', () => {
    const seen = new Set(
      Array.from({ length: 22 }, (_, id) => visemeFamily(id)),
    );
    expect(seen.size).toBe(7);
  });
});

describe('FAMILY_ORDER', () => {
  it('lists every family exactly once', () => {
    expect(FAMILY_ORDER).toHaveLength(7);
    expect(new Set(FAMILY_ORDER).size).toBe(7);
  });

  it('covers exactly the families reachable from IDs 0-21', () => {
    const reachable = new Set(
      Array.from({ length: 22 }, (_, id) => visemeFamily(id)!),
    );
    expect(new Set(FAMILY_ORDER)).toEqual(reachable);
  });
});

describe('visemeColor', () => {
  it('returns the family colour for a known ID', () => {
    expect(visemeColor(0)).toBe(FAMILY_COLORS.silence);
    expect(visemeColor(21)).toBe(FAMILY_COLORS.plosive);
  });

  it('returns a neutral grey for an unknown ID', () => {
    expect(visemeColor(99)).toBe('#64748b');
  });
});
