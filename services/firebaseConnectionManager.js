/**
 * Firebase RTDB connection manager.
 *
 * Manages active listener count and enforces the Spark-plan 100-connection
 * ceiling.  Every hook that attaches a Firebase listener MUST acquire a
 * slot via `acquireSlot()` and release it via `releaseSlot()` on unmount.
 *
 * When all slots are taken, `acquireSlot` returns `false` so the caller
 * can silently fall back to Appwrite polling / static reads.
 */

import { AppState } from 'react-native';
import { dbRef, ensureFirebaseAuth, isFirebaseReady } from './firebase';

/* ------------------------------------------------------------------ */
/*  Slot accounting                                                    */
/* ------------------------------------------------------------------ */

const MAX_CONNECTIONS = 85; // leave headroom below the hard 100-limit
let _activeSlots = 0;

/**
 * Try to reserve a Firebase connection slot.
 * @returns {boolean} `true` if a slot was reserved, `false` if limit reached.
 */
export const acquireSlot = () => {
  if (_activeSlots >= MAX_CONNECTIONS) return false;
  _activeSlots += 1;
  return true;
};

/**
 * Release a previously acquired slot.
 */
export const releaseSlot = () => {
  _activeSlots = Math.max(0, _activeSlots - 1);
};

/**
 * Current number of active connections (for debugging / telemetry).
 */
export const getActiveSlotCount = () => _activeSlots;

/* ------------------------------------------------------------------ */
/*  Safe listener helpers                                              */
/* ------------------------------------------------------------------ */

/**
 * Attach a Firebase RTDB value listener with full guard rails:
 *   1. Ensures anonymous auth first.
 *   2. Acquires a connection slot (returns noop if limit hit).
 *   3. On any Firebase error, invokes the optional `onFallback` so the
 *      caller can switch to Appwrite.
 *   4. Returns an `unsubscribe` function that also releases the slot.
 *
 * @param {string}   path        RTDB path to listen on
 * @param {Function} onValue     called with the snapshot value on each change
 * @param {Function} [onFallback] called when Firebase is unavailable
 * @returns {Function} unsubscribe — always safe to call, even if slot failed
 */
export const attachListener = async (path, onValue, onFallback) => {
  let released = false;

  const cleanup = () => {
    if (!released) {
      released = true;
      releaseSlot();
    }
  };

  try {
    const authed = await ensureFirebaseAuth();
    if (!authed) {
      onFallback?.();
      return () => {};
    }

    if (!acquireSlot()) {
      onFallback?.();
      return () => {};
    }

    const ref = dbRef(path);

    const valueHandler = (snapshot) => {
      try {
        onValue(snapshot.val());
      } catch (_) {
        // swallow handler errors so the listener stays alive
      }
    };

    const errorHandler = (error) => {
      cleanup();
      ref.off('value', valueHandler);
      onFallback?.();
    };

    ref.on('value', valueHandler, errorHandler);

    return () => {
      cleanup();
      ref.off('value', valueHandler);
    };
  } catch (error) {
    cleanup();
    onFallback?.();
    return () => {};
  }
};

/**
 * One-shot read from RTDB.  Falls back to `null` on failure.
 *
 * @param {string} path
 * @returns {Promise<any>}
 */
export const readOnce = async (path) => {
  try {
    const authed = await ensureFirebaseAuth();
    if (!authed) return null;

    const snapshot = await dbRef(path).once('value');
    return snapshot.val();
  } catch (_) {
    return null;
  }
};

/**
 * Write a value to RTDB.  Swallows errors silently — RTDB is a cache,
 * never the source of truth.
 *
 * @param {string} path
 * @param {any}    value
 */
export const writeValue = async (path, value) => {
  try {
    const authed = await ensureFirebaseAuth();
    if (!authed) return;

    await dbRef(path).set(value);
  } catch (_) {
    // Swallow — Appwrite is the primary store
  }
};

/**
 * Atomically increment a numeric counter in RTDB.
 *
 * @param {string} path
 * @param {number} delta  positive or negative integer
 */
export const incrementValue = async (path, delta = 1) => {
  try {
    const authed = await ensureFirebaseAuth();
    if (!authed) return;

    const ref = dbRef(path);
    await ref.transaction((current) => (current || 0) + delta);
  } catch (_) {
    // Swallow
  }
};

/**
 * Merge-update multiple children at a path without overwriting siblings.
 * This is critical for `posts/{postId}` where we store likeCount,
 * replyCount, viewCount under a single node — we only want to touch
 * the key being updated.
 *
 * @param {string} path
 * @param {Object} values  e.g. { likeCount: 5 }
 */
export const updateValues = async (path, values) => {
  try {
    const authed = await ensureFirebaseAuth();
    if (!authed) return;

    await dbRef(path).update(values);
  } catch (_) {
    // Swallow — Appwrite is the primary store
  }
};

/**
 * Remove a node from RTDB.
 *
 * @param {string} path
 */
export const removeValue = async (path) => {
  try {
    const authed = await ensureFirebaseAuth();
    if (!authed) return;

    await dbRef(path).remove();
  } catch (_) {
    // Swallow
  }
};

/* ------------------------------------------------------------------ */
/*  App-state watcher                                                  */
/* ------------------------------------------------------------------ */

let _appStateSubscription = null;
let _backgroundCallbacks = [];

/**
 * Register a callback to be invoked when the app moves to background.
 * Useful for globally detaching all listeners in one sweep.
 *
 * @param {Function} cb
 * @returns {Function} unregister
 */
export const onAppBackground = (cb) => {
  _backgroundCallbacks.push(cb);
  return () => {
    _backgroundCallbacks = _backgroundCallbacks.filter((fn) => fn !== cb);
  };
};

// Initialise AppState listener once
if (!_appStateSubscription) {
  _appStateSubscription = AppState.addEventListener('change', (nextState) => {
    if (nextState?.match(/inactive|background/)) {
      _backgroundCallbacks.forEach((cb) => {
        try {
          cb();
        } catch (_) {
          // ignore
        }
      });
    }
  });
}
