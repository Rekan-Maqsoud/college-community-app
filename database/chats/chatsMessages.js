import { ID, Query } from 'appwrite';
import { databases, config } from '../config';
import { sendChatPushNotification } from '../../services/pushNotificationService';
import { parsePollPayload, applyPollVote } from '../../app/utils/pollUtils';
import { enforceRateLimit } from '../securityGuards';
import { ensureChatParticipant } from './chatsEncryption';
import { getChat, canUserSendMessage, restorePrivateChatForUser } from './chatsLifecycle';
import {
  getAuthenticatedUserId,
  buildParticipantPermissions,
  ensureChatEncryption,
  parseChatSettings,
  checkForEveryoneMention,
  encryptContent,
  decryptContent,
  isEncryptedContent,
  decryptMessageFields,
  decryptMessagesWithRecovery,
  canManageChat,
  parseMessageReactions,
  resolveChatKey,
} from './chatsShared';

export const sendMessage = async (chatId, messageData) => {
  try {
    if (!chatId || typeof chatId !== 'string') {
      throw new Error('Invalid chat ID');
    }

    if (!messageData || typeof messageData !== 'object') {
      throw new Error('Invalid message data');
    }

    if (!messageData.senderName || typeof messageData.senderName !== 'string') {
      throw new Error('Missing required message fields');
    }

    const currentUserId = await getAuthenticatedUserId();
    const senderId = currentUserId;

    enforceRateLimit({
      action: 'send_chat_message',
      userId: currentUserId,
      maxActions: 15,
      windowMs: 10 * 1000,
    });

    const hasContent = messageData.content && messageData.content.trim().length > 0;
    const hasImages = messageData.images && messageData.images.length > 0;
    const hasType = messageData.type && messageData.type.trim().length > 0;

    if (!hasContent && !hasImages && !hasType) {
      throw new Error('Message must have either content or an image');
    }

    const canSend = await canUserSendMessage(chatId, senderId);
    if (!canSend) {
      throw new Error('User does not have permission to send messages in this chat');
    }

    const chat = await ensureChatParticipant(chatId, senderId) || await getChat(chatId);

    if (chat.type === 'private') {
      restorePrivateChatForUser(chatId, senderId).catch(() => {});
    }

    const chatKey = await ensureChatEncryption(chat, senderId);

    let shouldEncrypt = false;
    if (chatKey) {
      const refreshed = await getChat(chatId, true);
      const covSettings = parseChatSettings(refreshed.settings);
      const covKeys = covSettings?.e2ee?.keys || {};
      const participants = Array.isArray(chat.participants) ? chat.participants : [];
      shouldEncrypt = participants.every((pid) => !!covKeys[pid]);
    }

    const mentionsAll = checkForEveryoneMention(messageData.content);
    const encryptedContent = hasContent
      ? (shouldEncrypt ? encryptContent(messageData.content, chatKey) : messageData.content)
      : '';
    const encryptedReplyContent = messageData.replyToContent
      ? (shouldEncrypt ? encryptContent(messageData.replyToContent, chatKey) : messageData.replyToContent)
      : '';
    const serializedMetadata = messageData.metadata
      ? (typeof messageData.metadata === 'string' ? messageData.metadata : JSON.stringify(messageData.metadata))
      : '';
    const encryptedMetadata = serializedMetadata
      ? (shouldEncrypt ? encryptContent(serializedMetadata, chatKey) : serializedMetadata)
      : '';

    const documentData = {
      chatId,
      senderId,
      senderName: messageData.senderName,
      content: encryptedContent,
      mentionsAll,
      status: 'sent',
      deliveredTo: [],
      readBy: [],
    };

    if (messageData.type) {
      documentData.type = messageData.type;
    }

    if (messageData.metadata) {
      documentData.content = encryptedMetadata;
    }

    if (messageData.type === 'gif' && messageData.gif_metadata) {
      const serializedGifMetadata = typeof messageData.gif_metadata === 'string'
        ? messageData.gif_metadata
        : JSON.stringify(messageData.gif_metadata);
      documentData.content = shouldEncrypt
        ? encryptContent(serializedGifMetadata, chatKey)
        : serializedGifMetadata;
    }

    if (hasImages) {
      documentData.imageUrl = messageData.images[0];
      if (!documentData.type) {
        documentData.type = 'image';
      }
    }

    if (messageData.replyToId) {
      documentData.replyToId = messageData.replyToId;
      documentData.replyToContent = encryptedReplyContent || '';
      documentData.replyToSender = messageData.replyToSender || '';
    }

    const message = await databases.createDocument({
      databaseId: config.databaseId,
      collectionId: config.messagesCollectionId,
      documentId: ID.unique(),
      data: documentData,
      permissions: buildParticipantPermissions(chat.participants || [senderId])
    });

    const latestChatDoc = await getChat(chatId, true);
    const currentCount = Math.max(
      Number(chat.messageCount || 0),
      Number(latestChatDoc?.messageCount || 0)
    );

    let lastMessagePreview = '';
    if (messageData.type === 'image' || (hasImages && !hasContent)) {
      lastMessagePreview = '\uD83D\uDCF7 Image';
    } else if (messageData.type === 'gif') {
      lastMessagePreview = 'GIF';
    } else if (messageData.type === 'file') {
      lastMessagePreview = '\uD83D\uDCCE File';
    } else if (messageData.type === 'voice') {
      lastMessagePreview = '\uD83C\uDFA4 Voice message';
    } else if (messageData.type === 'location') {
      lastMessagePreview = '\uD83D\uDCCD Location';
    } else if (messageData.type === 'poll') {
      lastMessagePreview = '\uD83D\uDCCA Poll';
    } else if (messageData.type === 'post_share') {
      lastMessagePreview = '\uD83D\uDCDD Shared Post';
    } else if (messageData.type === 'lecture_asset_banner') {
      lastMessagePreview = '\uD83D\uDCDA New lecture file';
    } else if (hasContent) {
      lastMessagePreview = encryptedContent;
    }
    const notificationPreview = typeof messageData.notificationPreview === 'string'
      ? messageData.notificationPreview
      : '';

    const lastMessageAtTimestamp = new Date().toISOString();

    await databases.updateDocument({
      databaseId: config.databaseId,
      collectionId: config.chatsCollectionId,
      documentId: chatId,
      data: {
        lastMessage: lastMessagePreview,
        lastMessageAt: lastMessageAtTimestamp,
        lastMessageSenderId: senderId,
        messageCount: currentCount + 1,
      }
    });

    sendChatPushNotification({
      chatId,
      messageId: message.$id,
      senderId,
      senderName: messageData.senderName,
      content: notificationPreview,
      chatName: chat.name,
      chatType: chat.type,
    }).catch(() => {});

    return decryptMessageFields(message, chatKey);
  } catch (error) {
    throw error;
  }
};

