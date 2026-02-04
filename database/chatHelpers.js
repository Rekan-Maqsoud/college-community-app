import { databases, config } from './config';
import { ID, Query } from 'appwrite';
import { CHAT_TYPES, createGroupChat, getUserGroupChats, decryptChatPreviews, ensureChatParticipant } from './chats';
import { getUserById } from './users';
import { chatsCacheManager } from '../app/utils/cacheManager';

export const PRIVATE_CHAT_TYPE = 'private';
export const CUSTOM_GROUP_TYPE = 'custom_group';

export const getOrCreateStageGroup = async (department, stage) => {
    try {
        if (!department || !stage) {
            return null;
        }

        const stageValue = typeof stage === 'number' ? String(stage) : stage;
        
        const existingChats = await databases.listDocuments(
            config.databaseId,
            config.chatsCollectionId,
            [
                Query.equal('department', department),
                Query.equal('stage', stageValue),
                Query.equal('type', CHAT_TYPES.STAGE_GROUP),
                Query.limit(1)
            ]
        );

        if (existingChats.documents.length > 0) {
            return existingChats.documents[0];
        }

        try {
            const newChat = await createGroupChat({
                name: `Stage ${stageValue} - ${department}`,
                type: CHAT_TYPES.STAGE_GROUP,
                department: department,
                stage: stageValue,
                requiresRepresentative: false,
                representatives: [],
                description: `Group chat for ${department} Stage ${stageValue} students`,
            });
            return newChat;
        } catch (createError) {
            return null;
        }
    } catch (error) {
        return null;
    }
};

export const getOrCreateDepartmentGroup = async (department) => {
    try {
        if (!department) {
            return null;
        }

        const existingChats = await databases.listDocuments(
            config.databaseId,
            config.chatsCollectionId,
            [
                Query.equal('department', department),
                Query.equal('type', CHAT_TYPES.DEPARTMENT_GROUP),
                Query.limit(1)
            ]
        );

        if (existingChats.documents.length > 0) {
            return existingChats.documents[0];
        }

        try {
            const newChat = await createGroupChat({
                name: `${department} Department`,
                type: CHAT_TYPES.DEPARTMENT_GROUP,
                department: department,
                stage: null,
                requiresRepresentative: false,
                representatives: [],
                description: `Group chat for all ${department} department students`,
            });
            return newChat;
        } catch (createError) {
            return null;
        }
    } catch (error) {
        return null;
    }
};

export const initializeUserGroups = async (department, stage, userId = null) => {
    try {
        const results = {
            stageGroup: null,
            departmentGroup: null,
            allChats: [],
        };

        if (!department) {
            return results;
        }

        const [stageGroup, departmentGroup] = await Promise.all([
            stage ? getOrCreateStageGroup(department, stage) : Promise.resolve(null),
            getOrCreateDepartmentGroup(department),
        ]);

        results.stageGroup = stageGroup;
        results.departmentGroup = departmentGroup;

        const allChats = await getUserGroupChats(department, stage, userId);

        if (userId) {
            const updatedChats = [];
            for (const chat of allChats) {
                const updatedChat = await ensureChatParticipant(chat.$id, userId);
                updatedChats.push(updatedChat || chat);
            }
            results.allChats = updatedChats;
        } else {
            results.allChats = allChats;
        }

        return results;
    } catch (error) {
        return {
            stageGroup: null,
            departmentGroup: null,
            allChats: [],
        };
    }
};

export const getPrivateChat = async (userId1, userId2) => {
    try {
        if (!userId1 || !userId2) {
            return null;
        }

        const sortedIds = [userId1, userId2].sort();
        const chatKey = `${sortedIds[0]}_${sortedIds[1]}`;

        const existingChats = await databases.listDocuments(
            config.databaseId,
            config.chatsCollectionId,
            [
                Query.equal('type', PRIVATE_CHAT_TYPE),
                Query.equal('chatKey', chatKey),
                Query.limit(1)
            ]
        );

        if (existingChats.documents.length > 0) {
            return existingChats.documents[0];
        }

        return null;
    } catch (error) {
        return null;
    }
};

