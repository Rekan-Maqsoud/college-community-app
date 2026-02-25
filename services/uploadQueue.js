/**
 * Centralized upload queue with exponential-backoff retry.
 *
 * Supports image (ImgBB), file (Appwrite Storage), and voice uploads.
 * Each upload is tracked with a state machine:
 *   pending → uploading → success | failed (retryable) | failed (permanent)
 *
 * Usage:
 *   import uploadQueue from '../services/uploadQueue';
 *   const item = uploadQueue.enqueue({ type: 'image', payload: { uri } });
 *   uploadQueue.onUpdate(item.id, (status) => { ... });
 */

const MAX_RETRIES = 4;
const BASE_DELAY_MS = 1000;
const MAX_DELAY_MS = 30000;

const UPLOAD_STATUS = {
  PENDING: 'pending',
  UPLOADING: 'uploading',
  SUCCESS: 'success',
  RETRYING: 'retrying',
  FAILED: 'failed',
};

let _nextId = 1;
const _queue = new Map();
const _listeners = new Map();
let _processing = false;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const backoffDelay = (attempt) =>
  Math.min(MAX_DELAY_MS, BASE_DELAY_MS * Math.pow(2, attempt));

const isTransientError = (error) => {
  const msg = String(error?.message || '').toLowerCase();
  return (
    msg.includes('network') ||
    msg.includes('timeout') ||
    msg.includes('fetch') ||
    msg.includes('econnreset') ||
    msg.includes('502') ||
    msg.includes('503') ||
    msg.includes('429')
  );
};

const notifyListeners = (id, item) => {
  const fns = _listeners.get(id);
  if (fns) {
    fns.forEach((fn) => {
      try {
        fn({ ...item });
      } catch {
        // listener error should not break queue
      }
    });
  }
};

const processItem = async (item) => {
  item.status = UPLOAD_STATUS.UPLOADING;
  item.attempts += 1;
  notifyListeners(item.id, item);

  try {
    const result = await item.uploadFn(item.payload);
    item.status = UPLOAD_STATUS.SUCCESS;
    item.result = result;
    notifyListeners(item.id, item);
  } catch (error) {
    if (isTransientError(error) && item.attempts < MAX_RETRIES) {
      item.status = UPLOAD_STATUS.RETRYING;
      item.lastError = error;
      notifyListeners(item.id, item);
      const waitMs = backoffDelay(item.attempts);
      await delay(waitMs);
      await processItem(item);
    } else {
      item.status = UPLOAD_STATUS.FAILED;
      item.lastError = error;
      notifyListeners(item.id, item);
    }
  }
};

const processQueue = async () => {
  if (_processing) return;
  _processing = true;

  try {
    for (const [, item] of _queue) {
      if (item.status === UPLOAD_STATUS.PENDING) {
        await processItem(item);
      }
    }
  } finally {
    _processing = false;
  }

  // Check for any new items added while processing
  const hasPending = [..._queue.values()].some(
    (it) => it.status === UPLOAD_STATUS.PENDING
  );
  if (hasPending) {
    processQueue();
  }
};

/**
 * Enqueue an upload.
 *
 * @param {Object}   opts
 * @param {string}   opts.type       - 'image' | 'file' | 'voice' | 'custom'
 * @param {Object}   opts.payload    - Data passed to the upload function.
 * @param {Function} opts.uploadFn   - Async (payload) => result. The actual upload call.
 * @param {Object}   [opts.meta]     - Arbitrary metadata (chatId, postId, etc.).
 * @returns {{ id: number, status: string }}
 */
const enqueue = ({ type, payload, uploadFn, meta = {} }) => {
  if (typeof uploadFn !== 'function') {
    throw new Error('uploadFn is required');
  }

  const id = _nextId++;
  const item = {
    id,
    type,
    payload,
    uploadFn,
    meta,
    status: UPLOAD_STATUS.PENDING,
    attempts: 0,
    result: null,
    lastError: null,
    createdAt: Date.now(),
  };

  _queue.set(id, item);

  // Kick off processing (non-blocking)
  Promise.resolve().then(processQueue);

  return { id, status: item.status };
};

/**
 * Register a listener for status changes on a specific upload.
 * Returns an unsubscribe function.
 */
const onUpdate = (id, fn) => {
  if (!_listeners.has(id)) {
    _listeners.set(id, new Set());
  }
  _listeners.get(id).add(fn);

  return () => {
    const fns = _listeners.get(id);
    if (fns) {
      fns.delete(fn);
      if (fns.size === 0) _listeners.delete(id);
    }
  };
};

/**
 * Manually retry a failed upload.
 */
const retry = (id) => {
  const item = _queue.get(id);
  if (!item || item.status !== UPLOAD_STATUS.FAILED) return false;
  item.status = UPLOAD_STATUS.PENDING;
  item.attempts = 0;
  item.lastError = null;
  Promise.resolve().then(processQueue);
  return true;
};

/**
 * Cancel / remove an upload from the queue.
 */
const cancel = (id) => {
  _queue.delete(id);
  _listeners.delete(id);
};

/**
 * Get current status snapshot for all items (useful for UI).
 */
const getAll = () => [..._queue.values()].map((it) => ({ ...it }));

/**
 * Get status of a single upload.
 */
const getStatus = (id) => {
  const item = _queue.get(id);
  return item ? { ...item } : null;
};

/**
 * Remove completed / failed items older than `maxAge` ms (default 5 min).
 */
const prune = (maxAge = 5 * 60 * 1000) => {
  const now = Date.now();
  for (const [id, item] of _queue) {
    if (
      (item.status === UPLOAD_STATUS.SUCCESS || item.status === UPLOAD_STATUS.FAILED) &&
      now - item.createdAt > maxAge
    ) {
      _queue.delete(id);
      _listeners.delete(id);
    }
  }
};

export { UPLOAD_STATUS };

export default {
  enqueue,
  onUpdate,
  retry,
  cancel,
  getAll,
  getStatus,
  prune,
  UPLOAD_STATUS,
};
