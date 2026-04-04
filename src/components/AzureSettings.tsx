interface AzureSettingsProps {
  apiKey: string;
  region: string;
  onKeyChange: (key: string) => void;
  onRegionChange: (region: string) => void;
}

const REGIONS = [
  'eastus', 'eastus2', 'westus', 'westus2', 'westus3',
  'centralus', 'northcentralus', 'southcentralus',
  'westeurope', 'northeurope', 'uksouth',
  'southeastasia', 'swedencentral', 'eastasia', 'japaneast', 'japanwest',
  'australiaeast', 'canadacentral', 'brazilsouth',
  'koreacentral', 'centralindia', 'francecentral',
];

export function AzureSettings({ apiKey, region, onKeyChange, onRegionChange }: AzureSettingsProps) {
  return (
    <div className="space-y-3 p-4 bg-white rounded-lg shadow-sm border">
      <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Azure Settings</h2>
      <div>
        <label className="block text-sm font-medium text-gray-600 mb-1">API Key</label>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => onKeyChange(e.target.value)}
          placeholder="Enter your Azure Speech API key"
          className="w-full px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-600 mb-1">Region</label>
        <select
          value={region}
          onChange={(e) => onRegionChange(e.target.value)}
          className="w-full px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">Select a region...</option>
          {REGIONS.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
