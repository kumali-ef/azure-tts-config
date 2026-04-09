import { useState } from 'react';
import { AzureApp } from './AzureApp';
import { MiniMaxApp } from './MiniMaxApp';

type Tab = 'azure' | 'minimax';

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
        </nav>
      </header>

      {activeTab === 'azure' ? <AzureApp /> : <MiniMaxApp />}
    </div>
  );
}

export default App;

