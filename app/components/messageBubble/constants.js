import { borderRadius } from '../../theme/designTokens';

export const SWIPE_THRESHOLD = 60;
export const VOICE_VISUAL_BARS = 20;
export const sharedVoiceControllers = new Map();

export const buildSeededWaveform = (seedText = '', bars = VOICE_VISUAL_BARS) => {
  let seed = 0;
  for (let index = 0; index < seedText.length; index += 1) {
    seed = (seed * 31 + seedText.charCodeAt(index)) >>> 0;
  }

  return Array.from({ length: bars }, (_, index) => {
    seed = (seed * 1664525 + 1013904223 + index) >>> 0;
    const randomValue = (seed % 1000) / 1000;
    return Number((0.18 + randomValue * 0.72).toFixed(3));
  });
};

export const normalizeWaveformSamples = (samples, bars = VOICE_VISUAL_BARS, seedText = '') => {
  const source = (Array.isArray(samples) ? samples : [])
    .map((sample) => Number(sample))
    .filter((sample) => Number.isFinite(sample))
    .map((sample) => Math.max(0.08, Math.min(1, sample)));

  if (source.length === 0) {
    return buildSeededWaveform(seedText, bars);
  }

  return Array.from({ length: bars }, (_, index) => {
    const start = Math.floor((index * source.length) / bars);
    const end = Math.max(start + 1, Math.floor(((index + 1) * source.length) / bars));
    const segment = source.slice(start, end);
    const peak = Math.max(...segment);
    const average = segment.reduce((sum, value) => sum + value, 0) / Math.max(1, segment.length);
    const signal = Math.max(0.08, Math.min(1, (peak * 0.78) + (average * 0.22)));
    return Number(signal.toFixed(3));
  });
};

export const getBubbleStyleRadius = (chatSettings) => {
  const configuredRadius = Number(chatSettings?.bubbleRadius);
  if (Number.isFinite(configuredRadius)) {
    return { borderRadius: Math.max(4, Math.min(28, configuredRadius)) };
  }

  switch (chatSettings?.bubbleStyle) {
    case 'minimal':
      return { borderRadius: borderRadius.sm };
    case 'sharp':
      return { borderRadius: borderRadius.xs };
    case 'bubble':
      return { borderRadius: borderRadius.xxl || 24 };
    case 'classic':
      return { borderRadius: borderRadius.md };
    default:
      return { borderRadius: borderRadius.lg };
  }
};
