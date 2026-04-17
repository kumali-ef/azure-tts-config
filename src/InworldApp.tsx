import { useState, useRef, useCallback } from 'react';
import type { InworldConfig, InworldRecording } from './types';
import { DEFAULT_INWORLD_CONFIG } from './types';
import { useInworldSettings } from './hooks/useInworldSettings';
import { useInworldVoices } from './hooks/useInworldVoices';
import { useInworldRecordings } from './hooks/useInworldRecordings';
import { inworldSynthesize, inworldSynthesizeStreaming } from './utils/inworld-tts';
import type { InworldSynthesisParams } from './utils/inworld-tts';
import { sanitizeFilename } from './utils/storage';
import { Accordion } from './components/Accordion';
import { ShowJsonModal } from './components/ShowJsonModal';
import { InworldSettings } from './components/inworld/InworldSettings';
import { InworldModelSelector } from './components/inworld/InworldModelSelector';
import { InworldVoiceSelector } from './components/inworld/InworldVoiceSelector';
import { InworldVoiceSettings } from './components/inworld/InworldVoiceSettings';
import { InworldRecordingsList } from './components/inworld/InworldRecordingsList';

function recordingToConfig(rec: InworldRecording): InworldConfig {
  return {
    model: rec.model,
    voiceId: rec.voice_id,
    voiceName: rec.voice_name || rec.voice_id,
    text: rec.text,
    temperature: rec.temperature ?? 1.0,
    applyTextNormalization: rec.apply_text_normalization || 'APPLY_TEXT_NORMALIZATION_UNSPECIFIED',
  };
}

