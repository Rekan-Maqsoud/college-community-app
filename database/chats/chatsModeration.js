import { Query } from 'appwrite';
import { databases, config } from '../config';
import { getChat } from './chatsLifecycle';
import { resolveChatKey, decryptMessageFields, checkForEveryoneMention } from './chatsShared';

export const addRepresentative = async (chatId, userId) => {
  try {
    if (!chatId || !userId) {
      throw new Error('Invalid chat ID or user ID');
    }

    const chat = await databases.getDocument(
      config.databaseId,
      config.chatsCollectionId,
      chatId
    );

    const currentReps = chat.representatives || [];
    if (currentReps.includes(userId)) {
      return chat;
    }

    const updatedChat = await databases.updateDocument(
      config.databaseId,
      config.chatsCollectionId,
      chatId,
      {
        representatives: [...currentReps, userId],
      }
    );

    return updatedChat;
  } catch (error) {
    throw error;
  }
};

export const removeRepresentative = async (chatId, userId) => {
  try {
    if (!chatId || !userId) {
      throw new Error('Invalid chat ID or user ID');
    }

    const chat = await databases.getDocument(
      config.databaseId,
      config.chatsCollectionId,
      chatId
    );

    const currentReps = chat.representatives || [];
    const updatedReps = currentReps.filter(id => id !== userId);

    const updatedChat = await databases.updateDocument(
      config.databaseId,
      config.chatsCollectionId,
      chatId,
      {
        representatives: updatedReps,
      }
    );

    return updatedChat;
  } catch (error) {
    throw error;
  }
};

export const pinMessage = async (chatId, messageId, userId) => {
  try {
    if (!chatId || !messageId || !userId) {
      throw new Error('Chat ID, message ID, and user ID are required');
    }

    await databases.updateDocument(
      config.databaseId,
      config.messagesCollectionId,
      messageId,
      {
        isPinned: true,
        pinnedBy: userId,
        pinnedAt: new Date().toISOString(),
      }
    );

    const chat = await databases.getDocument(
      config.databaseId,
      config.chatsCollectionId,
      chatId
    );

    const pinnedMessages = chat.pinnedMessages || [];
    if (!pinnedMessages.includes(messageId)) {
      pinnedMessages.push(messageId);
      await databases.updateDocument(
        config.databaseId,
        config.chatsCollectionId,
        chatId,
        { pinnedMessages }
      );
    }

    return true;
  } catch (error) {
    throw error;
  }
};

export const unpinMessage = async (chatId, messageId) => {
  try {
    if (!chatId || !messageId) {
      throw new Error('Chat ID and message ID are required');
    }

    await databases.updateDocument(
      config.databaseId,
      config.messagesCollectionId,
      messageId,
      {
        isPinned: false,
        pinnedBy: null,
        pinnedAt: null,
      }
    );

    const chat = await databases.getDocument(
      config.databaseId,
      config.chatsCollectionId,
      chatId
    );

    const pinnedMessages = (chat.pinnedMessages || []).filter(id => id !== messageId);
    await databases.updateDocument(
      config.databaseId,
      config.chatsCollectionId,
      chatId,
      { pinnedMessages }
    );

    return true;
  } catch (error) {
    throw error;
  }
};

export const getPinnedMessages = async (chatId, userId = null) => {
  try {
    if (!chatId) {
      throw new Error('Chat ID is required');
    }

    const messages = await databases.listDocuments(
      config.databaseId,
      config.messagesCollectionId,
      [
        Query.equal('chatId', chatId),
        Query.equal('isPinned', true),
        Query.orderDesc('pinnedAt'),
        Query.limit(50),
      ]
    );

    if (!userId) {
      return messages.documents;
    }

    const chat = await getChat(chatId);
    const chatKey = await resolveChatKey(chat, userId);
    if (!chatKey) {
      return messages.documents;
    }

    return messages.documents.map(message => decryptMessageFields(message, chatKey));
  } catch {
    return [];
  }
};

