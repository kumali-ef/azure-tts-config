import { useState, useRef, useCallback } from 'react';
import type { MiniMaxConfig, MiniMaxRecording } from './types';
import { DEFAULT_MINIMAX_CONFIG } from './types';
import { useMiniMaxSettings } from './hooks/useMiniMaxSettings';
import { useMiniMaxVoices } from './hooks/useMiniMaxVoices';
import { useMiniMaxRecordings } from './hooks/useMiniMaxRecordings';
import { miniMaxSynthesize, miniMaxSynthesizeStreaming } from './utils/minimax-tts';
import type { MiniMaxSynthesisParams } from './utils/minimax-tts';
import { Accordion } from './components/Accordion';
import { MiniMaxSettings } from './components/minimax/MiniMaxSettings';
import { ModelSelector } from './components/minimax/ModelSelector';
import { MiniMaxVoiceSelector } from './components/minimax/MiniMaxVoiceSelector';
import { VoiceSettings } from './components/minimax/VoiceSettings';
import { LanguageBoost } from './components/minimax/LanguageBoost';
import { VoiceModify } from './components/minimax/VoiceModify';
import { MiniMaxRecordingsList } from './components/minimax/MiniMaxRecordingsList';

function recordingToConfig(rec: MiniMaxRecording): MiniMaxConfig {
  return {
    model: rec.model,
    voiceId: rec.voice_id,
    voiceName: rec.voice_name || rec.voice_id,
    text: rec.text,
    speed: rec.speed,
    vol: rec.vol,
    pitch: rec.pitch,
    emotion: rec.emotion || '',
    languageBoost: rec.language_boost || '',
    voiceModifyTimbre: rec.voice_modify_timbre ?? 0,
    voiceModifyIntensity: rec.voice_modify_intensity ?? 0,
    voiceModifySoundEffect: rec.voice_modify_sound_effect || '',
    customVoiceId: '',
    useCustomVoice: false,
  };
}

