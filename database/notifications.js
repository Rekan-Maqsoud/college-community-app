import { databases, config } from './config';
import { ID, Query, Permission, Role } from 'appwrite';
import { sendGeneralPushNotification } from '../services/pushNotificationService';
import { unreadCountCacheManager, notificationsCacheManager } from '../app/utils/cacheManager';
import { getAuthenticatedUserId, hasBlockedRelationship } from './securityGuards';

/**
 * Notification Types:
 * - post_like: Someone liked the user's post
 * - post_reply: Someone replied to the user's post
 * - mention: Someone mentioned the user in a post or reply
 * - friend_post: A friend/followed user created a new post
 * - follow: Someone started following the user
 */

export const NOTIFICATION_TYPES = {
    POST_LIKE: 'post_like',
    POST_REPLY: 'post_reply',
    REPLY_LIKE: 'reply_like',
    REPLY_REPLY: 'reply_reply',
    MENTION: 'mention',
    FRIEND_POST: 'friend_post',
    FOLLOW: 'follow',
    DEPARTMENT_POST: 'department_post',
    POST_HIDDEN_REPORT: 'post_hidden_report',
    POST_LIKE_BATCH: 'post_like_batch',
    POST_REPLY_BATCH: 'post_reply_batch',
    REPLY_LIKE_BATCH: 'reply_like_batch',
    REPLY_REPLY_BATCH: 'reply_reply_batch',
};

const BATCH_WINDOW_MS = 15 * 60 * 1000;
const BATCH_MIN_COUNT = 3;

const BATCH_TYPES = {
    [NOTIFICATION_TYPES.POST_LIKE]: NOTIFICATION_TYPES.POST_LIKE_BATCH,
    [NOTIFICATION_TYPES.POST_REPLY]: NOTIFICATION_TYPES.POST_REPLY_BATCH,
    [NOTIFICATION_TYPES.REPLY_LIKE]: NOTIFICATION_TYPES.REPLY_LIKE_BATCH,
    [NOTIFICATION_TYPES.REPLY_REPLY]: NOTIFICATION_TYPES.REPLY_REPLY_BATCH,
};

const getBatchType = (type) => BATCH_TYPES[type] || null;

const trimPreview = (value, max = 80) => {
    if (!value) return null;
    const text = String(value).trim();
    if (!text) return null;
    return text.substring(0, max);
};

const getRecentWindowCount = (documents = [], windowMs = BATCH_WINDOW_MS) => {
    const now = Date.now();
    return (documents || []).filter((doc) => {
        const createdAt = new Date(doc?.$createdAt || 0).getTime();
        if (!createdAt || Number.isNaN(createdAt)) {
            return false;
        }
        return (now - createdAt) <= windowMs;
    }).length;
};

const listRecentInteractionNotifications = async ({ userId, type, postId = null, limit = 25 }) => {
    if (!config.notificationsCollectionId || !config.databaseId) {
        return [];
    }

    const queries = [
        Query.equal('userId', userId),
        Query.equal('type', type),
        Query.orderDesc('$createdAt'),
        Query.limit(limit),
    ];

    if (postId) {
        queries.push(Query.equal('postId', postId));
    }

    const result = await databases.listDocuments({
        databaseId: config.databaseId,
        collectionId: config.notificationsCollectionId,
        queries,
    });

    return result?.documents || [];
};

