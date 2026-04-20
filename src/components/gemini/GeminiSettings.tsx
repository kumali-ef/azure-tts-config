interface Props {
  apiKey: string;
  onApiKeyChange: (key: string) => void;
}

export function GeminiSettings({ apiKey, onApiKeyChange }: Props) {
  return (
    <div className="p-4 space-y-3">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Google AI API Key
        </label>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => onApiKeyChange(e.target.value)}
          placeholder="Paste your Gemini API key..."
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
        />
        <p className="text-xs text-gray-400 mt-1">
          Get your key from{' '}
          <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="text-emerald-500 hover:underline">
            Google AI Studio → API Keys
          </a>
        </p>
      </div>
    </div>
  );
}
