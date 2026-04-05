import { account, databases, config } from './config';
import { ID, Query, Permission, Role } from 'appwrite';
import { repliesCacheManager } from '../app/utils/cacheManager';
import { enforceRateLimit } from './securityGuards';
import { getUserById } from './users';
import { canGuestReply, GUEST_COMMENT_RATE_LIMIT, isGuest } from '../app/utils/guestUtils';
import { notifyPostReply, notifyReplyLike, notifyReplyReply } from './notifications';
import telemetry from '../app/utils/telemetry';

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
        telemetry.recordEvent('replies_create_start', {
            hasReplyData: !!replyData,
            postId: replyData?.postId || '',
            hasText: typeof replyData?.text === 'string' && replyData.text.trim().length > 0,
            parentReplyId: replyData?.parentReplyId || '',
        });

        if (!replyData || typeof replyData !== 'object') {
            throw new Error('Invalid reply data');
        }
        
        if (!replyData.postId) {
            throw new Error('Missing required fields');
        }

        const currentUserId = await getAuthenticatedUserId();
        const effectiveReplyData = {
            ...replyData,
            userId: currentUserId,
        };

        const normalizedText = typeof effectiveReplyData.text === 'string'
            ? effectiveReplyData.text.trim()
            : '';
        if (!normalizedText) {
            throw new Error('Reply text is required');
        }

        if (normalizedText.length > 500) {
            throw new Error('Reply text is too long');
        }

        const sanitizeStringArray = (value) => {
            if (!Array.isArray(value)) {
                return [];
            }

            return value
                .map((item) => String(item || '').trim())
                .filter(Boolean);
        };

        const payload = {
            postId: effectiveReplyData.postId,
            userId: currentUserId,
            text: normalizedText,
            isAccepted: Boolean(effectiveReplyData.isAccepted),
            images: sanitizeStringArray(effectiveReplyData.images),
            imageDeleteUrls: sanitizeStringArray(effectiveReplyData.imageDeleteUrls),
            links: sanitizeStringArray(effectiveReplyData.links),
            upvotedBy: sanitizeStringArray(effectiveReplyData.upvotedBy),
            downvotedBy: sanitizeStringArray(effectiveReplyData.downvotedBy),
            upCount: Number.isFinite(Number(effectiveReplyData.upCount)) ? Number(effectiveReplyData.upCount) : 0,
            downCount: Number.isFinite(Number(effectiveReplyData.downCount)) ? Number(effectiveReplyData.downCount) : 0,
            likeCount: Number.isFinite(Number(effectiveReplyData.likeCount)) ? Number(effectiveReplyData.likeCount) : 0,
            isEdited: Boolean(effectiveReplyData.isEdited),
        };

        const parentReplyId = typeof effectiveReplyData.parentReplyId === 'string'
            ? effectiveReplyData.parentReplyId.trim()
            : '';
        if (parentReplyId) {
            payload.parentReplyId = parentReplyId;
        }

        const post = await databases.getDocument({
            databaseId: config.databaseId,
            collectionId: config.postsCollectionId,
            documentId: payload.postId,
        });

        telemetry.recordEvent('replies_create_post_fetched', {
            postId: payload.postId,
            postOwnerId: post?.userId || '',
            currentUserId,
        });

        const [currentUserDoc, postAuthorDoc] = await Promise.all([
            getUserById(currentUserId),
            getUserById(post.userId),
        ]);

        if (!canGuestReply(currentUserDoc, postAuthorDoc)) {
            const restrictionError = new Error('Guests can only reply to posts from students they are friends with.');
            restrictionError.code = 'GUEST_REPLY_RESTRICTED';
            throw restrictionError;
        }

        const replyPermissions = [
            Permission.read(Role.users()),
            Permission.update(Role.users()),
            Permission.delete(Role.user(currentUserId)),
        ];

        const uniqueReplyPermissions = Array.from(new Set(replyPermissions));

        telemetry.recordEvent('replies_create_permissions_prepared', {
            postId: payload.postId,
            currentUserId,
            permissions: uniqueReplyPermissions,
        });

        const isGuestAuthor = isGuest(currentUserDoc);

        enforceRateLimit({
            action: 'create_reply',
            userId: currentUserId,
            maxActions: isGuestAuthor ? GUEST_COMMENT_RATE_LIMIT.maxActions : 8,
            windowMs: isGuestAuthor ? GUEST_COMMENT_RATE_LIMIT.windowMs : (60 * 1000),
        });
        
        const reply = await databases.createDocument({
            databaseId: config.databaseId,
            collectionId: config.repliesCollectionId,
            documentId: ID.unique(),
            data: payload,
            permissions: uniqueReplyPermissions,
        });

        telemetry.recordEvent('replies_create_success', {
            postId: payload.postId,
            replyId: reply?.$id || '',
            parentReplyId: payload.parentReplyId || '',
        });

        await incrementPostReplyCount(payload.postId);

        try {
            const [actor, post] = await Promise.all([
                getUserById(currentUserId),
                Promise.resolve(post),
            ]);

            const actorName = actor?.name || actor?.fullName || 'Someone';
            const actorPhoto = actor?.profilePicture || null;
            const replyTextPreview = (payload.text || '').trim();

            if (payload.parentReplyId) {
                const parentReply = await databases.getDocument({
                    databaseId: config.databaseId,
                    collectionId: config.repliesCollectionId,
                    documentId: payload.parentReplyId,
                });

                if (parentReply?.userId && parentReply.userId !== currentUserId) {
                    notifyReplyReply(
                        parentReply.userId,
                        currentUserId,
                        actorName,
                        actorPhoto,
                        payload.postId,
                        replyTextPreview,
                        parentReply.$id,
                        reply?.$id
                    ).catch(() => {
                        // Silent fail - reply creation should not fail on notify
                    });
                }
            } else if (post?.userId && post.userId !== currentUserId) {
                notifyPostReply(
                    post.userId,
                    currentUserId,
                    actorName,
                    actorPhoto,
                    payload.postId,
                    replyTextPreview,
                    reply?.$id
                ).catch(() => {
                    // Silent fail - reply creation should not fail on notify
                });
            }
        } catch (notificationError) {
            // Silent fail - reply creation should not fail on notify
        }
        
        // Invalidate replies cache for this post
        await repliesCacheManager.invalidateReplies(payload.postId);

        return reply;
    } catch (error) {
        telemetry.recordEvent('replies_create_failed', {
            postId: replyData?.postId || '',
            parentReplyId: replyData?.parentReplyId || '',
            errorMessage: error?.message || String(error || ''),
            errorCode: error?.code || error?.status || '',
            errorType: error?.type || '',
            response: error?.response || null,
        });
        throw error;
    }
};

