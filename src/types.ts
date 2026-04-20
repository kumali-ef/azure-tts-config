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

// ── Qwen3 TTS Types ──

export interface Qwen3Voice {
  voice: string;
  name: string;
  gender: 'M' | 'F';
  description: string;
  supportedModels: string[];
}

export interface Qwen3Config {
  model: string;
  voice: string;
  voiceDisplayName: string;
  text: string;
  languageType: string;
  instructions: string;
  optimizeInstructions: boolean;
}

export interface Qwen3Recording {
  id: string;
  model: string;
  voice: string;
  voice_display_name: string | null;
  text: string;
  language_type: string;
  instructions: string | null;
  optimize_instructions: number | null;
  audio_filename: string;
  api_response_time_ms: number | null;
  stream_duration_ms: number | null;
  created_at: string;
  label: string | null;
}

export const DEFAULT_QWEN3_CONFIG: Qwen3Config = {
  model: 'qwen3-tts-flash',
  voice: '',
  voiceDisplayName: '',
  text: '',
  languageType: 'Auto',
  instructions: '',
  optimizeInstructions: false,
};

// ── Cartesia TTS Types ──

export interface CartesiaVoice {
  id: string;
  name: string;
  description: string;
  language: string;
  gender: string;
  is_owner: boolean;
}

export interface CartesiaConfig {
  model: string;
  voiceId: string;
  voiceName: string;
  text: string;
  language: string;
  speed: number;
  volume: number;
  emotion: string;
}

export interface CartesiaRecording {
  id: string;
  model: string;
  voice_id: string;
  voice_name: string | null;
  text: string;
  language: string | null;
  speed: number | null;
  volume: number | null;
  emotion: string | null;
  audio_filename: string;
  api_response_time_ms: number | null;
  stream_duration_ms: number | null;
  created_at: string;
  label: string | null;
}

export const DEFAULT_CARTESIA_CONFIG: CartesiaConfig = {
  model: 'sonic-3',
  voiceId: '',
  voiceName: '',
  text: '',
  language: '',
  speed: 1.0,
  volume: 1.0,
  emotion: '',
};

// ── ElevenLabs TTS Types ──

export interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  category: string;
  labels: Record<string, string>;
}

export interface ElevenLabsConfig {
  model: string;
  voiceId: string;
  voiceName: string;
  text: string;
  languageCode: string;
  stability: number;
  similarityBoost: number;
  style: number;
  useSpeakerBoost: boolean;
  speed: number;
}

export interface ElevenLabsRecording {
  id: string;
  model: string;
  voice_id: string;
  voice_name: string | null;
  text: string;
  language_code: string | null;
  stability: number | null;
  similarity_boost: number | null;
  style: number | null;
  use_speaker_boost: number | null;
  speed: number | null;
  audio_filename: string;
  api_response_time_ms: number | null;
  stream_duration_ms: number | null;
  created_at: string;
  label: string | null;
}

export const DEFAULT_ELEVENLABS_CONFIG: ElevenLabsConfig = {
  model: 'eleven_flash_v2_5',
  voiceId: '',
  voiceName: '',
  text: '',
  languageCode: '',
  stability: 0.5,
  similarityBoost: 0.75,
  style: 0.0,
  useSpeakerBoost: true,
  speed: 1.0,
};

// ── Inworld TTS Types ──

export interface InworldVoice {
  voiceId: string;
  name: string;
  displayName: string;
  description: string;
  langCode: string;
  tags: string[];
  source: string;
}

export interface InworldConfig {
  model: string;
  voiceId: string;
  voiceName: string;
  text: string;
  temperature: number;
  applyTextNormalization: string;
}

export interface InworldRecording {
  id: string;
  model: string;
  voice_id: string;
  voice_name: string | null;
  text: string;
  temperature: number | null;
  apply_text_normalization: string | null;
  audio_filename: string;
  api_response_time_ms: number | null;
  stream_duration_ms: number | null;
  created_at: string;
  label: string | null;
}

export const DEFAULT_INWORLD_CONFIG: InworldConfig = {
  model: 'inworld-tts-1.5-max',
  voiceId: '',
  voiceName: '',
  text: '',
  temperature: 1.0,
  applyTextNormalization: 'APPLY_TEXT_NORMALIZATION_UNSPECIFIED',
};

// ── Fish Audio TTS Types ──

export interface FishAudioVoice {
  _id: string;
  title: string;
  description: string;
  tags: string[];
  languages: string[];
  author: { _id: string; nickname: string };
  like_count: number;
  task_count: number;
}

export interface FishAudioConfig {
  model: string;
  referenceId: string;
  voiceName: string;
  text: string;
  chunkLength: number;
  normalize: boolean;
  latency: string;
  temperature: number;
  topP: number;
  speed: number;
  volume: number;
}

export interface FishAudioRecording {
  id: string;
  model: string;
  reference_id: string | null;
  voice_name: string | null;
  text: string;
  chunk_length: number | null;
  normalize: number | null;
  latency: string | null;
  temperature: number | null;
  top_p: number | null;
  speed: number | null;
  volume: number | null;
  audio_filename: string;
  api_response_time_ms: number | null;
  stream_duration_ms: number | null;
  created_at: string;
  label: string | null;
}

export const DEFAULT_FISHAUDIO_CONFIG: FishAudioConfig = {
  model: 's2-pro',
  referenceId: '',
  voiceName: '',
  text: '',
  chunkLength: 200,
  normalize: true,
  latency: 'balanced',
  temperature: 0.7,
  topP: 0.7,
  speed: 1.0,
  volume: 0,
};

// ── Gemini TTS Types ──

export interface GeminiVoice {
  name: string;
  displayName: string;
  gender: string;
  style: string;
}

export interface GeminiConfig {
  model: string;
  voiceName: string;
  voiceDisplayName: string;
  text: string;
}

export interface GeminiRecording {
  id: string;
  model: string;
  voice_name: string;
  voice_display_name: string | null;
  text: string;
  audio_filename: string;
  api_response_time_ms: number | null;
  created_at: string;
  label: string | null;
}

export const DEFAULT_GEMINI_CONFIG: GeminiConfig = {
  model: 'gemini-3.1-flash-tts-preview',
  voiceName: '',
  voiceDisplayName: '',
  text: '',
};
