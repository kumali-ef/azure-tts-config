import type { TtsConfig } from '../types';

/**
 * A prosody value overrides the default when it is non-empty and not the
 * `medium` no-op level. Custom values (e.g. `+20%`, `1.5`, `-6dB`) pass through
 * verbatim; Azure validates them authoritatively.
 */
function isProsodyActive(value: string): boolean {
  const trimmed = value.trim();
  return trimmed !== '' && trimmed !== 'medium';
}

export function buildSsml(config: TtsConfig): string {
  const hasStyle = config.style !== '';
  const hasRole = config.role !== '';
  const hasExpressAs = hasStyle || hasRole;
  const hasProsody =
    isProsodyActive(config.rate) ||
    isProsodyActive(config.pitch) ||
    isProsodyActive(config.volume);
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
    if (isProsodyActive(config.rate)) attrs.push(`rate="${config.rate.trim()}"`);
    if (isProsodyActive(config.pitch)) attrs.push(`pitch="${config.pitch.trim()}"`);
    if (isProsodyActive(config.volume)) attrs.push(`volume="${config.volume.trim()}"`);
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
