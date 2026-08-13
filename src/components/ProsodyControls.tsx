import { ProsodyField } from './ProsodyField';

interface ProsodyControlsProps {
  rate: string;
  pitch: string;
  volume: string;
  onRateChange: (rate: string) => void;
  onPitchChange: (pitch: string) => void;
  onVolumeChange: (volume: string) => void;
}

const RATE_OPTIONS = ['x-slow', 'slow', 'medium', 'fast', 'x-fast'];
const PITCH_OPTIONS = ['x-low', 'low', 'medium', 'high', 'x-high'];
const VOLUME_OPTIONS = ['silent', 'x-soft', 'soft', 'medium', 'loud', 'x-loud'];

// Soft, non-blocking format checks for custom values (Azure is the authoritative
// validator). Presets are handled by the dropdown, so these only cover the
// free-form kinds each attribute accepts, plus the `default` keyword.
const RATE_PATTERN = /^(default|[+-]?\d+(\.\d+)?%|\d+(\.\d+)?)$/;
const PITCH_PATTERN = /^(default|[+-]?\d+(\.\d+)?(%|st|Hz))$/i;
const VOLUME_PATTERN = /^(default|[+-]?\d+(\.\d+)?(dB)?)$/i;

export function ProsodyControls({
  rate, pitch, volume, onRateChange, onPitchChange, onVolumeChange,
}: ProsodyControlsProps) {
  return (
    <div className="space-y-3 p-4">
      <div className="grid grid-cols-3 gap-3 items-start">
        <ProsodyField
          label="Rate"
          presets={RATE_OPTIONS}
          customHint="e.g. +20%, -10%, 0.5, 1.5"
          customPattern={RATE_PATTERN}
          value={rate}
          onChange={onRateChange}
        />
        <ProsodyField
          label="Pitch"
          presets={PITCH_OPTIONS}
          customHint="e.g. +10%, -5%, +50Hz, -2st, 200Hz"
          customPattern={PITCH_PATTERN}
          value={pitch}
          onChange={onPitchChange}
        />
        <ProsodyField
          label="Volume"
          presets={VOLUME_OPTIONS}
          customHint="e.g. +10, -6dB, 0–100"
          customPattern={VOLUME_PATTERN}
          value={volume}
          onChange={onVolumeChange}
        />
      </div>
    </div>
  );
}
