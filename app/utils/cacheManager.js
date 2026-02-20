import safeStorage from './safeStorage';

const CACHE_PREFIX = 'cache_';
const CACHE_EXPIRY_TIME = 1000 * 60 * 60 * 24; // 24 hours

// Cache durations for different data types
const CACHE_DURATIONS = {
  user: 1000 * 60 * 60, // 1 hour for user data
  posts: 1000 * 60 * 30, // 30 minutes for posts
  chats: 1000 * 60 * 20, // 20 minutes for chats list
  messages: 1000 * 60 * 5, // 5 minutes for messages
  replies: 1000 * 60 * 20, // 20 minutes for replies
  notifications: 1000 * 60 * 10, // 10 minutes for notifications
  unreadCount: 1000 * 60 * 2, // 2 minutes for unread counters
  image: CACHE_EXPIRY_TIME * 7, // 7 days for images
};

export const cacheManager = {
  async set(key, value, expiryTime = CACHE_EXPIRY_TIME) {
    try {
      const cacheData = {
        value,
        timestamp: Date.now(),
        expiryTime
      };
      await safeStorage.setItem(
        `${CACHE_PREFIX}${key}`,
        JSON.stringify(cacheData)
      );
    } catch (error) {
      // Failed to set cache
    }
  },

  async get(key, ignoreExpiry = false) {
    try {
      const cachedData = await safeStorage.getItem(`${CACHE_PREFIX}${key}`);
      if (!cachedData) return null;

      const { value, timestamp, expiryTime } = JSON.parse(cachedData);
      
      // If ignoring expiry, return value regardless of age (for stale-while-revalidate)
      if (ignoreExpiry) {
        return { value, isStale: Date.now() - timestamp > expiryTime };
      }
      
      if (Date.now() - timestamp > expiryTime) {
        await this.remove(key);
        return null;
      }

      return value;
    } catch (error) {
      return null;
    }
  },

  async getWithMeta(key) {
    try {
      const cachedData = await safeStorage.getItem(`${CACHE_PREFIX}${key}`);
      if (!cachedData) return null;

      const { value, timestamp, expiryTime } = JSON.parse(cachedData);
      const isStale = Date.now() - timestamp > expiryTime;
      
      return { value, timestamp, isStale };
    } catch (error) {
      return null;
    }
  },

  async remove(key) {
    try {
      await safeStorage.removeItem(`${CACHE_PREFIX}${key}`);
    } catch (error) {
      // Failed to remove cache
    }
  },

  async removeByPrefix(prefix) {
    try {
      const keys = await safeStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith(`${CACHE_PREFIX}${prefix}`));
      if (cacheKeys.length > 0) {
        await safeStorage.multiRemove(cacheKeys);
      }
    } catch (error) {
      // Failed to remove cache by prefix
    }
  },

  async clear() {
    try {
      const keys = await safeStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith(CACHE_PREFIX));
      await safeStorage.multiRemove(cacheKeys);
    } catch (error) {
      // Failed to clear cache
    }
  }
};

export const imageCacheManager = {
  async cacheImage(url) {
    if (!url) return null;
    
    const cached = await cacheManager.get(`image_${url}`);
    if (cached) return cached;

    await cacheManager.set(`image_${url}`, url, CACHE_DURATIONS.image);
    return url;
  },

  async getCachedImage(url) {
    if (!url) return null;
    return await cacheManager.get(`image_${url}`);
  }
};

export const userCacheManager = {
  async cacheUserData(userId, userData) {
    if (!userId || !userData) return;
    await cacheManager.set(`user_${userId}`, userData, CACHE_DURATIONS.user);
  },

  async getCachedUserData(userId) {
    if (!userId) return null;
    return await cacheManager.get(`user_${userId}`);
  },

  async invalidateUser(userId) {
    if (!userId) return;
    await cacheManager.remove(`user_${userId}`);
  }
};

// Posts cache manager with smart invalidation
export const postsCacheManager = {
  generateCacheKey(filters = {}, limit = 20, offset = 0) {
    const parts = ['posts'];
    if (filters.department) parts.push(`dept_${filters.department}`);
    if (filters.stage && filters.stage !== 'all') parts.push(`stage_${filters.stage}`);
    if (filters.userId) parts.push(`user_${filters.userId}`);
    if (filters.postType) parts.push(`type_${filters.postType}`);
    if (filters.answerStatus && filters.answerStatus !== 'all') parts.push(`answer_${filters.answerStatus}`);
    parts.push(`l${limit}_o${offset}`);
    return parts.join('_');
  },

  async cachePosts(key, posts) {
    if (!key || !posts) return;
    await cacheManager.set(key, posts, CACHE_DURATIONS.posts);
  },

  async getCachedPosts(key) {
    if (!key) return null;
    return await cacheManager.getWithMeta(key);
  },

  async invalidatePostsCache(department = null) {
    if (department) {
      await cacheManager.removeByPrefix(`posts_dept_${department}`);
    }
    await cacheManager.removeByPrefix('posts_');
  },

  async invalidateSinglePost(postId) {
    // Invalidate all posts caches since a post change affects multiple lists
    await cacheManager.removeByPrefix('posts_');
  }
};

