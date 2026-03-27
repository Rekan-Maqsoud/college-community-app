/**
 * guestUtils.js
 * Central utility for guest role checks and permission logic.
 * All role-based decisions should flow through here.
 */

/**
 * Returns true if the given user object has the 'guest' role.
 * @param {Object|null} user
 * @returns {boolean}
 */
export const isGuest = (user) => {
  if (!user || typeof user !== 'object') return false;
  return String(user.role || '').trim().toLowerCase() === 'guest';
};

/**
 * Returns true if the given user object has a student or teacher role.
 * @param {Object|null} user
 * @returns {boolean}
 */
export const isStudent = (user) => {
  if (!user || typeof user !== 'object') return false;
  const role = String(user.role || 'student').trim().toLowerCase();
  return role === 'student' || role === 'teacher';
};

// ---------------------------------------------------------------------------
// Rate limit constants — stricter than the student defaults
// ---------------------------------------------------------------------------
export const GUEST_POST_LIMIT_PER_DAY = 1;

export const GUEST_FOLLOW_RATE_LIMIT = {
  action: 'follow_user',
  maxActions: 4,
  windowMs: 60 * 1000, // 1 minute
};

export const GUEST_POST_RATE_LIMIT = {
  action: 'create_post',
  maxActions: 1,
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
};

export const GUEST_COMMENT_RATE_LIMIT = {
  action: 'create_reply',
  maxActions: 3,
  windowMs: 60 * 1000, // 1 minute
};

// ---------------------------------------------------------------------------
// Daily post limit helpers
// ---------------------------------------------------------------------------

/**
 * Parse guest daily post tracking from the profileViews JSON string.
 * @param {string|null} profileViews  – JSON string stored on user document
 * @returns {{ lastPostDate: string|null, postCountToday: number }}
 */
export const parseGuestPostTracking = (profileViews) => {
  try {
    const parsed = JSON.parse(profileViews || '{}');
    return {
      lastPostDate: parsed.guestLastPostDate || null,
      postCountToday: Number(parsed.guestPostCountToday) || 0,
    };
  } catch {
    return { lastPostDate: null, postCountToday: 0 };
  }
};

/**
 * Returns true if the guest has already used their daily post allowance.
 * @param {string|null} profileViews  – JSON string stored on user document
 * @returns {boolean}
 */
export const hasGuestPostedToday = (profileViews) => {
  const { lastPostDate, postCountToday } = parseGuestPostTracking(profileViews);
  if (!lastPostDate) return false;

  // Compare against today's date (local) in YYYY-MM-DD format
  const today = new Date().toISOString().slice(0, 10);
  return lastPostDate === today && postCountToday >= GUEST_POST_LIMIT_PER_DAY;
};

/**
 * Build the updated profileViews JSON string after a successful guest post.
 * Merges with any existing data (socialLinks, visibility, etc.).
 * @param {string|null} existingProfileViews
 * @returns {string}
 */
export const buildUpdatedGuestPostTracking = (existingProfileViews) => {
  let existing = {};
  try {
    existing = JSON.parse(existingProfileViews || '{}');
  } catch { /* ignore */ }

  const today = new Date().toISOString().slice(0, 10);
  const isSameDay = existing.guestLastPostDate === today;

  return JSON.stringify({
    ...existing,
    guestLastPostDate: today,
    guestPostCountToday: isSameDay ? (Number(existing.guestPostCountToday) || 0) + 1 : 1,
  });
};

// ---------------------------------------------------------------------------
// Chat permission logic
// ---------------------------------------------------------------------------

/**
 * Returns true if the viewer is allowed to initiate a chat with the target.
 *
 * Rules:
 *   - Guest → Guest:   always allowed (no friend requirement)
 *   - Guest → Student: only if mutual follow (friends)
 *   - Student → Anyone: governed by existing student rules (not handled here)
 *
 * @param {Object} viewerUser  – full user object of the person initiating chat
 * @param {Object} targetUser  – full user object of the intended recipient
 * @returns {boolean}
 */
export const canGuestInitiateChat = (viewerUser, targetUser) => {
  if (!isGuest(viewerUser)) return true; // not a guest, use default logic

  // Guest → Guest: allowed without friendship
  if (isGuest(targetUser)) return true;

  // Guest → Student: mutual follow required
  const viewerFollowing = Array.isArray(viewerUser.following) ? viewerUser.following : [];
  const targetFollowers = Array.isArray(targetUser.followers) ? targetUser.followers : [];

  const viewerFollowsTarget = viewerFollowing.includes(targetUser.$id || targetUser.userId);
  const targetFollowsViewer = targetFollowers.includes(viewerUser.$id || viewerUser.userId);

  return viewerFollowsTarget && targetFollowsViewer;
};

/**
 * Returns true if the guest viewer is allowed to post a reply on the given post.
 * Guests can only reply if they are friends (mutual follow) with the post author,
 * OR if the post was written by another guest.
 *
 * @param {Object} viewerUser  – current user (guest)
 * @param {Object} postAuthor  – author user object
 * @returns {boolean}
 */
export const canGuestReply = (viewerUser, postAuthor) => {
  if (!isGuest(viewerUser)) return true; // non-guests use default rules

  // Guest can freely reply to other guests' posts
  if (isGuest(postAuthor)) return true;

  // Guest → Student post: mutual follow required
  const viewerFollowing = Array.isArray(viewerUser.following) ? viewerUser.following : [];
  const postAuthorFollowers = Array.isArray(postAuthor.followers) ? postAuthor.followers : [];

  const viewerFollowsAuthor = viewerFollowing.includes(postAuthor.$id || postAuthor.userId);
  const authorFollowsViewer = postAuthorFollowers.includes(viewerUser.$id || viewerUser.userId);

  return viewerFollowsAuthor && authorFollowsViewer;
};
