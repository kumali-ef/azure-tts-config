import { useMemo } from 'react';
import type { Qwen3Voice } from '../types';
import { QWEN3_VOICES } from '../utils/qwen3-tts';

export function useQwen3Voices(model: string) {
  const voices = useMemo<Qwen3Voice[]>(
    () => QWEN3_VOICES.filter((v) => v.supportedModels.includes(model)),
    [model]
  );

  return { voices };
}