export const getMessages = async (chatId, userIdOrLimit = 50, limitOrOffset = 0, offsetArg = 0) => {
  let userId = null;
  let limit = 50;
  let offset = 0;

  try {
    if (!chatId || typeof chatId !== 'string') {
      throw new Error('Invalid chat ID');
    }

    if (!config.messagesCollectionId) {
      throw new Error('Messages collection not configured. Please check your .env file.');
    }

    if (typeof userIdOrLimit === 'string') {
      userId = userIdOrLimit;
      limit = typeof limitOrOffset === 'number' ? limitOrOffset : 50;
      offset = typeof offsetArg === 'number' ? offsetArg : 0;
    } else {
      limit = typeof userIdOrLimit === 'number' ? userIdOrLimit : 50;
      offset = typeof limitOrOffset === 'number' ? limitOrOffset : 0;
    }

    const messages = await databases.listDocuments({
      databaseId: config.databaseId,
      collectionId: config.messagesCollectionId,
      queries: [
        Query.equal('chatId', chatId),
        Query.orderDesc('$createdAt'),
        Query.limit(Math.min(limit, 100)),
        Query.offset(offset),
      ]
    });

    let documents = messages.documents;
    if (userId) {
      const chat = await getChat(chatId);
      const chatKey = await resolveChatKey(chat, userId);
      documents = await decryptMessagesWithRecovery(chat, userId, documents, chatKey);
    }

    return documents;
  } catch (error) {
    throw error;
  }
};

