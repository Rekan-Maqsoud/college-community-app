/**
 * Online status utility — determines if a user is online or returns
 * a human-readable "last seen" string.
 *
 * A user is considered "online" if their lastSeen timestamp is within
 * the last 2 minutes (ONLINE_THRESHOLD_MS).
 */

const ONLINE_THRESHOLD_MS = 2 * 60 * 1000; // 2 minutes

/**
 * Returns true when the user should be shown as online.
 * @param {string|null} lastSeen  ISO-8601 timestamp or null
 * @returns {boolean}
 */
export const isUserOnline = (lastSeen) => {
  if (!lastSeen) return false;
  const diff = Date.now() - new Date(lastSeen).getTime();
  return diff < ONLINE_THRESHOLD_MS;
};

/**
 * Returns a translated "last seen …" string, or null when the user is
 * online (callers should show the online label instead).
 *
 * @param {string|null} lastSeen  ISO-8601 timestamp or null
 * @param {Function}    t         translation function
 * @returns {string|null}
 */
export const getLastSeenText = (lastSeen, t) => {
  if (!lastSeen) return null;
  if (isUserOnline(lastSeen)) return null; // caller shows "Online"

  const diffMs = Date.now() - new Date(lastSeen).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return t('chats.lastSeenJustNow');
  if (diffMins < 60) return t('chats.lastSeenMinutes').replace('{count}', diffMins);
  if (diffHours < 24) return t('chats.lastSeenHours').replace('{count}', diffHours);
  if (diffDays < 7) return t('chats.lastSeenDays').replace('{count}', diffDays);

  const date = new Date(lastSeen);
  return t('chats.lastSeenDate').replace('{date}', date.toLocaleDateString());
};
