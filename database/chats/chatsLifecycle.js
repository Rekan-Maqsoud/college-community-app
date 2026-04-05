import { ID, Query } from 'appwrite';
import { databases, config } from '../config';
import { CHAT_TYPES } from './chatsMedia';
import { decryptChatPreviews } from './chatsEncryption';
import {
  buildParticipantPermissions,
  getAuthenticatedUserId,
  canManageChat,
  parseChatSettings,
  ensureChatEncryption,
  removeStoredChatKey,
} from './chatsShared';
import { canGuestInitiateChat } from '../../app/utils/guestUtils';

export const createGroupChat = async (chatData) => {
  try {
    if (!chatData || typeof chatData !== 'object') {
      throw new Error('Invalid chat data');
    }

    if (!chatData.type || !Object.values(CHAT_TYPES).includes(chatData.type)) {
      throw new Error('Invalid chat type');
    }

    if (!chatData.name || typeof chatData.name !== 'string') {
      throw new Error('Chat name is required');
    }

    const currentUserId = await getAuthenticatedUserId();
    const participants = Array.isArray(chatData.participants)
      ? Array.from(new Set([...chatData.participants, currentUserId]))
      : [currentUserId];

    const chat = await databases.createDocument({
      databaseId: config.databaseId,
      collectionId: config.chatsCollectionId,
      documentId: ID.unique(),
      data: {
        ...chatData,
        participants,
        messageCount: 0,
      },
      permissions: buildParticipantPermissions(participants)
    });

    await ensureChatEncryption(chat, currentUserId).catch(() => null);
    return chat;
  } catch (error) {
    throw error;
  }
};

export const createChat = async (chatData) => {
  try {
    if (!chatData || typeof chatData !== 'object') {
      throw new Error('Invalid chat data');
    }

    if (!chatData.participants || !Array.isArray(chatData.participants)) {
      throw new Error('Participants array is required');
    }

    const currentUserId = await getAuthenticatedUserId();
    const participants = Array.from(new Set([...chatData.participants, currentUserId]));

    const chat = await databases.createDocument({
      databaseId: config.databaseId,
      collectionId: config.chatsCollectionId,
      documentId: ID.unique(),
      data: {
        ...chatData,
        participants,
      },
      permissions: buildParticipantPermissions(participants)
    });

    await ensureChatEncryption(chat, currentUserId).catch(() => null);
    return chat;
  } catch (error) {
    throw error;
  }
};

export const getUserGroupChats = async (department, stage, userId = null) => {
  try {
    if (!department || typeof department !== 'string') {
      throw new Error('Invalid department');
    }

    if (String(department).trim().toLowerCase() === 'other') {
      return [];
    }

    if (!config.chatsCollectionId) {
      throw new Error('Chat collection not configured. Please check your .env file.');
    }

    const departmentQuery = Query.equal('department', department);
    const classGroupLimit = 100;
    const allChats = [];

    const departmentChats = await databases.listDocuments({
      databaseId: config.databaseId,
      collectionId: config.chatsCollectionId,
      queries: [
        departmentQuery,
        Query.equal('type', CHAT_TYPES.DEPARTMENT_GROUP),
        Query.orderDesc('lastMessageAt'),
        Query.limit(classGroupLimit),
      ]
    });
    allChats.push(...departmentChats.documents);

    if (stage) {
      const stageValue = typeof stage === 'number' ? String(stage) : stage;
      const stageChats = await databases.listDocuments({
        databaseId: config.databaseId,
        collectionId: config.chatsCollectionId,
        queries: [
          departmentQuery,
          Query.equal('stage', stageValue),
          Query.equal('type', CHAT_TYPES.STAGE_GROUP),
          Query.orderDesc('lastMessageAt'),
          Query.limit(classGroupLimit),
        ]
      });
      allChats.push(...stageChats.documents);
    }

    const deduplicatedByClassGroup = Array.from(
      allChats.reduce((acc, chat) => {
        if (!chat?.$id) {
          return acc;
        }

        const dedupeKey = `${chat.type || 'group'}:${chat.department || ''}:${chat.stage || ''}`;
        const existing = acc.get(dedupeKey);

        if (!existing) {
          acc.set(dedupeKey, chat);
          return acc;
        }

        const existingDate = new Date(existing.lastMessageAt || existing.$updatedAt || existing.$createdAt || 0);
        const incomingDate = new Date(chat.lastMessageAt || chat.$updatedAt || chat.$createdAt || 0);
        if (incomingDate > existingDate) {
          acc.set(dedupeKey, chat);
        }

        return acc;
      }, new Map()).values()
    );

    const sorted = deduplicatedByClassGroup.sort((a, b) => {
      const dateA = new Date(a.lastMessageAt || a.$createdAt || 0);
      const dateB = new Date(b.lastMessageAt || b.$createdAt || 0);
      return dateB - dateA;
    });

    if (userId) {
      return await decryptChatPreviews(sorted, userId);
    }

    return sorted;
  } catch (error) {
    throw error;
  }
};

