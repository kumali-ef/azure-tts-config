import { useState, useRef, useCallback } from 'react';
import type { CartesiaConfig, CartesiaRecording } from './types';
import { DEFAULT_CARTESIA_CONFIG } from './types';
import { useCartesiaSettings } from './hooks/useCartesiaSettings';
import { useCartesiaVoices } from './hooks/useCartesiaVoices';
import { useCartesiaRecordings } from './hooks/useCartesiaRecordings';
import { cartesiaSynthesize, cartesiaSynthesizeStreaming } from './utils/cartesia-tts';
import type { CartesiaSynthesisParams } from './utils/cartesia-tts';
import { sanitizeFilename } from './utils/storage';
import { Accordion } from './components/Accordion';
import { ShowJsonModal } from './components/ShowJsonModal';
import { CartesiaSettings } from './components/cartesia/CartesiaSettings';
import { CartesiaModelSelector } from './components/cartesia/CartesiaModelSelector';
import { CartesiaVoiceSelector } from './components/cartesia/CartesiaVoiceSelector';
import { CartesiaLanguage } from './components/cartesia/CartesiaLanguage';
import { CartesiaGenerationConfig } from './components/cartesia/CartesiaGenerationConfig';
import { CartesiaRecordingsList } from './components/cartesia/CartesiaRecordingsList';

function recordingToConfig(rec: CartesiaRecording): CartesiaConfig {
  return {
    model: rec.model,
    voiceId: rec.voice_id,
    voiceName: rec.voice_name || rec.voice_id,
    text: rec.text,
    language: rec.language || '',
    speed: rec.speed ?? 1.0,
    volume: rec.volume ?? 1.0,
    emotion: rec.emotion || '',
  };
}

export function CartesiaApp() {
  const { apiKey, setApiKey, isConfigured } = useCartesiaSettings();
  const { voices, loading: voicesLoading, error: voicesError, retry } = useCartesiaVoices(apiKey);
  const { recordings, loading: recsLoading, error: recsError, saveRecording, deleteRecording } = useCartesiaRecordings();

  const [config, setConfig] = useState<CartesiaConfig>(DEFAULT_CARTESIA_CONFIG);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [codeModalJson, setCodeModalJson] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const updateConfig = useCallback((updates: Partial<CartesiaConfig>) => {
    setConfig((prev) => ({ ...prev, ...updates }));
  }, []);

  const buildParams = (): CartesiaSynthesisParams => ({
    apiKey,
    model: config.model,
    text: config.text,
    voiceId: config.voiceId,
    language: config.language || undefined,
    speed: config.speed,
    volume: config.volume,
    emotion: config.emotion || undefined,
  });

  const buildSaveConfig = (timingMs: number, streamDurationMs?: number) => ({
    model: config.model,
    voice_id: config.voiceId,
    voice_name: config.voiceName,
    text: config.text,
    language: config.language || null,
    speed: config.speed,
    volume: config.volume,
    emotion: config.emotion || null,
    api_response_time_ms: timingMs,
    stream_duration_ms: streamDurationMs ?? null,
  });

  const canSynthesize = isConfigured && !!config.text && !!config.voiceId;

  const configToJson = (cfg: CartesiaConfig) => JSON.stringify({
    model: cfg.model,
    voiceId: cfg.voiceId,
    voiceName: cfg.voiceName,
    text: cfg.text,
    language: cfg.language || undefined,
    speed: cfg.speed,
    volume: cfg.volume,
    emotion: cfg.emotion || undefined,
  }, null, 2);

  const handleSynthesize = async () => {
    if (!canSynthesize) return;
    setIsSynthesizing(true);
    setError(null);
    try {
      const startTime = performance.now();
      const audioBuffer = await cartesiaSynthesize(buildParams());
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
      const { ttfbMs, totalMs, buffer } = await cartesiaSynthesizeStreaming(buildParams(), audioRef.current);
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
      audioRef.current.src = `/api/cartesia/recordings/${id}/audio`;
      audioRef.current.play();
    }
  };

  const handleDownloadRecording = (id: string) => {
    const rec = recordings.find((r) => r.id === id);
    if (!rec) return;
    const voiceName = sanitizeFilename(rec.voice_name || rec.voice_id);
    const a = document.createElement('a');
    a.href = `/api/cartesia/recordings/${id}/audio`;
    a.download = `cartesia-${voiceName}-${id}.wav`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleLoadRecording = (rec: CartesiaRecording) => {
    setConfig(recordingToConfig(rec));
  };

  return (
    <div className="flex h-[calc(100vh-52px)]">
      {/* Left Panel - Configuration */}
      <div className="w-1/2 overflow-y-auto p-4 space-y-3 border-r">
        <Accordion title="Cartesia API">
          <CartesiaSettings apiKey={apiKey} onApiKeyChange={setApiKey} />
        </Accordion>

        <Accordion title="Model">
          <CartesiaModelSelector model={config.model} onChange={(model) => updateConfig({ model })} />
        </Accordion>

        <Accordion title="Voice">
          <CartesiaVoiceSelector
            voices={voices}
            selectedVoiceId={config.voiceId}
            loading={voicesLoading}
            error={voicesError}
            onVoiceChange={(voiceId, voiceName) => updateConfig({ voiceId, voiceName })}
            onRetry={retry}
          />
        </Accordion>

        <Accordion title="Language">
          <CartesiaLanguage
            value={config.language}
            onChange={(language) => updateConfig({ language })}
          />
        </Accordion>

        <Accordion title="Generation Config">
          <CartesiaGenerationConfig
            speed={config.speed}
            volume={config.volume}
            emotion={config.emotion}
            onSpeedChange={(speed) => updateConfig({ speed })}
            onVolumeChange={(volume) => updateConfig({ volume })}
            onEmotionChange={(emotion) => updateConfig({ emotion })}
          />
        </Accordion>

        <Accordion title="Text">
          <div className="p-4">
            <textarea
              value={config.text}
              onChange={(e) => updateConfig({ text: e.target.value })}
              placeholder="Enter text to synthesize..."
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-lime-500 focus:border-lime-500 resize-y"
            />
            <p className="text-xs text-gray-400 mt-1">
              💡 Insert [laughter] for laughing. Supports SSML tags for speed/volume/emotion.
            </p>
          </div>
        </Accordion>

        {/* Action Buttons */}
        <div className="flex gap-2 px-4">
          <button
            onClick={handleSynthesize}
            disabled={!canSynthesize || isSynthesizing || isStreaming}
            className="flex-1 px-4 py-2 bg-lime-600 text-white rounded-lg font-semibold text-sm disabled:opacity-50 hover:bg-lime-700 transition-colors"
          >
            {isSynthesizing ? '⏳ Synthesizing...' : '🔊 Synthesize'}
          </button>
          <button
            onClick={handleStreamSynthesize}
            disabled={!canSynthesize || isSynthesizing || isStreaming}
            className="flex-1 px-4 py-2 border border-lime-500 text-lime-600 rounded-lg font-semibold text-sm disabled:opacity-50 hover:bg-lime-50 transition-colors"
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
            Enter your Cartesia API key to get started.
          </div>
        )}
      </div>

      {/* Right Panel - Recordings */}
      <div className="w-1/2 overflow-y-auto bg-gray-50">
        <CartesiaRecordingsList
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
          buttonClassName="px-4 py-2 bg-lime-600 text-white rounded-md text-sm font-medium hover:bg-lime-700 transition-colors"
          onClose={() => setCodeModalJson(null)}
        />
      )}
    </div>
  );
}
