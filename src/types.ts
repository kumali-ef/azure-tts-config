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
  created_at: string;
  label: string | null;
}

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
};