const createInteractionNotification = async ({
    userId,
    senderId,
    senderName,
    senderProfilePicture,
    type,
    postId,
    postPreview,
    standardPush,
    batchedPush,
}) => {
    const batchType = getBatchType(type);

    if (!batchType) {
        const notification = await createNotification({
            userId,
            senderId,
            senderName,
            senderProfilePicture,
            type,
            postId: postId || null,
            postPreview: trimPreview(postPreview, 50),
        });

        if (standardPush) {
            standardPush();
        }

        return notification;
    }

    // Check for existing batch FIRST — if one already exists, absorb into it
    const recentBatchDocs = await listRecentInteractionNotifications({ userId, type: batchType, postId });
    const existingBatchInWindow = getRecentWindowCount(recentBatchDocs) > 0;
    if (existingBatchInWindow && recentBatchDocs[0]) {
        const existingBatch = recentBatchDocs[0];
        const match = existingBatch.postPreview?.match(/\[batch:(\d+)\]/);
        const oldCount = match ? parseInt(match[1], 10) : BATCH_MIN_COUNT;
        const newCount = oldCount + 1;

        try {
            await databases.updateDocument({
                databaseId: config.databaseId,
                collectionId: config.notificationsCollectionId,
                documentId: existingBatch.$id,
                data: { postPreview: trimPreview(`[batch:${newCount}]${postPreview || ''}`, 80) }
            });
        } catch (e) {}

        if (batchedPush) {
            batchedPush(newCount);
        }

        return existingBatch;
    }

    // No batch yet — count individual notifications in window
    const recentStandardDocs = await listRecentInteractionNotifications({ userId, type, postId });
    const inWindowCount = getRecentWindowCount(recentStandardDocs);
    const nextCount = inWindowCount + 1;

    if (nextCount < BATCH_MIN_COUNT) {
        const notification = await createNotification({
            userId,
            senderId,
            senderName,
            senderProfilePicture,
            type,
            postId: postId || null,
            postPreview: trimPreview(postPreview, 50),
        });

        if (standardPush) {
            standardPush();
        }

        return notification;
    }

    const batchNotification = await createNotification({
        userId,
        senderId: 'system',
        senderName: 'System',
        senderProfilePicture: null,
        type: batchType,
        postId: postId || null,
        postPreview: trimPreview(`[batch:${nextCount}]${postPreview || ''}`, 80),
    });

    // Remove superseded individual in-app notifications
    if (recentStandardDocs.length > 0) {
        Promise.all(
            recentStandardDocs.map((doc) =>
                databases.deleteDocument({
                    databaseId: config.databaseId,
                    collectionId: config.notificationsCollectionId,
                    documentId: doc.$id,
                }).catch(() => {})
            )
        ).then(() => {
            unreadCountCacheManager.invalidateNotificationUnreadCount(userId).catch(() => {});
            notificationsCacheManager.invalidateUserNotifications(userId).catch(() => {});
        }).catch(() => {});
    }

    if (batchedPush) {
        batchedPush(nextCount);
    }

    return batchNotification;
};

/**
 * Create a new notification
 * @param {Object} notificationData - Notification data
 * @returns {Promise<Object>} Created notification
 */
export const createNotification = async (notificationData) => {
    try {
        if (!notificationData || typeof notificationData !== 'object') {
            return null;
        }

        if (!notificationData.userId || !notificationData.type) {
            return null;
        }

        // Check if collection ID is configured
        if (!config.notificationsCollectionId) {
            return null;
        }

        // Don't create notification if user is notifying themselves
        if (notificationData.userId === notificationData.senderId) {
            return null;
        }

        if (notificationData.senderId && notificationData.senderId !== 'system') {
            const currentUserId = await getAuthenticatedUserId();
            if (!currentUserId) {
                return null;
            }
        }

        const isMention = notificationData.type === NOTIFICATION_TYPES.MENTION;
        if (notificationData.senderId && notificationData.senderId !== 'system') {
            const blocked = await hasBlockedRelationship(
                notificationData.userId,
                notificationData.senderId,
                { includeChatBlocks: isMention }
            );
            if (blocked) {
                return null;
            }
        }

        // Build notification document with only valid fields
        const notificationDoc = {
            userId: notificationData.userId,
            senderId: notificationData.senderId,
            type: notificationData.type,
            isRead: false,
        };

        // Add optional fields only if they have values
        if (notificationData.senderName) {
            notificationDoc.senderName = notificationData.senderName;
        }
        if (notificationData.senderProfilePicture) {
            notificationDoc.senderProfilePicture = notificationData.senderProfilePicture;
        }
        if (notificationData.postId) {
            notificationDoc.postId = notificationData.postId;
        }
        if (notificationData.postPreview) {
            notificationDoc.postPreview = notificationData.postPreview;
        }

        const safeNotificationDoc = {
            userId: String(notificationData.userId || '').trim(),
            senderId: String(notificationData.senderId || 'system').trim().substring(0, 255),
            type: String(notificationData.type || '').trim().substring(0, 255),
            isRead: false,
        };

        if (notificationData.senderName) {
            safeNotificationDoc.senderName = String(notificationData.senderName).substring(0, 255);
        }
        if (notificationData.senderProfilePicture) {
            safeNotificationDoc.senderProfilePicture = String(notificationData.senderProfilePicture).substring(0, 999);
        }
        if (notificationData.postId) {
            safeNotificationDoc.postId = String(notificationData.postId).substring(0, 255);
        }
        if (notificationData.postPreview) {
            safeNotificationDoc.postPreview = String(notificationData.postPreview).substring(0, 1000);
        }

        let notification;
        try {
            notification = await databases.createDocument({
                databaseId: config.databaseId,
                collectionId: config.notificationsCollectionId,
                documentId: ID.unique(),
                data: safeNotificationDoc,
                permissions: [
                    Permission.read(Role.user(notificationData.userId)),
                    Permission.update(Role.user(notificationData.userId)),
                    Permission.delete(Role.user(notificationData.userId)),
                ],
            });
        } catch (permissionError) {
            notification = await databases.createDocument({
                databaseId: config.databaseId,
                collectionId: config.notificationsCollectionId,
                documentId: ID.unique(),
                data: safeNotificationDoc,
            });
        }

        await unreadCountCacheManager.invalidateNotificationUnreadCount(notificationData.userId);
        await notificationsCacheManager.invalidateUserNotifications(notificationData.userId);

        return notification;
    } catch (error) {
        if (typeof __DEV__ !== 'undefined' && __DEV__) {
            console.warn('createNotification: primary write failed', {
                message: error?.message || String(error),
                type: notificationData?.type,
                userId: notificationData?.userId,
                senderId: notificationData?.senderId,
            });
        }
        try {
            if (!notificationData?.userId || !notificationData?.type || !config.notificationsCollectionId || !config.databaseId) {
                return null;
            }

            const emergencyDoc = {
                userId: String(notificationData.userId || '').trim(),
                senderId: String(notificationData.senderId || 'system').trim().substring(0, 255),
                type: String(notificationData.type || '').trim().substring(0, 255),
                isRead: false,
            };

            if (notificationData.postId) {
                emergencyDoc.postId = String(notificationData.postId).substring(0, 255);
            }
            if (notificationData.postPreview) {
                emergencyDoc.postPreview = String(notificationData.postPreview).substring(0, 1000);
            }

            const emergencyNotification = await databases.createDocument({
                databaseId: config.databaseId,
                collectionId: config.notificationsCollectionId,
                documentId: ID.unique(),
                data: emergencyDoc,
            });

            await unreadCountCacheManager.invalidateNotificationUnreadCount(notificationData.userId);
            await notificationsCacheManager.invalidateUserNotifications(notificationData.userId);

            return emergencyNotification;
        } catch (emergencyError) {
            if (typeof __DEV__ !== 'undefined' && __DEV__) {
                console.warn('createNotification: emergency write failed', {
                    message: emergencyError?.message || String(emergencyError),
                    type: notificationData?.type,
                    userId: notificationData?.userId,
                    senderId: notificationData?.senderId,
                });
            }
            return null;
        }
    }
};

