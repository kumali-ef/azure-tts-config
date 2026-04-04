import { TtsConfig } from '../types';

export function buildSsml(config: TtsConfig): string {
  const hasStyle = config.style !== '';
  const hasRole = config.role !== '';
  const hasExpressAs = hasStyle || hasRole;
  const hasProsody =
    config.rate !== 'medium' ||
    config.pitch !== 'medium' ||
    config.volume !== 'medium';
  const hasEmphasis = config.emphasis !== '' && config.emphasis !== 'none';
  const hasBreak = config.breakValue !== '';

  const msttsNs = hasExpressAs ? ' xmlns:mstts="https://www.w3.org/2001/mstts"' : '';

  let innerContent = config.text;

  // Wrap with emphasis if set
  if (hasEmphasis) {
    innerContent = `<emphasis level="${config.emphasis}">${innerContent}</emphasis>`;
  }

  // Prepend break if set
  if (hasBreak) {
    if (config.breakType === 'duration') {
      innerContent = `<break time="${config.breakValue}"/>${innerContent}`;
    } else {
      innerContent = `<break strength="${config.breakValue}"/>${innerContent}`;
    }
  }

  // Wrap with prosody if any prosody values differ from default
  if (hasProsody) {
    const attrs: string[] = [];
    if (config.rate !== 'medium') attrs.push(`rate="${config.rate}"`);
    if (config.pitch !== 'medium') attrs.push(`pitch="${config.pitch}"`);
    if (config.volume !== 'medium') attrs.push(`volume="${config.volume}"`);
    innerContent = `<prosody ${attrs.join(' ')}>${innerContent}</prosody>`;
  }

  // Wrap with express-as if style or role is set
  if (hasExpressAs) {
    const attrs: string[] = [];
    if (hasStyle) {
      attrs.push(`style="${config.style}"`);
      attrs.push(`styledegree="${config.styleDegree}"`);
    }
    if (hasRole) {
      attrs.push(`role="${config.role}"`);
    }
    innerContent = `<mstts:express-as ${attrs.join(' ')}>${innerContent}</mstts:express-as>`;
  }

  return `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis"${msttsNs} xml:lang="${config.language}"><voice name="${config.voiceName}">${innerContent}</voice></speak>`;
}