export const getChats = async (userId, limit = 200) => {
  try {
    if (!userId || typeof userId !== 'string') {
      throw new Error('Invalid user ID');
    }

    const boundedLimit = Math.min(Math.max(limit, 1), 200);

    const chats = await databases.listDocuments({
      databaseId: config.databaseId,
      collectionId: config.chatsCollectionId,
      queries: [
        Query.contains('participants', userId),
        Query.orderDesc('lastMessageAt'),
        Query.limit(boundedLimit),
      ]
    });
    return await decryptChatPreviews(chats.documents, userId);
  } catch (error) {
    throw error;
  }
};

export const getChat = async (chatId) => {
  try {
    if (!chatId || typeof chatId !== 'string') {
      throw new Error('Invalid chat ID');
    }

    const chat = await databases.getDocument({
      databaseId: config.databaseId,
      collectionId: config.chatsCollectionId,
      documentId: chatId,
    });
    return chat;
  } catch (error) {
    throw error;
  }
};

export const clearChatMessages = async (chatId, actorUserId = null) => {
  try {
    if (!chatId || typeof chatId !== 'string') {
      throw new Error('Invalid chat ID');
    }

    const effectiveActorUserId = actorUserId || await getAuthenticatedUserId();
    const chat = await getChat(chatId, true);
    if (!canManageChat(chat, effectiveActorUserId)) {
      throw new Error('Not authorized to clear this chat');
    }

    let hasMore = true;
    let deletedCount = 0;

    while (hasMore) {
      const messages = await databases.listDocuments({
        databaseId: config.databaseId,
        collectionId: config.messagesCollectionId,
        queries: [
          Query.equal('chatId', chatId),
          Query.orderAsc('$createdAt'),
          Query.limit(100),
        ]
      });

      if (messages.documents.length === 0) {
        hasMore = false;
        break;
      }

      const deletePromises = messages.documents.map(async (msg) => {
        try {
          await databases.deleteDocument({
            databaseId: config.databaseId,
            collectionId: config.messagesCollectionId,
            documentId: msg.$id,
          });

          if (msg.imageDeleteUrl) {
            try {
              const { deleteImageFromImgbb } = require('../../services/imgbbService');
              await deleteImageFromImgbb(msg.imageDeleteUrl);
            } catch {
            }
          }
          return true;
        } catch {
          return false;
        }
      });

      const results = await Promise.all(deletePromises);
      deletedCount += results.filter(r => r).length;

      if (messages.documents.length < 100) {
        hasMore = false;
      }
    }

    return { success: true, deletedCount };
  } catch (error) {
    throw error;
  }
};

export const deleteChat = async (chatId, actorUserId = null) => {
  try {
    if (!chatId || typeof chatId !== 'string') {
      throw new Error('Invalid chat ID');
    }

    const effectiveActorUserId = actorUserId || await getAuthenticatedUserId();
    const chat = await getChat(chatId, true);
    if (!canManageChat(chat, effectiveActorUserId)) {
      throw new Error('Not authorized to delete this chat');
    }

    const { deleteUserChatSettingsByChatId } = require('../userChatSettings');

    await clearChatMessages(chatId, effectiveActorUserId);
    await deleteUserChatSettingsByChatId(chatId);

    await databases.deleteDocument({
      databaseId: config.databaseId,
      collectionId: config.chatsCollectionId,
      documentId: chatId,
    });
    await removeStoredChatKey(chatId);
  } catch (error) {
    throw error;
  }
};