/**
 * Get notifications for a user
 * @param {string} userId - User ID
 * @param {number} limit - Number of notifications to fetch
 * @param {number} offset - Offset for pagination
 * @returns {Promise<Array>} List of notifications
 */
export const getNotifications = async (userId, limit = 20, offset = 0, options = {}) => {
    try {
        if (!userId || typeof userId !== 'string') {
            return [];
        }

        const currentUserId = await getAuthenticatedUserId();
        if (currentUserId !== userId) {
            return [];
        }

        const { useCache = true } = options;

        if (useCache) {
            const cached = await notificationsCacheManager.getCachedNotifications(userId, limit, offset);
            if (cached?.value && Array.isArray(cached.value)) {
                return cached.value;
            }
        }

        if (!config.notificationsCollectionId || !config.databaseId) {
            return [];
        }

        const notifications = await databases.listDocuments({
            databaseId: config.databaseId,
            collectionId: config.notificationsCollectionId,
            queries: [
                Query.equal('userId', userId),
                Query.orderDesc('$createdAt'),
                Query.limit(Math.min(limit, 100)),
                Query.offset(offset),
            ]
        });

        const docs = notifications.documents || [];
        await notificationsCacheManager.cacheNotifications(userId, docs, limit, offset);
        return docs;
    } catch (error) {
        const cached = await notificationsCacheManager.getCachedNotifications(userId, limit, offset);
        if (cached?.value && Array.isArray(cached.value)) {
            return cached.value;
        }
        return [];
    }
};

/**
 * Get unread notification count for a user
 * @param {string} userId - User ID
 * @returns {Promise<number>} Unread count
 */
export const getUnreadNotificationCount = async (userId, options = {}) => {
    try {
        if (!userId || typeof userId !== 'string') {
            return 0;
        }

        const currentUserId = await getAuthenticatedUserId();
        if (currentUserId !== userId) {
            return 0;
        }

        const { useCache = true } = options;

        if (useCache) {
            const cached = await unreadCountCacheManager.getCachedNotificationUnreadCount(userId);
            if (cached && typeof cached.value === 'number') {
                return cached.value;
            }
        }

        if (!config.notificationsCollectionId) {
            return 0;
        }

        const notifications = await databases.listDocuments({
            databaseId: config.databaseId,
            collectionId: config.notificationsCollectionId,
            queries: [
                Query.equal('userId', userId),
                Query.equal('isRead', false),
                Query.limit(100),
            ]
        });

        await unreadCountCacheManager.cacheNotificationUnreadCount(userId, notifications.total);

        return notifications.total;
    } catch (error) {
        return 0;
    }
};

