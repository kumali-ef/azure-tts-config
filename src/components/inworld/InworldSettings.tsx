interface Props {
  apiKey: string;
  onApiKeyChange: (key: string) => void;
}

export function InworldSettings({ apiKey, onApiKeyChange }: Props) {
  return (
    <div className="p-4 space-y-3">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Inworld API Key (Base64)
        </label>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => onApiKeyChange(e.target.value)}
          placeholder="Paste your Base64 API key..."
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
        />
        <p className="text-xs text-gray-400 mt-1">
          Get your key from{' '}
          <a href="https://platform.inworld.ai/api-keys" target="_blank" rel="noopener noreferrer" className="text-rose-500 hover:underline">
            Inworld Portal → API Keys
          </a>
          {' '}(copy the "Basic (Base64)" value)
        </p>
      </div>
    </div>
  );
}