export const removePrivateChatForUser = async (chatId, userId) => {
  try {
    if (!chatId || !userId) {
      throw new Error('Invalid chat ID or user ID');
    }

    const chat = await databases.getDocument({
      databaseId: config.databaseId,
      collectionId: config.chatsCollectionId,
      documentId: chatId,
    });

    if (chat.type !== 'private') {
      throw new Error('This function is only for private chats');
    }

    const settings = parseChatSettings(chat.settings);
    const removedBy = Array.isArray(settings.removedBy) ? settings.removedBy : [];

    if (!removedBy.includes(userId)) {
      removedBy.push(userId);
    }

    const participants = Array.isArray(chat.participants) ? chat.participants : [];
    const allRemoved = participants.length > 0 && participants.every(p => removedBy.includes(p));

    if (allRemoved) {
      await deleteChat(chatId, userId);
      return 'deleted';
    }

    const updatedSettings = { ...settings, removedBy };
    await databases.updateDocument({
      databaseId: config.databaseId,
      collectionId: config.chatsCollectionId,
      documentId: chatId,
      data: { settings: JSON.stringify(updatedSettings) },
    });
    return 'hidden';
  } catch (error) {
    throw error;
  }
};

export const isChatRemovedByUser = (chat, userId) => {
  const settings = parseChatSettings(chat.settings);
  const removedBy = Array.isArray(settings.removedBy) ? settings.removedBy : [];
  return removedBy.includes(userId);
};

export const restorePrivateChatForUser = async (chatId, userId) => {
  try {
    const chat = await databases.getDocument({
      databaseId: config.databaseId,
      collectionId: config.chatsCollectionId,
      documentId: chatId,
    });

    const settings = parseChatSettings(chat.settings);
    if (!Array.isArray(settings.removedBy) || settings.removedBy.length === 0) return;

    const updatedRemovedBy = settings.removedBy.filter(id => id !== userId);
    const updatedSettings = { ...settings, removedBy: updatedRemovedBy };

    await databases.updateDocument({
      databaseId: config.databaseId,
      collectionId: config.chatsCollectionId,
      documentId: chatId,
      data: { settings: JSON.stringify(updatedSettings) }
    });
  } catch {
  }
};

export const canUserSendMessage = async (chatId, userId) => {
  try {
    if (!chatId || !userId) {
      return false;
    }

    const chat = await databases.getDocument({
      databaseId: config.databaseId,
      collectionId: config.chatsCollectionId,
      documentId: chatId,
    });

    const participants = Array.isArray(chat.participants) ? chat.participants : [];
    if (!participants.includes(userId)) {
      return false;
    }

    if (chat.type === 'private') {
      if (!chat.participants?.includes(userId)) return false;
      const otherUserId = chat.participants.find(id => id !== userId);
      if (otherUserId) {
        try {
          const [currentUserDoc, otherUserDoc] = await Promise.all([
            databases.getDocument({
              databaseId: config.databaseId,
              collectionId: config.usersCollectionId,
              documentId: userId,
            }),
            databases.getDocument({
              databaseId: config.databaseId,
              collectionId: config.usersCollectionId,
              documentId: otherUserId,
            }),
          ]);
          const myBlocked = currentUserDoc?.blockedUsers || [];
          const theirBlocked = otherUserDoc?.blockedUsers || [];
          const myChatBlocked = currentUserDoc?.chatBlockedUsers || [];
          const theirChatBlocked = otherUserDoc?.chatBlockedUsers || [];
          if (
            myBlocked.includes(otherUserId) ||
            theirBlocked.includes(userId) ||
            myChatBlocked.includes(otherUserId) ||
            theirChatBlocked.includes(userId)
          ) {
            return false;
          }

          // Guests can only message students when both users follow each other.
          if (!canGuestInitiateChat(currentUserDoc, otherUserDoc)) {
            return false;
          }
        } catch {
          return false;
        }
      }
      return true;
    }

    if (chat.type === 'custom_group') {
      if (!chat.participants?.includes(userId)) {
        return false;
      }

      let settings = {};
      try {
        settings = chat.settings ? JSON.parse(chat.settings) : {};
      } catch {
        settings = {};
      }

      if (settings.onlyAdminsCanPost) {
        return chat.admins?.includes(userId) ||
               chat.representatives?.includes(userId) ||
               false;
      }

      return true;
    }

    if (!chat.requiresRepresentative) {
      return participants.includes(userId);
    }

    return chat.representatives?.includes(userId) || false;
  } catch {
    return false;
  }
};
