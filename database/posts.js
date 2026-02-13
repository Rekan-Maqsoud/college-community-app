import { databases, storage, config } from './config';
import { ID, Query } from 'appwrite';
import { handleNetworkError } from '../app/utils/networkErrorHandler';
import { postsCacheManager } from '../app/utils/cacheManager';
import { getUserById } from './users';
import { notifyDepartmentPost, notifyPostHiddenByReports } from './notifications';

const REPORT_HIDE_THRESHOLD = 5;
const REPORT_HIDE_MAX_VIEWS = 20;
const REPORT_HIDE_MIN_REPORTERS = 2;
const REPORT_HIDE_SCORE_THRESHOLD = 8;
const REPORT_REASONS = [
    'spam',
    'harassment',
    'inappropriate',
    'misinformation',
    'hate_speech',
    'violence',
    'self_harm',
    'copyright',
    'other',
];
const REPORT_FEEDBACK_REASONS = ['dont_like'];
const REPORT_REASON_WEIGHTS = {
    self_harm: 6,
    violence: 5,
    hate_speech: 5,
    harassment: 4,
    misinformation: 3,
    inappropriate: 3,
    copyright: 3,
    spam: 2,
    other: 1,
};
const DEFAULT_REPORT_REVIEW_WEBHOOK = 'https://discord.com/api/webhooks/1471830877049720842/CMWl-KzBZXuv0QaM73QUlsjYHh5sN9p_86EHRNgeOvy7P11WORRk-gMiH9cDpP-gw86N';

const sanitizeReportReason = (reason = '') => {
    const normalized = String(reason || '').trim().toLowerCase();
    return REPORT_REASONS.includes(normalized) ? normalized : 'other';
};

const sanitizeModerationReason = (reason = '') => {
    const normalized = String(reason || '').trim().toLowerCase();
    if (REPORT_REASONS.includes(normalized)) return normalized;
    if (REPORT_FEEDBACK_REASONS.includes(normalized)) return normalized;
    return 'other';
};

const isSchemaAttributeError = (error) => {
    const message = String(error?.message || '').toLowerCase();
    return message.includes('unknown attribute')
        || message.includes('attribute not found')
        || (message.includes('invalid document') && message.includes('attribute'));
};

const isHiddenForViewer = (post, viewerId = null) => {
    if (!post || !post.isHidden) return false;
    return post.userId !== viewerId;
};

const filterPostsByVisibility = (posts = [], viewerId = null) => {
    return posts.filter(post => !isHiddenForViewer(post, viewerId));
};

const calculateReportScore = (reasons = []) => {
    return reasons.reduce((total, reason) => {
        const normalizedReason = sanitizeReportReason(reason);
        return total + (REPORT_REASON_WEIGHTS[normalizedReason] || 1);
    }, 0);
};

export const createPost = async (postData) => {
    try {
        if (!postData || typeof postData !== 'object') {
            throw new Error('Invalid post data');
        }
        
        // Post must have userId and at least one of: topic, text, or images
        if (!postData.userId) {
            throw new Error('User ID is required');
        }
        
        const hasTopic = postData.topic && postData.topic.trim().length > 0;
        const hasText = postData.text && postData.text.trim().length > 0;
        const hasImages = postData.images && postData.images.length > 0;
        
        if (!hasTopic && !hasText && !hasImages) {
            throw new Error('Post must have topic, text, or images');
        }
        
        // Extract notification-only fields before creating document
        const { userName, fullName, profilePicture: posterPhoto, ...documentData } = postData;

        const post = await databases.createDocument(
            config.databaseId,
            config.postsCollectionId,
            ID.unique(),
            documentData
        );
        
        // Invalidate posts cache for the department
        await postsCacheManager.invalidatePostsCache(postData.department);
        
        // Send department match notifications in background (non-blocking)
        if (postData.userId && postData.department) {
            notifyDepartmentPost(
                postData.userId,
                userName || fullName || 'Someone',
                posterPhoto || null,
                post.$id,
                postData.postType || 'post',
                postData.topic || postData.text || '',
                postData.department,
                postData.stage || 'all'
            ).catch(() => {
                // Silent fail - should not break post creation
            });
        }
        
        return post;
    } catch (error) {
        throw error;
    }
};

