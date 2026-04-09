/** Azure voice object returned from the voices list API */
export interface AzureVoice {
  Name: string;
  DisplayName: string;
  LocalName: string;
  ShortName: string;
  Gender: string;
  Locale: string;
  LocaleName: string;
  StyleList?: string[];
  RolePlayList?: string[];
  VoiceType: string;
  Status: string;
  WordsPerMinute?: string;
}

/** TTS configuration parameters set by the user */
export interface TtsConfig {
  voiceName: string;
  voiceDisplayName: string;
  language: string;
  text: string;
  rate: string;
  pitch: string;
  volume: string;
  emphasis: string;
  style: string;
  styleDegree: number;
  role: string;
  breakType: 'duration' | 'strength';
  breakValue: string;
  customVoiceMode: boolean;
  deploymentId: string;
}

/** Recording metadata stored in the database */
export interface Recording {
  id: string;
  voice_name: string;
  voice_display_name: string;
  language: string;
  text: string;
  rate: string;
  pitch: string;
  volume: string;
  emphasis: string | null;
  style: string | null;
  style_degree: number | null;
  role: string | null;
  break_config: string | null;
  ssml: string;
  audio_filename: string;
  output_format: string;
  api_response_time_ms: number | null;
  stream_duration_ms: number | null;
  deployment_id: string | null;
  created_at: string;
  label: string | null;
}

// ── MiniMax TTS Types ──

export interface MiniMaxVoice {
  voice_id: string;
  voice_name: string;
  description: string[];
  created_time: string;
  category: 'system' | 'cloned' | 'generated';
}

export interface MiniMaxConfig {
  model: string;
  voiceId: string;
  voiceName: string;
  text: string;
  speed: number;
  vol: number;
  pitch: number;
  emotion: string;
  languageBoost: string;
  voiceModifyTimbre: number;
  voiceModifyIntensity: number;
  voiceModifySoundEffect: string;
  customVoiceId: string;
  useCustomVoice: boolean;
}

export interface MiniMaxRecording {
  id: string;
  model: string;
  voice_id: string;
  voice_name: string | null;
  text: string;
  speed: number;
  vol: number;
  pitch: number;
  emotion: string | null;
  language_boost: string | null;
  voice_modify_timbre: number | null;
  voice_modify_intensity: number | null;
  voice_modify_sound_effect: string | null;
  audio_filename: string;
  api_response_time_ms: number | null;
  stream_duration_ms: number | null;
  created_at: string;
  label: string | null;
}

export const DEFAULT_MINIMAX_CONFIG: MiniMaxConfig = {
  model: 'MiniMax/speech-2.8-turbo',
  voiceId: '',
  voiceName: '',
  text: '',
  speed: 1.0,
  vol: 1.0,
  pitch: 0,
  emotion: '',
  languageBoost: '',
  voiceModifyTimbre: 0,
  voiceModifyIntensity: 0,
  voiceModifySoundEffect: '',
  customVoiceId: '',
  useCustomVoice: false,
};

/** Default config values */
export const DEFAULT_CONFIG: TtsConfig = {
  voiceName: '',
  voiceDisplayName: '',
  language: 'en-US',
  text: '',
  rate: 'medium',
  pitch: 'medium',
  volume: 'medium',
  emphasis: '',
  style: '',
  styleDegree: 1.0,
  role: '',
  breakType: 'strength',
  breakValue: '',
  customVoiceMode: false,
  deploymentId: '',
};
