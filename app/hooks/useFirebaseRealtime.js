/**
 * React hooks for Firebase RTDB real-time features.
 *
 * These hooks implement the "micro-session" pattern:
 *   • Attach a Firebase listener on mount / when the component is visible.
 *   • Detach on unmount / app-background.
 *   • If Firebase is unavailable (connection limit, auth failure, etc.)
 *     the hook silently falls back so the UI keeps working with static
 *     Appwrite data.
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { AppState } from 'react-native';
import {
  attachListener,
  writeValue,
  updateValues,
  incrementValue,
  removeValue,
  onAppBackground,
} from '../../services/firebaseConnectionManager';

/* ================================================================== */
/*  useFirebaseValue — generic single-path listener                    */
/* ================================================================== */

/**
 * Subscribe to a single RTDB path while the component is mounted and
 * the app is in the foreground.
 *
 * @param {string|null}  path      RTDB path (pass `null` to disable)
 * @param {any}          fallback  value returned when Firebase is unavailable
 * @returns {{ value: any, isLive: boolean }}
 *   `isLive` is `true` when the value comes from an active Firebase listener,
 *   `false` when it is the static fallback.
 */
export const useFirebaseValue = (path, fallback = null) => {
  const [value, setValue] = useState(fallback);
  const [isLive, setIsLive] = useState(false);
  const unsubRef = useRef(null);
  const pathRef = useRef(path);

  // Keep pathRef fresh to avoid stale closure in cleanup
  useEffect(() => {
    pathRef.current = path;
  }, [path]);

  useEffect(() => {
    if (!path) {
      setValue(fallback);
      setIsLive(false);
      return;
    }

    let cancelled = false;

    const subscribe = async () => {
      const unsub = await attachListener(
        path,
        (val) => {
          if (!cancelled) {
            setValue(val ?? fallback);
            setIsLive(true);
          }
        },
        () => {
          // Fallback — Firebase unavailable
          if (!cancelled) {
            setValue(fallback);
            setIsLive(false);
          }
        },
      );
      if (!cancelled) {
        unsubRef.current = unsub;
      } else {
        unsub();
      }
    };

    subscribe();

    // Detach on app background, re-attach on foreground
    const bgUnsub = onAppBackground(() => {
      if (unsubRef.current) {
        unsubRef.current();
        unsubRef.current = null;
      }
    });

    const appSub = AppState.addEventListener('change', (next) => {
      if (next === 'active' && !unsubRef.current && pathRef.current) {
        subscribe();
      }
    });

    return () => {
      cancelled = true;
      bgUnsub();
      appSub.remove();
      if (unsubRef.current) {
        unsubRef.current();
        unsubRef.current = null;
      }
    };
  }, [path]); // intentionally omit `fallback` — it only seeds initial state

  return { value, isLive };
};

/* ================================================================== */
/*  usePostLiveCounters                                                */
/* ================================================================== */

/**
 * Attach live counters for a single post using **one** RTDB listener
 * (not three) to conserve connection slots on the Spark plan.
 *
 * RTDB structure (single node):
 * ```
 * posts/{postId} : { likeCount: n, replyCount: n, viewCount: n }
 * ```
 *
 * @param {string|null} postId
 * @param {{ likeCount: number, replyCount: number, viewCount: number }} initial
 * @returns {{ likeCount: number, replyCount: number, viewCount: number, isLive: boolean }}
 */
export const usePostLiveCounters = (postId, initial = {}) => {
  const { value: counters, isLive } = useFirebaseValue(
    postId ? `posts/${postId}` : null,
    null,
  );

  return {
    likeCount:  (isLive && counters?.likeCount  != null) ? counters.likeCount  : (initial.likeCount  ?? 0),
    replyCount: (isLive && counters?.replyCount != null) ? counters.replyCount : (initial.replyCount ?? 0),
    viewCount:  (isLive && counters?.viewCount  != null) ? counters.viewCount  : (initial.viewCount  ?? 0),
    isLive,
  };
};

/* ================================================================== */
/*  usePollLiveVotes                                                   */
/* ================================================================== */

