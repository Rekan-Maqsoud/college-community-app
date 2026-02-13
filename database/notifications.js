import { databases, config } from './config';
import { ID, Query } from 'appwrite';
import { sendGeneralPushNotification } from '../services/pushNotificationService';

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
    MENTION: 'mention',
    FRIEND_POST: 'friend_post',
    FOLLOW: 'follow',
    DEPARTMENT_POST: 'department_post',
    POST_HIDDEN_REPORT: 'post_hidden_report',
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

        const notification = await databases.createDocument(
            config.databaseId,
            config.notificationsCollectionId,
            ID.unique(),
            notificationDoc
        );

        return notification;
    } catch (error) {
        return null;
    }
};

/**
 * Get notifications for a user
 * @param {string} userId - User ID
 * @param {number} limit - Number of notifications to fetch
 * @param {number} offset - Offset for pagination
 * @returns {Promise<Array>} List of notifications
 */
export const getNotifications = async (userId, limit = 20, offset = 0) => {
    try {
        if (!userId || typeof userId !== 'string') {
            return [];
        }

        if (!config.notificationsCollectionId || !config.databaseId) {
            return [];
        }

        const notifications = await databases.listDocuments(
            config.databaseId,
            config.notificationsCollectionId,
            [
                Query.equal('userId', userId),
                Query.orderDesc('$createdAt'),
                Query.limit(Math.min(limit, 100)),
                Query.offset(offset),
            ]
        );

        return notifications.documents || [];
    } catch (error) {
        return [];
    }
};

/**
 * Get unread notification count for a user
 * @param {string} userId - User ID
 * @returns {Promise<number>} Unread count
 */
export const getUnreadNotificationCount = async (userId) => {
    try {
        if (!userId || typeof userId !== 'string') {
            return 0;
        }

        if (!config.notificationsCollectionId) {
            return 0;
        }

        const notifications = await databases.listDocuments(
            config.databaseId,
            config.notificationsCollectionId,
            [
                Query.equal('userId', userId),
                Query.equal('isRead', false),
                Query.limit(100),
            ]
        );

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

        const notification = await databases.updateDocument(
            config.databaseId,
            config.notificationsCollectionId,
            notificationId,
            { isRead: true }
        );

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

        if (!config.notificationsCollectionId) {
            return true;
        }

        // Get all unread notifications
        const unreadNotifications = await databases.listDocuments(
            config.databaseId,
            config.notificationsCollectionId,
            [
                Query.equal('userId', userId),
                Query.equal('isRead', false),
                Query.limit(100),
            ]
        );

        // Mark each as read
        const updatePromises = unreadNotifications.documents.map(notification =>
            databases.updateDocument(
                config.databaseId,
                config.notificationsCollectionId,
                notification.$id,
                { isRead: true }
            )
        );

        await Promise.all(updatePromises);

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

        await databases.deleteDocument(
            config.databaseId,
            config.notificationsCollectionId,
            notificationId
        );

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

        if (!config.notificationsCollectionId) {
            return true;
        }

        // Get all notifications for user
        const notifications = await databases.listDocuments(
            config.databaseId,
            config.notificationsCollectionId,
            [
                Query.equal('userId', userId),
                Query.limit(100),
            ]
        );

        // Delete each notification
        const deletePromises = notifications.documents.map(notification =>
            databases.deleteDocument(
                config.databaseId,
                config.notificationsCollectionId,
                notification.$id
            )
        );

        await Promise.all(deletePromises);

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
            const notifications = await databases.listDocuments(
                config.databaseId,
                config.notificationsCollectionId,
                [
                    Query.equal('postId', postId),
                    Query.limit(100),
                ]
            );

            if (notifications.documents.length === 0) {
                hasMore = false;
                break;
            }

            await Promise.all(
                notifications.documents.map(notification =>
                    databases.deleteDocument(
                        config.databaseId,
                        config.notificationsCollectionId,
                        notification.$id
                    )
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
    // Create in-app notification first (this is the primary notification)
    const notification = await createNotification({
        userId: postOwnerId,
        senderId: likerId,
        senderName: likerName,
        senderProfilePicture: likerPhoto || null,
        type: NOTIFICATION_TYPES.POST_LIKE,
        postId: postId || null,
        postPreview: postPreview?.substring(0, 50) || null,
    });

    // Send push notification in background (non-blocking)
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

    return notification;
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
    // Encode replyId into postPreview so it survives the in-app notification round-trip
    const previewText = replyPreview?.substring(0, 50) || null;
    const encodedPreview = replyId ? `[rid:${replyId}]${previewText || ''}` : previewText;

    // Create in-app notification first (this is the primary notification)
    const notification = await createNotification({
        userId: postOwnerId,
        senderId: replierId,
        senderName: replierName,
        senderProfilePicture: replierPhoto || null,
        type: NOTIFICATION_TYPES.POST_REPLY,
        postId: postId || null,
        postPreview: encodedPreview,
    });

    // Send push notification in background (non-blocking)
    sendGeneralPushNotification({
        recipientUserId: postOwnerId,
        senderId: replierId,
        senderName: replierName,
        type: NOTIFICATION_TYPES.POST_REPLY,
        title: replierName,
        body: `💬 replied: ${replyPreview?.substring(0, 50) || 'replied to your post'}`,
        postId,
        replyId: replyId || null,
    }).catch(() => {
        // Silent fail for push notification
    });

    return notification;
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
