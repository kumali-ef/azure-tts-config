interface Props {
  instructions: string;
  optimizeInstructions: boolean;
  onInstructionsChange: (value: string) => void;
  onOptimizeChange: (value: boolean) => void;
}

export function Qwen3Instructions({
  instructions,
  optimizeInstructions,
  onInstructionsChange,
  onOptimizeChange,
}: Props) {
  return (
    <div className="p-4 space-y-3">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Instructions
        </label>
        <textarea
          value={instructions}
          onChange={(e) => onInstructionsChange(e.target.value)}
          placeholder="Describe desired speech style, e.g.: 语速较快，带有明显的上扬语调，适合介绍时尚产品。"
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 resize-y"
        />
        <p className="text-xs text-gray-400 mt-1">
          Control tone, speed, emotion via natural language. Chinese and English only. Max 1600 tokens.
        </p>
      </div>
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={optimizeInstructions}
          onChange={(e) => onOptimizeChange(e.target.checked)}
          className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
        />
        <span className="text-sm text-gray-700">Optimize Instructions</span>
        <span className="text-xs text-gray-400">(system rewrites for better quality)</span>
      </label>
    </div>
  );
}
