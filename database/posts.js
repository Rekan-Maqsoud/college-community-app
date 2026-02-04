import { databases, storage, config } from './config';
import { ID, Query } from 'appwrite';
import { handleNetworkError } from '../app/utils/networkErrorHandler';
import { postsCacheManager } from '../app/utils/cacheManager';
import { getUserById } from './users';

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
        
        const post = await databases.createDocument(
            config.databaseId,
            config.postsCollectionId,
            ID.unique(),
            postData
        );
        
        // Invalidate posts cache for the department
        await postsCacheManager.invalidatePostsCache(postData.department);
        
        return post;
    } catch (error) {
        throw error;
    }
};

export const getPost = async (postId) => {
    try {
        if (!postId || typeof postId !== 'string') {
            throw new Error('Invalid post ID');
        }
        
        const post = await databases.getDocument(
            config.databaseId,
            config.postsCollectionId,
            postId
        );
        return post;
    } catch (error) {
        throw error;
    }
};

export const getPosts = async (filters = {}, limit = 20, offset = 0, useCache = true, sortBy = 'newest') => {
    const cacheKey = postsCacheManager.generateCacheKey(filters, limit, offset) + `_sort_${sortBy}`;
    
    try {
        // Try to get cached data first
        if (useCache && offset === 0) {
            const cached = await postsCacheManager.getCachedPosts(cacheKey);
            if (cached?.value && !cached.isStale) {
                return cached.value;
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
        
        return posts.documents;
    } catch (error) {
        // On network error, try to return stale cache
        if (offset === 0) {
            const cached = await postsCacheManager.getCachedPosts(cacheKey);
            if (cached?.value) {
                return cached.value;
            }
        }
        const errorInfo = handleNetworkError(error);
        throw error;
    }
};

export const getPostsByDepartments = async (departments = [], stage = 'all', limit = 20, offset = 0, useCache = true, sortBy = 'newest', postType = 'all') => {
    const cacheKey = `posts_multi_depts_${departments.sort().join('-')}_stage_${stage}_type_${postType}_sort_${sortBy}_l${limit}_o${offset}`;
    
    try {
        if (!departments || departments.length === 0) {
            return [];
        }

        // Try to get cached data first
        if (useCache && offset === 0) {
            const cached = await postsCacheManager.getCachedPosts(cacheKey);
            if (cached?.value && !cached.isStale) {
                return cached.value;
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

        const posts = await databases.listDocuments(
            config.databaseId,
            config.postsCollectionId,
            queries
        );
        
        // Cache the results for first page
        if (offset === 0) {
            await postsCacheManager.cachePosts(cacheKey, posts.documents);
        }
        
        return posts.documents;
    } catch (error) {
        // On network error, try to return stale cache
        if (offset === 0) {
            const cached = await postsCacheManager.getCachedPosts(cacheKey);
            if (cached?.value) {
                return cached.value;
            }
        }
        const errorInfo = handleNetworkError(error);
        throw error;
    }
};

export const getAllPublicPosts = async (stage = 'all', limit = 20, offset = 0, useCache = true, sortBy = 'newest', postType = 'all') => {
    const cacheKey = `posts_public_stage_${stage}_type_${postType}_sort_${sortBy}_l${limit}_o${offset}`;
    
    try {
        // Try to get cached data first
        if (useCache && offset === 0) {
            const cached = await postsCacheManager.getCachedPosts(cacheKey);
            if (cached?.value && !cached.isStale) {
                return cached.value;
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

        const posts = await databases.listDocuments(
            config.databaseId,
            config.postsCollectionId,
            queries
        );
        
        // Cache the results for first page
        if (offset === 0) {
            await postsCacheManager.cachePosts(cacheKey, posts.documents);
        }
        
        return posts.documents;
    } catch (error) {
        // On network error, try to return stale cache
        if (offset === 0) {
            const cached = await postsCacheManager.getCachedPosts(cacheKey);
            if (cached?.value) {
                return cached.value;
            }
        }
        const errorInfo = handleNetworkError(error);
        throw error;
    }
};

export const getPostsByDepartmentAndStage = async (department, stage, limit = 20, offset = 0) => {
    return getPosts({ department, stage }, limit, offset);
};

export const getPostsByUser = async (userId, limit = 20, offset = 0) => {
    return getPosts({ userId }, limit, offset);
};

export const searchPosts = async (searchQuery, userDepartment = null, userMajor = null, limit = 20) => {
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
        return allResults.slice(0, limit);
    } catch (error) {
        return [];
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
        
        await databases.updateDocument(
            config.databaseId,
            config.postsCollectionId,
            postId,
            { 
                likedBy: updatedLikedBy,
                likeCount: updatedLikedBy.length 
            }
        );
        
        return { isLiked: !isLiked, likeCount: updatedLikedBy.length };
    } catch (error) {
        throw error;
    }
};

export const markQuestionAsResolved = async (postId) => {
    try {
        if (!postId || typeof postId !== 'string') {
            throw new Error('Invalid post ID');
        }
        
        await databases.updateDocument(
            config.databaseId,
            config.postsCollectionId,
            postId,
            { isResolved: true }
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
        const reportedBy = post.reportedBy || [];

        if (reportedBy.includes(userId)) {
            return { alreadyReported: true };
        }

        const newReportedBy = [...reportedBy, userId];
        const reportCount = newReportedBy.length;

        await databases.updateDocument(
            config.databaseId,
            config.postsCollectionId,
            postId,
            {
                reportedBy: newReportedBy,
                reportCount: reportCount,
                isHidden: reportCount >= 5,
            }
        );

        return { success: true, reportCount };
    } catch (error) {
        throw error;
    }
};