/**
 * Mark a notification as read
 * @param {string} notificationId - Notification ID
 * @returns {Promise<Object>} Updated notification
 */
export const markNotificationAsRead = async (notificationId) => {
    try {
        if (!notificationId || typeof notificationId !== 'string') {
            throw new Error('Invalid notification ID');
        }

        const existing = await databases.getDocument({
            databaseId: config.databaseId,
            collectionId: config.notificationsCollectionId,
            documentId: notificationId,
        });

        const currentUserId = await getAuthenticatedUserId();
        if (existing?.userId !== currentUserId) {
            throw new Error('Not authorized to update this notification');
        }

        const notification = await databases.updateDocument({
            databaseId: config.databaseId,
            collectionId: config.notificationsCollectionId,
            documentId: notificationId,
            data: { isRead: true }
        });

        await unreadCountCacheManager.invalidateNotificationUnreadCount(notification?.userId);
        await notificationsCacheManager.invalidateUserNotifications(notification?.userId);

        return notification;
    } catch (error) {
        throw error;
    }
};

/**
 * Mark all notifications as read for a user
 * @param {string} userId - User ID
 * @returns {Promise<boolean>} Success status
 */
export const markAllNotificationsAsRead = async (userId) => {
    try {
        if (!userId || typeof userId !== 'string') {
            throw new Error('Invalid user ID');
        }

        const currentUserId = await getAuthenticatedUserId();
        if (currentUserId !== userId) {
            throw new Error('User identity mismatch');
        }

        if (!config.notificationsCollectionId) {
            return true;
        }

        // Get all unread notifications
        const unreadNotifications = await databases.listDocuments({
            databaseId: config.databaseId,
            collectionId: config.notificationsCollectionId,
            queries: [
                Query.equal('userId', userId),
                Query.equal('isRead', false),
                Query.limit(100),
            ]
        });

        // Mark each as read
        const updatePromises = unreadNotifications.documents.map(notification =>
            databases.updateDocument({
                databaseId: config.databaseId,
                collectionId: config.notificationsCollectionId,
                documentId: notification.$id,
                data: { isRead: true }
            })
        );

        await Promise.all(updatePromises);

        await unreadCountCacheManager.invalidateNotificationUnreadCount(userId);
        await notificationsCacheManager.invalidateUserNotifications(userId);

        return true;
    } catch (error) {
        throw error;
    }
};

/**
 * Delete a notification
 * @param {string} notificationId - Notification ID
 * @returns {Promise<boolean>} Success status
 */
export const deleteNotification = async (notificationId) => {
    try {
        if (!notificationId || typeof notificationId !== 'string') {
            throw new Error('Invalid notification ID');
        }

        const existing = await databases.getDocument({
            databaseId: config.databaseId,
            collectionId: config.notificationsCollectionId,
            documentId: notificationId,
        });

        const currentUserId = await getAuthenticatedUserId();
        if (existing?.userId !== currentUserId) {
            throw new Error('Not authorized to delete this notification');
        }

        await databases.deleteDocument({
            databaseId: config.databaseId,
            collectionId: config.notificationsCollectionId,
            documentId: notificationId,
        });

        await unreadCountCacheManager.invalidateNotificationUnreadCount(existing?.userId);
        await notificationsCacheManager.invalidateUserNotifications(existing?.userId);

        return true;
    } catch (error) {
        throw error;
    }
};

/**
 * Delete all notifications for a user
 * @param {string} userId - User ID
 * @returns {Promise<boolean>} Success status
 */
export const deleteAllNotifications = async (userId) => {
    try {
        if (!userId || typeof userId !== 'string') {
            throw new Error('Invalid user ID');
        }

        const currentUserId = await getAuthenticatedUserId();
        if (currentUserId !== userId) {
            throw new Error('User identity mismatch');
        }

        if (!config.notificationsCollectionId) {
            return true;
        }

        // Get all notifications for user
        const notifications = await databases.listDocuments({
            databaseId: config.databaseId,
            collectionId: config.notificationsCollectionId,
            queries: [
                Query.equal('userId', userId),
                Query.limit(100),
            ]
        });

        // Delete each notification
        const deletePromises = notifications.documents.map(notification =>
            databases.deleteDocument({
                databaseId: config.databaseId,
                collectionId: config.notificationsCollectionId,
                documentId: notification.$id,
            })
        );

        await Promise.all(deletePromises);

        await unreadCountCacheManager.invalidateNotificationUnreadCount(userId);
        await notificationsCacheManager.invalidateUserNotifications(userId);

        return true;
    } catch (error) {
        throw error;
    }
};

