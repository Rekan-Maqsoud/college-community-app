import { databases, config } from './config';
import { ID, Query } from 'appwrite';
import { userCacheManager } from '../app/utils/cacheManager';
import { assertActorIdentity, enforceRateLimit } from './securityGuards';

const sanitizeSearchQuery = (query) => {
    if (typeof query !== 'string') return '';
    return query.trim().replace(/[<>"']/g, '').substring(0, 100);
};

export const searchUsers = async (searchQuery, limit = 10) => {
    try {
        if (!searchQuery || searchQuery.trim().length === 0) {
            return [];
        }
        
        const sanitizedQuery = sanitizeSearchQuery(searchQuery);
        if (sanitizedQuery.length < 2) {
            return [];
        }

        // Use server-side search with Query.search for full-text search
        // Falls back to Query.contains if search index not available
        try {
            const searchQueries = [
                Query.search('name', sanitizedQuery),
                Query.limit(limit),
                Query.orderDesc('$createdAt')
            ];

            const users = await databases.listDocuments(
                config.databaseId,
                config.usersCollectionId || '68fc7b42001bf7efbba3',
                searchQueries
            );
            
            if (users.documents.length > 0) {
                return users.documents;
            }
        } catch (searchError) {
            // Full-text search not available, fall back to contains query
        }

        // Fallback: Use contains query on name (still server-side)
        const containsQueries = [
            Query.contains('name', [sanitizedQuery]),
            Query.limit(limit),
            Query.orderDesc('$createdAt')
        ];

        const users = await databases.listDocuments(
            config.databaseId,
            config.usersCollectionId || '68fc7b42001bf7efbba3',
            containsQueries
        );
        
        return users.documents;
    } catch (error) {
        return [];
    }
};

const filterBlockedUsersForViewer = async (users = [], viewerUserId = null) => {
    if (!viewerUserId || !Array.isArray(users) || users.length === 0) {
        return users;
    }

    let viewerDoc;
    try {
        viewerDoc = await getUserById(viewerUserId);
    } catch (error) {
        return users;
    }

    const viewerBlocked = Array.isArray(viewerDoc?.blockedUsers) ? viewerDoc.blockedUsers : [];
    const viewerChatBlocked = Array.isArray(viewerDoc?.chatBlockedUsers) ? viewerDoc.chatBlockedUsers : [];
    const excluded = new Set([...viewerBlocked, ...viewerChatBlocked]);

    return users.filter((candidate) => {
        const candidateId = candidate?.$id || candidate?.userID;
        if (!candidateId || candidateId === viewerUserId || excluded.has(candidateId)) {
            return false;
        }

        const candidateBlocked = Array.isArray(candidate?.blockedUsers) ? candidate.blockedUsers : [];
        const candidateChatBlocked = Array.isArray(candidate?.chatBlockedUsers) ? candidate.chatBlockedUsers : [];
        return !candidateBlocked.includes(viewerUserId) && !candidateChatBlocked.includes(viewerUserId);
    });
};

export const searchUsersForViewer = async (searchQuery, viewerUserId, limit = 10) => {
    const users = await searchUsers(searchQuery, limit);
    return await filterBlockedUsersForViewer(users, viewerUserId);
};

export const getUserById = async (userId, skipCache = false) => {
    try {
        if (!userId || typeof userId !== 'string') {
            throw new Error('Invalid user ID');
        }
        
        // Check cache first (unless explicitly skipped)
        if (!skipCache) {
            const cachedUser = await userCacheManager.getCachedUserData(userId);
            if (cachedUser) {
                return cachedUser;
            }
        }
        
        const user = await databases.getDocument(
            config.databaseId,
            config.usersCollectionId || '68fc7b42001bf7efbba3',
            userId
        );
        
        // Cache the user data for future requests
        await userCacheManager.cacheUserData(userId, user);
        
        return user;
    } catch (error) {
        throw error;
    }
};

export const getUsersByDepartment = async (department, limit = 20, offset = 0) => {
    try {
        if (!department || typeof department !== 'string') {
            return [];
        }
        
        const queries = [
            Query.equal('department', department),
            Query.limit(Math.min(limit, 100)),
            Query.offset(offset),
            Query.orderDesc('$createdAt')
        ];

        const users = await databases.listDocuments(
            config.databaseId,
            config.usersCollectionId || '68fc7b42001bf7efbba3',
            queries
        );
        
        return users.documents;
    } catch (error) {
        return [];
    }
};

/**
 * Get all students in a specific class (department + year/stage).
 * The DB stores `year` as an integer (1-6), while the app uses stage keys
 * like 'firstYear'. This function accepts either format.
 */
export const getClassStudents = async (department, stage) => {
    try {
        if (!department || !stage) return [];

        // Convert stage key to year number if needed
        const stageToYearMap = {
            firstYear: 1, secondYear: 2, thirdYear: 3,
            fourthYear: 4, fifthYear: 5, sixthYear: 6,
        };
        const year = stageToYearMap[stage] || parseInt(stage) || null;
        if (!year) return [];

        let allStudents = [];
        let offset = 0;
        const batchSize = 100;
        let hasMore = true;

        while (hasMore) {
            const batch = await databases.listDocuments(
                config.databaseId,
                config.usersCollectionId,
                [
                    Query.equal('department', department),
                    Query.equal('year', year),
                    Query.limit(batchSize),
                    Query.offset(offset),
                    Query.orderAsc('name'),
                ],
            );
            allStudents = [...allStudents, ...batch.documents];
            hasMore = batch.documents.length === batchSize;
            offset += batchSize;
        }

        return allStudents;
    } catch (error) {
        return [];
    }
};

export const updateUserPublicKey = async (userId, publicKey) => {
    try {
        if (!userId || typeof userId !== 'string') {
            throw new Error('Invalid user ID');
        }

        if (!publicKey || typeof publicKey !== 'string') {
            throw new Error('Invalid public key');
        }

        const userDoc = await databases.updateDocument(
            config.databaseId,
            config.usersCollectionId || '68fc7b42001bf7efbba3',
            userId,
            { publicKey }
        );

        await userCacheManager.invalidateUser(userId);

        return userDoc;
    } catch (error) {
        // If the schema doesn't include publicKey, avoid breaking chat encryption
        if (error?.message?.includes('Unknown attribute') && error?.message?.includes('publicKey')) {
            return null;
        }

        throw error;
    }
};

/**
 * Follow a user - uses arrays in user document (simpler approach)
 */
export const followUser = async (followerId, followingId) => {
    try {
        if (!followerId || !followingId || followerId === followingId) {
            throw new Error('Invalid follow request');
        }

        await assertActorIdentity(followerId);
        enforceRateLimit({
            action: 'follow_user',
            userId: followerId,
            maxActions: 8,
            windowMs: 60 * 1000,
        });

        // Get both users
        const [follower, following] = await Promise.all([
            getUserById(followerId),
            getUserById(followingId),
        ]);

        // Check if already following
        const followerFollowing = follower.following || [];
        if (followerFollowing.includes(followingId)) {
            return { alreadyFollowing: true };
        }

        // Add to follower's following list
        const newFollowing = [...followerFollowing, followingId];
        
        // Add to followed user's followers list
        const followingFollowers = following.followers || [];
        const newFollowers = [...followingFollowers, followerId];

        // Update both users
        await Promise.all([
            databases.updateDocument(config.databaseId, config.usersCollectionId, followerId, {
                following: newFollowing,
                followingCount: newFollowing.length,
            }),
            databases.updateDocument(config.databaseId, config.usersCollectionId, followingId, {
                followers: newFollowers,
                followersCount: newFollowers.length,
            }),
        ]);

        // Invalidate cache for both users
        await userCacheManager.invalidateUser(followerId);
        await userCacheManager.invalidateUser(followingId);

        return { success: true };
    } catch (error) {
        throw error;
    }
};

/**
 * Unfollow a user
 */
export const unfollowUser = async (followerId, followingId) => {
    try {
        if (!followerId || !followingId) {
            throw new Error('Invalid unfollow request');
        }

        await assertActorIdentity(followerId);
        enforceRateLimit({
            action: 'unfollow_user',
            userId: followerId,
            maxActions: 8,
            windowMs: 60 * 1000,
        });

        const [follower, following] = await Promise.all([
            getUserById(followerId),
            getUserById(followingId),
        ]);

        // Remove from follower's following list
        const followerFollowing = follower.following || [];
        const newFollowing = followerFollowing.filter(id => id !== followingId);

        // Remove from followed user's followers list
        const followingFollowers = following.followers || [];
        const newFollowers = followingFollowers.filter(id => id !== followerId);

        // Update both users
        await Promise.all([
            databases.updateDocument(config.databaseId, config.usersCollectionId, followerId, {
                following: newFollowing,
                followingCount: newFollowing.length,
            }),
            databases.updateDocument(config.databaseId, config.usersCollectionId, followingId, {
                followers: newFollowers,
                followersCount: newFollowers.length,
            }),
        ]);

        // Invalidate cache for both users
        await userCacheManager.invalidateUser(followerId);
        await userCacheManager.invalidateUser(followingId);

        return { success: true };
    } catch (error) {
        throw error;
    }
};

/**
 * Check if a user is following another user
 */
export const isFollowing = async (followerId, followingId) => {
    try {
        if (!followerId || !followingId) {
            return false;
        }

        const user = await getUserById(followerId);
        const following = user.following || [];
        return following.includes(followingId);
    } catch (error) {
        return false;
    }
};

/**
 * Check if two users are friends (mutual follows)
 */
export const areFriends = async (userId1, userId2) => {
    try {
        if (!userId1 || !userId2) {
            return false;
        }

        const user1 = await getUserById(userId1);
        const following1 = user1.following || [];
        const followers1 = user1.followers || [];

        return following1.includes(userId2) && followers1.includes(userId2);
    } catch (error) {
        return false;
    }
};

/**
 * Get all friends of a user (mutual follows)
 */
export const getFriends = async (userId) => {
    try {
        if (!userId) {
            return [];
        }

        const user = await getUserById(userId);
        const following = user.following || [];
        const followers = user.followers || [];

        // Friends are people in both arrays
        const friendIds = following.filter(id => followers.includes(id));

        // Fetch friend user data
        const friends = await Promise.all(
            friendIds.map(async (friendId) => {
                try {
                    return await getUserById(friendId);
                } catch (e) {
                    return null;
                }
            })
        );

        return friends.filter(Boolean);
    } catch (error) {
        return [];
    }
};

/**
 * Get followers of a user
 */
export const getFollowers = async (userId) => {
    try {
        if (!userId) {
            return [];
        }

        const user = await getUserById(userId);
        const followerIds = user.followers || [];

        const followers = await Promise.all(
            followerIds.map(async (id) => {
                try {
                    return await getUserById(id);
                } catch (e) {
                    return null;
                }
            })
        );

        return followers.filter(Boolean);
    } catch (error) {
        return [];
    }
};

/**
 * Get users that a user is following
 */
export const getFollowing = async (userId) => {
    try {
        if (!userId) {
            return [];
        }

        const user = await getUserById(userId);
        const followingIds = user.following || [];

        const following = await Promise.all(
            followingIds.map(async (id) => {
                try {
                    return await getUserById(id);
                } catch (e) {
                    return null;
                }
            })
        );

        return following.filter(Boolean);
    } catch (error) {
        return [];
    }
};

/**
 * Block a user
 */
export const blockUser = async (userId, blockedUserId) => {
    try {
        if (!userId || !blockedUserId || userId === blockedUserId) {
            throw new Error('Invalid block request');
        }

        await assertActorIdentity(userId);
        enforceRateLimit({
            action: 'block_user',
            userId,
            maxActions: 6,
            windowMs: 60 * 1000,
        });

        const user = await getUserById(userId);
        const blockedUsers = user.blockedUsers || [];

        if (blockedUsers.includes(blockedUserId)) {
            return { alreadyBlocked: true };
        }

        const newBlockedUsers = [...blockedUsers, blockedUserId];

        // Also unfollow if following
        const following = user.following || [];
        const newFollowing = following.filter(id => id !== blockedUserId);

        await databases.updateDocument(config.databaseId, config.usersCollectionId, userId, {
            blockedUsers: newBlockedUsers,
            following: newFollowing,
            followingCount: newFollowing.length,
        });

        // Remove blocker from blocked user's followers
        try {
            const blockedUser = await getUserById(blockedUserId);
            const blockedUserFollowers = blockedUser.followers || [];
            const newBlockedUserFollowers = blockedUserFollowers.filter(id => id !== userId);
            const blockedUserFollowing = blockedUser.following || [];
            const newBlockedUserFollowing = blockedUserFollowing.filter(id => id !== userId);

            await databases.updateDocument(config.databaseId, config.usersCollectionId, blockedUserId, {
                followers: newBlockedUserFollowers,
                followersCount: newBlockedUserFollowers.length,
                following: newBlockedUserFollowing,
                followingCount: newBlockedUserFollowing.length,
            });
        } catch (e) {
            // Blocked user update failed, continue
        }

        // Invalidate cache for both users
        await userCacheManager.invalidateUser(userId);
        await userCacheManager.invalidateUser(blockedUserId);

        return { success: true };
    } catch (error) {
        throw error;
    }
};

/**
 * Block a user in chats only (posts remain visible)
 */
export const blockUserChatOnly = async (userId, blockedUserId) => {
    try {
        if (!userId || !blockedUserId || userId === blockedUserId) {
            throw new Error('Invalid chat block request');
        }

        await assertActorIdentity(userId);
        enforceRateLimit({
            action: 'block_user_chat_only',
            userId,
            maxActions: 6,
            windowMs: 60 * 1000,
        });

        const user = await getUserById(userId);
        const chatBlockedUsers = user.chatBlockedUsers || [];

        if (chatBlockedUsers.includes(blockedUserId)) {
            return { alreadyBlocked: true };
        }

        const newChatBlockedUsers = [...chatBlockedUsers, blockedUserId];

        await databases.updateDocument(config.databaseId, config.usersCollectionId, userId, {
            chatBlockedUsers: newChatBlockedUsers,
        });

        await userCacheManager.invalidateUser(userId);

        return { success: true };
    } catch (error) {
        if (error?.message?.includes('Unknown attribute') && error?.message?.includes('chatBlockedUsers')) {
            const schemaError = new Error('CHAT_BLOCK_COLUMN_MISSING');
            schemaError.code = 'CHAT_BLOCK_COLUMN_MISSING';
            throw schemaError;
        }
        throw error;
    }
};

/**
 * Unblock a user in chats only
 */
export const unblockUserChatOnly = async (userId, blockedUserId) => {
    try {
        if (!userId || !blockedUserId) {
            throw new Error('Invalid chat unblock request');
        }

        await assertActorIdentity(userId);

        const user = await getUserById(userId);
        const chatBlockedUsers = user.chatBlockedUsers || [];
        const newChatBlockedUsers = chatBlockedUsers.filter(id => id !== blockedUserId);

        await databases.updateDocument(config.databaseId, config.usersCollectionId, userId, {
            chatBlockedUsers: newChatBlockedUsers,
        });

        await userCacheManager.invalidateUser(userId);

        return { success: true };
    } catch (error) {
        if (error?.message?.includes('Unknown attribute') && error?.message?.includes('chatBlockedUsers')) {
            const schemaError = new Error('CHAT_BLOCK_COLUMN_MISSING');
            schemaError.code = 'CHAT_BLOCK_COLUMN_MISSING';
            throw schemaError;
        }
        throw error;
    }
};

/**
 * Unblock a user
 */
export const unblockUser = async (userId, blockedUserId) => {
    try {
        if (!userId || !blockedUserId) {
            throw new Error('Invalid unblock request');
        }

        await assertActorIdentity(userId);

        const user = await getUserById(userId);
        const blockedUsers = user.blockedUsers || [];
        const newBlockedUsers = blockedUsers.filter(id => id !== blockedUserId);

        await databases.updateDocument(config.databaseId, config.usersCollectionId, userId, {
            blockedUsers: newBlockedUsers,
        });

        // Invalidate cache for the user
        await userCacheManager.invalidateUser(userId);

        return { success: true };
    } catch (error) {
        throw error;
    }
};

/**
 * Get blocked users
 */
export const getBlockedUsers = async (userId) => {
    try {
        if (!userId) {
            return [];
        }

        const user = await getUserById(userId);
        const blockedUserIds = user.blockedUsers || [];

        const blockedUsers = await Promise.all(
            blockedUserIds.map(async (id) => {
                try {
                    return await getUserById(id);
                } catch (e) {
                    return null;
                }
            })
        );

        return blockedUsers.filter(Boolean);
    } catch (error) {
        return [];
    }
};

/**
 * Get chat-only blocked users
 */
export const getChatBlockedUsers = async (userId) => {
    try {
        if (!userId) {
            return [];
        }

        const user = await getUserById(userId);
        const blockedUserIds = user.chatBlockedUsers || [];

        const blockedUsers = await Promise.all(
            blockedUserIds.map(async (id) => {
                try {
                    return await getUserById(id);
                } catch (e) {
                    return null;
                }
            })
        );

        return blockedUsers.filter(Boolean);
    } catch (error) {
        if (error?.message?.includes('Unknown attribute') && error?.message?.includes('chatBlockedUsers')) {
            return [];
        }
        return [];
    }
};

/**
 * Check if a user is blocked
 */
export const isUserBlocked = async (userId, targetUserId) => {
    try {
        if (!userId || !targetUserId) {
            return false;
        }

        const user = await getUserById(userId);
        const blockedUsers = user.blockedUsers || [];
        return blockedUsers.includes(targetUserId);
    } catch (error) {
        return false;
    }
};

/**
 * Sync updated user name across recent chat messages and invalidate caches.
 * Call this after a user updates their display name so existing chat threads
 * and the chat search index reflect the new name immediately.
 */
export const syncUserNameInChats = async (userId, newName) => {
    try {
        if (!userId || !newName) return;

        // Invalidate the user cache so chat list / search picks up the new name
        await userCacheManager.invalidateUser(userId);

        // Update senderName on the user's recent messages (last 200)
        const { config: dbConfig } = require('./config');
        const recentMessages = await databases.listDocuments(
            dbConfig.databaseId,
            dbConfig.messagesCollectionId,
            [
                Query.equal('senderId', userId),
                Query.orderDesc('$createdAt'),
                Query.limit(200),
            ]
        );

        const msgPromises = recentMessages.documents
            .filter(msg => msg.senderName !== newName)
            .map(msg =>
                databases.updateDocument(
                    dbConfig.databaseId,
                    dbConfig.messagesCollectionId,
                    msg.$id,
                    { senderName: newName }
                ).catch(() => null)
            );

        // Update senderName on the user's recent notifications (last 200)
        const recentNotifications = await databases.listDocuments(
            dbConfig.databaseId,
            dbConfig.notificationsCollectionId,
            [
                Query.equal('senderId', userId),
                Query.orderDesc('$createdAt'),
                Query.limit(200),
            ]
        );

        const notifPromises = recentNotifications.documents
            .filter(n => n.senderName !== newName)
            .map(n =>
                databases.updateDocument(
                    dbConfig.databaseId,
                    dbConfig.notificationsCollectionId,
                    n.$id,
                    { senderName: newName }
                ).catch(() => null)
            );

        await Promise.all([...msgPromises, ...notifPromises]);
    } catch (error) {
        // Non-critical — silently fail
    }
};

/**
 * Sync user profile picture across notifications where it's stored.
 * Should be called when a user changes their profile picture.
 */
export const syncUserProfilePicture = async (userId, newProfilePicture) => {
    try {
        if (!userId) return;

        await userCacheManager.invalidateUser(userId);

        const { config: dbConfig } = require('./config');
        const recentNotifications = await databases.listDocuments(
            dbConfig.databaseId,
            dbConfig.notificationsCollectionId,
            [
                Query.equal('senderId', userId),
                Query.orderDesc('$createdAt'),
                Query.limit(200),
            ]
        );

        const promises = recentNotifications.documents
            .filter(n => n.senderProfilePicture !== (newProfilePicture || null))
            .map(n =>
                databases.updateDocument(
                    dbConfig.databaseId,
                    dbConfig.notificationsCollectionId,
                    n.$id,
                    { senderProfilePicture: newProfilePicture || null }
                ).catch(() => null)
            );

        await Promise.all(promises);
    } catch (error) {
        // Non-critical — silently fail
    }
};

/**
 * Update user's lastSeen timestamp for online status tracking.
 * Throttled: only updates if the last write was more than 60 seconds ago.
 */
let _lastSeenWriteTimestamp = 0;
export const updateLastSeen = async (userId) => {
    try {
        if (!userId || typeof userId !== 'string') return;

        const now = Date.now();
        if (now - _lastSeenWriteTimestamp < 60000) return; // throttle to 1 min
        _lastSeenWriteTimestamp = now;

        await databases.updateDocument(
            config.databaseId,
            config.usersCollectionId,
            userId,
            { lastSeen: new Date().toISOString() }
        );
    } catch (error) {
        // Non-critical — silently fail
    }
};

/**
 * Save or update user's push notification token
 * Uses separate pushTokens collection to avoid column limit on users collection
 */
export const updateUserPushToken = async (userId, token, platform = 'unknown') => {
    try {
        if (!userId || !token) {
            return null;
        }

        await assertActorIdentity(userId);

        // Check if user already has a token document
        const existing = await databases.listDocuments(
            config.databaseId,
            config.pushTokensCollectionId,
            [Query.equal('userId', userId), Query.limit(1)]
        );

        if (existing.documents.length > 0) {
            const doc = existing.documents[0];
            if (doc.token !== token) {
                return await databases.updateDocument(
                    config.databaseId,
                    config.pushTokensCollectionId,
                    doc.$id,
                    { token, platform }
                );
            }
            return doc;
        } else {
            return await databases.createDocument(
                config.databaseId,
                config.pushTokensCollectionId,
                ID.unique(),
                { userId, token, platform }
            );
        }
    } catch (error) {
        throw error;
    }
};
export const getUserPushToken = async (userId) => {
    try {
        if (!userId) {
            return null;
        }

        const result = await databases.listDocuments(
            config.databaseId,
            config.pushTokensCollectionId,
            [Query.equal('userId', userId), Query.limit(1)]
        );

        if (result.documents.length > 0) {
            return result.documents[0].token;
        }
        return null;
    } catch (error) {
        return null;
    }
};

/**
 * Delete user's push token (for logout)
 */
export const deleteUserPushToken = async (userId) => {
    try {
        if (!userId) return;

        const existing = await databases.listDocuments(
            config.databaseId,
            config.pushTokensCollectionId,
            [Query.equal('userId', userId), Query.limit(1)]
        );

        if (existing.documents.length > 0) {
            await databases.deleteDocument(
                config.databaseId,
                config.pushTokensCollectionId,
                existing.documents[0].$id
            );
        }
    } catch (error) {
        // Silent fail
    }
};
