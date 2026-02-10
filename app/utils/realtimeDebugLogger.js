const MAX_ENTRIES = 200;

const shouldLog = () => {
  if (typeof globalThis === 'undefined') {
    return false;
  }

  return globalThis.__ENABLE_REALTIME_TRACE === true || __DEV__ === true;
};

const getStore = () => {
  if (typeof globalThis === 'undefined') {
    return [];
  }

  if (!globalThis.__realtimeDebugLog) {
    globalThis.__realtimeDebugLog = [];
  }

  return globalThis.__realtimeDebugLog;
};

const append = (level, message, meta) => {
  if (!shouldLog()) {
    return;
  }

  const store = getStore();
  store.push({
    ts: new Date().toISOString(),
    level,
    message,
    meta: meta || null,
  });

  if (store.length > MAX_ENTRIES) {
    store.splice(0, store.length - MAX_ENTRIES);
  }
};

const snapshot = () => {
  const store = getStore();
  return Array.isArray(store) ? [...store] : [];
};

const clear = () => {
  const store = getStore();
  if (Array.isArray(store)) {
    store.length = 0;
  }
};

export default {
  trace: (message, meta) => append('trace', message, meta),
  warn: (message, meta) => append('warn', message, meta),
  error: (message, meta) => append('error', message, meta),
  snapshot,
  clear,
};
