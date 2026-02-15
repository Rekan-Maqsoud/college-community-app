import { databases, config } from './config';
import { ID, Query } from 'appwrite';

// Mute types
export const MUTE_TYPES = {
    NONE: 'none',
    ALL: 'all',
    MENTIONS_ONLY: 'mentions_only',
};

// Mute duration presets (in milliseconds)
export const MUTE_DURATIONS = {
    ONE_HOUR: 60 * 60 * 1000,
    EIGHT_HOURS: 8 * 60 * 60 * 1000,
    ONE_DAY: 24 * 60 * 60 * 1000,
    ONE_WEEK: 7 * 24 * 60 * 60 * 1000,
    FOREVER: null,
};

export const DEFAULT_REACTION_SET = ['👍', '❤️', '😂', '😡', '😕'];

const parseReactionDefaults = (value) => {
    if (Array.isArray(value)) {
        return value.filter(Boolean);
    }

    if (typeof value === 'string') {
        try {
            const parsed = JSON.parse(value);
            if (Array.isArray(parsed)) {
                return parsed.filter(Boolean);
            }
        } catch (error) {
            return DEFAULT_REACTION_SET;
        }
    }

    return DEFAULT_REACTION_SET;
};

const normalizeReactionDefaults = (value) => {
    const list = Array.isArray(value) ? value : [];
    const unique = Array.from(new Set(list.map(item => `${item}`.trim()).filter(Boolean)));
    return unique.length > 0 ? unique : DEFAULT_REACTION_SET;
};

/**
 * Get or create user chat settings for a specific chat
 */
export const getUserChatSettings = async (userId, chatId) => {
    try {
        if (!userId || !chatId) {
            return null;
        }

        if (!config.userChatSettingsCollectionId) {
            return getDefaultSettings(userId, chatId);
        }

        const settings = await databases.listDocuments(
            config.databaseId,
            config.userChatSettingsCollectionId,
            [
                Query.equal('userId', userId),
                Query.equal('chatId', chatId),
                Query.limit(1)
            ]
        );

        if (settings.documents.length > 0) {
            return settings.documents[0];
        }

        return getDefaultSettings(userId, chatId);
    } catch (error) {
        return getDefaultSettings(userId, chatId);
    }
};

/**
 * Get default settings object
 */
const getDefaultSettings = (userId, chatId) => ({
    userId,
    chatId,
    isMuted: false,
    muteExpiresAt: null,
    muteType: MUTE_TYPES.NONE,
    isArchived: false,
    archivedAt: null,
    bookmarkedMsgs: [],
    notifyOnMention: true,
    notifyOnAll: true,
    reactionDefaults: DEFAULT_REACTION_SET,
});

/**
 * Archive or unarchive a chat for a specific user
 */
export const setChatArchived = async (userId, chatId, isArchived = true) => {
    try {
        return await updateUserChatSettings(userId, chatId, {
            isArchived,
            archivedAt: isArchived ? new Date().toISOString() : null,
        });
    } catch (error) {
        throw error;
    }
};

/**
 * Check if a chat is archived for a specific user
 */
export const isChatArchived = async (userId, chatId) => {
    try {
        const settings = await getUserChatSettings(userId, chatId);
        return Boolean(settings?.isArchived);
    } catch (error) {
        return false;
    }
};

export const getReactionDefaults = async (userId, chatId) => {
    try {
        const settings = await getUserChatSettings(userId, chatId);
        return parseReactionDefaults(settings?.reactionDefaults);
    } catch (error) {
        return DEFAULT_REACTION_SET;
    }
};

export const updateReactionDefaults = async (userId, chatId, reactions = []) => {
    const normalized = normalizeReactionDefaults(reactions);
    await updateUserChatSettings(userId, chatId, {
        reactionDefaults: JSON.stringify(normalized),
    });
    return normalized;
};

/**
 * Create or update user chat settings
 */
export const updateUserChatSettings = async (userId, chatId, updates) => {
    try {
        if (!userId || !chatId) {
            throw new Error('User ID and Chat ID are required');
        }

        if (!config.userChatSettingsCollectionId) {
            throw new Error('User chat settings collection not configured');
        }

        // Check if settings exist
        const existing = await databases.listDocuments(
            config.databaseId,
            config.userChatSettingsCollectionId,
            [
                Query.equal('userId', userId),
                Query.equal('chatId', chatId),
                Query.limit(1)
            ]
        );

        if (existing.documents.length > 0) {
            // Update existing
            const updated = await databases.updateDocument(
                config.databaseId,
                config.userChatSettingsCollectionId,
                existing.documents[0].$id,
                updates
            );
            return updated;
        } else {
            // Create new
            const created = await databases.createDocument(
                config.databaseId,
                config.userChatSettingsCollectionId,
                ID.unique(),
                {
                    userId,
                    chatId,
                    ...updates,
                }
            );
            return created;
        }
    } catch (error) {
        throw error;
    }
};

/**
 * Mute a chat with options
 */
export const muteChat = async (userId, chatId, muteType = MUTE_TYPES.ALL, duration = null) => {
    try {
        const updates = {
            isMuted: true,
            muteType,
            muteExpiresAt: duration ? new Date(Date.now() + duration).toISOString() : null,
        };

        return await updateUserChatSettings(userId, chatId, updates);
    } catch (error) {
        throw error;
    }
};

/**
 * Unmute a chat
 */
export const unmuteChat = async (userId, chatId) => {
    try {
        const updates = {
            isMuted: false,
            muteType: MUTE_TYPES.NONE,
            muteExpiresAt: null,
        };

        return await updateUserChatSettings(userId, chatId, updates);
    } catch (error) {
        throw error;
    }
};