export function InworldApp() {
  const { apiKey, setApiKey, isConfigured } = useInworldSettings();
  const { voices, loading: voicesLoading, error: voicesError, retry } = useInworldVoices(apiKey);
  const { recordings, loading: recsLoading, error: recsError, saveRecording, deleteRecording } = useInworldRecordings();

  const [config, setConfig] = useState<InworldConfig>(DEFAULT_INWORLD_CONFIG);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [codeModalJson, setCodeModalJson] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const updateConfig = useCallback((updates: Partial<InworldConfig>) => {
    setConfig((prev) => ({ ...prev, ...updates }));
  }, []);

  const buildParams = (): InworldSynthesisParams => ({
    apiKey,
    model: config.model,
    text: config.text,
    voiceId: config.voiceId,
    temperature: config.temperature,
    applyTextNormalization: config.applyTextNormalization,
  });

  const buildSaveConfig = (timingMs: number, streamDurationMs?: number) => ({
    model: config.model,
    voice_id: config.voiceId,
    voice_name: config.voiceName,
    text: config.text,
    temperature: config.temperature,
    apply_text_normalization: config.applyTextNormalization,
    api_response_time_ms: timingMs,
    stream_duration_ms: streamDurationMs ?? null,
  });

  const canSynthesize = isConfigured && !!config.text && !!config.voiceId;

  const configToJson = (cfg: InworldConfig) => JSON.stringify({
    model: cfg.model,
    voiceId: cfg.voiceId,
    voiceName: cfg.voiceName,
    text: cfg.text,
    temperature: cfg.temperature,
    applyTextNormalization: cfg.applyTextNormalization,
  }, null, 2);

  const handleSynthesize = async () => {
    if (!canSynthesize) return;
    setIsSynthesizing(true);
    setError(null);
    try {
      const startTime = performance.now();
      const audioBuffer = await inworldSynthesize(buildParams());
      const apiResponseTimeMs = Math.round(performance.now() - startTime);
      const blob = new Blob([audioBuffer], { type: 'audio/wav' });
      const url = URL.createObjectURL(blob);
      if (audioRef.current) {
        audioRef.current.src = url;
        audioRef.current.play();
      }
      await saveRecording(blob, buildSaveConfig(apiResponseTimeMs));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Synthesis failed');
    } finally {
      setIsSynthesizing(false);
    }
  };

  const handleStreamSynthesize = async () => {
    if (!canSynthesize || !audioRef.current) return;
    setIsStreaming(true);
    setError(null);
    try {
      const { ttfbMs, totalMs, buffer } = await inworldSynthesizeStreaming(buildParams(), audioRef.current);
      const blob = new Blob([buffer], { type: 'audio/wav' });
      await saveRecording(blob, buildSaveConfig(ttfbMs, totalMs));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Streaming synthesis failed');
    } finally {
      setIsStreaming(false);
    }
  };

  const handlePlayRecording = (id: string) => {
    if (audioRef.current) {
      audioRef.current.src = `/api/inworld/recordings/${id}/audio`;
      audioRef.current.play();
    }
  };

  const handleDownloadRecording = (id: string) => {
    const rec = recordings.find((r) => r.id === id);
    if (!rec) return;
    const voiceName = sanitizeFilename(rec.voice_name || rec.voice_id);
    const a = document.createElement('a');
    a.href = `/api/inworld/recordings/${id}/audio`;
    a.download = `inworld-${voiceName}-${id}.wav`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleLoadRecording = (rec: InworldRecording) => {
    setConfig(recordingToConfig(rec));
  };

  return (
    <div className="flex h-[calc(100vh-52px)]">
      {/* Left Panel - Configuration */}
      <div className="w-1/2 overflow-y-auto p-4 space-y-3 border-r">
        <Accordion title="Inworld API">
          <InworldSettings apiKey={apiKey} onApiKeyChange={setApiKey} />
        </Accordion>

        <Accordion title="Model">
          <InworldModelSelector model={config.model} onChange={(model) => updateConfig({ model })} />
        </Accordion>

        <Accordion title="Voice">
          <InworldVoiceSelector
            voices={voices}
            selectedVoiceId={config.voiceId}
            loading={voicesLoading}
            error={voicesError}
            onVoiceChange={(voiceId, voiceName) => updateConfig({ voiceId, voiceName })}
            onRetry={retry}
          />
        </Accordion>

        <Accordion title="Settings">
          <InworldVoiceSettings
            temperature={config.temperature}
            applyTextNormalization={config.applyTextNormalization}
            onTemperatureChange={(temperature) => updateConfig({ temperature })}
            onTextNormalizationChange={(applyTextNormalization) => updateConfig({ applyTextNormalization })}
          />
        </Accordion>

        <Accordion title="Text">
          <div className="p-4">
            <textarea
              value={config.text}
              onChange={(e) => updateConfig({ text: e.target.value })}
              placeholder="Enter text to synthesize (max 2,000 characters)..."
              maxLength={2000}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-rose-500 focus:border-rose-500 resize-y"
            />
            <p className="text-xs text-gray-400 mt-1">{config.text.length} / 2,000</p>
          </div>
        </Accordion>

        {/* Action Buttons */}
        <div className="flex gap-2 px-4">
          <button
            onClick={handleSynthesize}
            disabled={!canSynthesize || isSynthesizing || isStreaming}
            className="flex-1 px-4 py-2 bg-rose-600 text-white rounded-lg font-semibold text-sm disabled:opacity-50 hover:bg-rose-700 transition-colors"
          >
            {isSynthesizing ? '⏳ Synthesizing...' : '🔊 Synthesize'}
          </button>
          <button
            onClick={handleStreamSynthesize}
            disabled={!canSynthesize || isSynthesizing || isStreaming}
            className="flex-1 px-4 py-2 border border-rose-500 text-rose-600 rounded-lg font-semibold text-sm disabled:opacity-50 hover:bg-rose-50 transition-colors"
          >
            {isStreaming ? '⏳ Streaming...' : '📡 Stream & Play'}
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
            Enter your Inworld API key to get started.
          </div>
        )}
      </div>

      {/* Right Panel - Recordings */}
      <div className="w-1/2 overflow-y-auto bg-gray-50">
        <InworldRecordingsList
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
          buttonClassName="px-4 py-2 bg-rose-600 text-white rounded-md text-sm font-medium hover:bg-rose-700 transition-colors"
          onClose={() => setCodeModalJson(null)}
        />
      )}
    </div>
  );
}
