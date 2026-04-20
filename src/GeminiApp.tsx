import { useState, useRef, useCallback } from 'react';
import type { GeminiConfig, GeminiRecording } from './types';
import { DEFAULT_GEMINI_CONFIG } from './types';
import { useGeminiSettings } from './hooks/useGeminiSettings';
import { useGeminiRecordings } from './hooks/useGeminiRecordings';
import { geminiSynthesize, GEMINI_VOICES } from './utils/gemini-tts';
import { sanitizeFilename } from './utils/storage';
import { Accordion } from './components/Accordion';
import { ShowJsonModal } from './components/ShowJsonModal';
import { GeminiSettings } from './components/gemini/GeminiSettings';
import { GeminiModelSelector } from './components/gemini/GeminiModelSelector';
import { GeminiVoiceSelector } from './components/gemini/GeminiVoiceSelector';
import { GeminiRecordingsList } from './components/gemini/GeminiRecordingsList';

function recordingToConfig(rec: GeminiRecording): GeminiConfig {
  return {
    model: rec.model,
    voiceName: rec.voice_name,
    voiceDisplayName: rec.voice_display_name || rec.voice_name,
    text: rec.text,
  };
}

export function GeminiApp() {
  const { apiKey, setApiKey, isConfigured } = useGeminiSettings();
  const { recordings, loading: recsLoading, error: recsError, saveRecording, deleteRecording } = useGeminiRecordings();

  const [config, setConfig] = useState<GeminiConfig>(DEFAULT_GEMINI_CONFIG);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [codeModalJson, setCodeModalJson] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const updateConfig = useCallback((updates: Partial<GeminiConfig>) => {
    setConfig((prev) => ({ ...prev, ...updates }));
  }, []);

  const canSynthesize = isConfigured && !!config.text && !!config.voiceName;

  const configToJson = (cfg: GeminiConfig) => JSON.stringify({
    model: cfg.model,
    voiceName: cfg.voiceName,
    voiceDisplayName: cfg.voiceDisplayName,
    text: cfg.text,
  }, null, 2);

  const handleSynthesize = async () => {
    if (!canSynthesize) return;
    setIsSynthesizing(true);
    setError(null);
    try {
      const startTime = performance.now();
      const { audioBuffer, mimeType } = await geminiSynthesize({
        apiKey,
        model: config.model,
        voiceName: config.voiceName,
        text: config.text,
      });
      const apiResponseTimeMs = Math.round(performance.now() - startTime);
      const blob = new Blob([audioBuffer], { type: mimeType });
      const url = URL.createObjectURL(blob);
      if (audioRef.current) {
        audioRef.current.src = url;
        audioRef.current.play();
      }
      await saveRecording(blob, {
        model: config.model,
        voice_name: config.voiceName,
        voice_display_name: config.voiceDisplayName,
        text: config.text,
        mime_type: mimeType,
        api_response_time_ms: apiResponseTimeMs,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Synthesis failed');
    } finally {
      setIsSynthesizing(false);
    }
  };

  const handlePlayRecording = (id: string) => {
    if (audioRef.current) {
      audioRef.current.src = `/api/gemini/recordings/${id}/audio`;
      audioRef.current.play();
    }
  };

  const handleDownloadRecording = (id: string) => {
    const rec = recordings.find((r) => r.id === id);
    if (!rec) return;
    const voiceName = sanitizeFilename(rec.voice_display_name || rec.voice_name);
    const a = document.createElement('a');
    a.href = `/api/gemini/recordings/${id}/audio`;
    a.download = `gemini-${voiceName}-${id}.wav`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleLoadRecording = (rec: GeminiRecording) => {
    setConfig(recordingToConfig(rec));
  };

  return (
    <div className="flex h-[calc(100vh-52px)]">
      {/* Left Panel - Configuration */}
      <div className="w-1/2 overflow-y-auto p-4 space-y-3 border-r">
        <Accordion title="Gemini API">
          <GeminiSettings apiKey={apiKey} onApiKeyChange={setApiKey} />
        </Accordion>

        <Accordion title="Model">
          <GeminiModelSelector model={config.model} onChange={(model) => updateConfig({ model })} />
        </Accordion>

        <Accordion title="Voice">
          <GeminiVoiceSelector
            voices={GEMINI_VOICES}
            selectedVoiceName={config.voiceName}
            onVoiceChange={(voiceName, voiceDisplayName) => updateConfig({ voiceName, voiceDisplayName })}
          />
        </Accordion>

        <Accordion title="Text">
          <div className="p-4">
            <textarea
              value={config.text}
              onChange={(e) => updateConfig({ text: e.target.value })}
              placeholder="Enter text to synthesize..."
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-y"
            />
            <p className="text-xs text-gray-400 mt-1">{config.text.length} characters</p>
          </div>
        </Accordion>

        {/* Action Buttons */}
        <div className="flex gap-2 px-4">
          <button
            onClick={handleSynthesize}
            disabled={!canSynthesize || isSynthesizing}
            className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg font-semibold text-sm disabled:opacity-50 hover:bg-emerald-700 transition-colors"
          >
            {isSynthesizing ? '⏳ Synthesizing...' : '🔊 Synthesize'}
          </button>
          <button
            onClick={() => setCodeModalJson(configToJson(config))}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg font-semibold text-sm hover:bg-gray-700 transition-colors"
          >
            Show Code
          </button>
        </div>

        {error && (
          <div className="mx-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
            {error}
          </div>
        )}

        {!isConfigured && (
          <div className="mx-4 p-3 bg-yellow-50 border border-yellow-200 text-yellow-700 rounded-md text-sm">
            Enter your Google AI API key to get started.
          </div>
        )}
      </div>

      {/* Right Panel - Recordings */}
      <div className="w-1/2 overflow-y-auto bg-gray-50">
        <GeminiRecordingsList
          recordings={recordings}
          loading={recsLoading}
          error={recsError}
          onPlay={handlePlayRecording}
          onDownload={handleDownloadRecording}
          onDelete={deleteRecording}
          onLoad={handleLoadRecording}
          onShowCode={(rec) => setCodeModalJson(configToJson(recordingToConfig(rec)))}
        />
      </div>

      <audio ref={audioRef} />

      {codeModalJson && (
        <ShowJsonModal
          json={codeModalJson}
          buttonClassName="px-4 py-2 bg-emerald-600 text-white rounded-md text-sm font-medium hover:bg-emerald-700 transition-colors"
          onClose={() => setCodeModalJson(null)}
        />
      )}
    </div>
  );
}