/**
 * Attach live poll vote counts.
 *
 * RTDB structure:
 * ```
 * polls/{postId}/votes  : { [optionIndex]: number }
 * polls/{postId}/total  : number
 * ```
 *
 * @param {string|null} postId
 * @param {Object}      initialVotes  e.g. { 0: 5, 1: 12 }
 * @returns {{ votes: Object, total: number, isLive: boolean }}
 */
export const usePollLiveVotes = (postId, initialVotes = {}) => {
  const { value: votesNode, isLive } = useFirebaseValue(
    postId ? `polls/${postId}` : null,
    null,
  );

  if (!votesNode || !isLive) {
    const total = Object.values(initialVotes).reduce((s, n) => s + n, 0);
    return { votes: initialVotes, total, isLive: false };
  }

  const votes = votesNode.votes || initialVotes;
  const total = votesNode.total ?? Object.values(votes).reduce((s, n) => s + n, 0);
  return { votes, total, isLive };
};

/* ================================================================== */
/*  useTypingIndicator                                                 */
/* ================================================================== */

/**
 * Provides a list of users currently typing in a chat, and a function
 * to broadcast the local user's typing state.
 *
 * RTDB structure:
 * ```
 * chats/{chatId}/typing/{userId} : { name: string, ts: number }
 * ```
 *
 * Entries older than 10 s are ignored client-side.
 *
 * @param {string|null} chatId
 * @param {string|null} userId    current user's ID
 * @param {string}      userName  current user's display name
 * @returns {{ typingUsers: string[], setTyping: (isTyping: boolean) => void }}
 */
export const useTypingIndicator = (chatId, userId, userName) => {
  const STALE_MS = 10000;
  const path = chatId ? `chats/${chatId}/typing` : null;

  const { value: typingNode } = useFirebaseValue(path, null);

  // Filter out stale entries and the local user
  const typingUsers = [];
  if (typingNode && typeof typingNode === 'object') {
    const now = Date.now();
    Object.entries(typingNode).forEach(([uid, entry]) => {
      if (uid === userId) return;
      if (entry?.ts && now - entry.ts < STALE_MS) {
        typingUsers.push(entry.name || uid);
      }
    });
  }

  const setTyping = useCallback(
    (isTyping) => {
      if (!chatId || !userId) return;
      const typingPath = `chats/${chatId}/typing/${userId}`;
      if (isTyping) {
        writeValue(typingPath, { name: userName || userId, ts: Date.now() });
      } else {
        removeValue(typingPath);
      }
    },
    [chatId, userId, userName],
  );

  // Clean up own typing flag on unmount
  useEffect(() => {
    return () => {
      if (chatId && userId) {
        removeValue(`chats/${chatId}/typing/${userId}`);
      }
    };
  }, [chatId, userId]);

  return { typingUsers, setTyping };
};

/* ================================================================== */
/*  usePresence                                                        */
/* ================================================================== */

/**
 * Mark the current user as online while a screen is mounted, and
 * monitor another user's presence.
 *
 * RTDB structure:
 * ```
 * presence/{userId} : { online: boolean, lastSeen: number }
 * ```
 *
 * @param {string|null} currentUserId  local user (sets own presence)
 * @param {string|null} targetUserId   user to observe (optional)
 * @returns {{ isOnline: boolean, lastSeen: number|null }}
 */
export const usePresence = (currentUserId, targetUserId = null) => {
  // --- Broadcast own presence ---
  useEffect(() => {
    if (!currentUserId) return;

    const presencePath = `presence/${currentUserId}`;
    writeValue(presencePath, { online: true, lastSeen: Date.now() });

    const interval = setInterval(() => {
      writeValue(presencePath, { online: true, lastSeen: Date.now() });
    }, 60000); // heartbeat every 60 s

    return () => {
      clearInterval(interval);
      writeValue(presencePath, { online: false, lastSeen: Date.now() });
    };
  }, [currentUserId]);

  // --- Observe target user ---
  const { value: presenceData } = useFirebaseValue(
    targetUserId ? `presence/${targetUserId}` : null,
    null,
  );

  const isOnline = presenceData?.online === true;
  const lastSeen = presenceData?.lastSeen ?? null;

  return { isOnline, lastSeen };
};

