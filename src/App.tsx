import { useState, useRef, useCallback, useEffect } from 'react';
import type { TtsConfig, AzureVoice, Recording } from './types';
import { DEFAULT_CONFIG } from './types';
import { useAzureSettings } from './hooks/useAzureSettings';
import { useVoices } from './hooks/useVoices';
import { useRecordings } from './hooks/useRecordings';
import { buildSsml, buildPlainTextSsml } from './utils/ssml';
import { synthesizeSpeech } from './utils/azure-tts';
import {
  getStoredDeploymentId, setStoredDeploymentId,
  getStoredCustomVoiceName, setStoredCustomVoiceName,
} from './utils/storage';
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
    customVoiceMode: !!rec.deployment_id,
    deploymentId: rec.deployment_id || '',
    plainTextMode: false,
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

  // Custom voice state (persisted in localStorage)
  const [customVoiceName, setCustomVoiceName] = useState(getStoredCustomVoiceName);
  const [customDeploymentId, setCustomDeploymentId] = useState(getStoredDeploymentId);

  useEffect(() => { setStoredCustomVoiceName(customVoiceName); }, [customVoiceName]);
  useEffect(() => { setStoredDeploymentId(customDeploymentId); }, [customDeploymentId]);

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
    if (!isConfigured || !config.text) return;

    // In custom mode, we need deploymentId and customVoiceName
    const isCustom = config.customVoiceMode;
    const effectiveVoiceName = isCustom ? customVoiceName : config.voiceName;
    const effectiveDisplayName = isCustom ? customVoiceName : config.voiceDisplayName;
    const effectiveDeploymentId = isCustom ? customDeploymentId : undefined;

    if (!effectiveVoiceName) return;
    if (isCustom && !customDeploymentId) return;

    setIsSynthesizing(true);
    setError(null);
    try {
      const ssml = config.plainTextMode
        ? buildPlainTextSsml(effectiveVoiceName, config.language, config.text)
        : buildSsml({ ...config, voiceName: effectiveVoiceName });
      const startTime = performance.now();
      const audioBuffer = await synthesizeSpeech(key, region, ssml, effectiveDeploymentId);
      const apiResponseTimeMs = Math.round(performance.now() - startTime);
      const blob = new Blob([audioBuffer], { type: 'audio/mpeg' });
      const url = URL.createObjectURL(blob);
      if (audioRef.current) {
        audioRef.current.src = url;
        audioRef.current.play();
      }
      // Auto-save after successful synthesis
      await saveRecording(blob, {
        voice_name: effectiveVoiceName,
        voice_display_name: effectiveDisplayName,
        language: config.language,
        text: config.text,
        rate: config.plainTextMode ? 'medium' : config.rate,
        pitch: config.plainTextMode ? 'medium' : config.pitch,
        volume: config.plainTextMode ? 'medium' : config.volume,
        emphasis: config.plainTextMode ? null : (config.emphasis || null),
        style: (isCustom || config.plainTextMode) ? null : (config.style || null),
        style_degree: (isCustom || config.plainTextMode) ? null : (config.style ? config.styleDegree : null),
        role: (isCustom || config.plainTextMode) ? null : (config.role || null),
        break_config: config.plainTextMode ? null : (config.breakValue
          ? JSON.stringify({ type: config.breakType, value: config.breakValue })
          : null),
        ssml,
        api_response_time_ms: apiResponseTimeMs,
        deployment_id: isCustom ? customDeploymentId : null,
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
    if (rec.deployment_id) {
      // Loading a custom voice recording
      setCustomDeploymentId(rec.deployment_id);
      setCustomVoiceName(rec.voice_name);
    } else {
      // Loading a standard voice recording
      setLanguageFilter(rec.language);
      const voice = allVoices.find((v) => v.ShortName === rec.voice_name) || null;
      if (voice) setSelectedVoice(voice);
    }
  };

  const canSynthesize = isConfigured && !!config.text && (
    config.customVoiceMode
      ? !!customVoiceName && !!customDeploymentId
      : !!config.voiceName
  );

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
              customVoiceMode={config.customVoiceMode}
              customVoiceName={customVoiceName}
              customDeploymentId={customDeploymentId}
              customLanguage={config.language}
              onVoiceChange={handleVoiceSelect}
              onSearchChange={setSearchQuery}
              onLanguageChange={setLanguageFilter}
              onRetry={retry}
              onCustomVoiceModeChange={(enabled) => updateConfig({ customVoiceMode: enabled })}
              onCustomVoiceNameChange={setCustomVoiceName}
              onCustomDeploymentIdChange={setCustomDeploymentId}
              onCustomLanguageChange={(language) => updateConfig({ language })}
            />
          </Accordion>

          {!config.plainTextMode && (
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
          )}

          {!config.plainTextMode && (
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
          )}

          {!config.plainTextMode && !config.customVoiceMode && (selectedVoice?.StyleList?.length || selectedVoice?.RolePlayList?.length) ? (
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
            <TextInput
              text={config.text}
              plainTextMode={config.plainTextMode}
              onChange={(text) => updateConfig({ text })}
              onPlainTextModeChange={(plainTextMode) => updateConfig({ plainTextMode })}
            />
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