export const canUserPinMessage = async (chatId, userId) => {
  try {
    const chat = await databases.getDocument(
      config.databaseId,
      config.chatsCollectionId,
      chatId
    );

    if (chat.type === 'private') {
      return chat.participants?.includes(userId) || false;
    }

    let settings = {};
    try {
      settings = chat.settings ? JSON.parse(chat.settings) : {};
    } catch {
      settings = {};
    }

    if (settings.onlyAdminsCanPin) {
      return chat.admins?.includes(userId) ||
        chat.representatives?.includes(userId) ||
        false;
    }

    return chat.participants?.includes(userId) || true;
  } catch {
    return false;
  }
};

export { checkForEveryoneMention };

export const canUserMentionEveryone = async (chatId, userId) => {
  try {
    const chat = await databases.getDocument(
      config.databaseId,
      config.chatsCollectionId,
      chatId
    );

    if (chat.type === 'private') {
      return false;
    }

    let settings = {};
    try {
      settings = chat.settings ? JSON.parse(chat.settings) : {};
    } catch {
      settings = {};
    }

    if (settings.allowEveryoneMention === false) {
      return false;
    }

    if (settings.onlyAdminsCanMention) {
      return chat.admins?.includes(userId) ||
        chat.representatives?.includes(userId) ||
        false;
    }

    return true;
  } catch {
    return false;
  }
};

export const updateChatSettings = async (chatId, settings) => {
  try {
    if (!chatId) {
      throw new Error('Chat ID is required');
    }

    const settingsString = JSON.stringify(settings);

    const chat = await databases.updateDocument(
      config.databaseId,
      config.chatsCollectionId,
      chatId,
      { settings: settingsString }
    );

    return chat;
  } catch (error) {
    throw error;
  }
};

export const getChatSettings = async (chatId) => {
  try {
    if (!chatId) {
      return {};
    }

    const chat = await databases.getDocument(
      config.databaseId,
      config.chatsCollectionId,
      chatId
    );

    try {
      return chat.settings ? JSON.parse(chat.settings) : {};
    } catch {
      return {};
    }
  } catch {
    return {};
  }
};

export const getUnreadCount = async (chatId, userId, options = {}) => {
  try {
    if (!chatId || !userId) {
      return 0;
    }

    const messages = await databases.listDocuments(
      config.databaseId,
      config.messagesCollectionId,
      [
        Query.equal('chatId', chatId),
        Query.limit(100),
        Query.orderDesc('$createdAt'),
      ]
    );

    let unreadCount = 0;
    for (const message of messages.documents) {
      if (message.senderId !== userId) {
        const readBy = message.readBy || [];
        if (!readBy.includes(userId)) {
          unreadCount++;
        }
      }
    }

    return unreadCount;
  } catch {
    return 0;
  }
};

export const markChatAsRead = async (chatId, userId) => {
  try {
    if (!chatId || !userId) {
      return;
    }

    const messages = await databases.listDocuments(
      config.databaseId,
      config.messagesCollectionId,
      [
        Query.equal('chatId', chatId),
        Query.limit(100),
        Query.orderDesc('$createdAt'),
      ]
    );

    const updatePromises = messages.documents
      .filter(msg => msg.senderId !== userId && !(msg.readBy || []).includes(userId))
      .map(msg => {
        const readBy = msg.readBy || [];
        readBy.push(userId);
        return databases.updateDocument(
          config.databaseId,
          config.messagesCollectionId,
          msg.$id,
          { readBy }
        );
      });

    await Promise.all(updatePromises);
  } catch {
  }
};

export const getTotalUnreadCount = async (userId, chatIds, options = {}) => {
  try {
    if (!userId || !chatIds || chatIds.length === 0) {
      return 0;
    }

    let totalUnread = 0;
    for (const chatId of chatIds) {
      const count = await getUnreadCount(chatId, userId);
      totalUnread += count;
    }

    return totalUnread;
  } catch {
    return 0;
  }
};
