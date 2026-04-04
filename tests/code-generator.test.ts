import { describe, it, expect } from 'vitest';
import { generatePythonCode, generateNodeCode } from '../src/utils/code-generator';
import { TtsConfig, DEFAULT_CONFIG } from '../src/types';

const sampleConfig: TtsConfig = {
  ...DEFAULT_CONFIG,
  voiceName: 'en-US-JennyNeural',
  voiceDisplayName: 'Jenny',
  language: 'en-US',
  text: 'Hello world',
  rate: 'fast',
  pitch: 'high',
  volume: 'loud',
  style: 'cheerful',
  styleDegree: 1.5,
};

describe('generatePythonCode', () => {
  it('includes language and voice name', () => {
    const code = generatePythonCode(sampleConfig);
    expect(code).toContain('en-US-JennyNeural');
    expect(code).toContain('en-US');
  });

  it('includes azure.cognitiveservices.speech import', () => {
    const code = generatePythonCode(sampleConfig);
    expect(code).toContain('import azure.cognitiveservices.speech as speechsdk');
  });

  it('includes SSML with config params', () => {
    const code = generatePythonCode(sampleConfig);
    expect(code).toContain('rate=\\"fast\\"');
    expect(code).toContain('pitch=\\"high\\"');
    expect(code).toContain('style=\\"cheerful\\"');
  });

  it('generates minimal code when config is default', () => {
    const minimal: TtsConfig = {
      ...DEFAULT_CONFIG,
      voiceName: 'en-US-GuyNeural',
      voiceDisplayName: 'Guy',
      language: 'en-US',
      text: 'Test',
    };
    const code = generatePythonCode(minimal);
    expect(code).toContain('en-US-GuyNeural');
    expect(code).not.toContain('prosody');
  });
});

describe('generateNodeCode', () => {
  it('includes language and voice name', () => {
    const code = generateNodeCode(sampleConfig);
    expect(code).toContain('en-US-JennyNeural');
    expect(code).toContain('en-US');
  });

  it('includes microsoft-cognitiveservices-speech-sdk require', () => {
    const code = generateNodeCode(sampleConfig);
    expect(code).toContain('microsoft-cognitiveservices-speech-sdk');
  });

  it('includes SSML with config params', () => {
    const code = generateNodeCode(sampleConfig);
    expect(code).toContain('rate="fast"');
    expect(code).toContain('style="cheerful"');
  });
});
