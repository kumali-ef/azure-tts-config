import { useState, useRef, useCallback } from 'react';
import type { ElevenLabsConfig, ElevenLabsRecording } from './types';
import { DEFAULT_ELEVENLABS_CONFIG } from './types';
import { useElevenLabsSettings } from './hooks/useElevenLabsSettings';
import { useElevenLabsVoices } from './hooks/useElevenLabsVoices';
import { useElevenLabsRecordings } from './hooks/useElevenLabsRecordings';
import { elevenLabsSynthesize, elevenLabsSynthesizeStreaming } from './utils/elevenlabs-tts';
import type { ElevenLabsSynthesisParams } from './utils/elevenlabs-tts';
import { Accordion } from './components/Accordion';
import { ShowJsonModal } from './components/ShowJsonModal';
import { ElevenLabsSettings } from './components/elevenlabs/ElevenLabsSettings';
import { ElevenLabsModelSelector } from './components/elevenlabs/ElevenLabsModelSelector';
import { ElevenLabsVoiceSelector } from './components/elevenlabs/ElevenLabsVoiceSelector';
import { ElevenLabsVoiceSettings } from './components/elevenlabs/ElevenLabsVoiceSettings';
import { ElevenLabsLanguage } from './components/elevenlabs/ElevenLabsLanguage';
import { ElevenLabsRecordingsList } from './components/elevenlabs/ElevenLabsRecordingsList';

function recordingToConfig(rec: ElevenLabsRecording): ElevenLabsConfig {
  return {
    model: rec.model,
    voiceId: rec.voice_id,
    voiceName: rec.voice_name || rec.voice_id,
    text: rec.text,
    languageCode: rec.language_code || '',
    stability: rec.stability ?? 0.5,
    similarityBoost: rec.similarity_boost ?? 0.75,
    style: rec.style ?? 0.0,
    useSpeakerBoost: rec.use_speaker_boost != null ? !!rec.use_speaker_boost : true,
    speed: rec.speed ?? 1.0,
  };
}