export const getPost = async (postId, viewerId = null) => {
    try {
        if (!postId || typeof postId !== 'string') {
            throw new Error('Invalid post ID');
        }
        
        const post = await databases.getDocument(
            config.databaseId,
            config.postsCollectionId,
            postId
        );

        if (isHiddenForViewer(post, viewerId)) {
            throw new Error('Post not found');
        }

        return post;
    } catch (error) {
        throw error;
    }
};

export const getPosts = async (filters = {}, limit = 20, offset = 0, useCache = true, sortBy = 'newest', blockedUserIds = [], currentUserId = null) => {
    const cacheKey = postsCacheManager.generateCacheKey(filters, limit, offset) + `_sort_${sortBy}`;
    
    try {
        // Try to get cached data first
        if (useCache && offset === 0) {
            const cached = await postsCacheManager.getCachedPosts(cacheKey);
            if (cached?.value && !cached.isStale) {
                const visibleCached = filterPostsByVisibility(cached.value, currentUserId);
                // Filter blocked users from cached results
                if (blockedUserIds.length > 0) {
                    return visibleCached.filter(post => !blockedUserIds.includes(post.userId));
                }
                return visibleCached;
            }
        }
        
        const queries = [
            Query.limit(limit),
            Query.offset(offset),
        ];

        // Add sort order
        if (sortBy === 'oldest') {
            queries.push(Query.orderAsc('$createdAt'));
        } else if (sortBy === 'popular') {
            queries.push(Query.orderDesc('likeCount'));
        } else {
            queries.push(Query.orderDesc('$createdAt'));
        }

        if (filters.department) {
            queries.push(Query.equal('department', filters.department));
        }
        if (filters.stage && filters.stage !== 'all') {
            queries.push(Query.equal('stage', filters.stage));
        }
        if (filters.postType && filters.postType !== 'all') {
            queries.push(Query.equal('postType', filters.postType));
        }
        if (filters.answerStatus && filters.answerStatus !== 'all') {
            queries.push(Query.equal('isResolved', filters.answerStatus === 'answered'));
        }
        if (filters.userId) {
            queries.push(Query.equal('userId', filters.userId));
        }

        const posts = await databases.listDocuments(
            config.databaseId,
            config.postsCollectionId,
            queries
        );
        
        // Cache the results for first page
        if (offset === 0) {
            await postsCacheManager.cachePosts(cacheKey, posts.documents);
        }

        // Filter out posts from blocked users
        let results = filterPostsByVisibility(posts.documents, currentUserId);
        if (Array.isArray(blockedUserIds) && blockedUserIds.length > 0) {
            results = results.filter(post => !blockedUserIds.includes(post.userId));
        }
        
        return results;
    } catch (error) {
        // On network error, try to return stale cache
        if (offset === 0) {
            const cached = await postsCacheManager.getCachedPosts(cacheKey);
            if (cached?.value) {
                return filterPostsByVisibility(cached.value, currentUserId);
            }
        }
        const errorInfo = handleNetworkError(error);
        throw error;
    }
};