/**
 * Delete all notifications for a post
 * @param {string} postId - Post ID
 * @returns {Promise<boolean>} Success status
 */
export const deleteNotificationsByPostId = async (postId) => {
    try {
        if (!postId || typeof postId !== 'string') {
            throw new Error('Invalid post ID');
        }

        if (!config.notificationsCollectionId) {
            return true;
        }

        let hasMore = true;

        while (hasMore) {
            const notifications = await databases.listDocuments({
                databaseId: config.databaseId,
                collectionId: config.notificationsCollectionId,
                queries: [
                    Query.equal('postId', postId),
                    Query.limit(100),
                ]
            });

            if (notifications.documents.length === 0) {
                hasMore = false;
                break;
            }

            await Promise.all(
                notifications.documents.map(notification =>
                    databases.deleteDocument({
                        databaseId: config.databaseId,
                        collectionId: config.notificationsCollectionId,
                        documentId: notification.$id,
                    })
                )
            );

            if (notifications.documents.length < 100) {
                hasMore = false;
            }
        }

        return true;
    } catch (error) {
        throw error;
    }
};

/**
 * Create notification for post like
 * @param {string} postOwnerId - Post owner's user ID
 * @param {string} likerId - User who liked the post
 * @param {string} likerName - Name of user who liked
 * @param {string} likerPhoto - Profile picture of liker
 * @param {string} postId - Post ID
 * @param {string} postPreview - Preview of post content
 */
export const notifyPostLike = async (postOwnerId, likerId, likerName, likerPhoto, postId, postPreview) => {
    return createInteractionNotification({
        userId: postOwnerId,
        senderId: likerId,
        senderName: likerName,
        senderProfilePicture: likerPhoto || null,
        type: NOTIFICATION_TYPES.POST_LIKE,
        postId,
        postPreview,
        standardPush: () => {
            sendGeneralPushNotification({
                recipientUserId: postOwnerId,
                senderId: likerId,
                senderName: likerName,
                type: NOTIFICATION_TYPES.POST_LIKE,
                title: likerName,
                body: `❤️ liked your post`,
                postId,
            }).catch(() => {
                // Silent fail for push notification
            });
        },
        batchedPush: (count) => {
            sendGeneralPushNotification({
                recipientUserId: postOwnerId,
                senderId: likerId,
                senderName: likerName,
                type: NOTIFICATION_TYPES.POST_LIKE_BATCH,
                title: likerName,
                body: `❤️ You have ${count} new likes`,
                postId,
            }).catch(() => {
                // Silent fail for push notification
            });
        },
    });
};

/**
 * Create notification for post reply
 * @param {string} postOwnerId - Post owner's user ID
 * @param {string} replierId - User who replied
 * @param {string} replierName - Name of user who replied
 * @param {string} replierPhoto - Profile picture of replier
 * @param {string} postId - Post ID
 * @param {string} replyPreview - Preview of reply content
 */
export const notifyPostReply = async (postOwnerId, replierId, replierName, replierPhoto, postId, replyPreview, replyId) => {
    const previewText = trimPreview(replyPreview, 50);
    const encodedPreview = replyId ? `[rid:${replyId}]${previewText || ''}` : previewText;

    return createInteractionNotification({
        userId: postOwnerId,
        senderId: replierId,
        senderName: replierName,
        senderProfilePicture: replierPhoto || null,
        type: NOTIFICATION_TYPES.POST_REPLY,
        postId,
        postPreview: encodedPreview,
        standardPush: () => {
            sendGeneralPushNotification({
                recipientUserId: postOwnerId,
                senderId: replierId,
                senderName: replierName,
                type: NOTIFICATION_TYPES.POST_REPLY,
                title: replierName,
                body: `💬 replied: ${trimPreview(replyPreview, 50) || 'replied to your post'}`,
                postId,
                replyId: replyId || null,
            }).catch(() => {
                // Silent fail for push notification
            });
        },
        batchedPush: (count) => {
            sendGeneralPushNotification({
                recipientUserId: postOwnerId,
                senderId: replierId,
                senderName: replierName,
                type: NOTIFICATION_TYPES.POST_REPLY_BATCH,
                title: replierName,
                body: `💬 You have ${count} new replies`,
                postId,
                replyId: replyId || null,
            }).catch(() => {
                // Silent fail for push notification
            });
        },
    });
};

