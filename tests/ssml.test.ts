import { describe, it, expect } from 'vitest';
import { buildSsml } from '../src/utils/ssml';
import { TtsConfig, DEFAULT_CONFIG } from '../src/types';

describe('buildSsml', () => {
  it('builds minimal SSML with just voice and text', () => {
    const config: TtsConfig = {
      ...DEFAULT_CONFIG,
      voiceName: 'en-US-JennyNeural',
      language: 'en-US',
      text: 'Hello world',
    };
    const ssml = buildSsml(config);
    expect(ssml).toContain('<speak version="1.0"');
    expect(ssml).toContain('xml:lang="en-US"');
    expect(ssml).toContain('<voice name="en-US-JennyNeural">');
    expect(ssml).toContain('Hello world');
    expect(ssml).toContain('</voice>');
    expect(ssml).toContain('</speak>');
  });

  it('includes prosody when rate differs from default', () => {
    const config: TtsConfig = {
      ...DEFAULT_CONFIG,
      voiceName: 'en-US-JennyNeural',
      language: 'en-US',
      text: 'Fast speech',
      rate: 'fast',
    };
    const ssml = buildSsml(config);
    expect(ssml).toContain('<prosody');
    expect(ssml).toContain('rate="fast"');
  });

  it('includes all prosody attributes when all differ from default', () => {
    const config: TtsConfig = {
      ...DEFAULT_CONFIG,
      voiceName: 'en-US-JennyNeural',
      language: 'en-US',
      text: 'Test',
      rate: 'fast',
      pitch: 'high',
      volume: 'loud',
    };
    const ssml = buildSsml(config);
    expect(ssml).toContain('rate="fast"');
    expect(ssml).toContain('pitch="high"');
    expect(ssml).toContain('volume="loud"');
  });

  it('includes emphasis when set', () => {
    const config: TtsConfig = {
      ...DEFAULT_CONFIG,
      voiceName: 'en-US-JennyNeural',
      language: 'en-US',
      text: 'Important',
      emphasis: 'strong',
    };
    const ssml = buildSsml(config);
    expect(ssml).toContain('<emphasis level="strong">');
  });

  it('includes express-as when style is set', () => {
    const config: TtsConfig = {
      ...DEFAULT_CONFIG,
      voiceName: 'en-US-JennyNeural',
      language: 'en-US',
      text: 'Happy text',
      style: 'cheerful',
      styleDegree: 1.5,
    };
    const ssml = buildSsml(config);
    expect(ssml).toContain('xmlns:mstts=');
    expect(ssml).toContain('<mstts:express-as style="cheerful" styledegree="1.5">');
  });

  it('includes role in express-as when set', () => {
    const config: TtsConfig = {
      ...DEFAULT_CONFIG,
      voiceName: 'en-US-JennyNeural',
      language: 'en-US',
      text: 'News',
      style: 'cheerful',
      styleDegree: 1.0,
      role: 'narrator',
    };
    const ssml = buildSsml(config);
    expect(ssml).toContain('role="narrator"');
  });

  it('includes break when breakValue is set with strength', () => {
    const config: TtsConfig = {
      ...DEFAULT_CONFIG,
      voiceName: 'en-US-JennyNeural',
      language: 'en-US',
      text: 'After pause',
      breakType: 'strength',
      breakValue: 'strong',
    };
    const ssml = buildSsml(config);
    expect(ssml).toContain('<break strength="strong"/>');
  });

  it('includes break when breakValue is set with duration', () => {
    const config: TtsConfig = {
      ...DEFAULT_CONFIG,
      voiceName: 'en-US-JennyNeural',
      language: 'en-US',
      text: 'After pause',
      breakType: 'duration',
      breakValue: '500ms',
    };
    const ssml = buildSsml(config);
    expect(ssml).toContain('<break time="500ms"/>');
  });

  it('emits a custom percentage rate verbatim', () => {
    const config: TtsConfig = {
      ...DEFAULT_CONFIG,
      voiceName: 'en-US-JennyNeural',
      language: 'en-US',
      text: 'Faster',
      rate: '+20%',
    };
    const ssml = buildSsml(config);
    expect(ssml).toContain('<prosody rate="+20%">');
  });

  it('emits a custom multiplier rate verbatim', () => {
    const config: TtsConfig = {
      ...DEFAULT_CONFIG,
      voiceName: 'en-US-JennyNeural',
      language: 'en-US',
      text: 'Faster',
      rate: '1.5',
    };
    const ssml = buildSsml(config);
    expect(ssml).toContain('rate="1.5"');
  });

  it('emits custom pitch and volume values verbatim', () => {
    const config: TtsConfig = {
      ...DEFAULT_CONFIG,
      voiceName: 'en-US-JennyNeural',
      language: 'en-US',
      text: 'Test',
      pitch: '+50Hz',
      volume: '-6dB',
    };
    const ssml = buildSsml(config);
    expect(ssml).toContain('pitch="+50Hz"');
    expect(ssml).toContain('volume="-6dB"');
  });

  it('omits prosody when rate is a custom-but-empty value', () => {
    const config: TtsConfig = {
      ...DEFAULT_CONFIG,
      voiceName: 'en-US-JennyNeural',
      language: 'en-US',
      text: 'Plain text',
      rate: '',
    };
    const ssml = buildSsml(config);
    expect(ssml).not.toContain('rate=');
    expect(ssml).not.toContain('<prosody');
  });

  it('trims whitespace around a custom prosody value', () => {
    const config: TtsConfig = {
      ...DEFAULT_CONFIG,
      voiceName: 'en-US-JennyNeural',
      language: 'en-US',
      text: 'Test',
      rate: ' +20% ',
    };
    const ssml = buildSsml(config);
    expect(ssml).toContain('rate="+20%"');
  });

  it('omits prosody element when all values are default', () => {
    const config: TtsConfig = {
      ...DEFAULT_CONFIG,
      voiceName: 'en-US-JennyNeural',
      language: 'en-US',
      text: 'Plain text',
    };
    const ssml = buildSsml(config);
    expect(ssml).not.toContain('<prosody');
  });

  it('omits express-as when no style or role set', () => {
    const config: TtsConfig = {
      ...DEFAULT_CONFIG,
      voiceName: 'en-US-JennyNeural',
      language: 'en-US',
      text: 'Plain text',
    };
    const ssml = buildSsml(config);
    expect(ssml).not.toContain('express-as');
  });
});
