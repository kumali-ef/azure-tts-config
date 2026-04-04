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

export function ProsodyControls({
  rate, pitch, volume, onRateChange, onPitchChange, onVolumeChange,
}: ProsodyControlsProps) {
  return (
    <div className="space-y-3 p-4">
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">Rate</label>
          <select value={rate} onChange={(e) => onRateChange(e.target.value)} className="w-full px-2 py-1.5 border rounded-md text-sm">
            {RATE_OPTIONS.map((o) => (<option key={o} value={o}>{o}</option>))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">Pitch</label>
          <select value={pitch} onChange={(e) => onPitchChange(e.target.value)} className="w-full px-2 py-1.5 border rounded-md text-sm">
            {PITCH_OPTIONS.map((o) => (<option key={o} value={o}>{o}</option>))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">Volume</label>
          <select value={volume} onChange={(e) => onVolumeChange(e.target.value)} className="w-full px-2 py-1.5 border rounded-md text-sm">
            {VOLUME_OPTIONS.map((o) => (<option key={o} value={o}>{o}</option>))}
          </select>
        </div>
      </div>
    </div>
  );
}