/**
 * Check if chat is currently muted for user
 */
export const isChatMuted = async (userId, chatId) => {
    try {
        const settings = await getUserChatSettings(userId, chatId);
        
        if (!settings || !settings.isMuted) {
            return false;
        }

        // Check if mute has expired
        if (settings.muteExpiresAt) {
            const expiresAt = new Date(settings.muteExpiresAt);
            if (expiresAt <= new Date()) {
                // Mute expired, unmute
                await unmuteChat(userId, chatId);
                return false;
            }
        }

        return true;
    } catch (error) {
        return false;
    }
};

/**
 * Get mute status with details
 */
export const getMuteStatus = async (userId, chatId) => {
    try {
        const settings = await getUserChatSettings(userId, chatId);
        
        if (!settings || !settings.isMuted) {
            return { isMuted: false, muteType: MUTE_TYPES.NONE, expiresAt: null };
        }

        // Check if mute has expired
        if (settings.muteExpiresAt) {
            const expiresAt = new Date(settings.muteExpiresAt);
            if (expiresAt <= new Date()) {
                await unmuteChat(userId, chatId);
                return { isMuted: false, muteType: MUTE_TYPES.NONE, expiresAt: null };
            }
        }

        return {
            isMuted: true,
            muteType: settings.muteType,
            expiresAt: settings.muteExpiresAt,
        };
    } catch (error) {
        return { isMuted: false, muteType: MUTE_TYPES.NONE, expiresAt: null };
    }
};

/**
 * Bookmark a message
 */
export const bookmarkMessage = async (userId, chatId, messageId) => {
    try {
        const settings = await getUserChatSettings(userId, chatId);
        const bookmarks = settings?.bookmarkedMsgs || [];
        
        if (!bookmarks.includes(messageId)) {
            bookmarks.push(messageId);
            await updateUserChatSettings(userId, chatId, { bookmarkedMsgs: bookmarks });
        }
        
        return true;
    } catch (error) {
        throw error;
    }
};

/**
 * Remove bookmark from a message
 */
export const unbookmarkMessage = async (userId, chatId, messageId) => {
    try {
        const settings = await getUserChatSettings(userId, chatId);
        const bookmarks = (settings?.bookmarkedMsgs || []).filter(id => id !== messageId);
        
        await updateUserChatSettings(userId, chatId, { bookmarkedMsgs: bookmarks });
        
        return true;
    } catch (error) {
        throw error;
    }
};

/**
 * Get all bookmarked messages for a user in a chat
 */
export const getBookmarkedMessages = async (userId, chatId) => {
    try {
        const settings = await getUserChatSettings(userId, chatId);
        return settings?.bookmarkedMsgs || [];
    } catch (error) {
        return [];
    }
};

/**
 * Check if a message is bookmarked
 */
export const isMessageBookmarked = async (userId, chatId, messageId) => {
    try {
        const bookmarks = await getBookmarkedMessages(userId, chatId);
        return bookmarks.includes(messageId);
    } catch (error) {
        return false;
    }
};

/**
 * Update notification preferences
 */
export const updateNotificationPreferences = async (userId, chatId, notifyOnMention, notifyOnAll) => {
    try {
        return await updateUserChatSettings(userId, chatId, {
            notifyOnMention,
            notifyOnAll,
        });
    } catch (error) {
        throw error;
    }
};

/**
 * Set clearedAt timestamp for local-only chat clear
 */
export const setChatClearedAt = async (userId, chatId) => {
    try {
        const clearedAt = new Date().toISOString();
        await updateUserChatSettings(userId, chatId, { muteExpiresAt: null, clearedAt });
        return clearedAt;
    } catch (error) {
        throw error;
    }
};

/**
 * Get the clearedAt timestamp for a user's chat
 */
export const getChatClearedAt = async (userId, chatId) => {
    try {
        const settings = await getUserChatSettings(userId, chatId);
        return settings?.clearedAt || null;
    } catch (error) {
        return null;
    }
};

/**
 * Hide specific messages for a user (batch delete for me)
 */
export const hideMessagesForUser = async (userId, chatId, messageIds) => {
    try {
        const settings = await getUserChatSettings(userId, chatId);
        const existing = settings?.hiddenMessageIds || [];
        const merged = [...new Set([...existing, ...messageIds])];
        await updateUserChatSettings(userId, chatId, { hiddenMessageIds: merged });
        return merged;
    } catch (error) {
        throw error;
    }
};

/**
 * Get hidden message IDs for a user in a chat
 */
export const getHiddenMessageIds = async (userId, chatId) => {
    try {
        const settings = await getUserChatSettings(userId, chatId);
        return settings?.hiddenMessageIds || [];
    } catch (error) {
        return [];
    }
};

/**
 * Delete all user chat settings for a chat
 */
export const deleteUserChatSettingsByChatId = async (chatId) => {
    try {
        if (!chatId) {
            throw new Error('Chat ID is required');
        }

        if (!config.userChatSettingsCollectionId) {
            return true;
        }

        let hasMore = true;

        while (hasMore) {
            const settings = await databases.listDocuments(
                config.databaseId,
                config.userChatSettingsCollectionId,
                [
                    Query.equal('chatId', chatId),
                    Query.limit(100)
                ]
            );

            if (settings.documents.length === 0) {
                hasMore = false;
                break;
            }

            await Promise.all(
                settings.documents.map(item =>
                    databases.deleteDocument(
                        config.databaseId,
                        config.userChatSettingsCollectionId,
                        item.$id
                    )
                )
            );

            if (settings.documents.length < 100) {
                hasMore = false;
            }
        }

        return true;
    } catch (error) {
        throw error;
    }
};
