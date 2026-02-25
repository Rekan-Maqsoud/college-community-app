/**
 * Firebase Realtime Database - initialisation and anonymous auth.
 *
 * Uses the modular / Web-compat API so namespaced-API deprecation
 * warnings are silenced.
 *
 * Architecture notes:
 * - Firebase RTDB is used ONLY as an ephemeral real-time caching layer.
 * - Appwrite remains the persistent source of truth for all writes.
 * - All RTDB read paths must call ensureFirebaseAuth() first because
 *   our security rules require auth != null.
 * - On the Spark (free) plan we are limited to 100 concurrent connections,
 *   so every consumer MUST detach listeners on unmount / app-background.
 */

import { getAuth, signInAnonymously } from '@react-native-firebase/auth';
import {
  getDatabase as getFirebaseDatabase,
  ref as firebaseRef,
} from '@react-native-firebase/database';

const RTDB_URL =
  'https://college-community-5800d-default-rtdb.europe-west1.firebasedatabase.app';

/* ------------------------------------------------------------------ */
/*  Anonymous auth                                                     */
/* ------------------------------------------------------------------ */

let _authPromise = null;
let _isAuthenticated = false;

const AUTH_TIMEOUT_MS = 10000;

/**
 * Silently sign in anonymously.  Safe to call repeatedly — only the
 * first invocation triggers a network request; subsequent calls return
 * the cached promise.
 */
export const ensureFirebaseAuth = () => {
  if (_isAuthenticated) return Promise.resolve(true);

  if (!_authPromise) {
    console.log('[Firebase] Starting anonymous auth attempt...');

    let timeoutId = null;
    const auth = getAuth();

    const authAttempt = signInAnonymously(auth)
      .then((result) => {
        console.log('[Firebase] ✅ Anonymous auth succeeded. uid:', result?.user?.uid);
        _isAuthenticated = true;
        if (timeoutId) clearTimeout(timeoutId);
        return true;
      })
      .catch((err) => {
        console.warn('[Firebase] ❌ signInAnonymously failed:', err?.code, err?.message);
        _authPromise = null;
        _isAuthenticated = false;
        return false;
      });

    const timeout = new Promise((resolve) => {
      timeoutId = setTimeout(() => {
        console.warn('[Firebase] ⏱ Auth timed out after', AUTH_TIMEOUT_MS, 'ms');
        resolve(false);
      }, AUTH_TIMEOUT_MS);
    });

    _authPromise = Promise.race([authAttempt, timeout]).then((result) => {
      if (!result) {
        _authPromise = null;
        _isAuthenticated = false;
        console.warn('[Firebase] Auth result: false — Firebase RTDB will be skipped');
      }
      return result;
    });
  }

  return _authPromise;
};

/**
 * Returns `true` if anonymous auth has already succeeded.
 */
export const isFirebaseReady = () => _isAuthenticated;

/* ------------------------------------------------------------------ */
/*  Database reference helpers  (modular API)                          */
/* ------------------------------------------------------------------ */

/** Cached database instance — avoids repeated init calls. */
let _db = null;

const db = () => {
  if (!_db) {
    _db = getFirebaseDatabase(undefined, RTDB_URL);
  }
  return _db;
};

/**
 * Return a ref for a specific path inside RTDB.
 */
export const dbRef = (path) => firebaseRef(db(), path);

/**
 * Return the raw database instance (needed by modular helpers like `onValue`).
 */
export { db as getDb };

/**
 * Convenience — returns the configured database URL for debugging.
 */
export const getDatabaseUrl = () => RTDB_URL;