export const createPrivateChat = async (user1, user2) => {
    try {
        if (!user1?.$id || !user2?.$id) {
            throw new Error('Invalid user data');
        }

        const existingChat = await getPrivateChat(user1.$id, user2.$id);
        if (existingChat) {
            // Return with otherUser populated for proper display
            return { ...existingChat, otherUser: user2 };
        }

        const sortedIds = [user1.$id, user2.$id].sort();
        const chatKey = `${sortedIds[0]}_${sortedIds[1]}`;

        const chat = await databases.createDocument(
            config.databaseId,
            config.chatsCollectionId,
            ID.unique(),
            {
                name: `${user1.name || user1.fullName} & ${user2.name || user2.fullName}`,
                type: PRIVATE_CHAT_TYPE,
                participants: [user1.$id, user2.$id],
                chatKey: chatKey,
                requiresRepresentative: false,
                representatives: [],
                messageCount: 0,
            }
        );

        // Invalidate chat cache for both users
        await chatsCacheManager.invalidateChatsCache(user1.$id);
        await chatsCacheManager.invalidateChatsCache(user2.$id);

        // Return with otherUser populated for proper display
        return { ...chat, otherUser: user2 };
    } catch (error) {
        throw error;
    }
};

export const createCustomGroup = async (groupData, creatorId) => {
    try {
        if (!groupData?.name || !creatorId) {
            throw new Error('Group name and creator are required');
        }

        const members = groupData.members || [];
        if (!members.includes(creatorId)) {
            members.push(creatorId);
        }

        const documentData = {
            name: groupData.name,
            type: CUSTOM_GROUP_TYPE,
            description: groupData.description || '',
            participants: members,
            department: groupData.department || null,
            requiresRepresentative: groupData.requiresRepresentative || false,
            representatives: [creatorId],
            admins: [creatorId],
            messageCount: 0,
            groupPhoto: groupData.groupPhoto || null,
            settings: groupData.settings || null,
        };

        const chat = await databases.createDocument(
            config.databaseId,
            config.chatsCollectionId,
            ID.unique(),
            documentData
        );

        // Invalidate chat cache for all members
        for (const memberId of members) {
            await chatsCacheManager.invalidateChatsCache(memberId);
        }

        return chat;
    } catch (error) {
        throw error;
    }
};

export const getUserPrivateChats = async (userId) => {
    try {
        if (!userId) {
            return [];
        }

        const chats = await databases.listDocuments(
            config.databaseId,
            config.chatsCollectionId,
            [
                Query.equal('type', PRIVATE_CHAT_TYPE),
                Query.contains('participants', [userId]),
                Query.orderDesc('lastMessageAt'),
                Query.limit(50)
            ]
        );

        return chats.documents;
    } catch (error) {
        return [];
    }
};

export const getUserCustomGroups = async (userId) => {
    try {
        if (!userId) {
            return [];
        }

        const chats = await databases.listDocuments(
            config.databaseId,
            config.chatsCollectionId,
            [
                Query.equal('type', CUSTOM_GROUP_TYPE),
                Query.contains('participants', [userId]),
                Query.orderDesc('lastMessageAt'),
                Query.limit(50)
            ]
        );

        return chats.documents;
    } catch (error) {
        return [];
    }
};