export function MiniMaxApp() {
  const { apiKey, setApiKey, groupId, setGroupId, isConfigured } = useMiniMaxSettings();
  const { voices, loading: voicesLoading, error: voicesError, retry } = useMiniMaxVoices(apiKey, groupId);
  const { recordings, loading: recsLoading, error: recsError, saveRecording, deleteRecording } = useMiniMaxRecordings();

  const [config, setConfig] = useState<MiniMaxConfig>(DEFAULT_MINIMAX_CONFIG);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const updateConfig = useCallback((updates: Partial<MiniMaxConfig>) => {
    setConfig((prev) => ({ ...prev, ...updates }));
  }, []);

  const buildParams = (): MiniMaxSynthesisParams => ({
    apiKey,
    groupId: groupId || undefined,
    model: config.model,
    text: config.text,
    voiceId: config.useCustomVoice ? config.customVoiceId : config.voiceId,
    speed: config.speed,
    vol: config.vol,
    pitch: config.pitch,
    emotion: config.emotion || undefined,
    languageBoost: config.languageBoost || undefined,
    voiceModifyTimbre: config.voiceModifyTimbre || undefined,
    voiceModifyIntensity: config.voiceModifyIntensity || undefined,
    voiceModifySoundEffect: config.voiceModifySoundEffect || undefined,
  });

  const buildSaveConfig = (timingMs: number, streamDurationMs?: number) => ({
    model: config.model,
    voice_id: config.useCustomVoice ? config.customVoiceId : config.voiceId,
    voice_name: config.useCustomVoice ? config.customVoiceId : config.voiceName,
    text: config.text,
    speed: config.speed,
    vol: config.vol,
    pitch: config.pitch,
    emotion: config.emotion || null,
    language_boost: config.languageBoost || null,
    voice_modify_timbre: config.voiceModifyTimbre || null,
    voice_modify_intensity: config.voiceModifyIntensity || null,
    voice_modify_sound_effect: config.voiceModifySoundEffect || null,
    api_response_time_ms: timingMs,
    stream_duration_ms: streamDurationMs ?? null,
  });

  const effectiveVoiceId = config.useCustomVoice ? config.customVoiceId : config.voiceId;
  const canSynthesize = isConfigured && !!config.text && !!effectiveVoiceId;

  const handleSynthesize = async () => {
    if (!canSynthesize) return;
    setIsSynthesizing(true);
    setError(null);
    try {
      const startTime = performance.now();
      const audioBuffer = await miniMaxSynthesize(buildParams());
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
      const { ttfbMs, totalMs, buffer } = await miniMaxSynthesizeStreaming(buildParams(), audioRef.current);
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
      audioRef.current.src = `/api/minimax/recordings/${id}/audio`;
      audioRef.current.play();
    }
  };

  const handleLoadRecording = (rec: MiniMaxRecording) => {
    setConfig(recordingToConfig(rec));
  };

  const is28Model = config.model.startsWith('speech-2.8');

  return (
    <div className="flex h-[calc(100vh-52px)]">
      {/* Left Panel - Configuration */}
      <div className="w-1/2 overflow-y-auto p-4 space-y-3 border-r">
        <Accordion title="MiniMax Settings">
          <MiniMaxSettings
            apiKey={apiKey}
            groupId={groupId}
            onApiKeyChange={setApiKey}
            onGroupIdChange={setGroupId}
          />
        </Accordion>

        <Accordion title="Model">
          <ModelSelector model={config.model} onChange={(model) => updateConfig({ model })} />
        </Accordion>

        <Accordion title="Voice">
          <MiniMaxVoiceSelector
            voices={voices}
            selectedVoiceId={config.voiceId}
            customVoiceId={config.customVoiceId}
            useCustomVoice={config.useCustomVoice}
            loading={voicesLoading}
            error={voicesError}
            onVoiceChange={(voiceId, voiceName) => updateConfig({ voiceId, voiceName })}
            onCustomVoiceIdChange={(customVoiceId) => updateConfig({ customVoiceId })}
            onUseCustomVoiceChange={(useCustomVoice) => updateConfig({ useCustomVoice })}
            onRetry={retry}
          />
        </Accordion>

        <Accordion title="Voice Settings">
          <VoiceSettings
            speed={config.speed}
            vol={config.vol}
            pitch={config.pitch}
            emotion={config.emotion}
            onSpeedChange={(speed) => updateConfig({ speed })}
            onVolChange={(vol) => updateConfig({ vol })}
            onPitchChange={(pitch) => updateConfig({ pitch })}
            onEmotionChange={(emotion) => updateConfig({ emotion })}
          />
        </Accordion>

        <Accordion title="Language Boost">
          <LanguageBoost
            value={config.languageBoost}
            onChange={(languageBoost) => updateConfig({ languageBoost })}
          />
        </Accordion>

        <Accordion title="Voice Modify (Effects)">
          <VoiceModify
            timbre={config.voiceModifyTimbre}
            intensity={config.voiceModifyIntensity}
            soundEffect={config.voiceModifySoundEffect}
            onTimbreChange={(voiceModifyTimbre) => updateConfig({ voiceModifyTimbre })}
            onIntensityChange={(voiceModifyIntensity) => updateConfig({ voiceModifyIntensity })}
            onSoundEffectChange={(voiceModifySoundEffect) => updateConfig({ voiceModifySoundEffect })}
          />
        </Accordion>

        <Accordion title="Text">
          <div className="p-4">
            <textarea
              value={config.text}
              onChange={(e) => updateConfig({ text: e.target.value })}
              placeholder="Enter text to synthesize..."
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-y"
            />
            {is28Model && (
              <p className="text-xs text-gray-400 mt-1">
                💡 Supports interjections: (laughs), (sighs), (coughs) — and pauses: &lt;#1.5#&gt;
              </p>
            )}
          </div>
        </Accordion>

        {/* Action Buttons */}
        <div className="flex gap-2 px-4">
          <button
            onClick={handleSynthesize}
            disabled={!canSynthesize || isSynthesizing || isStreaming}
            className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg font-semibold text-sm disabled:opacity-50 hover:bg-purple-700 transition-colors"
          >
            {isSynthesizing ? '⏳ Synthesizing...' : '🔊 Synthesize'}
          </button>
          <button
            onClick={handleStreamSynthesize}
            disabled={!canSynthesize || isSynthesizing || isStreaming}
            className="flex-1 px-4 py-2 border border-purple-500 text-purple-600 rounded-lg font-semibold text-sm disabled:opacity-50 hover:bg-purple-50 transition-colors"
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
            Enter your MiniMax API key to get started.
          </div>
        )}
      </div>

      {/* Right Panel - Recordings */}
      <div className="w-1/2 overflow-y-auto bg-gray-50">
        <MiniMaxRecordingsList
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
