interface TextInputProps {
  text: string;
  plainTextMode: boolean;
  onChange: (text: string) => void;
  onPlainTextModeChange: (enabled: boolean) => void;
}

export function TextInput({ text, plainTextMode, onChange, onPlainTextModeChange }: TextInputProps) {
  return (
    <div className="space-y-2 p-4">
      <div className="flex items-center justify-between">
        <div className="flex rounded-md overflow-hidden border w-fit">
          <button
            onClick={() => onPlainTextModeChange(false)}
            className={`px-3 py-1 text-xs font-medium transition-colors ${
              !plainTextMode ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            SSML
          </button>
          <button
            onClick={() => onPlainTextModeChange(true)}
            className={`px-3 py-1 text-xs font-medium transition-colors ${
              plainTextMode ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            Plain Text
          </button>
        </div>
        {plainTextMode && (
          <span className="text-xs text-gray-400">Prosody, emphasis, break, and style settings will be skipped</span>
        )}
      </div>
      <textarea value={text} onChange={(e) => onChange(e.target.value)}
        placeholder="Enter text to synthesize..." rows={4}
        className="w-full px-3 py-2 border rounded-md text-sm resize-y focus:ring-2 focus:ring-blue-500" />
    </div>
  );
}