export const getReply = async (replyId) => {
    try {
        if (!replyId || typeof replyId !== 'string') {
            throw new Error('Invalid reply ID');
        }
        
        const reply = await databases.getDocument({
            databaseId: config.databaseId,
            collectionId: config.repliesCollectionId,
            documentId: replyId,
        });
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
            if (cached?.value) {
                // Return stale cache immediately — caller re-fetches on pull-to-refresh
                return cached.value;
            }
        }
        
        const replies = await databases.listDocuments({
            databaseId: config.databaseId,
            collectionId: config.repliesCollectionId,
            queries: [
                Query.equal('postId', postId),
                Query.orderDesc('upCount'),
                Query.limit(Math.min(limit, 100)),
                Query.offset(offset)
            ],
        });
        
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
        
        const replies = await databases.listDocuments({
            databaseId: config.databaseId,
            collectionId: config.repliesCollectionId,
            queries: [
                Query.equal('userId', userId),
                Query.orderDesc('$createdAt'),
                Query.limit(Math.min(limit, 100)),
                Query.offset(offset)
            ],
        });
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
        const existingReply = await databases.getDocument({
            databaseId: config.databaseId,
            collectionId: config.repliesCollectionId,
            documentId: replyId,
        });

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

            const nowUpvoted = nextUpvotedBy.includes(currentUserId);
            const wasUpvoted = currentUpvotedBy.includes(currentUserId);
            const didAddUpvote = nowUpvoted && !wasUpvoted;

            if (didAddUpvote && existingReply.userId && existingReply.userId !== currentUserId) {
                try {
                    const actor = await getUserById(currentUserId);
                    notifyReplyLike(
                        existingReply.userId,
                        currentUserId,
                        actor?.name || actor?.fullName || 'Someone',
                        actor?.profilePicture || null,
                        existingReply.postId,
                        existingReply.$id,
                        (existingReply.text || '').trim()
                    ).catch(() => {
                        // Silent fail - voting should not fail on notify
                    });
                } catch (notificationError) {
                    // Silent fail - voting should not fail on notify
                }
            }
        }

        delete replyData.userId;
        delete replyData.postId;
        delete replyData.$id;

        // Only add isEdited if text is being changed (not for vote updates)
        const updateData = { ...replyData };
        if (replyData.text !== undefined && replyData.isEdited !== false) {
            updateData.isEdited = true;
        }

        const reply = await databases.updateDocument({
            databaseId: config.databaseId,
            collectionId: config.repliesCollectionId,
            documentId: replyId,
            data: updateData,
        });
        
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
            databases.getDocument({
                databaseId: config.databaseId,
                collectionId: config.repliesCollectionId,
                documentId: replyId,
            }),
            databases.getDocument({
                databaseId: config.databaseId,
                collectionId: config.postsCollectionId,
                documentId: postId,
            }),
        ]);

        const canDelete = reply?.userId === currentUserId || post?.userId === currentUserId;
        if (!canDelete) {
            throw new Error('Not authorized to delete this reply');
        }
        
        await databases.deleteDocument({
            databaseId: config.databaseId,
            collectionId: config.repliesCollectionId,
            documentId: replyId,
        });

        await decrementPostReplyCount(postId);
        
        // Invalidate replies cache for this post
        await repliesCacheManager.invalidateReplies(postId);

        if (imageDeleteUrls && imageDeleteUrls.length > 0) {
        }
    } catch (error) {
        throw error;
    }
};