// Chats cache manager
export const chatsCacheManager = {
  generateCacheKey(userId, department, stage) {
    return `chats_${userId}_${department}_${stage || 'all'}`;
  },

  async cacheChats(key, chats) {
    if (!key || !chats) return;
    await cacheManager.set(key, chats, CACHE_DURATIONS.chats);
  },

  async getCachedChats(key) {
    if (!key) return null;
    return await cacheManager.getWithMeta(key);
  },

  async invalidateChatsCache(userId = null) {
    if (userId) {
      await cacheManager.removeByPrefix(`chats_${userId}`);
    } else {
      await cacheManager.removeByPrefix('chats_');
    }
  }
};

export const unreadCountCacheManager = {
  getNotificationUnreadKey(userId) {
    return `unread_notifications_${userId}`;
  },

  getChatUnreadKey(chatId, userId) {
    return `unread_chat_${chatId}_${userId}`;
  },

  async cacheNotificationUnreadCount(userId, count) {
    if (!userId) return;
    await cacheManager.set(this.getNotificationUnreadKey(userId), Number(count) || 0, CACHE_DURATIONS.unreadCount);
  },

  async getCachedNotificationUnreadCount(userId) {
    if (!userId) return null;
    return await cacheManager.getWithMeta(this.getNotificationUnreadKey(userId));
  },

  async cacheChatUnreadCount(chatId, userId, count) {
    if (!chatId || !userId) return;
    await cacheManager.set(this.getChatUnreadKey(chatId, userId), Number(count) || 0, CACHE_DURATIONS.unreadCount);
  },

  async getCachedChatUnreadCount(chatId, userId) {
    if (!chatId || !userId) return null;
    return await cacheManager.getWithMeta(this.getChatUnreadKey(chatId, userId));
  },

  async invalidateNotificationUnreadCount(userId) {
    if (!userId) return;
    await cacheManager.remove(this.getNotificationUnreadKey(userId));
  },

  async invalidateChatUnreadCount(chatId, userId) {
    if (!chatId || !userId) return;
    await cacheManager.remove(this.getChatUnreadKey(chatId, userId));
  },

  async invalidateAllChatUnreadForUser(userId) {
    if (!userId) return;
    await cacheManager.removeByPrefix(`unread_chat_`);
  },
};

export const notificationsCacheManager = {
  generateCacheKey(userId, limit = 20, offset = 0) {
    return `notifications_${userId}_l${limit}_o${offset}`;
  },

  async cacheNotifications(userId, notifications, limit = 20, offset = 0) {
    if (!userId || !Array.isArray(notifications)) return;
    const key = this.generateCacheKey(userId, limit, offset);
    await cacheManager.set(key, notifications, CACHE_DURATIONS.notifications);
  },

  async getCachedNotifications(userId, limit = 20, offset = 0) {
    if (!userId) return null;
    const key = this.generateCacheKey(userId, limit, offset);
    return await cacheManager.getWithMeta(key);
  },

  async invalidateUserNotifications(userId) {
    if (!userId) return;
    await cacheManager.removeByPrefix(`notifications_${userId}_`);
  },
};

// Messages cache manager
export const messagesCacheManager = {
  generateCacheKey(chatId, limit = 100) {
    return `messages_${chatId}_${limit}`;
  },

  async cacheMessages(chatId, messages, limit = 100) {
    if (!chatId || !messages) return;
    const key = this.generateCacheKey(chatId, limit);
    await cacheManager.set(key, messages, CACHE_DURATIONS.messages);
  },

  async getCachedMessages(chatId, limit = 100) {
    if (!chatId) return null;
    const key = this.generateCacheKey(chatId, limit);
    return await cacheManager.getWithMeta(key);
  },

  async invalidateChatMessages(chatId) {
    if (!chatId) return;
    await cacheManager.removeByPrefix(`messages_${chatId}`);
  },

  async addMessageToCache(chatId, message, limit = 100) {
    if (!chatId || !message) return;
    const key = this.generateCacheKey(chatId, limit);
    const cached = await cacheManager.getWithMeta(key);
    if (cached?.value) {
      const messages = cached.value;
      if (!messages.some(m => m.$id === message.$id)) {
        const updatedMessages = [message, ...messages];
        // Keep only the last 'limit' messages (newest first)
        if (updatedMessages.length > limit) {
          updatedMessages.pop();
        }
        await cacheManager.set(key, updatedMessages, CACHE_DURATIONS.messages);
      }
    }
  }
};

// Replies cache manager
export const repliesCacheManager = {
  generateCacheKey(postId) {
    return `replies_${postId}`;
  },

  async cacheReplies(postId, replies) {
    if (!postId || !replies) return;
    const key = this.generateCacheKey(postId);
    await cacheManager.set(key, replies, CACHE_DURATIONS.replies);
  },

  async getCachedReplies(postId) {
    if (!postId) return null;
    const key = this.generateCacheKey(postId);
    return await cacheManager.getWithMeta(key);
  },

  async invalidateReplies(postId) {
    if (!postId) return;
    await cacheManager.remove(this.generateCacheKey(postId));
  }
};