export const notifyReplyLike = async (replyOwnerId, likerId, likerName, likerPhoto, postId, replyId, replyPreview) => {
    const encodedPreview = replyId ? `[rid:${replyId}]${trimPreview(replyPreview, 50) || ''}` : trimPreview(replyPreview, 50);

    return createInteractionNotification({
        userId: replyOwnerId,
        senderId: likerId,
        senderName: likerName,
        senderProfilePicture: likerPhoto || null,
        type: NOTIFICATION_TYPES.REPLY_LIKE,
        postId,
        postPreview: encodedPreview,
        standardPush: () => {
            sendGeneralPushNotification({
                recipientUserId: replyOwnerId,
                senderId: likerId,
                senderName: likerName,
                type: NOTIFICATION_TYPES.REPLY_LIKE,
                title: likerName,
                body: `❤️ liked your reply`,
                postId,
                replyId: replyId || null,
            }).catch(() => {
                // Silent fail for push notification
            });
        },
        batchedPush: (count) => {
            sendGeneralPushNotification({
                recipientUserId: replyOwnerId,
                senderId: likerId,
                senderName: likerName,
                type: NOTIFICATION_TYPES.REPLY_LIKE_BATCH,
                title: likerName,
                body: `❤️ You have ${count} new reply likes`,
                postId,
                replyId: replyId || null,
            }).catch(() => {
                // Silent fail for push notification
            });
        },
    });
};

export const notifyReplyReply = async (replyOwnerId, replierId, replierName, replierPhoto, postId, replyPreview, parentReplyId, replyId) => {
    const encodedPreview = `[rid:${replyId || parentReplyId || ''}]${trimPreview(replyPreview, 50) || ''}`;

    return createInteractionNotification({
        userId: replyOwnerId,
        senderId: replierId,
        senderName: replierName,
        senderProfilePicture: replierPhoto || null,
        type: NOTIFICATION_TYPES.REPLY_REPLY,
        postId,
        postPreview: encodedPreview,
        standardPush: () => {
            sendGeneralPushNotification({
                recipientUserId: replyOwnerId,
                senderId: replierId,
                senderName: replierName,
                type: NOTIFICATION_TYPES.REPLY_REPLY,
                title: replierName,
                body: `💬 replied to your reply`,
                postId,
                replyId: replyId || parentReplyId || null,
            }).catch(() => {
                // Silent fail for push notification
            });
        },
        batchedPush: (count) => {
            sendGeneralPushNotification({
                recipientUserId: replyOwnerId,
                senderId: replierId,
                senderName: replierName,
                type: NOTIFICATION_TYPES.REPLY_REPLY_BATCH,
                title: replierName,
                body: `💬 You have ${count} new reply threads`,
                postId,
                replyId: replyId || parentReplyId || null,
            }).catch(() => {
                // Silent fail for push notification
            });
        },
    });
};

/**
 * Create notification for mention
 * @param {string} mentionedUserId - User who was mentioned
 * @param {string} mentionerId - User who made the mention
 * @param {string} mentionerName - Name of user who made mention
 * @param {string} mentionerPhoto - Profile picture of mentioner
 * @param {string} postId - Post ID where mention occurred
 * @param {string} contextPreview - Preview of the context
 */
export const notifyMention = async (mentionedUserId, mentionerId, mentionerName, mentionerPhoto, postId, contextPreview) => {
    // Create in-app notification first (this is the primary notification)
    const notification = await createNotification({
        userId: mentionedUserId,
        senderId: mentionerId,
        senderName: mentionerName,
        senderProfilePicture: mentionerPhoto || null,
        type: NOTIFICATION_TYPES.MENTION,
        postId: postId || null,
        postPreview: contextPreview?.substring(0, 50) || null,
    });

    // Send push notification in background (non-blocking)
    sendGeneralPushNotification({
        recipientUserId: mentionedUserId,
        senderId: mentionerId,
        senderName: mentionerName,
        type: NOTIFICATION_TYPES.MENTION,
        title: mentionerName,
        body: `📢 mentioned you: ${contextPreview?.substring(0, 50) || 'mentioned you'}`,
        postId,
    }).catch(() => {
        // Silent fail for push notification
    });

    return notification;
};

/**
 * Create notification for new friend post
 * @param {string} followerId - User who follows
 * @param {string} posterId - User who posted
 * @param {string} posterName - Name of user who posted
 * @param {string} posterPhoto - Profile picture of poster
 * @param {string} postId - Post ID
 * @param {string} postPreview - Preview of post content
 */
