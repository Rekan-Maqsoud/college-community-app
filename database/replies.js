import { account, databases, config } from './config';
import { ID, Query, Permission, Role } from 'appwrite';
import { repliesCacheManager } from '../app/utils/cacheManager';
import { broadcastReplyCount } from '../app/hooks/useFirebaseRealtime';
import { enforceRateLimit } from './securityGuards';

const getAuthenticatedUserId = async () => {
    const currentUser = await account.get();
    const currentUserId = currentUser?.$id;
    if (!currentUserId) {
        throw new Error('Authentication required');
    }
    return currentUserId;
};

const getChangedIds = (before = [], after = []) => {
    const beforeSet = new Set(before);
    const afterSet = new Set(after);
    const changed = new Set();

    beforeSet.forEach((id) => {
        if (!afterSet.has(id)) {
            changed.add(id);
        }
    });

    afterSet.forEach((id) => {
        if (!beforeSet.has(id)) {
            changed.add(id);
        }
    });

    return Array.from(changed);
};

export const createReply = async (replyData) => {
    try {
        if (!replyData || typeof replyData !== 'object') {
            throw new Error('Invalid reply data');
        }
        
        if (!replyData.postId || !replyData.userId) {
            throw new Error('Missing required fields');
        }

        const currentUserId = await getAuthenticatedUserId();
        if (replyData.userId !== currentUserId) {
            throw new Error('User identity mismatch');
        }

        enforceRateLimit({
            action: 'create_reply',
            userId: currentUserId,
            maxActions: 8,
            windowMs: 60 * 1000,
        });
        
        const reply = await databases.createDocument(
            config.databaseId,
            config.repliesCollectionId,
            ID.unique(),
            replyData,
            [
                Permission.read(Role.users()),
                Permission.update(Role.user(currentUserId)),
                Permission.delete(Role.user(currentUserId)),
            ]
        );

        await incrementPostReplyCount(replyData.postId);
        
        // Invalidate replies cache for this post
        await repliesCacheManager.invalidateReplies(replyData.postId);

        return reply;
    } catch (error) {
        throw error;
    }
};

export const getReply = async (replyId) => {
    try {
        if (!replyId || typeof replyId !== 'string') {
            throw new Error('Invalid reply ID');
        }
        
        const reply = await databases.getDocument(
            config.databaseId,
            config.repliesCollectionId,
            replyId
        );
        return reply;
    } catch (error) {
        throw error;
    }
};

export const getRepliesByPost = async (postId, limit = 50, offset = 0, useCache = true) => {
    try {
        if (!postId || typeof postId !== 'string') {
            throw new Error('Invalid post ID');
        }
        
        // Try to get cached data first (only for initial load without offset)
        if (useCache && offset === 0) {
            const cached = await repliesCacheManager.getCachedReplies(postId);
            if (cached?.value && !cached.isStale) {
                return cached.value;
            }
        }
        
        const replies = await databases.listDocuments(
            config.databaseId,
            config.repliesCollectionId,
            [
                Query.equal('postId', postId),
                Query.orderDesc('upCount'),
                Query.limit(Math.min(limit, 100)),
                Query.offset(offset)
            ]
        );
        
        // Cache the replies for initial load
        if (offset === 0) {
            await repliesCacheManager.cacheReplies(postId, replies.documents);
        }
        
        return replies.documents;
    } catch (error) {
        // On network error, try to return stale cache
        if (offset === 0) {
            const cached = await repliesCacheManager.getCachedReplies(postId);
            if (cached?.value) {
                return cached.value;
            }
        }
        throw error;
    }
};

export const getRepliesByUser = async (userId, limit = 20, offset = 0) => {
    try {
        if (!userId || typeof userId !== 'string') {
            throw new Error('Invalid user ID');
        }
        
        const replies = await databases.listDocuments(
            config.databaseId,
            config.repliesCollectionId,
            [
                Query.equal('userId', userId),
                Query.orderDesc('$createdAt'),
                Query.limit(Math.min(limit, 100)),
                Query.offset(offset)
            ]
        );
        return replies.documents;
    } catch (error) {
        throw error;
    }
};

