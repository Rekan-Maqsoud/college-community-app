import { databases, config } from './config';
import { ID, Query } from 'appwrite';
import { repliesCacheManager } from '../app/utils/cacheManager';

export const createReply = async (replyData) => {
    try {
        if (!replyData || typeof replyData !== 'object') {
            throw new Error('Invalid reply data');
        }
        
        if (!replyData.postId || !replyData.userId) {
            throw new Error('Missing required fields');
        }
        
        const reply = await databases.createDocument(
            config.databaseId,
            config.repliesCollectionId,
            ID.unique(),
            replyData
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
        await databases.updateDocument(
            config.databaseId,
            config.postsCollectionId,
            postId,
            { replyCount: (post.replyCount || 0) + 1 }
        );
    } catch (error) {
    }
};

const decrementPostReplyCount = async (postId) => {
    try {
        const { getPost } = require('./posts');
        const post = await getPost(postId);
        await databases.updateDocument(
            config.databaseId,
            config.postsCollectionId,
            postId,
            { replyCount: Math.max(0, (post.replyCount || 0) - 1) }
        );
    } catch (error) {
    }
};
