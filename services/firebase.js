/**
 * Firebase Realtime Database — initialisation & anonymous auth.
 *
 * This module is the single source of truth for anything Firebase in the app.
 * It lazily initialises an anonymous session the first time any consumer calls
 * `ensureFirebaseAuth()` and exposes a ready-to-use `database()` reference.
 *
 * Architecture notes
 * ─────────────────
 * • Firebase RTDB is used ONLY as an ephemeral real-time caching layer.
 * • Appwrite remains the persistent source of truth for all writes.
 * • All RTDB read paths must call `ensureFirebaseAuth()` first because our
 *   security rules require `auth != null`.
 * • On the Spark (free) plan we are limited to **100 concurrent connections**,
 *   so every consumer MUST detach listeners on unmount / app-background.
 */

import auth from '@react-native-firebase/auth';
import database from '@react-native-firebase/database';

const RTDB_URL =
  'https://college-community-5800d-default-rtdb.europe-west1.firebasedatabase.app/';

/* ------------------------------------------------------------------ */
/*  Anonymous auth                                                     */
/* ------------------------------------------------------------------ */

let _authPromise = null;
let _isAuthenticated = false;

const AUTH_TIMEOUT_MS = 10000; // 10 s — fail fast on bad networks

/**
 * Silently sign in anonymously.  Safe to call repeatedly — only the
 * first invocation triggers a network request; subsequent calls return
 * the cached promise.
 *
 * Includes a timeout so a stalled network never blocks the caller
 * indefinitely, and all rejections are caught internally so no
 * unhandled promise warnings can escape.
 *
 * @returns {Promise<boolean>} resolves `true` when authenticated,
 *   `false` on any failure (timeout, offline, Firebase error).
 */
export const ensureFirebaseAuth = () => {
  if (_isAuthenticated) return Promise.resolve(true);

  if (!_authPromise) {
    const authAttempt = auth()
      .signInAnonymously()
      .then(() => {
        _isAuthenticated = true;
        return true;
      })
      .catch(() => {
        _authPromise = null;
        _isAuthenticated = false;
        return false;
      });

    // Race against a timeout so a poor network never hangs forever
    const timeout = new Promise((resolve) => {
      setTimeout(() => resolve(false), AUTH_TIMEOUT_MS);
    });

    _authPromise = Promise.race([authAttempt, timeout]).then((result) => {
      if (!result) {
        _authPromise = null;
        _isAuthenticated = false;
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
/*  Database reference helpers                                         */
/* ------------------------------------------------------------------ */

/**
 * Returns the RTDB instance configured with the correct (non-default) URL.
 * Our database lives in europe-west1, NOT the US default, so we MUST pass
 * the URL explicitly — otherwise reads/writes silently go nowhere.
 */
const db = () => database(RTDB_URL);

/**
 * Returns the root `database()` reference configured with the correct URL.
 * Consumers should always prefer the path-specific helpers below.
 */
export const getDatabase = () => db().ref();

/**
 * Return a ref for a specific path inside RTDB.
 *
 * @param {string} path  e.g. `posts/<postId>/likeCount`
 * @returns {import('@react-native-firebase/database').FirebaseDatabaseTypes.Reference}
 */
export const dbRef = (path) => db().ref(path);

/**
 * Convenience — returns the configured database URL for debugging.
 */
export const getDatabaseUrl = () => RTDB_URL;

export { auth, database };
