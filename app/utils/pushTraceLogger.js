/**
 * Push Notification Trace Logger
 *
 * Centralized, null-safe logger for tracing the entire push notification
 * lifecycle. All output uses the [PUSH_TRACE] prefix for easy filtering
 * in adb logcat:
 *
 *   adb logcat -s ReactNativeJS | grep "PUSH_TRACE"
 *
 * Phases:
 *   1 - ORIGIN:  Message/document creation, payload assembly
 *   2 - TRANSIT: Expo Push API request/response, token lookup
 *   3 - DEVICE:  OS-level notification arrival (foreground handler)
 *   4 - APP:     In-app listener callbacks (received + response)
 *   0 - BOOT:    Token registration, permission checks, config validation
 */

const PREFIX = '[PUSH_TRACE]';

const safeStringify = (obj) => {
  try {
    if (obj === null || obj === undefined) return 'null';
    if (typeof obj === 'string') return obj;
    return JSON.stringify(obj, (key, value) => {
      if (value instanceof Error) {
        return {
          message: value?.message || 'unknown',
          name: value?.name || 'Error',
          stack: value?.stack?.split('\n')?.slice(0, 3)?.join(' | ') || 'no stack',
        };
      }
      return value;
    }, 2);
  } catch (e) {
    return `[stringify-error: ${e?.message || 'unknown'}]`;
  }
};

const timestamp = () => {
  try {
    return new Date().toISOString();
  } catch {
    return 'no-timestamp';
  }
};

const PHASE_LABELS = {
  0: 'BOOT',
  1: 'ORIGIN',
  2: 'TRANSIT',
  3: 'DEVICE',
  4: 'APP',
};

/**
 * Core trace function. All other helpers delegate here.
 * @param {number} phase - 0=BOOT, 1=ORIGIN, 2=TRANSIT, 3=DEVICE, 4=APP
 * @param {string} tag - Short label for the log point (e.g. 'sendMessage')
 * @param {string} message - Human-readable description
 * @param {*} [data] - Optional data payload (safely stringified)
 */
const trace = (phase, tag, message, data) => {
  try {
    const phaseLabel = PHASE_LABELS[phase] || `P${phase}`;
    const ts = timestamp();
    const dataStr = data !== undefined ? ` | DATA: ${safeStringify(data)}` : '';
    const line = `${PREFIX} [${phaseLabel}] [${ts}] [${tag}] ${message}${dataStr}`;
    // eslint-disable-next-line no-console
    console.log(line);
  } catch {
    // Safety: never crash the app from a log call
  }
};

/**
 * Log a potential problem (still uses console.log for adb logcat consistency).
 */
const traceWarn = (phase, tag, message, data) => {
  try {
    const phaseLabel = PHASE_LABELS[phase] || `P${phase}`;
    const ts = timestamp();
    const dataStr = data !== undefined ? ` | DATA: ${safeStringify(data)}` : '';
    const line = `${PREFIX} [${phaseLabel}] [${ts}] [WARN] [${tag}] ${message}${dataStr}`;
    // eslint-disable-next-line no-console
    console.warn(line);
  } catch {
    // Safety
  }
};

/**
 * Log an error with full context.
 */
const traceError = (phase, tag, message, error, extraData) => {
  try {
    const phaseLabel = PHASE_LABELS[phase] || `P${phase}`;
    const ts = timestamp();
    const errStr = safeStringify(error);
    const extraStr = extraData !== undefined ? ` | EXTRA: ${safeStringify(extraData)}` : '';
    const line = `${PREFIX} [${phaseLabel}] [${ts}] [ERROR] [${tag}] ${message} | ERR: ${errStr}${extraStr}`;
    // eslint-disable-next-line no-console
    console.error(line);
  } catch {
    // Safety
  }
};

// ── Convenience helpers per phase ──────────────────────────────

const boot = (tag, message, data) => trace(0, tag, message, data);
const bootWarn = (tag, message, data) => traceWarn(0, tag, message, data);
const bootError = (tag, message, error, extra) => traceError(0, tag, message, error, extra);

const origin = (tag, message, data) => trace(1, tag, message, data);
const originWarn = (tag, message, data) => traceWarn(1, tag, message, data);
const originError = (tag, message, error, extra) => traceError(1, tag, message, error, extra);

const transit = (tag, message, data) => trace(2, tag, message, data);
const transitWarn = (tag, message, data) => traceWarn(2, tag, message, data);
const transitError = (tag, message, error, extra) => traceError(2, tag, message, error, extra);

const device = (tag, message, data) => trace(3, tag, message, data);
const deviceWarn = (tag, message, data) => traceWarn(3, tag, message, data);
const deviceError = (tag, message, error, extra) => traceError(3, tag, message, error, extra);

const app = (tag, message, data) => trace(4, tag, message, data);
const appWarn = (tag, message, data) => traceWarn(4, tag, message, data);
const appError = (tag, message, error, extra) => traceError(4, tag, message, error, extra);

/**
 * Dump a full diagnostic summary. Call once at boot to verify config.
 */
const dumpConfig = (configObj) => {
  boot('CONFIG_DUMP', '=== PUSH NOTIFICATION CONFIG AUDIT ===');
  try {
    const checks = {
      hasProjectId: !!configObj?.projectId,
      projectId: configObj?.projectId || 'MISSING',
      hasDatabaseId: !!configObj?.databaseId,
      hasPushTokensCollection: !!configObj?.pushTokensCollectionId,
      pushTokensCollectionId: configObj?.pushTokensCollectionId || 'MISSING',
      hasChatsCollection: !!configObj?.chatsCollectionId,
      hasMessagesCollection: !!configObj?.messagesCollectionId,
    };
    boot('CONFIG_DUMP', 'Appwrite config validation', checks);

    // Check for known issues
    if (!configObj?.pushTokensCollectionId) {
      bootWarn('CONFIG_DUMP', 'CRITICAL: pushTokensCollectionId is not configured - push tokens cannot be stored/retrieved');
    }
    if (!configObj?.chatsCollectionId) {
      bootWarn('CONFIG_DUMP', 'CRITICAL: chatsCollectionId is not configured - cannot fetch participants for push');
    }
  } catch (e) {
    bootError('CONFIG_DUMP', 'Failed to dump config', e);
  }
  boot('CONFIG_DUMP', '=== END CONFIG AUDIT ===');
};

export default {
  trace,
  traceWarn,
  traceError,
  boot,
  bootWarn,
  bootError,
  origin,
  originWarn,
  originError,
  transit,
  transitWarn,
  transitError,
  device,
  deviceWarn,
  deviceError,
  app,
  appWarn,
  appError,
  dumpConfig,
  safeStringify,
};
