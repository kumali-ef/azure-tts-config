import { useState, useRef, useCallback } from 'react';
import type { FishAudioConfig, FishAudioRecording } from './types';
import { DEFAULT_FISHAUDIO_CONFIG } from './types';
import { useFishAudioSettings } from './hooks/useFishAudioSettings';
import { useFishAudioRecordings } from './hooks/useFishAudioRecordings';
import { useFishAudioVoices } from './hooks/useFishAudioVoices';
import { fishAudioSynthesize, fishAudioSynthesizeStreaming } from './utils/fishaudio-tts';
import type { FishAudioSynthesisParams } from './utils/fishaudio-tts';
import { sanitizeFilename } from './utils/storage';
import { Accordion } from './components/Accordion';
import { ShowJsonModal } from './components/ShowJsonModal';
import { FishAudioSettings } from './components/fishaudio/FishAudioSettings';
import { FishAudioModelSelector } from './components/fishaudio/FishAudioModelSelector';
import { FishAudioVoiceSelector } from './components/fishaudio/FishAudioVoiceSelector';
import { FishAudioAdvancedSettings } from './components/fishaudio/FishAudioAdvancedSettings';
import { FishAudioRecordingsList } from './components/fishaudio/FishAudioRecordingsList';

function recordingToConfig(rec: FishAudioRecording): FishAudioConfig {
  return {
    model: rec.model,
    referenceId: rec.reference_id || '',
    voiceName: rec.voice_name || '',
    text: rec.text,
    chunkLength: rec.chunk_length ?? 200,
    normalize: rec.normalize === 1,
    latency: rec.latency || 'balanced',
    temperature: rec.temperature ?? 0.7,
    topP: rec.top_p ?? 0.7,
    speed: rec.speed ?? 1.0,
    volume: rec.volume ?? 0,
  };
}

