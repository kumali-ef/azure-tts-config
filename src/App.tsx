import { useState } from 'react';
import { AzureApp } from './AzureApp';
import { MiniMaxApp } from './MiniMaxApp';
import { Qwen3App } from './Qwen3App';
import { CartesiaApp } from './CartesiaApp';

type Tab = 'azure' | 'minimax' | 'qwen3' | 'cartesia';

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('azure');

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm border-b px-6 py-0 flex items-center gap-0">
        <h1 className="text-xl font-bold text-gray-800 mr-8 py-3">TTS Config Tester</h1>
        <nav className="flex h-full">
          <button
            onClick={() => setActiveTab('azure')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'azure'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Azure TTS
          </button>
          <button
            onClick={() => setActiveTab('minimax')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'minimax'
                ? 'border-purple-500 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            MiniMax TTS
          </button>
          <button
            onClick={() => setActiveTab('qwen3')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'qwen3'
                ? 'border-teal-500 text-teal-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Qwen3 TTS
          </button>
          <button
            onClick={() => setActiveTab('cartesia')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'cartesia'
                ? 'border-lime-500 text-lime-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Cartesia TTS
          </button>
          <a
            href="https://playground.deepgram.com/?endpoint=speak&architecture=aura-2&language=en"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-3 text-sm font-medium border-b-2 border-transparent text-gray-500 hover:text-gray-700 transition-colors"
          >
            Aura2(Deepgram) ↗
          </a>
        </nav>
      </header>

      {activeTab === 'azure' ? <AzureApp /> : activeTab === 'minimax' ? <MiniMaxApp /> : activeTab === 'qwen3' ? <Qwen3App /> : <CartesiaApp />}
    </div>
  );
}

export default App;

