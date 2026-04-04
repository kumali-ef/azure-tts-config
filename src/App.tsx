import { useState, useRef, useCallback } from 'react';
import type { TtsConfig, AzureVoice, Recording } from './types';
import { DEFAULT_CONFIG } from './types';
import { useAzureSettings } from './hooks/useAzureSettings';
import { useVoices } from './hooks/useVoices';
import { useRecordings } from './hooks/useRecordings';
import { buildSsml } from './utils/ssml';
import { synthesizeSpeech } from './utils/azure-tts';
import { Accordion } from './components/Accordion';
import { AzureSettings } from './components/AzureSettings';
import { VoiceSelector } from './components/VoiceSelector';
import { ProsodyControls } from './components/ProsodyControls';
import { EmphasisControl } from './components/EmphasisControl';
import { StyleRoleControls } from './components/StyleRoleControls';
import { BreakControl } from './components/BreakControl';
import { TextInput } from './components/TextInput';
import { ActionButtons } from './components/ActionButtons';
import { ShowCodeModal } from './components/ShowCodeModal';
import { RecordingsList } from './components/RecordingsList';

function recordingToConfig(rec: Recording): TtsConfig {
  const breakConfig = rec.break_config ? JSON.parse(rec.break_config) : null;
  return {
    voiceName: rec.voice_name,
    voiceDisplayName: rec.voice_display_name,
    language: rec.language,
    text: rec.text,
    rate: rec.rate,
    pitch: rec.pitch,
    volume: rec.volume,
    emphasis: rec.emphasis || '',
    style: rec.style || '',
    styleDegree: rec.style_degree ?? 1.0,
    role: rec.role || '',
    breakType: breakConfig?.type || 'strength',
    breakValue: breakConfig?.value || '',
  };
}