export const getPostsByDepartments = async (departments = [], stage = 'all', limit = 20, offset = 0, useCache = true, sortBy = 'newest', postType = 'all', answerStatus = 'all', blockedUserIds = [], currentUserId = null) => {
    const cacheKey = `posts_multi_depts_${departments.sort().join('-')}_stage_${stage}_type_${postType}_answer_${answerStatus}_sort_${sortBy}_l${limit}_o${offset}`;
    
    try {
        if (!departments || departments.length === 0) {
            return [];
        }

        // Try to get cached data first
        if (useCache && offset === 0) {
            const cached = await postsCacheManager.getCachedPosts(cacheKey);
            if (cached?.value && !cached.isStale) {
                return filterPostsByVisibility(cached.value, currentUserId);
            }
        }

        const queries = [
            Query.equal('department', departments),
            Query.limit(limit),
            Query.offset(offset),
        ];

        // Add sort order
        if (sortBy === 'oldest') {
            queries.push(Query.orderAsc('$createdAt'));
        } else if (sortBy === 'popular') {
            queries.push(Query.orderDesc('likeCount'));
        } else {
            queries.push(Query.orderDesc('$createdAt'));
        }

        if (stage && stage !== 'all') {
            queries.push(Query.equal('stage', stage));
        }

        if (postType && postType !== 'all') {
            queries.push(Query.equal('postType', postType));
        }

        if (answerStatus && answerStatus !== 'all') {
            queries.push(Query.equal('isResolved', answerStatus === 'answered'));
        }

        const posts = await databases.listDocuments(
            config.databaseId,
            config.postsCollectionId,
            queries
        );
        
        // Cache the results for first page
        if (offset === 0) {
            await postsCacheManager.cachePosts(cacheKey, posts.documents);
        }

        // Filter out posts from blocked users
        let deptResults = filterPostsByVisibility(posts.documents, currentUserId);
        if (Array.isArray(blockedUserIds) && blockedUserIds.length > 0) {
            deptResults = deptResults.filter(post => !blockedUserIds.includes(post.userId));
        }
        
        return deptResults;
    } catch (error) {
        // On network error, try to return stale cache
        if (offset === 0) {
            const cached = await postsCacheManager.getCachedPosts(cacheKey);
            if (cached?.value) {
                return filterPostsByVisibility(cached.value, currentUserId);
            }
        }
        const errorInfo = handleNetworkError(error);
        throw error;
    }
};

export const getAllPublicPosts = async (stage = 'all', limit = 20, offset = 0, useCache = true, sortBy = 'newest', postType = 'all', answerStatus = 'all', blockedUserIds = [], currentUserId = null) => {
    const cacheKey = `posts_public_stage_${stage}_type_${postType}_answer_${answerStatus}_sort_${sortBy}_l${limit}_o${offset}`;
    
    try {
        // Try to get cached data first
        if (useCache && offset === 0) {
            const cached = await postsCacheManager.getCachedPosts(cacheKey);
            if (cached?.value && !cached.isStale) {
                return filterPostsByVisibility(cached.value, currentUserId);
            }
        }
        
        const queries = [
            Query.limit(limit),
            Query.offset(offset),
        ];

        // Add sort order
        if (sortBy === 'oldest') {
            queries.push(Query.orderAsc('$createdAt'));
        } else if (sortBy === 'popular') {
            queries.push(Query.orderDesc('likeCount'));
        } else {
            queries.push(Query.orderDesc('$createdAt'));
        }

        if (stage && stage !== 'all') {
            queries.push(Query.equal('stage', stage));
        }

        if (postType && postType !== 'all') {
            queries.push(Query.equal('postType', postType));
        }

        if (answerStatus && answerStatus !== 'all') {
            queries.push(Query.equal('isResolved', answerStatus === 'answered'));
        }

        const posts = await databases.listDocuments(
            config.databaseId,
            config.postsCollectionId,
            queries
        );
        
        // Cache the results for first page
        if (offset === 0) {
            await postsCacheManager.cachePosts(cacheKey, posts.documents);
        }

        // Filter out posts from blocked users
        let publicResults = filterPostsByVisibility(posts.documents, currentUserId);
        if (Array.isArray(blockedUserIds) && blockedUserIds.length > 0) {
            publicResults = publicResults.filter(post => !blockedUserIds.includes(post.userId));
        }
        
        return publicResults;
    } catch (error) {
        // On network error, try to return stale cache
        if (offset === 0) {
            const cached = await postsCacheManager.getCachedPosts(cacheKey);
            if (cached?.value) {
                return filterPostsByVisibility(cached.value, currentUserId);
            }
        }
        const errorInfo = handleNetworkError(error);
        throw error;
    }
};

export const getPostsByDepartmentAndStage = async (department, stage, limit = 20, offset = 0, currentUserId = null) => {
    return getPosts({ department, stage }, limit, offset, true, 'newest', [], currentUserId);
};

