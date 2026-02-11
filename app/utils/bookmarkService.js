import safeStorage from './safeStorage';
import { databases, config } from '../../database/config';

const BOOKMARKS_KEY = '@bookmarked_posts';

/**
 * Get all bookmarked post IDs.
 * Reads from AsyncStorage first (fast). Falls back to empty array.
 */
export const getBookmarkedPostIds = async () => {
  try {
    const raw = await safeStorage.getItem(BOOKMARKS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

/**
 * Check if a specific post is bookmarked.
 */
export const isPostBookmarked = async (postId) => {
  const ids = await getBookmarkedPostIds();
  return ids.includes(postId);
};

/**
 * Toggle bookmark for a post. Returns the new bookmark state.
 * Writes to AsyncStorage immediately, then syncs to Appwrite in background.
 */
export const togglePostBookmark = async (postId, userId) => {
  const ids = await getBookmarkedPostIds();
  const wasBookmarked = ids.includes(postId);
  let updatedIds;

  if (wasBookmarked) {
    updatedIds = ids.filter(id => id !== postId);
  } else {
    updatedIds = [...ids, postId];
  }

  // Write to local storage immediately
  await safeStorage.setItem(BOOKMARKS_KEY, JSON.stringify(updatedIds));

  // Sync to Appwrite in background (non-blocking)
  if (userId) {
    syncBookmarksToServer(userId, updatedIds).catch(() => {});
  }

  return !wasBookmarked;
};

/**
 * Sync local bookmarks to Appwrite users collection.
 * Requires `bookmarkedPostIds` attribute on the users collection (String, size 999999).
 */
const syncBookmarksToServer = async (userId, bookmarkIds) => {
  try {
    if (!config.usersCollectionId || !userId) return;
    await databases.updateDocument(
      config.databaseId,
      config.usersCollectionId,
      userId,
      { bookmarkedPostIds: bookmarkIds }
    );
  } catch {
    // Attribute may not exist yet — silent fail
  }
};

/**
 * Restore bookmarks from server on fresh install or login.
 * Merges server bookmarks with any local ones.
 */
export const restoreBookmarksFromServer = async (userId) => {
  try {
    if (!config.usersCollectionId || !userId) return;
    const userDoc = await databases.getDocument(
      config.databaseId,
      config.usersCollectionId,
      userId
    );

    const serverIds = userDoc?.bookmarkedPostIds || [];
    if (!Array.isArray(serverIds) || serverIds.length === 0) return;

    const localIds = await getBookmarkedPostIds();
    const mergedSet = new Set([...localIds, ...serverIds]);
    const merged = [...mergedSet];

    await safeStorage.setItem(BOOKMARKS_KEY, JSON.stringify(merged));
  } catch {
    // Attribute may not exist yet — silent fail
  }
};
