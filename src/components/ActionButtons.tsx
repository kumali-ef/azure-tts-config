interface ActionButtonsProps {
  canSynthesize: boolean;
  isSynthesizing: boolean;
  isStreaming: boolean;
  onSynthesize: () => void;
  onStreamSynthesize: () => void;
  onShowCode: () => void;
}

export function ActionButtons({
  canSynthesize, isSynthesizing, isStreaming,
  onSynthesize, onStreamSynthesize, onShowCode,
}: ActionButtonsProps) {
  const busy = isSynthesizing || isStreaming;
  return (
    <div className="flex gap-2 p-4">
      <button
        onClick={onSynthesize}
        disabled={!canSynthesize || busy}
        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
      >
        {isSynthesizing ? 'Synthesizing...' : 'Synthesize & Save'}
      </button>
      <button
        onClick={onStreamSynthesize}
        disabled={!canSynthesize || busy}
        className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
      >
        {isStreaming ? 'Streaming...' : 'Stream & Play'}
      </button>
      <button
        onClick={onShowCode}
        className="px-4 py-2 bg-gray-600 text-white rounded-md text-sm font-medium hover:bg-gray-700 transition-colors"
      >
        Show Code
      </button>
    </div>
  );
}
