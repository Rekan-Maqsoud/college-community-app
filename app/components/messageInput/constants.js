import { moderateScale } from '../../utils/responsive';

export const MAX_INPUT_LINES = 5;
export const LINE_HEIGHT = moderateScale(20);
export const MAX_INPUT_HEIGHT = LINE_HEIGHT * MAX_INPUT_LINES;
export const GIF_SEND_COOLDOWN_MS = 300;
export const VOICE_LOCK_THRESHOLD = moderateScale(70);
export const VOICE_CANCEL_THRESHOLD = moderateScale(90);
export const VOICE_LOCK_HORIZONTAL_TOLERANCE = moderateScale(58);
export const VOICE_PRESS_RETENTION = moderateScale(120);
export const MIN_VOICE_DURATION_MS = 500;
export const VOICE_WAVE_BARS = 16;
export const VOICE_WAVE_PAYLOAD_BARS = 24;
export const VOICE_WAVE_HISTORY_LIMIT = 600;
