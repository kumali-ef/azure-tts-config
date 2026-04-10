interface Props {
  apiKey: string;
  onApiKeyChange: (key: string) => void;
}

export function CartesiaSettings({ apiKey, onApiKeyChange }: Props) {
  return (
    <div className="p-4">
      <label className="block text-sm font-medium text-gray-700 mb-1">Cartesia API Key</label>
      <input
        type="password"
        value={apiKey}
        onChange={(e) => onApiKeyChange(e.target.value)}
        placeholder="Enter your Cartesia API key"
        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-lime-500 focus:border-lime-500"
      />
      <p className="text-xs text-gray-400 mt-1">Stored in browser localStorage.</p>
    </div>
  );
}