export const getAllUserChats = async (userId, department, stage, useCache = true) => {
    const cacheKey = chatsCacheManager.generateCacheKey(userId, department, stage);
    
    try {
        const results = {
            defaultGroups: [],
            customGroups: [],
            privateChats: [],
        };

        if (!userId) {
            return results;
        }

        // Try to get cached data first
        if (useCache) {
            const cached = await chatsCacheManager.getCachedChats(cacheKey);
            if (cached?.value && !cached.isStale) {
                return cached.value;
            }
        }

        const [groupChats, customGroups, privateChats] = await Promise.all([
            department ? getUserGroupChats(department, stage, userId) : Promise.resolve([]),
            getUserCustomGroups(userId),
            getUserPrivateChats(userId),
        ]);

        results.defaultGroups = await decryptChatPreviews(groupChats, userId);
        results.customGroups = await decryptChatPreviews(customGroups, userId);
        
        // Populate otherUser for private chats
        const privateChatsWithOtherUser = await Promise.all(
            privateChats.map(async (chat) => {
                try {
                    const otherUserId = chat.participants?.find(id => id !== userId);
                    if (otherUserId) {
                        const otherUser = await getUserById(otherUserId);
                        return { ...chat, otherUser };
                    }
                    return chat;
                } catch (error) {
                    return chat;
                }
            })
        );
        
        results.privateChats = await decryptChatPreviews(privateChatsWithOtherUser, userId);
        
        // Cache the results
        await chatsCacheManager.cacheChats(cacheKey, results);

        return results;
    } catch (error) {
        // On network error, try to return stale cache
        const cached = await chatsCacheManager.getCachedChats(cacheKey);
        if (cached?.value) {
            return cached.value;
        }
        return {
            defaultGroups: [],
            customGroups: [],
            privateChats: [],
        };
    }
};

export const getChatDisplayName = (chat, currentUserId, userCache = {}) => {
    if (!chat) return '';

    if (chat.type === PRIVATE_CHAT_TYPE && chat.participants) {
        const otherUserId = chat.participants.find(id => id !== currentUserId);
        if (otherUserId && userCache[otherUserId]) {
            return userCache[otherUserId].name || userCache[otherUserId].fullName || chat.name;
        }
    }

    return chat.name || '';
};

export const getChatIcon = (chatType) => {
    switch (chatType) {
        case CHAT_TYPES.STAGE_GROUP:
            return 'people';
        case CHAT_TYPES.DEPARTMENT_GROUP:
            return 'business';
        case PRIVATE_CHAT_TYPE:
            return 'person';
        case CUSTOM_GROUP_TYPE:
            return 'people-circle';
        default:
            return 'chatbubble';
    }
};

export const getChatIconColor = (chatType, theme) => {
    switch (chatType) {
        case CHAT_TYPES.STAGE_GROUP:
            return '#3B82F6';
        case CHAT_TYPES.DEPARTMENT_GROUP:
            return '#8B5CF6';
        case PRIVATE_CHAT_TYPE:
            return '#10B981';
        case CUSTOM_GROUP_TYPE:
            return '#F59E0B';
        default:
            return theme?.primary || '#007AFF';
    }
};

// Group Management Functions

export const updateGroupSettings = async (chatId, updates) => {
    try {
        if (!chatId) throw new Error('Chat ID is required');

        const chat = await databases.updateDocument(
            config.databaseId,
            config.chatsCollectionId,
            chatId,
            updates
        );
        return chat;
    } catch (error) {
        throw error;
    }
};

export const addGroupAdmin = async (chatId, userId) => {
    try {
        if (!chatId || !userId) throw new Error('Chat ID and user ID are required');

        const chat = await databases.getDocument(
            config.databaseId,
            config.chatsCollectionId,
            chatId
        );

        const admins = chat.admins || [];
        if (!admins.includes(userId)) {
            admins.push(userId);
            await databases.updateDocument(
                config.databaseId,
                config.chatsCollectionId,
                chatId,
                { admins, representatives: admins }
            );
        }
        return true;
    } catch (error) {
        throw error;
    }
};