export const deleteRepliesByPost = async (postId, options = {}) => {
    try {
        if (!postId || typeof postId !== 'string') {
            throw new Error('Invalid post ID');
        }

        const { continueOnDeleteError = false } = options;
        
        let hasMore = true;
        const allImageDeleteUrls = [];
        
        while (hasMore) {
            const replies = await databases.listDocuments({
                databaseId: config.databaseId,
                collectionId: config.repliesCollectionId,
                queries: [
                    Query.equal('postId', postId),
                    Query.orderAsc('$createdAt'),
                    Query.limit(100)
                ],
            });
            
            if (replies.documents.length === 0) {
                hasMore = false;
                break;
            }
            
            for (const reply of replies.documents) {
                try {
                    await databases.deleteDocument({
                        databaseId: config.databaseId,
                        collectionId: config.repliesCollectionId,
                        documentId: reply.$id,
                    });
                } catch (error) {
                    if (!continueOnDeleteError) {
                        throw error;
                    }
                    continue;
                }

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
        
        await databases.updateDocument({
            databaseId: config.databaseId,
            collectionId: config.repliesCollectionId,
            documentId: replyId,
            data: { isAccepted: true },
        });
    } catch (error) {
        throw error;
    }
};

export const unmarkReplyAsAccepted = async (replyId) => {
    try {
        if (!replyId || typeof replyId !== 'string') {
            throw new Error('Invalid reply ID');
        }
        
        await databases.updateDocument({
            databaseId: config.databaseId,
            collectionId: config.repliesCollectionId,
            documentId: replyId,
            data: { isAccepted: false },
        });
    } catch (error) {
        throw error;
    }
};

const incrementPostReplyCount = async (postId) => {
    try {
        const { getPost } = require('./posts');
        const post = await getPost(postId);
        const newCount = (post.replyCount || 0) + 1;
        await databases.updateDocument({
            databaseId: config.databaseId,
            collectionId: config.postsCollectionId,
            documentId: postId,
            data: { replyCount: newCount },
        });
    } catch (error) {
    }
};

const decrementPostReplyCount = async (postId) => {
    try {
        const { getPost } = require('./posts');
        const post = await getPost(postId);
        const newCount = Math.max(0, (post.replyCount || 0) - 1);
        await databases.updateDocument({
            databaseId: config.databaseId,
            collectionId: config.postsCollectionId,
            documentId: postId,
            data: { replyCount: newCount },
        });
    } catch (error) {
    }
};