export const getPostsByUser = async (userId, limit = 20, offset = 0, currentUserId = null) => {
    return getPosts({ userId }, limit, offset, true, 'newest', [], currentUserId);
};

export const searchPosts = async (searchQuery, userDepartment = null, userMajor = null, limit = 20, currentUserId = null) => {
    try {
        if (!searchQuery || searchQuery.trim().length === 0) {
            return [];
        }
        
        const sanitizedQuery = searchQuery.trim().replace(/[<>"']/g, '').substring(0, 100);
        if (sanitizedQuery.length < 2) {
            return [];
        }

        // Check if query looks like a hashtag search
        const isHashtagSearch = sanitizedQuery.startsWith('#');
        const searchTerm = isHashtagSearch ? sanitizedQuery.substring(1) : sanitizedQuery;

        let allResults = [];

        // Search in topic field
        try {
            const topicResults = await databases.listDocuments(
                config.databaseId,
                config.postsCollectionId,
                [
                    Query.contains('topic', [searchTerm]),
                    Query.limit(limit),
                    Query.orderDesc('$createdAt')
                ]
            );
            allResults = [...topicResults.documents];
        } catch (e) {
            // Topic search failed
        }

        // Search in description field (some posts may use this)
        try {
            const descriptionResults = await databases.listDocuments(
                config.databaseId,
                config.postsCollectionId,
                [
                    Query.contains('description', [searchTerm]),
                    Query.limit(limit),
                    Query.orderDesc('$createdAt')
                ]
            );
            // Add unique results
            descriptionResults.documents.forEach(doc => {
                if (!allResults.find(r => r.$id === doc.$id)) {
                    allResults.push(doc);
                }
            });
        } catch (e) {
            // Description search failed
        }

        // Search in text field (post content)
        try {
            const textResults = await databases.listDocuments(
                config.databaseId,
                config.postsCollectionId,
                [
                    Query.contains('text', [searchTerm]),
                    Query.limit(limit),
                    Query.orderDesc('$createdAt')
                ]
            );
            // Add unique results
            textResults.documents.forEach(doc => {
                if (!allResults.find(r => r.$id === doc.$id)) {
                    allResults.push(doc);
                }
            });
        } catch (e) {
            // Text search failed
        }

        // Search in tags array
        try {
            const tagsResults = await databases.listDocuments(
                config.databaseId,
                config.postsCollectionId,
                [
                    Query.contains('tags', [searchTerm]),
                    Query.limit(limit),
                    Query.orderDesc('$createdAt')
                ]
            );
            // Add unique results
            tagsResults.documents.forEach(doc => {
                if (!allResults.find(r => r.$id === doc.$id)) {
                    allResults.push(doc);
                }
            });
        } catch (e) {
            // Tags search failed
        }

        // Search in links array
        try {
            const linksResults = await databases.listDocuments(
                config.databaseId,
                config.postsCollectionId,
                [
                    Query.contains('links', [searchTerm]),
                    Query.limit(limit),
                    Query.orderDesc('$createdAt')
                ]
            );
            // Add unique results
            linksResults.documents.forEach(doc => {
                if (!allResults.find(r => r.$id === doc.$id)) {
                    allResults.push(doc);
                }
            });
        } catch (e) {
            // Links search failed
        }

        // Sort by date and limit results
        allResults.sort((a, b) => new Date(b.$createdAt) - new Date(a.$createdAt));
        return filterPostsByVisibility(allResults, currentUserId).slice(0, limit);
    } catch (error) {
        return [];
    }
};

export const createRepost = async (originalPostId, userId, repostData = {}) => {
    try {
        if (!originalPostId || typeof originalPostId !== 'string') {
            throw new Error('Invalid original post ID');
        }

        if (!userId || typeof userId !== 'string') {
            throw new Error('Invalid user ID');
        }

        const directOriginal = await databases.getDocument(
            config.databaseId,
            config.postsCollectionId,
            originalPostId
        );

        const rootOriginalId = directOriginal?.isRepost && directOriginal?.originalPostId
            ? directOriginal.originalPostId
            : directOriginal.$id;

        const rootOriginal = rootOriginalId === directOriginal.$id
            ? directOriginal
            : await databases.getDocument(
                config.databaseId,
                config.postsCollectionId,
                rootOriginalId
            );

        if (!rootOriginal || rootOriginal.isHidden) {
            throw new Error('Original post is not available');
        }

        const canRepost = rootOriginal.userId === userId || rootOriginal.canOthersRepost !== false;
        if (!canRepost) {
            throw new Error('Repost is not allowed for this post');
        }

        const existingRepost = await databases.listDocuments(
            config.databaseId,
            config.postsCollectionId,
            [
                Query.equal('userId', userId),
                Query.equal('isRepost', true),
                Query.equal('originalPostId', rootOriginal.$id),
                Query.limit(1),
            ]
        );

        if (existingRepost.documents.length > 0) {
            return {
                alreadyReposted: true,
                post: existingRepost.documents[0],
            };
        }

        const repostTopic = typeof repostData.topic === 'string' && repostData.topic.trim().length > 0
            ? repostData.topic.trim().slice(0, 200)
            : (rootOriginal.topic || '');

        const repostText = typeof repostData.text === 'string' && repostData.text.trim().length > 0
            ? repostData.text.trim().slice(0, 5000)
            : (rootOriginal.text || '');

        const post = await createPost({
            userId,
            userName: repostData.userName || null,
            profilePicture: repostData.profilePicture || null,
            topic: repostTopic,
            text: repostText,
            department: repostData.department || rootOriginal.department || 'public',
            stage: repostData.stage || rootOriginal.stage || 'all',
            postType: repostData.postType || rootOriginal.postType || 'discussion',
            images: Array.isArray(repostData.images) ? repostData.images : [],
            imageDeleteUrls: Array.isArray(repostData.imageDeleteUrls) ? repostData.imageDeleteUrls : [],
            tags: Array.isArray(repostData.tags) ? repostData.tags : [],
            links: Array.isArray(repostData.links) ? repostData.links : [],
            isRepost: true,
            originalPostId: rootOriginal.$id,
            originalPostOwnerId: rootOriginal.userId,
            originalPostTopic: rootOriginal.topic || '',
            originalPostPreview: (rootOriginal.text || '').slice(0, 180),
            canOthersRepost: rootOriginal.canOthersRepost !== false,
        });

        try {
            const nextRepostCount = Number(rootOriginal.repostCount || 0) + 1;
            await databases.updateDocument(
                config.databaseId,
                config.postsCollectionId,
                rootOriginal.$id,
                { repostCount: nextRepostCount }
            );
        } catch (error) {
            // Silent fail - repost must not fail because of counter update
        }

        return {
            success: true,
            post,
        };
    } catch (error) {
        throw error;
    }
};

export const requestPostReview = async (postId, requesterUserId = null) => {
    try {
        if (!postId || typeof postId !== 'string') {
            throw new Error('Invalid post ID');
        }

        const post = await databases.getDocument(
            config.databaseId,
            config.postsCollectionId,
            postId
        );

        if (!post) {
            throw new Error('Post not found');
        }

        if (requesterUserId && post.userId !== requesterUserId) {
            throw new Error('Only post owner can request review');
        }

        if (!post.isHidden) {
            throw new Error('Only hidden posts can request review');
        }

        const now = Date.now();
        const lastRequested = post.reviewRequestedAt ? new Date(post.reviewRequestedAt).getTime() : 0;
        const REVIEW_COOLDOWN_MS = 60 * 60 * 1000;
        if (lastRequested && now - lastRequested < REVIEW_COOLDOWN_MS) {
            throw new Error('Review request already sent recently');
        }

        const webhookUrl = config.reportReviewWebhookUrl || DEFAULT_REPORT_REVIEW_WEBHOOK;
        if (!webhookUrl) {
            throw new Error('Review webhook is not configured');
        }

        const payload = {
            username: 'College Community Moderation',
            embeds: [
                {
                    title: 'Post Review Request',
                    color: 15158332,
                    fields: [
                        { name: 'Post ID', value: String(post.$id), inline: false },
                        { name: 'Owner ID', value: String(post.userId || 'unknown'), inline: true },
                        { name: 'Requester ID', value: String(requesterUserId || 'unknown'), inline: true },
                        { name: 'Reports', value: String(post.reportCount || 0), inline: true },
                        { name: 'Views', value: String(post.viewCount || 0), inline: true },
                        { name: 'Likes', value: String(post.likeCount || 0), inline: true },
                        { name: 'Replies', value: String(post.replyCount || 0), inline: true },
                        { name: 'Topic', value: String(post.topic || 'No topic').slice(0, 250), inline: false },
                    ],
                    timestamp: new Date().toISOString(),
                },
            ],
        };

        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            throw new Error('Failed to send review request');
        }

        await databases.updateDocument(
            config.databaseId,
            config.postsCollectionId,
            postId,
            {
                reviewRequestedAt: new Date().toISOString(),
                reviewRequestedBy: requesterUserId || post.userId,
            }
        ).catch(() => {
            // Optional columns may not exist yet.
        });

        return { success: true };
    } catch (error) {
        throw error;
    }
};

export const updatePost = async (postId, postData) => {
    try {
        if (!postId || typeof postId !== 'string') {
            throw new Error('Invalid post ID');
        }
        
        if (!postData || typeof postData !== 'object') {
            throw new Error('Invalid post data');
        }
        
        const updateData = {
            ...postData,
            isEdited: true
        };
        
        const post = await databases.updateDocument(
            config.databaseId,
            config.postsCollectionId,
            postId,
            updateData
        );
        
        // Invalidate posts cache
        await postsCacheManager.invalidateSinglePost(postId);
        
        return post;
    } catch (error) {
        throw error;
    }
};

export const deletePost = async (postId, imageDeleteUrls = []) => {
    try {
        if (!postId || typeof postId !== 'string') {
            throw new Error('Invalid post ID');
        }
        
        const { deleteRepliesByPost } = require('./replies');
        const { deleteNotificationsByPostId } = require('./notifications');
        
        await deleteRepliesByPost(postId);
        await deleteNotificationsByPostId(postId);
        
        await databases.deleteDocument(
            config.databaseId,
            config.postsCollectionId,
            postId
        );

        if (imageDeleteUrls && imageDeleteUrls.length > 0) {
            const { deleteMultipleImages } = require('../services/imgbbService');
            await deleteMultipleImages(imageDeleteUrls);
        }
        
        // Invalidate posts cache
        await postsCacheManager.invalidateSinglePost(postId);
        
        return { success: true };
    } catch (error) {
        throw error;
    }
};

export const incrementPostViewCount = async (postId, userId = null) => {
    try {
        if (!postId || typeof postId !== 'string') {
            throw new Error('Invalid post ID');
        }
        
        const post = await getPost(postId);
        const viewedBy = post.viewedBy || [];
        
        if (userId && !viewedBy.includes(userId)) {
            viewedBy.push(userId);
            await databases.updateDocument(
                config.databaseId,
                config.postsCollectionId,
                postId,
                { 
                    viewedBy: viewedBy,
                    viewCount: viewedBy.length 
                }
            );
        } else if (!userId) {
            await databases.updateDocument(
                config.databaseId,
                config.postsCollectionId,
                postId,
                { viewCount: (post.viewCount || 0) + 1 }
            );
        }
    } catch (error) {
        throw error;
    }
};

export const togglePostLike = async (postId, userId) => {
    try {
        if (!postId || typeof postId !== 'string') {
            throw new Error('Invalid post ID');
        }
        
        if (!userId || typeof userId !== 'string') {
            throw new Error('Invalid user ID');
        }
        
        const post = await getPost(postId);
        const likedBy = post.likedBy || [];
        const isLiked = likedBy.includes(userId);
        
        let updatedLikedBy;
        if (isLiked) {
            updatedLikedBy = likedBy.filter(id => id !== userId);
        } else {
            updatedLikedBy = [...likedBy, userId];
        }
        
        const updatedPost = await databases.updateDocument(
            config.databaseId,
            config.postsCollectionId,
            postId,
            { 
                likedBy: updatedLikedBy,
                likeCount: updatedLikedBy.length 
            }
        );

        // Invalidate posts cache so refreshes show the updated like state
        await postsCacheManager.invalidatePostsCache();
        
        return { 
            isLiked: !isLiked, 
            likeCount: updatedPost.likeCount ?? updatedLikedBy.length,
            likedBy: updatedPost.likedBy ?? updatedLikedBy,
        };
    } catch (error) {
        throw error;
    }
};

export const markQuestionAsResolved = async (postId) => {
    return setQuestionResolvedStatus(postId, true);
};

export const setQuestionResolvedStatus = async (postId, isResolved) => {
    try {
        if (!postId || typeof postId !== 'string') {
            throw new Error('Invalid post ID');
        }

        if (typeof isResolved !== 'boolean') {
            throw new Error('Invalid resolved status');
        }
        
        await databases.updateDocument(
            config.databaseId,
            config.postsCollectionId,
            postId,
            { isResolved }
        );
    } catch (error) {
        throw error;
    }
};

export const createReply = async (postId, replyData) => {
    try {
        if (!postId || typeof postId !== 'string') {
            throw new Error('Invalid post ID');
        }
        
        const reply = await databases.createDocument(
            config.databaseId,
            config.repliesCollectionId,
            ID.unique(),
            {
                ...replyData,
                postId
            }
        );
        return reply;
    } catch (error) {
        throw error;
    }
};

export const getReplies = async (postId) => {
    try {
        if (!postId || typeof postId !== 'string') {
            throw new Error('Invalid post ID');
        }
        
        const replies = await databases.listDocuments(
            config.databaseId,
            config.repliesCollectionId,
            [
                Query.equal('postId', postId),
                Query.orderAsc('$createdAt')
            ]
        );
        return replies.documents;
    } catch (error) {
        throw error;
    }
};

export const deleteReply = async (replyId) => {
    try {
        if (!replyId || typeof replyId !== 'string') {
            throw new Error('Invalid reply ID');
        }
        
        await databases.deleteDocument(
            config.databaseId,
            config.repliesCollectionId,
            replyId
        );
    } catch (error) {
        throw error;
    }
};

export const uploadImage = async (file) => {
    try {
        if (!file) {
            throw new Error('File is required');
        }
        
        const uploadedFile = await storage.createFile(
            config.bucketId,
            ID.unique(),
            file
        );
        return uploadedFile;
    } catch (error) {
        throw error;
    }
};

export const getImageUrl = (fileId) => {
    return storage.getFileView(config.bucketId, fileId);
};

export const deleteImage = async (fileId) => {
    try {
        if (!fileId || typeof fileId !== 'string') {
            throw new Error('Invalid file ID');
        }
        
        await storage.deleteFile(config.bucketId, fileId);
    } catch (error) {
        throw error;
    }
};

/**
 * Enriches posts with user data for posts that are missing userName
 * @param {Array} posts - Array of post documents
 * @returns {Array} - Posts with enriched user data
 */
export const enrichPostsWithUserData = async (posts) => {
    if (!posts || posts.length === 0) return posts;
    
    // Find posts missing userName
    const postsNeedingUserData = posts.filter(post => !post.userName && post.userId);
    
    if (postsNeedingUserData.length === 0) return posts;
    
    // Get unique user IDs
    const userIds = [...new Set(postsNeedingUserData.map(post => post.userId))];
    
    // Fetch user data for all unique users (uses cached data)
    const userDataMap = {};
    await Promise.all(
        userIds.map(async (userId) => {
            try {
                const user = await getUserById(userId);
                userDataMap[userId] = {
                    name: user.name || user.fullName,
                    profilePicture: user.profilePicture || null,
                };
            } catch (error) {
                // User not found, skip
            }
        })
    );
    
    // Enrich posts with user data
    return posts.map(post => {
        if (!post.userName && post.userId && userDataMap[post.userId]) {
            return {
                ...post,
                userName: userDataMap[post.userId].name,
                userProfilePicture: post.userProfilePicture || userDataMap[post.userId].profilePicture,
            };
        }
        return post;
    });
};

export const reportPost = async (postId, userId, reason = '') => {
    try {
        if (!postId || typeof postId !== 'string') {
            throw new Error('Invalid post ID');
        }
        if (!userId || typeof userId !== 'string') {
            throw new Error('Invalid user ID');
        }

        const post = await getPost(postId);
        if (!post || post.isHidden) {
            return { success: true, alreadyHidden: true, reportCount: post?.reportCount || 0 };
        }

        if (post.userId === userId) {
            throw new Error('Users cannot report their own posts');
        }

        const moderationReason = sanitizeModerationReason(reason);
        const reportedBy = post.reportedBy || [];

        if (reportedBy.includes(userId)) {
            return { alreadyReported: true };
        }

        if (REPORT_FEEDBACK_REASONS.includes(moderationReason)) {
            if (config.postReportsCollectionId) {
                try {
                    await databases.createDocument(
                        config.databaseId,
                        config.postReportsCollectionId,
                        ID.unique(),
                        {
                            postId,
                            reporterId: userId,
                            postOwnerId: post.userId,
                            reason: moderationReason,
                        }
                    );
                } catch (error) {
                    // Silent fail if optional collection is not available
                }
            }

            return { success: true, treatedAsFeedback: true, reportCount: post.reportCount || 0 };
        }

        const newReportedBy = [...new Set([...reportedBy, userId])];
        const reportCount = newReportedBy.length;
        const reportReason = sanitizeReportReason(moderationReason);
        const existingReasons = Array.isArray(post.reportReasons) ? post.reportReasons : [];
        const nextReportReasons = [...existingReasons, reportReason].slice(-200);
        const viewCount = Number(post.viewCount || 0);
        const reportScore = calculateReportScore(nextReportReasons);
        const passedWeightedThreshold = reportScore >= REPORT_HIDE_SCORE_THRESHOLD;
        const passedCountThreshold = reportCount >= REPORT_HIDE_THRESHOLD;
        const isHidden = reportCount >= REPORT_HIDE_MIN_REPORTERS
            && (passedWeightedThreshold || passedCountThreshold)
            && viewCount < REPORT_HIDE_MAX_VIEWS;
        const becameHidden = isHidden && !post.isHidden;
        let moderationStatePersisted = true;

        try {
            await databases.updateDocument(
                config.databaseId,
                config.postsCollectionId,
                postId,
                {
                    reportedBy: newReportedBy,
                    reportCount: reportCount,
                    reportReasons: nextReportReasons,
                    isHidden,
                }
            );
        } catch (error) {
            if (isSchemaAttributeError(error)) {
                moderationStatePersisted = false;
            } else {
                throw error;
            }
        }

        if (becameHidden && moderationStatePersisted) {
            notifyPostHiddenByReports(
                post.userId,
                post.$id,
                post.topic || post.text || '',
                reportCount,
                viewCount
            ).catch(() => {
                // Silent fail - reporting should not fail on notify
            });
        }

        if (config.postReportsCollectionId) {
            try {
                await databases.createDocument(
                    config.databaseId,
                    config.postReportsCollectionId,
                    ID.unique(),
                    {
                        postId,
                        reporterId: userId,
                        postOwnerId: post.userId,
                        reason: reportReason,
                    }
                );
            } catch (error) {
                // Silent fail if optional collection is not available
            }
        }

        return {
            success: true,
            reportCount: moderationStatePersisted ? reportCount : (post.reportCount || 0),
            isHidden: moderationStatePersisted ? isHidden : false,
            moderationStatePersisted,
            hideCriteria: {
                requiredReports: REPORT_HIDE_THRESHOLD,
                requiredMinReporters: REPORT_HIDE_MIN_REPORTERS,
                requiredScore: REPORT_HIDE_SCORE_THRESHOLD,
                currentScore: reportScore,
                maxViews: REPORT_HIDE_MAX_VIEWS,
                currentViews: viewCount,
            },
        };
    } catch (error) {
        throw error;
    }
};