export const updateReply = async (replyId, replyData, postId = null) => {
    try {
        if (!replyId || typeof replyId !== 'string') {
            throw new Error('Invalid reply ID');
        }
        
        if (!replyData || typeof replyData !== 'object') {
            throw new Error('Invalid reply data');
        }
        
        const currentUserId = await getAuthenticatedUserId();
        const existingReply = await databases.getDocument(
            config.databaseId,
            config.repliesCollectionId,
            replyId
        );

        const isContentEdit = (
            replyData.text !== undefined
            || replyData.images !== undefined
            || replyData.imageDeleteUrls !== undefined
            || replyData.links !== undefined
            || replyData.parentReplyId !== undefined
        );

        if (isContentEdit && existingReply.userId !== currentUserId) {
            throw new Error('Not authorized to edit this reply');
        }

        const hasVoteUpdate = (
            replyData.upvotedBy !== undefined
            || replyData.downvotedBy !== undefined
            || replyData.upCount !== undefined
            || replyData.downCount !== undefined
        );

        if (hasVoteUpdate) {
            const nextUpvotedBy = Array.isArray(replyData.upvotedBy)
                ? replyData.upvotedBy
                : (Array.isArray(existingReply.upvotedBy) ? existingReply.upvotedBy : []);
            const nextDownvotedBy = Array.isArray(replyData.downvotedBy)
                ? replyData.downvotedBy
                : (Array.isArray(existingReply.downvotedBy) ? existingReply.downvotedBy : []);

            const currentUpvotedBy = Array.isArray(existingReply.upvotedBy) ? existingReply.upvotedBy : [];
            const currentDownvotedBy = Array.isArray(existingReply.downvotedBy) ? existingReply.downvotedBy : [];

            const changedUpvoteIds = getChangedIds(currentUpvotedBy, nextUpvotedBy);
            const changedDownvoteIds = getChangedIds(currentDownvotedBy, nextDownvotedBy);

            if (
                changedUpvoteIds.some((id) => id !== currentUserId)
                || changedDownvoteIds.some((id) => id !== currentUserId)
            ) {
                throw new Error('Not authorized to modify other users votes');
            }

            if (nextUpvotedBy.includes(currentUserId) && nextDownvotedBy.includes(currentUserId)) {
                throw new Error('Invalid vote state');
            }

            replyData.upvotedBy = nextUpvotedBy;
            replyData.downvotedBy = nextDownvotedBy;
            replyData.upCount = nextUpvotedBy.length;
            replyData.downCount = nextDownvotedBy.length;
        }

        delete replyData.userId;
        delete replyData.postId;
        delete replyData.$id;

        // Only add isEdited if text is being changed (not for vote updates)
        const updateData = { ...replyData };
        if (replyData.text !== undefined && replyData.isEdited !== false) {
            updateData.isEdited = true;
        }

        const reply = await databases.updateDocument(
            config.databaseId,
            config.repliesCollectionId,
            replyId,
            updateData
        );
        
        // Invalidate replies cache if postId is provided
        if (postId) {
            await repliesCacheManager.invalidateReplies(postId);
        }
        
        return reply;
    } catch (error) {
        throw error;
    }
};

export const deleteReply = async (replyId, postId, imageDeleteUrls = []) => {
    try {
        if (!replyId || typeof replyId !== 'string') {
            throw new Error('Invalid reply ID');
        }
        
        if (!postId || typeof postId !== 'string') {
            throw new Error('Invalid post ID');
        }

        const currentUserId = await getAuthenticatedUserId();
        const [reply, post] = await Promise.all([
            databases.getDocument(config.databaseId, config.repliesCollectionId, replyId),
            databases.getDocument(config.databaseId, config.postsCollectionId, postId),
        ]);

        const canDelete = reply?.userId === currentUserId || post?.userId === currentUserId;
        if (!canDelete) {
            throw new Error('Not authorized to delete this reply');
        }
        
        await databases.deleteDocument(
            config.databaseId,
            config.repliesCollectionId,
            replyId
        );

        await decrementPostReplyCount(postId);
        
        // Invalidate replies cache for this post
        await repliesCacheManager.invalidateReplies(postId);

        if (imageDeleteUrls && imageDeleteUrls.length > 0) {
        }
    } catch (error) {
        throw error;
    }
};

export const deleteRepliesByPost = async (postId) => {
    try {
        if (!postId || typeof postId !== 'string') {
            throw new Error('Invalid post ID');
        }
        
        let hasMore = true;
        const allImageDeleteUrls = [];
        
        while (hasMore) {
            const replies = await databases.listDocuments(
                config.databaseId,
                config.repliesCollectionId,
                [
                    Query.equal('postId', postId),
                    Query.limit(100)
                ]
            );
            
            if (replies.documents.length === 0) {
                hasMore = false;
                break;
            }
            
            for (const reply of replies.documents) {
                await databases.deleteDocument(
                    config.databaseId,
                    config.repliesCollectionId,
                    reply.$id
                );

                if (reply.imageDeleteUrls && reply.imageDeleteUrls.length > 0) {
                    allImageDeleteUrls.push(...reply.imageDeleteUrls);
                }
            }
            
            if (replies.documents.length < 100) {
                hasMore = false;
            }
        }
        
        if (allImageDeleteUrls.length > 0) {
            const { deleteMultipleImages } = require('../services/imgbbService');
            await deleteMultipleImages(allImageDeleteUrls);
        }
        
        await repliesCacheManager.invalidateReplies(postId);
    } catch (error) {
        throw error;
    }
};

export const markReplyAsAccepted = async (replyId) => {
    try {
        if (!replyId || typeof replyId !== 'string') {
            throw new Error('Invalid reply ID');
        }
        
        await databases.updateDocument(
            config.databaseId,
            config.repliesCollectionId,
            replyId,
            { isAccepted: true }
        );
    } catch (error) {
        throw error;
    }
};

export const unmarkReplyAsAccepted = async (replyId) => {
    try {
        if (!replyId || typeof replyId !== 'string') {
            throw new Error('Invalid reply ID');
        }
        
        await databases.updateDocument(
            config.databaseId,
            config.repliesCollectionId,
            replyId,
            { isAccepted: false }
        );
    } catch (error) {
        throw error;
    }
};

const incrementPostReplyCount = async (postId) => {
    try {
        const { getPost } = require('./posts');
        const post = await getPost(postId);
        const newCount = (post.replyCount || 0) + 1;
        await databases.updateDocument(
            config.databaseId,
            config.postsCollectionId,
            postId,
            { replyCount: newCount }
        );
        broadcastReplyCount(postId, newCount);
    } catch (error) {
    }
};

const decrementPostReplyCount = async (postId) => {
    try {
        const { getPost } = require('./posts');
        const post = await getPost(postId);
        const newCount = Math.max(0, (post.replyCount || 0) - 1);
        await databases.updateDocument(
            config.databaseId,
            config.postsCollectionId,
            postId,
            { replyCount: newCount }
        );
        broadcastReplyCount(postId, newCount);
    } catch (error) {
    }
};
