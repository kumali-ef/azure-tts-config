interface ActionButtonsProps {
  canSynthesize: boolean;
  canSave: boolean;
  isSynthesizing: boolean;
  onSynthesize: () => void;
  onSave: () => void;
  onShowCode: () => void;
}

export function ActionButtons({
  canSynthesize, canSave, isSynthesizing,
  onSynthesize, onSave, onShowCode,
}: ActionButtonsProps) {
  return (
    <div className="flex gap-2 p-4">
      <button
        onClick={onSynthesize}
        disabled={!canSynthesize || isSynthesizing}
        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
      >
        {isSynthesizing ? 'Synthesizing...' : 'Synthesize & Play'}
      </button>
      <button
        onClick={onSave}
        disabled={!canSave}
        className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
      >
        Save
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
