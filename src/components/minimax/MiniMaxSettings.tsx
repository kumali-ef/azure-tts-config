interface Props {
  apiKey: string;
  groupId: string;
  onApiKeyChange: (value: string) => void;
  onGroupIdChange: (value: string) => void;
}

export function MiniMaxSettings({ apiKey, groupId, onApiKeyChange, onGroupIdChange }: Props) {
  return (
    <div className="p-4 space-y-3">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          API Key <span className="text-red-500">*</span>
        </label>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => onApiKeyChange(e.target.value)}
          placeholder="Enter MiniMax API Key"
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Group ID <span className="text-gray-400">(optional)</span>
        </label>
        <input
          type="text"
          value={groupId}
          onChange={(e) => onGroupIdChange(e.target.value)}
          placeholder="Enter Group ID"
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
        />
      </div>
    </div>
  );
}