export const notifyFriendPost = async (followerId, posterId, posterName, posterPhoto, postId, postPreview) => {
    // Create in-app notification first (this is the primary notification)
    const notification = await createNotification({
        userId: followerId,
        senderId: posterId,
        senderName: posterName,
        senderProfilePicture: posterPhoto || null,
        type: NOTIFICATION_TYPES.FRIEND_POST,
        postId: postId || null,
        postPreview: postPreview?.substring(0, 50) || null,
    });

    // Send push notification in background (non-blocking)
    sendGeneralPushNotification({
        recipientUserId: followerId,
        senderId: posterId,
        senderName: posterName,
        type: NOTIFICATION_TYPES.FRIEND_POST,
        title: posterName,
        body: `📝 posted: ${postPreview?.substring(0, 50) || 'shared a new post'}`,
        postId,
    }).catch(() => {
        // Silent fail for push notification
    });

    return notification;
};

/**
 * Create notification for new follower
 * @param {string} followedUserId - User who was followed
 * @param {string} followerId - User who followed
 * @param {string} followerName - Name of user who followed
 * @param {string} followerPhoto - Profile picture of follower
 */
export const notifyFollow = async (followedUserId, followerId, followerName, followerPhoto) => {
    // Create in-app notification first (this is the primary notification)
    const notification = await createNotification({
        userId: followedUserId,
        senderId: followerId,
        senderName: followerName,
        senderProfilePicture: followerPhoto || null,
        type: NOTIFICATION_TYPES.FOLLOW,
        postId: null,
        postPreview: null,
    });

    // Send push notification in background (non-blocking)
    sendGeneralPushNotification({
        recipientUserId: followedUserId,
        senderId: followerId,
        senderName: followerName,
        type: NOTIFICATION_TYPES.FOLLOW,
        title: followerName,
        body: `👋 started following you`,
        postId: null,
    }).catch(() => {
        // Silent fail for push notification
    });

    return notification;
};

/**
 * Notify users in the same department and stage about a new post
 * @param {string} posterId - The user who created the post
 * @param {string} posterName - Name of the poster
 * @param {string} posterPhoto - Profile picture of the poster
 * @param {string} postId - The new post ID
 * @param {string} postType - Type of the post (question, note, etc.)
 * @param {string} postPreview - Preview of the post content
 * @param {string} department - The poster's department
 * @param {string} stage - The poster's stage
 */
export const notifyDepartmentPost = async (posterId, posterName, posterPhoto, postId, postType, postPreview, department, stage) => {
    try {
        if (!posterId || !department) return;

        const { Query: Q } = require('appwrite');
        const { databases: db, config: cfg } = require('./config');

        // Build queries for same department AND same stage
        const queries = [
            Q.equal('department', department),
            Q.limit(100),
        ];
        if (stage && stage !== 'all') {
            const stageNum = parseInt(stage, 10);
            if (!isNaN(stageNum)) {
                queries.push(Q.equal('year', stageNum));
            }
        }

        const usersResult = await db.listDocuments(
            cfg.databaseId,
            cfg.usersCollectionId,
            queries
        );

        const recipients = (usersResult.documents || []).filter(u => u.$id !== posterId && u.userID !== posterId);

        if (recipients.length === 0) return;

        // Format post type label
        const typeLabels = {
            question: 'Question',
            note: 'Note',
            resource: 'Resource',
            discussion: 'Discussion',
            announcement: 'Announcement',
        };
        const typeLabel = typeLabels[postType] || 'Post';

        // Create in-app notifications and push for each recipient (batch, non-blocking)
        const notificationPromises = recipients.map(async (recipient) => {
            const recipientId = recipient.$id || recipient.userID;
            try {
                await createNotification({
                    userId: recipientId,
                    senderId: posterId,
                    senderName: posterName,
                    senderProfilePicture: posterPhoto || null,
                    type: NOTIFICATION_TYPES.DEPARTMENT_POST,
                    postId,
                    postPreview: postPreview?.substring(0, 50) || null,
                });

                sendGeneralPushNotification({
                    recipientUserId: recipientId,
                    senderId: posterId,
                    senderName: posterName,
                    type: NOTIFICATION_TYPES.DEPARTMENT_POST,
                    title: `New ${typeLabel} in your department`,
                    body: `${posterName} posted a ${typeLabel.toLowerCase()}${postPreview ? ': ' + postPreview.substring(0, 50) : ''}`,
                    postId,
                }).catch(() => {});
            } catch (e) {
                // Silent fail per recipient
            }
        });

        await Promise.all(notificationPromises);
    } catch (error) {
        // Silent fail - department notifications should not break post creation
    }
};