/* ================================================================== */
/*  Broadcast helpers (call from database write functions)             */
/* ================================================================== */

/**
 * After Appwrite persists a like toggle, broadcast the new count to
 * Firebase so active listeners update instantly.
 *
 * Uses a merge-style update so we only overwrite the single key inside
 * the `posts/{postId}` node — the other counters remain untouched.
 *
 * @param {string} postId
 * @param {number} newLikeCount
 */
export const broadcastLikeCount = (postId, newLikeCount) => {
  updateValues(`posts/${postId}`, { likeCount: newLikeCount });
};

/**
 * @param {string} postId
 * @param {number} newReplyCount
 */
export const broadcastReplyCount = (postId, newReplyCount) => {
  updateValues(`posts/${postId}`, { replyCount: newReplyCount });
};

/**
 * @param {string} postId
 * @param {number} newViewCount
 */
export const broadcastViewCount = (postId, newViewCount) => {
  updateValues(`posts/${postId}`, { viewCount: newViewCount });
};

/**
 * Broadcast poll vote counts after Appwrite persists the vote.
 *
 * @param {string} postId
 * @param {Object} voteCounts  e.g. { 0: 5, 1: 12 }
 * @param {number} total
 */
export const broadcastPollVotes = (postId, voteCounts, total) => {
  writeValue(`polls/${postId}`, { votes: voteCounts, total });
};

/* ================================================================== */
/*  Seeding helpers (populate Firebase from Appwrite data)             */
/* ================================================================== */

/** Track which posts have already been seeded this session. */
const _seededPosts = new Set();

/**
 * Seed an array of posts' counters into Firebase RTDB so that active
 * listeners immediately receive real data instead of `null`.
 *
 * Only writes once per post per app session to minimise writes.
 *
 * @param {Array} posts  Appwrite post documents
 */
export const seedPostCounters = (posts) => {
  if (!Array.isArray(posts) || posts.length === 0) return;

  posts.forEach((post) => {
    if (!post?.$id || _seededPosts.has(post.$id)) return;
    _seededPosts.add(post.$id);

    updateValues(`posts/${post.$id}`, {
      likeCount: post.likeCount ?? 0,
      replyCount: post.replyCount ?? 0,
      viewCount: post.viewCount ?? 0,
    });
  });
};

/**
 * Broadcast chat metadata to Firebase after a message is sent.
 * Chat list listeners pick this up for instant last-message updates.
 *
 * RTDB structure:
 * ```
 * chatMeta/{chatId} : { lastMessage, lastMessageAt, messageCount, lastSenderId }
 * ```
 *
 * @param {string} chatId
 * @param {Object} meta
 */
export const broadcastChatMeta = (chatId, meta) => {
  if (!chatId) return;
  updateValues(`chatMeta/${chatId}`, {
    lastMessage: meta.lastMessage || '',
    lastMessageAt: meta.lastMessageAt || new Date().toISOString(),
    messageCount: meta.messageCount ?? 0,
    lastSenderId: meta.lastSenderId || '',
    updatedAt: Date.now(),
  });
};

/**
 * Seed chat metadata for an array of chats (called once on load).
 *
 * @param {Array} chats  Appwrite chat documents
 */
const _seededChats = new Set();

export const seedChatMeta = (chats) => {
  if (!Array.isArray(chats) || chats.length === 0) return;

  chats.forEach((chat) => {
    if (!chat?.$id || _seededChats.has(chat.$id)) return;
    _seededChats.add(chat.$id);

    updateValues(`chatMeta/${chat.$id}`, {
      lastMessage: chat.lastMessage || '',
      lastMessageAt: chat.lastMessageAt || chat.$createdAt || '',
      messageCount: chat.messageCount ?? 0,
      lastSenderId: chat.lastMessageSenderId || '',
      updatedAt: Date.now(),
    });
  });
};