export const voteOnMessagePoll = async (chatId, messageId, userId, selectedOptionIds) => {
  try {
    if (!chatId || typeof chatId !== 'string') {
      throw new Error('Invalid chat ID');
    }

    if (!messageId || typeof messageId !== 'string') {
      throw new Error('Invalid message ID');
    }

    const currentUserId = await getAuthenticatedUserId();
    const effectiveUserId = currentUserId;

    const chat = await ensureChatParticipant(chatId, effectiveUserId);
    const chatKey = await resolveChatKey(chat, effectiveUserId);
    const message = await databases.getDocument({
      databaseId: config.databaseId,
      collectionId: config.messagesCollectionId,
      documentId: messageId,
    });

    if (message.chatId !== chatId) {
      throw new Error('Message does not belong to this chat');
    }

    if (message.type !== 'poll') {
      throw new Error('Message is not a poll');
    }

    const rawContent = chatKey ? decryptContent(message.content, chatKey) : message.content;
    const parsedPoll = parsePollPayload(rawContent);
    if (!parsedPoll) {
      throw new Error('Invalid poll payload');
    }

    const nextPoll = applyPollVote(parsedPoll, effectiveUserId, selectedOptionIds);
    const serializedPoll = JSON.stringify(nextPoll);
    const shouldEncrypt = chatKey && isEncryptedContent(message.content);
    const contentToSave = shouldEncrypt ? encryptContent(serializedPoll, chatKey) : serializedPoll;

    const updatedMessage = await databases.updateDocument({
      databaseId: config.databaseId,
      collectionId: config.messagesCollectionId,
      documentId: messageId,
      data: {
        content: contentToSave,
      }
    });

    if (chatKey) {
      return decryptMessageFields(updatedMessage, chatKey);
    }

    return updatedMessage;
  } catch (error) {
    throw error;
  }
};

export const deleteMessage = async (messageId, imageDeleteUrl = null) => {
  try {
    if (!messageId || typeof messageId !== 'string') {
      throw new Error('Invalid message ID');
    }

    const currentUserId = await getAuthenticatedUserId();
    const message = await databases.getDocument({
      databaseId: config.databaseId,
      collectionId: config.messagesCollectionId,
      documentId: messageId,
    });

    const chat = await getChat(message.chatId, true);
    const canDelete = message.senderId === currentUserId || canManageChat(chat, currentUserId);
    if (!canDelete) {
      throw new Error('Not authorized to delete this message');
    }

    await databases.deleteDocument({
      databaseId: config.databaseId,
      collectionId: config.messagesCollectionId,
      documentId: messageId,
    });

    const deleteUrl = message?.imageDeleteUrl || imageDeleteUrl;
    if (deleteUrl) {
      try {
        const { deleteImageFromImgbb } = require('../../services/imgbbService');
        await deleteImageFromImgbb(deleteUrl);
      } catch {
      }
    }
  } catch (error) {
    throw error;
  }
};

export const updateMessage = async (messageId, messageData) => {
  try {
    if (!messageId || typeof messageId !== 'string') {
      throw new Error('Invalid message ID');
    }

    if (!messageData || typeof messageData !== 'object') {
      throw new Error('Invalid message data');
    }

    const currentUserId = await getAuthenticatedUserId();
    const existingMessage = await databases.getDocument({
      databaseId: config.databaseId,
      collectionId: config.messagesCollectionId,
      documentId: messageId,
    });

    const chat = await getChat(existingMessage.chatId, true);
    const canEdit = existingMessage.senderId === currentUserId || canManageChat(chat, currentUserId);
    if (!canEdit) {
      throw new Error('Not authorized to update this message');
    }

    const message = await databases.updateDocument({
      databaseId: config.databaseId,
      collectionId: config.messagesCollectionId,
      documentId: messageId,
      data: messageData
    });
    return message;
  } catch (error) {
    throw error;
  }
};

export const toggleMessageReaction = async (chatId, messageId, userId, emoji) => {
  try {
    if (!messageId || !emoji) {
      throw new Error('Message ID and emoji are required');
    }

    const currentUserId = await getAuthenticatedUserId();
    enforceRateLimit({
      action: 'toggle_message_reaction',
      userId: currentUserId,
      maxActions: 25,
      windowMs: 60 * 1000,
    });

    const message = await databases.getDocument({
      databaseId: config.databaseId,
      collectionId: config.messagesCollectionId,
      documentId: messageId,
    });

    if (chatId && message.chatId !== chatId) {
      throw new Error('Message does not belong to this chat');
    }

    const chat = await getChat(message.chatId, true);
    const participants = Array.isArray(chat?.participants) ? chat.participants : [];
    if (!participants.includes(currentUserId)) {
      throw new Error('Not authorized to react in this chat');
    }

    const reactions = parseMessageReactions(message.reactions);
    const current = Array.isArray(reactions[emoji]) ? reactions[emoji] : [];
    const hasReacted = current.includes(currentUserId);
    const nextReactions = Object.entries(reactions).reduce((acc, [key, users]) => {
      const filtered = Array.isArray(users) ? users.filter(id => id !== currentUserId) : [];
      if (filtered.length > 0) {
        acc[key] = filtered;
      }
      return acc;
    }, {});

    if (!hasReacted) {
      nextReactions[emoji] = [...(nextReactions[emoji] || []), currentUserId];
    }

    const updatedMessage = await databases.updateDocument({
      databaseId: config.databaseId,
      collectionId: config.messagesCollectionId,
      documentId: messageId,
      data: { reactions: JSON.stringify(nextReactions) }
    });

    return updatedMessage;
  } catch (error) {
    throw error;
  }
};

