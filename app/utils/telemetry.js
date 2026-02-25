/**
 * Lightweight production telemetry for performance & reliability.
 *
 * Records traces for the top critical flows:
 *   1. Auth sign-in / sign-up
 *   2. Post list fetch
 *   3. Post create
 *   4. Chat message send
 *   5. Chat message list
 *   6. Notification fetch
 *   7. Image upload
 *   8. Realtime reconnect
 *   9. Push token registration
 *  10. App cold-start
 *
 * Each trace captures: name, durationMs, success, error (if any), and optional metadata.
 *
 * In production builds the buffer can be flushed to any backend by providing
 * a custom `flushFn` via `telemetry.configure({ flushFn })`.
 * In development, entries are printed to the console when `__DEV__` is true.
 */

const MAX_BUFFER = 500;
const AUTO_FLUSH_SIZE = 50;
const SLOW_THRESHOLD_MS = 3000;

let _buffer = [];
let _flushFn = null;
let _enabled = true;

/**
 * Configure telemetry.
 * @param {Object} opts
 * @param {Function|null} opts.flushFn - async (entries[]) => void
 * @param {boolean}       opts.enabled - master switch (default true)
 */
const configure = ({ flushFn = null, enabled = true } = {}) => {
  _flushFn = typeof flushFn === 'function' ? flushFn : null;
  _enabled = enabled;
};

/**
 * Start a trace. Returns a `finish` function.
 *
 * @param {string} name  - Trace name (e.g. 'post_list_fetch').
 * @param {Object} [meta] - Optional metadata.
 * @returns {{ finish: (result?: { success?: boolean, error?: Error, meta?: Object }) => void }}
 */
const startTrace = (name, meta = {}) => {
  const start = Date.now();

  return {
    finish: ({ success = true, error = null, meta: extraMeta = {} } = {}) => {
      if (!_enabled) return;

      const durationMs = Date.now() - start;
      const entry = {
        name,
        durationMs,
        success,
        error: error ? (error.message || String(error)) : null,
        isSlow: durationMs > SLOW_THRESHOLD_MS,
        ts: new Date().toISOString(),
        ...meta,
        ...extraMeta,
      };

      _buffer.push(entry);

      if (_buffer.length > MAX_BUFFER) {
        _buffer = _buffer.slice(_buffer.length - MAX_BUFFER);
      }

      if (__DEV__) {
        const tag = entry.success ? 'OK' : 'FAIL';
        const slow = entry.isSlow ? ' [SLOW]' : '';
        console.log(`[telemetry] ${tag}${slow} ${name} ${durationMs}ms`, entry);
      }

      if (_flushFn && _buffer.length >= AUTO_FLUSH_SIZE) {
        flush();
      }
    },
  };
};

/**
 * Record a single instant event (no duration).
 */
const recordEvent = (name, meta = {}) => {
  if (!_enabled) return;

  const entry = {
    name,
    durationMs: 0,
    success: true,
    error: null,
    isSlow: false,
    ts: new Date().toISOString(),
    ...meta,
  };

  _buffer.push(entry);

  if (_buffer.length > MAX_BUFFER) {
    _buffer = _buffer.slice(_buffer.length - MAX_BUFFER);
  }
};

/**
 * Flush the buffer to the configured flushFn.
 * Returns the entries that were flushed.
 */
const flush = async () => {
  if (!_flushFn || _buffer.length === 0) return [];

  const toSend = [..._buffer];
  _buffer = [];

  try {
    await _flushFn(toSend);
  } catch {
    // Re-add to buffer on failure (best-effort)
    _buffer = [...toSend, ..._buffer].slice(-MAX_BUFFER);
  }

  return toSend;
};

/**
 * Get a snapshot of the current buffer (for debugging / dev tools).
 */
const snapshot = () => [..._buffer];

/**
 * Clear the buffer.
 */
const clear = () => {
  _buffer = [];
};

/**
 * Higher-order wrapper: instruments an async function.
 *
 *   const trackedGetPosts = telemetry.wrap('post_list_fetch', getPosts);
 *   const posts = await trackedGetPosts(filters);
 */
const wrap = (name, fn, meta = {}) => {
  return async (...args) => {
    const trace = startTrace(name, meta);
    try {
      const result = await fn(...args);
      trace.finish({ success: true });
      return result;
    } catch (error) {
      trace.finish({ success: false, error });
      throw error;
    }
  };
};

export default {
  configure,
  startTrace,
  recordEvent,
  flush,
  snapshot,
  clear,
  wrap,
};