function App() {
  const { key, setKey, region, setRegion, isConfigured } = useAzureSettings();
  const {
    voices, allVoices, languages, loading: voicesLoading, error: voicesError,
    searchQuery, setSearchQuery, languageFilter, setLanguageFilter, retry,
  } = useVoices(key, region);
  const { recordings, loading: recsLoading, error: recsError, saveRecording, deleteRecording } = useRecordings();

  const [config, setConfig] = useState<TtsConfig>(DEFAULT_CONFIG);
  const [selectedVoice, setSelectedVoice] = useState<AzureVoice | null>(null);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [codeModalConfig, setCodeModalConfig] = useState<TtsConfig | null>(null);
  const [error, setError] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement>(null);

  const updateConfig = useCallback((updates: Partial<TtsConfig>) => {
    setConfig((prev) => ({ ...prev, ...updates }));
  }, []);

  const handleVoiceSelect = (voice: AzureVoice | null) => {
    setSelectedVoice(voice);
    if (voice) {
      updateConfig({
        voiceName: voice.ShortName,
        voiceDisplayName: voice.DisplayName,
        language: voice.Locale,
        style: '',
        styleDegree: 1.0,
        role: '',
      });
    }
  };

  const handleSynthesize = async () => {
    if (!isConfigured || !config.voiceName || !config.text) return;
    setIsSynthesizing(true);
    setError(null);
    try {
      const ssml = buildSsml(config);
      const audioBuffer = await synthesizeSpeech(key, region, ssml);
      const blob = new Blob([audioBuffer], { type: 'audio/mpeg' });
      const url = URL.createObjectURL(blob);
      if (audioRef.current) {
        audioRef.current.src = url;
        audioRef.current.play();
      }
      // Auto-save after successful synthesis
      await saveRecording(blob, {
        voice_name: config.voiceName,
        voice_display_name: config.voiceDisplayName,
        language: config.language,
        text: config.text,
        rate: config.rate,
        pitch: config.pitch,
        volume: config.volume,
        emphasis: config.emphasis || null,
        style: config.style || null,
        style_degree: config.style ? config.styleDegree : null,
        role: config.role || null,
        break_config: config.breakValue
          ? JSON.stringify({ type: config.breakType, value: config.breakValue })
          : null,
        ssml,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Synthesis failed');
    } finally {
      setIsSynthesizing(false);
    }
  };

  const handlePlayRecording = (id: string) => {
    if (audioRef.current) {
      audioRef.current.src = `/api/recordings/${id}/audio`;
      audioRef.current.play();
    }
  };

  const handleLoadRecording = (rec: Recording) => {
    const newConfig = recordingToConfig(rec);
    setConfig(newConfig);
    setLanguageFilter(rec.language);
    const voice = allVoices.find((v) => v.ShortName === rec.voice_name) || null;
    if (voice) setSelectedVoice(voice);
  };

  const canSynthesize = isConfigured && !!config.voiceName && !!config.text;

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm border-b px-6 py-3">
        <h1 className="text-xl font-bold text-gray-800">Azure TTS Config Tester</h1>
      </header>

      <div className="flex h-[calc(100vh-52px)]">
        {/* Left Panel - Configuration */}
        <div className="w-1/2 overflow-y-auto p-4 space-y-3 border-r">
          <Accordion title="Azure Settings">
            <AzureSettings
              apiKey={key}
              region={region}
              onKeyChange={setKey}
              onRegionChange={setRegion}
            />
          </Accordion>

          <Accordion title="Language & Voice">
            <VoiceSelector
              voices={voices}
              allVoices={allVoices}
              languages={languages}
              selectedVoice={config.voiceName}
              searchQuery={searchQuery}
              languageFilter={languageFilter}
              loading={voicesLoading}
              error={voicesError}
              onVoiceChange={handleVoiceSelect}
              onSearchChange={setSearchQuery}
              onLanguageChange={setLanguageFilter}
              onRetry={retry}
            />
          </Accordion>

          <Accordion title="Prosody">
            <ProsodyControls
              rate={config.rate}
              pitch={config.pitch}
              volume={config.volume}
              onRateChange={(rate) => updateConfig({ rate })}
              onPitchChange={(pitch) => updateConfig({ pitch })}
              onVolumeChange={(volume) => updateConfig({ volume })}
            />
          </Accordion>

          <Accordion title="Emphasis & Break">
            <div className="grid grid-cols-2 gap-3 p-4">
              <EmphasisControl
                emphasis={config.emphasis}
                onChange={(emphasis) => updateConfig({ emphasis })}
              />
              <BreakControl
                breakType={config.breakType}
                breakValue={config.breakValue}
                onBreakTypeChange={(breakType) => updateConfig({ breakType })}
                onBreakValueChange={(breakValue) => updateConfig({ breakValue })}
              />
            </div>
          </Accordion>

          {(selectedVoice?.StyleList?.length || selectedVoice?.RolePlayList?.length) ? (
            <Accordion title="Style & Role">
              <StyleRoleControls
                styles={selectedVoice?.StyleList || []}
                roles={selectedVoice?.RolePlayList || []}
                style={config.style}
                styleDegree={config.styleDegree}
                role={config.role}
                onStyleChange={(style) => updateConfig({ style })}
                onStyleDegreeChange={(styleDegree) => updateConfig({ styleDegree })}
                onRoleChange={(role) => updateConfig({ role })}
              />
            </Accordion>
          ) : null}

          <Accordion title="Text">
            <TextInput text={config.text} onChange={(text) => updateConfig({ text })} />
          </Accordion>

          <ActionButtons
            canSynthesize={canSynthesize}
            isSynthesizing={isSynthesizing}
            onSynthesize={handleSynthesize}
            onShowCode={() => setCodeModalConfig(config)}
          />

          {error && (
            <div className="mx-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
              {error}
            </div>
          )}

          {!isConfigured && (
            <div className="mx-4 p-3 bg-yellow-50 border border-yellow-200 text-yellow-700 rounded-md text-sm">
              Enter your Azure API key and region to get started.
            </div>
          )}
        </div>

        {/* Right Panel - Saved Recordings */}
        <div className="w-1/2 overflow-y-auto bg-gray-50">
          <RecordingsList
            recordings={recordings}
            loading={recsLoading}
            error={recsError}
            onPlay={handlePlayRecording}
            onDelete={deleteRecording}
            onShowCode={(rec) => setCodeModalConfig(recordingToConfig(rec))}
            onLoad={handleLoadRecording}
          />
        </div>
      </div>

      {/* Hidden audio element for playback */}
      <audio ref={audioRef} />

      {/* Show Code Modal */}
      {codeModalConfig && (
        <ShowCodeModal config={codeModalConfig} onClose={() => setCodeModalConfig(null)} />
      )}
    </div>
  );
}

export default App;
