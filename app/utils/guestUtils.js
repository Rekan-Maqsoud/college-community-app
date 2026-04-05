/**
 * guestUtils.js
 * Central utility for guest role checks and permission logic.
 * All role-based decisions should flow through here.
 */

import { isEducationalEmail } from '../constants/academicEmailDomains';

const normalizeRoleValue = (roleValue) => {
  if (roleValue === null || roleValue === undefined) return '';
  return String(roleValue).trim().toLowerCase();
};

const hasAcademicProfileSignals = (user) => {
  if (!user || typeof user !== 'object') return false;

  const university = String(user.university || '').trim();
  const department = String(user.department || '').trim();
  const stage = String(user.stage || '').trim();
  const major = String(user.major || user.college || '').trim();

  return Boolean(university || department || stage || major);
};

/**
 * Returns true if the given user object has the 'guest' role.
 * @param {Object|null} user
 * @returns {boolean}
 */
export const isGuest = (user) => {
  if (!user || typeof user !== 'object') return false;

  const normalizedRole = normalizeRoleValue(user.role);
  if (normalizedRole === 'guest') {
    return true;
  }

  if (user.isGuest === true || user.accountType === 'guest') {
    return true;
  }

  const normalizedEmail = String(user.email || '').trim().toLowerCase();
  if (!normalizedEmail || isEducationalEmail(normalizedEmail)) {
    return false;
  }

  // Fallback for stale cached payloads that may miss role while still being guest accounts.
  if (!normalizedRole || normalizedRole === 'student') {
    return !hasAcademicProfileSignals(user);
  }

  return false;
};

/**
 * Returns true if the given user object has a student or teacher role.
 * @param {Object|null} user
 * @returns {boolean}
 */
export const isStudent = (user) => {
  if (!user || typeof user !== 'object') return false;
  if (isGuest(user)) return false;

  const role = normalizeRoleValue(user.role) || 'student';
  return role === 'student' || role === 'teacher';
};

/**
 * Guest discovery guard for chat user search.
 * Guests can only discover other guest accounts in the chat finder.
 *
 * @param {Object} viewerUser
 * @param {Object} targetUser
 * @returns {boolean}
 */
export const canGuestDiscoverChatUser = (viewerUser, targetUser) => {
  if (!viewerUser || typeof viewerUser !== 'object' || !targetUser || typeof targetUser !== 'object') {
    return false;
  }

  if (!isGuest(viewerUser)) return true;
  return isGuest(targetUser);
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

export const GUEST_CHAT_MESSAGE_RATE_LIMIT = {
  action: 'send_chat_message',
  maxActions: 6,
  windowMs: 10 * 1000, // 10 seconds
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
  if (!viewerUser || typeof viewerUser !== 'object' || !targetUser || typeof targetUser !== 'object') {
    return false;
  }

  if (!isGuest(viewerUser)) return true; // not a guest, use default logic

  // Guest → Guest: allowed without friendship
  if (isGuest(targetUser)) return true;

  // Guest → Student: mutual follow required (both directions).
  const viewerId = String(viewerUser.$id || viewerUser.userId || '').trim();
  const targetId = String(targetUser.$id || targetUser.userId || '').trim();
  if (!viewerId || !targetId) {
    return false;
  }

  const viewerFollowing = Array.isArray(viewerUser.following) ? viewerUser.following : [];
  const viewerFollowers = Array.isArray(viewerUser.followers) ? viewerUser.followers : [];
  const targetFollowing = Array.isArray(targetUser.following) ? targetUser.following : [];
  const targetFollowers = Array.isArray(targetUser.followers) ? targetUser.followers : [];

  const viewerFollowsTarget = viewerFollowing.includes(targetId) || targetFollowers.includes(viewerId);
  const targetFollowsViewer = targetFollowing.includes(viewerId) || viewerFollowers.includes(targetId);

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
  if (!viewerUser || typeof viewerUser !== 'object' || !postAuthor || typeof postAuthor !== 'object') {
    return false;
  }

  if (!isGuest(viewerUser)) return true; // non-guests use default rules

  // Guest can freely reply to other guests' posts
  if (isGuest(postAuthor)) return true;

  // Guest → Student post: mutual follow required (both directions).
  const viewerId = String(viewerUser.$id || viewerUser.userId || '').trim();
  const authorId = String(postAuthor.$id || postAuthor.userId || '').trim();
  if (!viewerId || !authorId) {
    return false;
  }

  const viewerFollowing = Array.isArray(viewerUser.following) ? viewerUser.following : [];
  const viewerFollowers = Array.isArray(viewerUser.followers) ? viewerUser.followers : [];
  const authorFollowing = Array.isArray(postAuthor.following) ? postAuthor.following : [];
  const authorFollowers = Array.isArray(postAuthor.followers) ? postAuthor.followers : [];

  const viewerFollowsAuthor = viewerFollowing.includes(authorId) || authorFollowers.includes(viewerId);
  const authorFollowsViewer = authorFollowing.includes(viewerId) || viewerFollowers.includes(authorId);

  return viewerFollowsAuthor && authorFollowsViewer;
};