export const markMessageAsDelivered = async (messageId, userId) => {
  try {
    if (!messageId || !userId) {
      return null;
    }

    const message = await databases.getDocument({
      databaseId: config.databaseId,
      collectionId: config.messagesCollectionId,
      documentId: messageId,
    });

    const currentDeliveredTo = message.deliveredTo || [];
    if (currentDeliveredTo.includes(userId)) {
      return message;
    }

    const updatedMessage = await databases.updateDocument({
      databaseId: config.databaseId,
      collectionId: config.messagesCollectionId,
      documentId: messageId,
      data: {
        deliveredTo: [...currentDeliveredTo, userId],
        status: 'delivered',
      }
    });

    return updatedMessage;
  } catch {
    return null;
  }
};

export const markMessageAsRead = async (messageId, userId) => {
  try {
    if (!messageId || !userId) {
      return null;
    }

    const message = await databases.getDocument({
      databaseId: config.databaseId,
      collectionId: config.messagesCollectionId,
      documentId: messageId,
    });

    const currentReadBy = message.readBy || [];
    if (currentReadBy.includes(userId)) {
      return message;
    }

    const updatedMessage = await databases.updateDocument({
      databaseId: config.databaseId,
      collectionId: config.messagesCollectionId,
      documentId: messageId,
      data: {
        readBy: [...currentReadBy, userId],
        status: 'read',
      }
    });

    return updatedMessage;
  } catch {
    return null;
  }
};

export const markAllMessagesAsRead = async (chatId, userId) => {
  try {
    if (!chatId || !userId) {
      return;
    }

    const messages = await databases.listDocuments({
      databaseId: config.databaseId,
      collectionId: config.messagesCollectionId,
      queries: [
        Query.equal('chatId', chatId),
        Query.orderDesc('$createdAt'),
        Query.limit(50),
      ]
    });

    const updatePromises = messages.documents
      .filter(msg => msg.senderId !== userId && !(msg.readBy || []).includes(userId))
      .map(msg => markMessageAsRead(msg.$id, userId));

    await Promise.all(updatePromises);
  } catch {
  }
};

export const getMessageReadReceipts = async (messageId) => {
  try {
    if (!messageId) {
      return [];
    }

    const message = await databases.getDocument({
      databaseId: config.databaseId,
      collectionId: config.messagesCollectionId,
      documentId: messageId,
    });

    return message.readBy || [];
  } catch {
    return [];
  }
};

export const getMessagesCursor = async (chatId, userId = null, limit = 50, afterCursor = null) => {
  try {
    if (!chatId || typeof chatId !== 'string') {
      throw new Error('Invalid chat ID');
    }
    if (!config.messagesCollectionId) {
      throw new Error('Messages collection not configured');
    }

    const queries = [
      Query.equal('chatId', chatId),
      Query.orderDesc('$createdAt'),
      Query.limit(Math.min(limit, 100)),
    ];

    if (afterCursor) {
      queries.push(Query.cursorAfter(afterCursor));
    }

    const response = await databases.listDocuments({
      databaseId: config.databaseId,
      collectionId: config.messagesCollectionId,
      queries,
    });

    let documents = response.documents;

    if (userId) {
      const chat = await getChat(chatId);
      const chatKey = await resolveChatKey(chat, userId);
      documents = await decryptMessagesWithRecovery(chat, userId, documents, chatKey);
    }

    const lastDoc = documents.length > 0 ? documents[documents.length - 1] : null;

    return {
      documents,
      lastCursor: lastDoc?.$id || null,
      hasMore: response.documents.length === limit,
    };
  } catch (error) {
    throw error;
  }
};
