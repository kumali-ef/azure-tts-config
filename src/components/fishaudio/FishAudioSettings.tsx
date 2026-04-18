interface Props {
  apiKey: string;
  onApiKeyChange: (key: string) => void;
}

export function FishAudioSettings({ apiKey, onApiKeyChange }: Props) {
  return (
    <div className="p-4 space-y-3">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Fish Audio API Key
        </label>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => onApiKeyChange(e.target.value)}
          placeholder="Paste your API key..."
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
        />
        <p className="text-xs text-gray-400 mt-1">
          Get your key from{' '}
          <a href="https://fish.audio/go-api" target="_blank" rel="noopener noreferrer" className="text-cyan-500 hover:underline">
            fish.audio → API Keys
          </a>
        </p>
      </div>
    </div>
  );
}
