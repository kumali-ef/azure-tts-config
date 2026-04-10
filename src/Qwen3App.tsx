import { useState, useRef, useCallback } from 'react';
import type { Qwen3Config, Qwen3Recording } from './types';
import { DEFAULT_QWEN3_CONFIG } from './types';
import { useQwen3Settings } from './hooks/useQwen3Settings';
import { useQwen3Voices } from './hooks/useQwen3Voices';
import { useQwen3Recordings } from './hooks/useQwen3Recordings';
import { qwen3Synthesize, qwen3SynthesizeStreaming } from './utils/qwen3-tts';
import type { Qwen3SynthesisParams } from './utils/qwen3-tts';
import { Accordion } from './components/Accordion';
import { Qwen3Settings } from './components/qwen3/Qwen3Settings';
import { Qwen3ModelSelector } from './components/qwen3/Qwen3ModelSelector';
import { Qwen3VoiceSelector } from './components/qwen3/Qwen3VoiceSelector';
import { Qwen3LanguageType } from './components/qwen3/Qwen3LanguageType';
import { Qwen3Instructions } from './components/qwen3/Qwen3Instructions';
import { Qwen3RecordingsList } from './components/qwen3/Qwen3RecordingsList';

function recordingToConfig(rec: Qwen3Recording): Qwen3Config {
  return {
    model: rec.model,
    voice: rec.voice,
    voiceDisplayName: rec.voice_display_name || rec.voice,
    text: rec.text,
    languageType: rec.language_type || 'Auto',
    instructions: rec.instructions || '',
    optimizeInstructions: !!rec.optimize_instructions,
  };
}

export function Qwen3App() {
  const { apiKey, setApiKey, isConfigured } = useQwen3Settings();
  const [config, setConfig] = useState<Qwen3Config>(DEFAULT_QWEN3_CONFIG);
  const { voices } = useQwen3Voices(config.model);
  const { recordings, loading: recsLoading, error: recsError, saveRecording, deleteRecording } = useQwen3Recordings();

  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const updateConfig = useCallback((updates: Partial<Qwen3Config>) => {
    setConfig((prev) => ({ ...prev, ...updates }));
  }, []);

  const buildParams = (): Qwen3SynthesisParams => ({
    apiKey,
    model: config.model,
    text: config.text,
    voice: config.voice,
    languageType: config.languageType,
    instructions: config.instructions || undefined,
    optimizeInstructions: config.optimizeInstructions || undefined,
  });

  const buildSaveConfig = (timingMs: number, streamDurationMs?: number) => ({
    model: config.model,
    voice: config.voice,
    voice_display_name: config.voiceDisplayName,
    text: config.text,
    language_type: config.languageType,
    instructions: config.instructions || null,
    optimize_instructions: config.optimizeInstructions ? 1 : null,
    api_response_time_ms: timingMs,
    stream_duration_ms: streamDurationMs ?? null,
  });

  const canSynthesize = isConfigured && !!config.text && !!config.voice;

  const handleSynthesize = async () => {
    if (!canSynthesize) return;
    setIsSynthesizing(true);
    setError(null);
    try {
      const startTime = performance.now();
      const audioBuffer = await qwen3Synthesize(buildParams());
      const apiResponseTimeMs = Math.round(performance.now() - startTime);
      const blob = new Blob([audioBuffer], { type: 'audio/mpeg' });
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
      const { ttfbMs, totalMs, buffer } = await qwen3SynthesizeStreaming(buildParams(), audioRef.current);
      const blob = new Blob([buffer], { type: 'audio/mpeg' });
      await saveRecording(blob, buildSaveConfig(ttfbMs, totalMs));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Streaming synthesis failed');
    } finally {
      setIsStreaming(false);
    }
  };

  const handlePlayRecording = (id: string) => {
    if (audioRef.current) {
      audioRef.current.src = `/api/qwen3/recordings/${id}/audio`;
      audioRef.current.play();
    }
  };

  const handleLoadRecording = (rec: Qwen3Recording) => {
    setConfig(recordingToConfig(rec));
  };

  const isInstructModel = config.model.includes('instruct');

  return (
    <div className="flex h-[calc(100vh-52px)]">
      {/* Left Panel - Configuration */}
      <div className="w-1/2 overflow-y-auto p-4 space-y-3 border-r">
        <Accordion title="Qwen3@Aliyun">
          <Qwen3Settings apiKey={apiKey} onApiKeyChange={setApiKey} />
        </Accordion>

        <Accordion title="Model">
          <Qwen3ModelSelector model={config.model} onChange={(model) => updateConfig({ model })} />
        </Accordion>

        <Accordion title="Voice">
          <Qwen3VoiceSelector
            voices={voices}
            selectedVoice={config.voice}
            onVoiceChange={(voice, voiceDisplayName) => updateConfig({ voice, voiceDisplayName })}
          />
        </Accordion>

        <Accordion title="Language">
          <Qwen3LanguageType
            value={config.languageType}
            onChange={(languageType) => updateConfig({ languageType })}
          />
        </Accordion>

        {isInstructModel && (
          <Accordion title="Instructions (Instruct Model)">
            <Qwen3Instructions
              instructions={config.instructions}
              optimizeInstructions={config.optimizeInstructions}
              onInstructionsChange={(instructions) => updateConfig({ instructions })}
              onOptimizeChange={(optimizeInstructions) => updateConfig({ optimizeInstructions })}
            />
          </Accordion>
        )}

        <Accordion title="Text">
          <div className="p-4">
            <textarea
              value={config.text}
              onChange={(e) => updateConfig({ text: e.target.value })}
              placeholder="Enter text to synthesize..."
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 resize-y"
            />
            <p className="text-xs text-gray-400 mt-1">Max 512 tokens per request.</p>
          </div>
        </Accordion>

        {/* Action Buttons */}
        <div className="flex gap-2 px-4">
          <button
            onClick={handleSynthesize}
            disabled={!canSynthesize || isSynthesizing || isStreaming}
            className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg font-semibold text-sm disabled:opacity-50 hover:bg-teal-700 transition-colors"
          >
            {isSynthesizing ? '⏳ Synthesizing...' : '🔊 Synthesize'}
          </button>
          <button
            onClick={handleStreamSynthesize}
            disabled={!canSynthesize || isSynthesizing || isStreaming}
            className="flex-1 px-4 py-2 border border-teal-500 text-teal-600 rounded-lg font-semibold text-sm disabled:opacity-50 hover:bg-teal-50 transition-colors"
          >
            {isStreaming ? '⏳ Streaming...' : '📡 Stream & Play'}
          </button>
        </div>

        {error && (
          <div className="mx-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
            {error}
          </div>
        )}

        {!isConfigured && (
          <div className="mx-4 p-3 bg-yellow-50 border border-yellow-200 text-yellow-700 rounded-md text-sm">
            Enter your DashScope API key to get started.
          </div>
        )}
      </div>

      {/* Right Panel - Recordings */}
      <div className="w-1/2 overflow-y-auto bg-gray-50">
        <Qwen3RecordingsList
          recordings={recordings}
          loading={recsLoading}
          error={recsError}
          onPlay={handlePlayRecording}
          onDelete={deleteRecording}
          onLoad={handleLoadRecording}
        />
      </div>

      <audio ref={audioRef} />
    </div>
  );
}