/**
 * Notify post owner when a post gets hidden by reports.
 */
export const notifyPostHiddenByReports = async (postOwnerId, postId, postPreview, reportCount, viewCount) => {
    const notification = await createNotification({
        userId: postOwnerId,
        senderId: 'system',
        senderName: 'System',
        senderProfilePicture: null,
        type: NOTIFICATION_TYPES.POST_HIDDEN_REPORT,
        postId: postId || null,
        postPreview: `[reports:${reportCount}|views:${viewCount}]${(postPreview || '').substring(0, 80)}`,
    });

    sendGeneralPushNotification({
        recipientUserId: postOwnerId,
        senderId: 'system',
        senderName: 'System',
        type: NOTIFICATION_TYPES.POST_HIDDEN_REPORT,
        title: 'Post hidden',
        body: `Your post was hidden for review (${reportCount} reports, ${viewCount} views)` ,
        postId,
    }).catch(() => {
        // Silent fail for push notification
    });

    return notification;
};

// ─── Cursor-based notification pagination ────────────────────────────
/**
 * Fetch notifications using cursor-based pagination.
 *
 * @param {string}      userId       - Recipient user ID.
 * @param {number}      limit        - Page size (default 20).
 * @param {string|null} afterCursor  - `$id` of the last notification from the previous page.
 * @returns {Promise<{documents: Array, lastCursor: string|null, hasMore: boolean}>}
 */
export const getNotificationsCursor = async (userId, limit = 20, afterCursor = null) => {
    try {
        if (!userId || typeof userId !== 'string') {
            return { documents: [], lastCursor: null, hasMore: false };
        }
        if (!config.notificationsCollectionId || !config.databaseId) {
            return { documents: [], lastCursor: null, hasMore: false };
        }

        const queries = [
            Query.equal('userId', userId),
            Query.orderDesc('$createdAt'),
            Query.limit(Math.min(limit, 100)),
        ];

        if (afterCursor) {
            queries.push(Query.cursorAfter(afterCursor));
        }

        const response = await databases.listDocuments({
            databaseId: config.databaseId,
            collectionId: config.notificationsCollectionId,
            queries,
        });

        const documents = response.documents || [];
        const lastDoc = documents.length > 0 ? documents[documents.length - 1] : null;

        return {
            documents,
            lastCursor: lastDoc?.$id || null,
            hasMore: documents.length === limit,
        };
    } catch (error) {
        return { documents: [], lastCursor: null, hasMore: false };
    }
};

/**
 * Mark matching notifications as read for a user.
 * Supports efficient contextual dismissal when user opens target content.
 *
 * @param {string} userId
 * @param {Object} filters
 * @param {string|null} filters.postId
 * @param {string|null} filters.senderId
 * @param {Array<string>} filters.types
 * @returns {Promise<number>} Number of notifications marked as read
 */
export const markNotificationsAsReadByContext = async (userId, filters = {}) => {
    try {
        if (!userId || typeof userId !== 'string') {
            return 0;
        }

        // Skip network auth check — Appwrite document permissions already enforce
        // access control, and the extra account.get() call can fail silently,
        // preventing notifications from ever being dismissed.

        if (!config.notificationsCollectionId || !config.databaseId) {
            return 0;
        }

        const { postId = null, senderId = null } = filters || {};
        const types = Array.isArray(filters?.types)
            ? filters.types.filter((type) => typeof type === 'string' && type.trim().length > 0)
            : [];

        const queries = [
            Query.equal('userId', userId),
            Query.equal('isRead', false),
            Query.limit(100),
        ];

        if (postId) {
            queries.push(Query.equal('postId', postId));
        }

        if (senderId) {
            queries.push(Query.equal('senderId', senderId));
        }

        if (types.length > 0) {
            queries.push(Query.equal('type', types));
        }

        const result = await databases.listDocuments({
            databaseId: config.databaseId,
            collectionId: config.notificationsCollectionId,
            queries,
        });

        const unread = result?.documents || [];
        if (unread.length === 0) {
            return 0;
        }

        await Promise.all(
            unread.map((notification) =>
                databases.updateDocument({
                    databaseId: config.databaseId,
                    collectionId: config.notificationsCollectionId,
                    documentId: notification.$id,
                    data: { isRead: true }
                })
            )
        );

        await unreadCountCacheManager.invalidateNotificationUnreadCount(userId);
        await notificationsCacheManager.invalidateUserNotifications(userId);

        return unread.length;
    } catch (error) {
        return 0;
    }
};