/**
 * Azure Speech viseme IDs map to phoneme groups, not individual phonemes.
 * Order is significant — the array index IS the viseme ID reported by the SDK.
 */
export const VISEME_SHAPES: readonly string[] = [
  'silence',    // 0
  'æ ə ʌ',      // 1
  'ɑ',          // 2
  'ɔ',          // 3
  'ɛ ʊ',        // 4
  'ɝ',          // 5
  'j i ɪ',      // 6
  'w u',        // 7
  'o',          // 8
  'aʊ',         // 9
  'ɔɪ',         // 10
  'aɪ',         // 11
  'h',          // 12
  'ɹ',          // 13
  'l',          // 14
  's z',        // 15
  'ʃ tʃ dʒ ʒ',  // 16
  'ð',          // 17
  'f v',        // 18
  'd t n θ',    // 19
  'k g ŋ',      // 20
  'p b m',      // 21
];

export function visemeShape(id: number): string {
  return VISEME_SHAPES[id] ?? `id ${id}`;
}

export type VisemeFamily =
  | 'silence'
  | 'open-vowel'
  | 'close-vowel'
  | 'diphthong'
  | 'approximant'
  | 'fricative'
  | 'plosive';

/**
 * Seven families rather than a vowel/consonant split, so the timeline needs seven
 * colours instead of 22 arbitrary hues. IDs 12 (h), 13 (ɹ) and 14 (l) are grouped as
 * 'approximant' because all three are visually open, unclosed mouth shapes.
 */
const FAMILY_BY_ID: Record<number, VisemeFamily> = {
  0: 'silence',
  1: 'open-vowel', 2: 'open-vowel', 3: 'open-vowel', 5: 'open-vowel',
  4: 'close-vowel', 6: 'close-vowel', 7: 'close-vowel', 8: 'close-vowel',
  9: 'diphthong', 10: 'diphthong', 11: 'diphthong',
  12: 'approximant', 13: 'approximant', 14: 'approximant',
  15: 'fricative', 16: 'fricative', 17: 'fricative', 18: 'fricative',
  19: 'plosive', 20: 'plosive', 21: 'plosive',
};

/**
 * Canonical articulation order (silence, then vowels front-to-back, then consonants by
 * closure). Used for legend ordering so the same families read in the same order across
 * recordings, which matters when comparing two timelines side by side.
 */
export const FAMILY_ORDER: readonly VisemeFamily[] = [
  'silence',
  'open-vowel',
  'close-vowel',
  'diphthong',
  'approximant',
  'fricative',
  'plosive',
];

export const FAMILY_COLORS: Record<VisemeFamily, string> = {
  silence: '#cbd5e1',
  'open-vowel': '#f59e0b',
  'close-vowel': '#0ea5e9',
  diphthong: '#ec4899',
  approximant: '#8b5cf6',
  fricative: '#10b981',
  plosive: '#ef4444',
};

export const FAMILY_LABELS: Record<VisemeFamily, string> = {
  silence: 'silence',
  'open-vowel': 'open vowels',
  'close-vowel': 'close / rounded vowels',
  diphthong: 'diphthongs',
  approximant: 'glides & liquids',
  fricative: 'fricatives & sibilants',
  plosive: 'plosives & nasals',
};

const UNKNOWN_COLOR = '#64748b';

export function visemeFamily(id: number): VisemeFamily | null {
  return FAMILY_BY_ID[id] ?? null;
}

export function visemeColor(id: number): string {
  const family = visemeFamily(id);
  return family ? FAMILY_COLORS[family] : UNKNOWN_COLOR;
}
