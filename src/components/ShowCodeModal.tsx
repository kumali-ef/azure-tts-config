import { useState } from 'react';
import type { TtsConfig } from '../types';
import { generatePythonCode, generateNodeCode } from '../utils/code-generator';
import { buildSsml } from '../utils/ssml';

interface ShowCodeModalProps {
  config: TtsConfig;
  onClose: () => void;
}

type Tab = 'json' | 'python' | 'nodejs' | 'ssml';

export function ShowCodeModal({ config, onClose }: ShowCodeModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>('json');
  const [copied, setCopied] = useState(false);

  const codeMap: Record<Tab, string> = {
    python: generatePythonCode(config),
    nodejs: generateNodeCode(config),
    ssml: buildSsml(config),
    json: JSON.stringify({
      voiceName: config.voiceName,
      voiceDisplayName: config.voiceDisplayName,
      language: config.language,
      text: config.text,
      rate: config.rate,
      pitch: config.pitch,
      volume: config.volume,
      emphasis: config.emphasis || undefined,
      style: config.style || undefined,
      styleDegree: config.style ? config.styleDegree : undefined,
      role: config.role || undefined,
      breakType: config.breakValue ? config.breakType : undefined,
      breakValue: config.breakValue || undefined,
    }, null, 2),
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(codeMap[activeTab]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: 'json', label: 'JSON' },
    { key: 'python', label: 'Python SDK' },
    { key: 'nodejs', label: 'Node.js SDK' },
    { key: 'ssml', label: 'SSML' },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Generated Code</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-xl">&times;</button>
        </div>

        <div className="flex border-b">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-auto p-4">
          <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-sm overflow-x-auto whitespace-pre-wrap">
            <code>{codeMap[activeTab]}</code>
          </pre>
        </div>

        <div className="flex justify-end p-4 border-t">
          <button
            onClick={handleCopy}
            className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            {copied ? 'Copied!' : 'Copy to Clipboard'}
          </button>
        </div>
      </div>
    </div>
  );
}