export function ElevenLabsApp() {
  const { apiKey, setApiKey, isConfigured } = useElevenLabsSettings();
  const { voices, loading: voicesLoading, error: voicesError, retry } = useElevenLabsVoices(apiKey);
  const { recordings, loading: recsLoading, error: recsError, saveRecording, deleteRecording } = useElevenLabsRecordings();

  const [config, setConfig] = useState<ElevenLabsConfig>(DEFAULT_ELEVENLABS_CONFIG);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [codeModalJson, setCodeModalJson] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const updateConfig = useCallback((updates: Partial<ElevenLabsConfig>) => {
    setConfig((prev) => ({ ...prev, ...updates }));
  }, []);

  const buildParams = (): ElevenLabsSynthesisParams => ({
    apiKey,
    model: config.model,
    text: config.text,
    voiceId: config.voiceId,
    languageCode: config.languageCode || undefined,
    stability: config.stability,
    similarityBoost: config.similarityBoost,
    style: config.style,
    useSpeakerBoost: config.useSpeakerBoost,
    speed: config.speed,
  });

  const buildSaveConfig = (timingMs: number, streamDurationMs?: number) => ({
    model: config.model,
    voice_id: config.voiceId,
    voice_name: config.voiceName,
    text: config.text,
    language_code: config.languageCode || null,
    stability: config.stability,
    similarity_boost: config.similarityBoost,
    style: config.style,
    use_speaker_boost: config.useSpeakerBoost ? 1 : 0,
    speed: config.speed,
    api_response_time_ms: timingMs,
    stream_duration_ms: streamDurationMs ?? null,
  });

  const canSynthesize = isConfigured && !!config.text && !!config.voiceId;

  const configToJson = (cfg: ElevenLabsConfig) => JSON.stringify({
    model: cfg.model,
    voiceId: cfg.voiceId,
    voiceName: cfg.voiceName,
    text: cfg.text,
    languageCode: cfg.languageCode || undefined,
    stability: cfg.stability,
    similarityBoost: cfg.similarityBoost,
    style: cfg.style,
    useSpeakerBoost: cfg.useSpeakerBoost,
    speed: cfg.speed,
  }, null, 2);

  const handleSynthesize = async () => {
    if (!canSynthesize) return;
    setIsSynthesizing(true);
    setError(null);
    try {
      const startTime = performance.now();
      const audioBuffer = await elevenLabsSynthesize(buildParams());
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
      const { ttfbMs, totalMs, buffer } = await elevenLabsSynthesizeStreaming(buildParams(), audioRef.current);
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
      audioRef.current.src = `/api/elevenlabs/recordings/${id}/audio`;
      audioRef.current.play();
    }
  };

  const handleLoadRecording = (rec: ElevenLabsRecording) => {
    setConfig(recordingToConfig(rec));
  };

  return (
    <div className="flex h-[calc(100vh-52px)]">
      {/* Left Panel - Configuration */}
      <div className="w-1/2 overflow-y-auto p-4 space-y-3 border-r">
        <Accordion title="ElevenLabs API">
          <ElevenLabsSettings apiKey={apiKey} onApiKeyChange={setApiKey} />
        </Accordion>

        <Accordion title="Model">
          <ElevenLabsModelSelector model={config.model} onChange={(model) => updateConfig({ model })} />
        </Accordion>

        <Accordion title="Voice">
          <ElevenLabsVoiceSelector
            voices={voices}
            selectedVoiceId={config.voiceId}
            loading={voicesLoading}
            error={voicesError}
            onVoiceChange={(voiceId, voiceName) => updateConfig({ voiceId, voiceName })}
            onRetry={retry}
          />
        </Accordion>

        <Accordion title="Voice Settings">
          <ElevenLabsVoiceSettings
            stability={config.stability}
            similarityBoost={config.similarityBoost}
            style={config.style}
            useSpeakerBoost={config.useSpeakerBoost}
            speed={config.speed}
            onStabilityChange={(stability) => updateConfig({ stability })}
            onSimilarityBoostChange={(similarityBoost) => updateConfig({ similarityBoost })}
            onStyleChange={(style) => updateConfig({ style })}
            onUseSpeakerBoostChange={(useSpeakerBoost) => updateConfig({ useSpeakerBoost })}
            onSpeedChange={(speed) => updateConfig({ speed })}
          />
        </Accordion>

        <Accordion title="Language">
          <ElevenLabsLanguage
            value={config.languageCode}
            onChange={(languageCode) => updateConfig({ languageCode })}
          />
        </Accordion>

        <Accordion title="Text">
          <div className="p-4">
            <textarea
              value={config.text}
              onChange={(e) => updateConfig({ text: e.target.value })}
              placeholder="Enter text to synthesize..."
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 resize-y"
            />
          </div>
        </Accordion>

        {/* Action Buttons */}
        <div className="flex gap-2 px-4">
          <button
            onClick={handleSynthesize}
            disabled={!canSynthesize || isSynthesizing || isStreaming}
            className="flex-1 px-4 py-2 bg-amber-600 text-white rounded-lg font-semibold text-sm disabled:opacity-50 hover:bg-amber-700 transition-colors"
          >
            {isSynthesizing ? '⏳ Synthesizing...' : '🔊 Synthesize'}
          </button>
          <button
            onClick={handleStreamSynthesize}
            disabled={!canSynthesize || isSynthesizing || isStreaming}
            className="flex-1 px-4 py-2 border border-amber-500 text-amber-600 rounded-lg font-semibold text-sm disabled:opacity-50 hover:bg-amber-50 transition-colors"
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
            Enter your ElevenLabs API key to get started.
          </div>
        )}
      </div>

      {/* Right Panel - Recordings */}
      <div className="w-1/2 overflow-y-auto bg-gray-50">
        <ElevenLabsRecordingsList
          recordings={recordings}
          loading={recsLoading}
          error={recsError}
          onPlay={handlePlayRecording}
          onDelete={deleteRecording}
          onLoad={handleLoadRecording}
          onShowCode={(rec) => setCodeModalJson(configToJson(recordingToConfig(rec)))}
        />
      </div>

      <audio ref={audioRef} />

      {codeModalJson && (
        <ShowJsonModal
          json={codeModalJson}
          buttonClassName="px-4 py-2 bg-amber-600 text-white rounded-md text-sm font-medium hover:bg-amber-700 transition-colors"
          onClose={() => setCodeModalJson(null)}
        />
      )}
    </div>
  );
}
