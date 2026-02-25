/**
 * Firebase RTDB connection manager — modular API.
 *
 * Manages active listener count and enforces the Spark-plan 100-connection
 * ceiling.  Every hook that attaches a Firebase listener MUST acquire a
 * slot via `acquireSlot()` and release it via `releaseSlot()` on unmount.
 */

import { AppState } from 'react-native';
import { dbRef, ensureFirebaseAuth, isFirebaseReady } from './firebase';
import {
  onValue as fbOnValue,
  off as fbOff,
  set as fbSet,
  update as fbUpdate,
  remove as fbRemove,
  get as fbGet,
} from '@react-native-firebase/database';
import { runTransaction as fbRunTransaction } from '@react-native-firebase/database';

/* ------------------------------------------------------------------ */
/*  Slot accounting                                                    */
/* ------------------------------------------------------------------ */

const MAX_CONNECTIONS = 85;
let _activeSlots = 0;

export const acquireSlot = () => {
  if (_activeSlots >= MAX_CONNECTIONS) return false;
  _activeSlots += 1;
  return true;
};

export const releaseSlot = () => {
  _activeSlots = Math.max(0, _activeSlots - 1);
};

export const getActiveSlotCount = () => _activeSlots;

/* ------------------------------------------------------------------ */
/*  Safe listener helpers  (modular API)                               */
/* ------------------------------------------------------------------ */

/**
 * Attach a Firebase RTDB value listener with full guard rails.
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

    const reference = dbRef(path);

    const unsubscribe = fbOnValue(
      reference,
      (snapshot) => {
        try {
          onValue(snapshot.val());
        } catch (err) {
          // swallow handler errors so the listener stays alive
        }
      },
      (error) => {
        console.warn('[Firebase] ❌ Listener error at', path, ':', error?.code, error?.message);
        cleanup();
        onFallback?.();
      },
    );

    return () => {
      cleanup();
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      } else {
        fbOff(reference, 'value');
      }
    };
  } catch (error) {
    console.warn('[Firebase] ❌ attachListener threw for path:', path, ':', error?.code, error?.message);
    cleanup();
    onFallback?.();
    return () => {};
  }
};

/**
 * One-shot read from RTDB.
 */
export const readOnce = async (path) => {
  try {
    const authed = await ensureFirebaseAuth();
    if (!authed) return null;
    const snapshot = await fbGet(dbRef(path));
    return snapshot.val();
  } catch (err) {
    console.warn('[Firebase] ❌ readOnce failed at', path, ':', err?.code, err?.message);
    return null;
  }
};

/**
 * Write a value to RTDB.  Swallows errors — RTDB is a cache.
 */
export const writeValue = async (path, value) => {
  try {
    const authed = await ensureFirebaseAuth();
    if (!authed) return;
    await fbSet(dbRef(path), value);
  } catch (err) {
    console.warn('[Firebase] ❌ writeValue failed at', path, ':', err?.code, err?.message);
  }
};

/**
 * Atomically increment a numeric counter.
 */
export const incrementValue = async (path, delta = 1) => {
  try {
    const authed = await ensureFirebaseAuth();
    if (!authed) return;
    await fbRunTransaction(dbRef(path), (current) => (current || 0) + delta);
  } catch (err) {
    console.warn('[Firebase] ❌ incrementValue failed at', path, ':', err?.code, err?.message);
  }
};

/**
 * Merge-update without overwriting siblings.
 */
export const updateValues = async (path, values) => {
  try {
    const authed = await ensureFirebaseAuth();
    if (!authed) return;
    await fbUpdate(dbRef(path), values);
  } catch (err) {
    console.warn('[Firebase] ❌ updateValues failed at', path, ':', err?.code, err?.message);
  }
};

/**
 * Remove a node from RTDB.
 */
export const removeValue = async (path) => {
  try {
    const authed = await ensureFirebaseAuth();
    if (!authed) return;
    await fbRemove(dbRef(path));
  } catch (err) {
    console.warn('[Firebase] ❌ removeValue failed at', path, ':', err?.code, err?.message);
  }
};

/* ------------------------------------------------------------------ */
/*  App-state watcher                                                  */
/* ------------------------------------------------------------------ */

let _appStateSubscription = null;
let _backgroundCallbacks = [];

export const onAppBackground = (cb) => {
  _backgroundCallbacks.push(cb);
  return () => {
    _backgroundCallbacks = _backgroundCallbacks.filter((fn) => fn !== cb);
  };
};

if (!_appStateSubscription) {
  _appStateSubscription = AppState.addEventListener('change', (nextState) => {
    if (nextState?.match(/inactive|background/)) {
      _backgroundCallbacks.forEach((cb) => {
        try { cb(); } catch (_) { /* ignore */ }
      });
    }
  });
}
