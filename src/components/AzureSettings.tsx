interface AzureSettingsProps {
  apiKey: string;
  region: string;
  onKeyChange: (key: string) => void;
  onRegionChange: (region: string) => void;
  captureVisemes: boolean;
  onCaptureVisemesChange: (enabled: boolean) => void;
}

const REGIONS = [
  'eastus', 'eastus2', 'westus', 'westus2', 'westus3',
  'centralus', 'northcentralus', 'southcentralus',
  'westeurope', 'northeurope', 'uksouth',
  'southeastasia', 'swedencentral', 'eastasia', 'japaneast', 'japanwest',
  'australiaeast', 'canadacentral', 'brazilsouth',
  'koreacentral', 'centralindia', 'francecentral',
];

export function AzureSettings({ apiKey, region, onKeyChange, onRegionChange, captureVisemes, onCaptureVisemesChange }: AzureSettingsProps) {
  return (
    <div className="space-y-3 p-4">
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
      <label className="flex items-start gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={captureVisemes}
          onChange={(e) => onCaptureVisemesChange(e.target.checked)}
          className="mt-0.5"
        />
        <span className="text-sm">
          <span className="font-medium text-gray-700">Capture viseme events</span>
          <span className="block text-xs text-gray-500">
            Routes synthesis through the Speech SDK (WebSocket) instead of the REST API.
          </span>
        </span>
      </label>
    </div>
  );
}
