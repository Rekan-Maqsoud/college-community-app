const BASE_RECONNECT_DELAY_MS = 500;
const MAX_RECONNECT_DELAY_MS = 15000;
const MAX_JITTER_MS = 700;

const normalizeAttempt = (attempt) => {
  if (!Number.isFinite(attempt)) {
    return 0;
  }

  return Math.max(0, Math.floor(attempt));
};

export const computeReconnectDelayMs = (attempt, randomFn = Math.random) => {
  const safeAttempt = normalizeAttempt(attempt);
  const exponentialDelay = Math.min(
    MAX_RECONNECT_DELAY_MS,
    BASE_RECONNECT_DELAY_MS * (2 ** safeAttempt)
  );

  const randomValue = typeof randomFn === 'function' ? randomFn() : Math.random();
  const jitter = Math.floor(Math.max(0, Math.min(1, Number(randomValue) || 0)) * MAX_JITTER_MS);

  return exponentialDelay + jitter;
};

export const hasRealtimeChannels = (realtime) => {
  if (!realtime) {
    return false;
  }

  if (realtime.channels instanceof Set) {
    return realtime.channels.size > 0;
  }

  if (Array.isArray(realtime.channels)) {
    return realtime.channels.length > 0;
  }

  return false;
};

export const isRealtimeSocketConnected = (realtime) => {
  const readyState = realtime?.socket?.readyState;
  return readyState === 0 || readyState === 1;
};

export const shouldReconnectRealtime = (realtime) => {
  if (!realtime || typeof realtime.connect !== 'function') {
    return false;
  }

  if (!hasRealtimeChannels(realtime)) {
    return false;
  }

  return !isRealtimeSocketConnected(realtime);
};

export const tryReconnectRealtime = (realtime) => {
  if (!shouldReconnectRealtime(realtime)) {
    return false;
  }

  try {
    realtime.connect();
    return true;
  } catch (error) {
    return false;
  }
};