export function FishAudioApp() {
  const { apiKey, setApiKey, isConfigured } = useFishAudioSettings();
  const { recordings, loading: recsLoading, error: recsError, saveRecording, deleteRecording } = useFishAudioRecordings();
  const {
    voices, loading: voicesLoading, error: voicesError,
    search: voiceSearch, selfOnly, total: voicesTotal,
    setSearch: setVoiceSearch, setSelfOnly, retry: retryVoices,
  } = useFishAudioVoices(apiKey);

  const [config, setConfig] = useState<FishAudioConfig>(DEFAULT_FISHAUDIO_CONFIG);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [codeModalJson, setCodeModalJson] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const updateConfig = useCallback((updates: Partial<FishAudioConfig>) => {
    setConfig((prev) => ({ ...prev, ...updates }));
  }, []);

  const buildParams = (): FishAudioSynthesisParams => ({
    apiKey,
    model: config.model,
    text: config.text,
    referenceId: config.referenceId || undefined,
    chunkLength: config.chunkLength,
    normalize: config.normalize,
    latency: config.latency,
    temperature: config.temperature,
    topP: config.topP,
    speed: config.speed,
    volume: config.volume,
  });

  const buildSaveConfig = (timingMs: number, streamDurationMs?: number) => ({
    model: config.model,
    reference_id: config.referenceId || null,
    voice_name: config.voiceName || null,
    text: config.text,
    chunk_length: config.chunkLength,
    normalize: config.normalize ? 1 : 0,
    latency: config.latency,
    temperature: config.temperature,
    top_p: config.topP,
    speed: config.speed,
    volume: config.volume,
    api_response_time_ms: timingMs,
    stream_duration_ms: streamDurationMs ?? null,
  });

  const canSynthesize = isConfigured && !!config.text;

  const configToJson = (cfg: FishAudioConfig) => JSON.stringify({
    model: cfg.model,
    referenceId: cfg.referenceId,
    voiceName: cfg.voiceName,
    text: cfg.text,
    chunkLength: cfg.chunkLength,
    normalize: cfg.normalize,
    latency: cfg.latency,
    temperature: cfg.temperature,
    topP: cfg.topP,
    speed: cfg.speed,
    volume: cfg.volume,
  }, null, 2);

  const handleSynthesize = async () => {
    if (!canSynthesize) return;
    setIsSynthesizing(true);
    setError(null);
    try {
      const startTime = performance.now();
      const audioBuffer = await fishAudioSynthesize(buildParams());
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
      const { ttfbMs, totalMs, buffer } = await fishAudioSynthesizeStreaming(buildParams(), audioRef.current);
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
      audioRef.current.src = `/api/fishaudio/recordings/${id}/audio`;
      audioRef.current.play();
    }
  };

  const handleDownloadRecording = (id: string) => {
    const rec = recordings.find((r) => r.id === id);
    if (!rec) return;
    const voiceName = sanitizeFilename(rec.voice_name || rec.reference_id || 'default');
    const a = document.createElement('a');
    a.href = `/api/fishaudio/recordings/${id}/audio`;
    a.download = `fishaudio-${voiceName}-${id}.wav`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleLoadRecording = (rec: FishAudioRecording) => {
    setConfig(recordingToConfig(rec));
  };

  return (
    <div className="flex h-[calc(100vh-52px)]">
      {/* Left Panel - Configuration */}
      <div className="w-1/2 overflow-y-auto p-4 space-y-3 border-r">
        <Accordion title="Fish Audio API">
          <FishAudioSettings apiKey={apiKey} onApiKeyChange={setApiKey} />
        </Accordion>

        <Accordion title="Model">
          <FishAudioModelSelector model={config.model} onChange={(model) => updateConfig({ model })} />
        </Accordion>

        <Accordion title="Voice">
          <FishAudioVoiceSelector
            voices={voices}
            loading={voicesLoading}
            error={voicesError}
            search={voiceSearch}
            selfOnly={selfOnly}
            total={voicesTotal}
            selectedReferenceId={config.referenceId}
            voiceName={config.voiceName}
            onSearchChange={setVoiceSearch}
            onSelfOnlyChange={setSelfOnly}
            onVoiceChange={(referenceId, voiceName) => updateConfig({ referenceId, voiceName })}
            onManualIdChange={(referenceId) => updateConfig({ referenceId })}
            onVoiceNameChange={(voiceName) => updateConfig({ voiceName })}
            onRetry={retryVoices}
          />
        </Accordion>

        <Accordion title="Advanced Settings">
          <FishAudioAdvancedSettings
            temperature={config.temperature}
            topP={config.topP}
            chunkLength={config.chunkLength}
            normalize={config.normalize}
            latency={config.latency}
            speed={config.speed}
            volume={config.volume}
            onTemperatureChange={(temperature) => updateConfig({ temperature })}
            onTopPChange={(topP) => updateConfig({ topP })}
            onChunkLengthChange={(chunkLength) => updateConfig({ chunkLength })}
            onNormalizeChange={(normalize) => updateConfig({ normalize })}
            onLatencyChange={(latency) => updateConfig({ latency })}
            onSpeedChange={(speed) => updateConfig({ speed })}
            onVolumeChange={(volume) => updateConfig({ volume })}
          />
        </Accordion>

        <Accordion title="Text">
          <div className="p-4">
            <textarea
              value={config.text}
              onChange={(e) => updateConfig({ text: e.target.value })}
              placeholder="Enter text to synthesize..."
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 resize-y"
            />
            <p className="text-xs text-gray-400 mt-1">{config.text.length} characters</p>
          </div>
        </Accordion>

        {/* Action Buttons */}
        <div className="flex gap-2 px-4">
          <button
            onClick={handleSynthesize}
            disabled={!canSynthesize || isSynthesizing || isStreaming}
            className="flex-1 px-4 py-2 bg-cyan-600 text-white rounded-lg font-semibold text-sm disabled:opacity-50 hover:bg-cyan-700 transition-colors"
          >
            {isSynthesizing ? '⏳ Synthesizing...' : '🔊 Synthesize'}
          </button>
          <button
            onClick={handleStreamSynthesize}
            disabled={!canSynthesize || isSynthesizing || isStreaming}
            className="flex-1 px-4 py-2 border border-cyan-500 text-cyan-600 rounded-lg font-semibold text-sm disabled:opacity-50 hover:bg-cyan-50 transition-colors"
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
            Enter your Fish Audio API key to get started.
          </div>
        )}
      </div>

      {/* Right Panel - Recordings */}
      <div className="w-1/2 overflow-y-auto bg-gray-50">
        <FishAudioRecordingsList
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
          buttonClassName="px-4 py-2 bg-cyan-600 text-white rounded-md text-sm font-medium hover:bg-cyan-700 transition-colors"
          onClose={() => setCodeModalJson(null)}
        />
      )}
    </div>
  );
}
