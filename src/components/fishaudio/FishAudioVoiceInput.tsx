interface Props {
  referenceId: string;
  voiceName: string;
  onReferenceIdChange: (id: string) => void;
  onVoiceNameChange: (name: string) => void;
}

export function FishAudioVoiceInput({ referenceId, voiceName, onReferenceIdChange, onVoiceNameChange }: Props) {
  return (
    <div className="p-4 space-y-3">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Reference ID (Voice Model)
        </label>
        <input
          type="text"
          value={referenceId}
          onChange={(e) => onReferenceIdChange(e.target.value)}
          placeholder="e.g. 802e3bc2b27e49c2995d23ef70e6ac89"
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-mono focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
        />
        <p className="text-xs text-gray-400 mt-1">
          Model ID from{' '}
          <a href="https://fish.audio/discovery" target="_blank" rel="noopener noreferrer" className="text-cyan-500 hover:underline">
            fish.audio/discovery
          </a>
          {' '}URL or copy button. Leave empty for default voice.
        </p>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Voice Label <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        <input
          type="text"
          value={voiceName}
          onChange={(e) => onVoiceNameChange(e.target.value)}
          placeholder="e.g. E-Girl Voice"
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
        />
        <p className="text-xs text-gray-400 mt-1">
          A friendly name to identify this voice in recordings.
        </p>
      </div>
    </div>
  );
}
