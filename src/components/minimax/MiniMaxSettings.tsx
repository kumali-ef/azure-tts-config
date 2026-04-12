interface Props {
  apiKey: string;
  onApiKeyChange: (value: string) => void;
  region: string;
  onRegionChange: (value: string) => void;
}

export function MiniMaxSettings({ apiKey, onApiKeyChange, region, onRegionChange }: Props) {
  return (
    <div className="p-4 space-y-3">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Region
        </label>
        <select
          value={region}
          onChange={(e) => onRegionChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
        >
          <option value="cn-beijing">CN - Beijing</option>
          <option value="intl-singapore">Intl - Singapore</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          API Key <span className="text-red-500">*</span>
        </label>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => onApiKeyChange(e.target.value)}
          placeholder="Enter DashScope API Key"
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
        />
      </div>
    </div>
  );
}