export const removeGroupAdmin = async (chatId, userId) => {
    try {
        if (!chatId || !userId) throw new Error('Chat ID and user ID are required');

        const chat = await databases.getDocument(
            config.databaseId,
            config.chatsCollectionId,
            chatId
        );

        const admins = (chat.admins || []).filter(id => id !== userId);
        const representatives = (chat.representatives || []).filter(id => id !== userId);
        
        await databases.updateDocument(
            config.databaseId,
            config.chatsCollectionId,
            chatId,
            { admins, representatives }
        );
        return true;
    } catch (error) {
        throw error;
    }
};

export const addGroupMember = async (chatId, userId) => {
    try {
        if (!chatId || !userId) throw new Error('Chat ID and user ID are required');

        const chat = await databases.getDocument(
            config.databaseId,
            config.chatsCollectionId,
            chatId
        );

        const participants = chat.participants || [];
        if (!participants.includes(userId)) {
            participants.push(userId);
            await databases.updateDocument(
                config.databaseId,
                config.chatsCollectionId,
                chatId,
                { participants }
            );
            
            // Invalidate cache for the new member
            await chatsCacheManager.invalidateChatsCache(userId);
        }
        return true;
    } catch (error) {
        throw error;
    }
};

export const removeGroupMember = async (chatId, userId) => {
    try {
        if (!chatId || !userId) throw new Error('Chat ID and user ID are required');

        const chat = await databases.getDocument(
            config.databaseId,
            config.chatsCollectionId,
            chatId
        );

        const participants = (chat.participants || []).filter(id => id !== userId);
        const admins = (chat.admins || []).filter(id => id !== userId);
        const representatives = (chat.representatives || []).filter(id => id !== userId);
        
        await databases.updateDocument(
            config.databaseId,
            config.chatsCollectionId,
            chatId,
            { participants, admins, representatives }
        );
        return true;
    } catch (error) {
        throw error;
    }
};

export const leaveGroup = async (chatId, userId) => {
    try {
        if (!chatId || !userId) throw new Error('Chat ID and user ID are required');

        const chat = await databases.getDocument(
            config.databaseId,
            config.chatsCollectionId,
            chatId
        );

        // Check if user is the owner (first admin)
        const isOwner = chat.admins?.[0] === userId;
        
        let newAdmins = (chat.admins || []).filter(id => id !== userId);
        let newRepresentatives = (chat.representatives || []).filter(id => id !== userId);
        const newParticipants = (chat.participants || []).filter(id => id !== userId);

        // If owner is leaving, transfer ownership
        if (isOwner && newParticipants.length > 0) {
            let newOwnerId = null;
            
            // Priority 1: Oldest remaining admin (first in the admins array after filtering)
            if (newAdmins.length > 0) {
                newOwnerId = newAdmins[0]; // Already first, no change needed
            } else {
                // Priority 2: Oldest member (first participant by join order)
                // Find oldest participant by checking who's been there longest
                // Since we can't track join dates, use array order (first = oldest)
                newOwnerId = newParticipants[0];
                
                // Make them an admin
                newAdmins = [newOwnerId];
                newRepresentatives = [newOwnerId];
            }
        }

        await databases.updateDocument(
            config.databaseId,
            config.chatsCollectionId,
            chatId,
            { 
                participants: newParticipants, 
                admins: newAdmins, 
                representatives: newRepresentatives 
            }
        );
        
        // Invalidate cache
        await chatsCacheManager.invalidateChatsCache(userId);
        
        return true;
    } catch (error) {
        throw error;
    }
};

export const deleteGroup = async (chatId) => {
    try {
        if (!chatId) throw new Error('Chat ID is required');

        await databases.deleteDocument(
            config.databaseId,
            config.chatsCollectionId,
            chatId
        );
        return true;
    } catch (error) {
        throw error;
    }
};

export const isUserAdmin = (chat, userId) => {
    if (!chat || !userId) return false;
    return chat.admins?.includes(userId) || chat.representatives?.includes(userId);
};

export const canUserManageGroup = (chat, userId) => {
    if (!chat || !userId) return false;
    // First admin is creator
    return chat.admins?.[0] === userId;
};
