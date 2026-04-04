import { TtsConfig } from '../types';
import { buildSsml } from './ssml';

export function generatePythonCode(config: TtsConfig): string {
  const ssml = buildSsml(config);
  const escapedSsml = ssml.replace(/"/g, '\\"');

  return `import azure.cognitiveservices.speech as speechsdk

# Azure Speech Service configuration
speech_config = speechsdk.SpeechConfig(
    subscription="YOUR_SUBSCRIPTION_KEY",
    region="YOUR_REGION"
)

# Voice: ${config.voiceDisplayName} (${config.language})
speech_config.speech_synthesis_voice_name = "${config.voiceName}"

# SSML with all parameters
ssml = "${escapedSsml}"

# Synthesize speech
synthesizer = speechsdk.SpeechSynthesizer(speech_config=speech_config)
result = synthesizer.speak_ssml_async(ssml).get()

if result.reason == speechsdk.ResultReason.SynthesizingAudioCompleted:
    print("Speech synthesized successfully.")
elif result.reason == speechsdk.ResultReason.Canceled:
    cancellation = result.cancellation_details
    print(f"Speech synthesis canceled: {cancellation.reason}")
    if cancellation.error_details:
        print(f"Error details: {cancellation.error_details}")
`;
}

export function generateNodeCode(config: TtsConfig): string {
  const ssml = buildSsml(config);
  const escapedSsml = ssml.replace(/`/g, '\\`').replace(/\$/g, '\\$');

  return `const sdk = require("microsoft-cognitiveservices-speech-sdk");

// Azure Speech Service configuration
const speechConfig = sdk.SpeechConfig.fromSubscription(
  "YOUR_SUBSCRIPTION_KEY",
  "YOUR_REGION"
);

// Voice: ${config.voiceDisplayName} (${config.language})
speechConfig.speechSynthesisVoiceName = "${config.voiceName}";

// SSML with all parameters
const ssml = \`${escapedSsml}\`;

// Synthesize speech
const synthesizer = new sdk.SpeechSynthesizer(speechConfig);
synthesizer.speakSsmlAsync(
  ssml,
  (result) => {
    if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
      console.log("Speech synthesized successfully.");
    } else {
      console.error("Speech synthesis canceled:", result.errorDetails);
    }
    synthesizer.close();
  },
  (err) => {
    console.error("Error:", err);
    synthesizer.close();
  }
);
`;
}
