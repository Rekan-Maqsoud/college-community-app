import { databases, config } from '../config';
import nacl from 'tweetnacl';
import { assertActorIdentity } from '../securityGuards';
import {
  getAuthenticatedUserId,
  parseChatSettings,
  resolveChatKey,
  decryptContent,
  isEncryptedContent,
  sanitizeEncryptedMessage,
  clearStoredChatKey,
  decryptMessageFieldsWithRecovery,
  getOrCreateUserKeypair,
  encodeBytes,
  ensureUserPublicKeyStored,
  getSecureRandomBytes,
  getParticipantPublicKey,
  encryptWithBox,
  decodeBytes,
} from './chatsShared';
import { getChat } from './chatsLifecycle';

export const ensureChatParticipant = async (chatId, userId) => {
  try {
    if (!chatId || !userId) return null;

    const chat = await getChat(chatId);
    const participants = Array.isArray(chat.participants) ? chat.participants : [];

    if (participants.includes(userId)) {
      return chat;
    }

    const updatedChat = await databases.updateDocument(
      config.databaseId,
      config.chatsCollectionId,
      chatId,
      { participants: [...participants, userId] }
    );

    await rotateChatE2eeKeys(chatId, userId).catch(() => null);

    return updatedChat;
  } catch {
    return null;
  }
};

export const rotateChatE2eeKeys = async (chatId, actorUserId = null) => {
  try {
    if (!chatId || typeof chatId !== 'string') {
      throw new Error('Invalid chat ID');
    }

    const currentUserId = actorUserId || await getAuthenticatedUserId();
    await assertActorIdentity(currentUserId);

    const chat = await getChat(chatId, true);
    const participants = Array.isArray(chat?.participants) ? Array.from(new Set(chat.participants)) : [];
    if (!participants.includes(currentUserId)) {
      throw new Error('Not authorized to rotate chat keys');
    }

    const settings = parseChatSettings(chat.settings);
    const previousE2ee = settings?.e2ee || {};
    const previousHistory = Array.isArray(previousE2ee.keyHistory) ? previousE2ee.keyHistory : [];
    const previousVersion = Number(previousE2ee.keyVersion || previousE2ee.version || 1);

    const senderKeypair = await getOrCreateUserKeypair(currentUserId);
    if (!senderKeypair) {
      throw new Error('Unable to create encryption keypair');
    }

    const senderPublicKey = encodeBytes(senderKeypair.publicKey);
    await ensureUserPublicKeyStored(currentUserId, senderPublicKey);

    const nextChatKey = getSecureRandomBytes(nacl.secretbox.keyLength);
    if (!nextChatKey) {
      throw new Error('Unable to rotate chat key');
    }

    const publicKeys = {
      ...(previousE2ee.publicKeys || {}),
      [currentUserId]: senderPublicKey,
    };

    const nextKeys = {};
    for (const participantId of participants) {
      const participantPublicKey = participantId === currentUserId
        ? senderPublicKey
        : await getParticipantPublicKey({ e2ee: { publicKeys } }, participantId);
      if (!participantPublicKey) {
        continue;
      }

      if (!publicKeys[participantId]) {
        publicKeys[participantId] = participantPublicKey;
      }

      const encrypted = encryptWithBox(
        nextChatKey,
        senderKeypair.secretKey,
        decodeBytes(participantPublicKey)
      );
      if (!encrypted) {
        continue;
      }

      nextKeys[participantId] = {
        nonce: encodeBytes(encrypted.nonce),
        cipher: encodeBytes(encrypted.cipher),
        senderPublicKey,
      };
    }

    const nextKeyVersion = previousVersion + 1;
    const rotatedAt = new Date().toISOString();
    const historyEntry = {
      keyVersion: nextKeyVersion,
      creatorId: currentUserId,
      creatorPublicKey: senderPublicKey,
      keys: nextKeys,
      rotatedAt,
    };

    const nextHistory = [...previousHistory, historyEntry].slice(-5);
    const nextSettings = {
      ...settings,
      e2ee: {
        ...previousE2ee,
        version: 1,
        keyVersion: nextKeyVersion,
        rotatedAt,
        creatorId: currentUserId,
        creatorPublicKey: senderPublicKey,
        publicKeys,
        keys: nextKeys,
        keyHistory: nextHistory,
      },
    };

    await databases.updateDocument(
      config.databaseId,
      config.chatsCollectionId,
      chatId,
      { settings: JSON.stringify(nextSettings) }
    );

    return { success: true, keyVersion: nextKeyVersion };
  } catch (error) {
    throw error;
  }
};

export const recoverChatE2eeKey = async (chatId, userId = null) => {
  try {
    if (!chatId || typeof chatId !== 'string') {
      return null;
    }

    const effectiveUserId = userId || await getAuthenticatedUserId();
    await assertActorIdentity(effectiveUserId);

    await clearStoredChatKey(chatId);
    const chat = await getChat(chatId, true);
    return await resolveChatKey(chat, effectiveUserId, { forceRefresh: true });
  } catch {
    return null;
  }
};

export const decryptChatPreview = async (chat, userId) => {
  try {
    if (!chat || !userId) return chat;
    if (!chat.lastMessage || typeof chat.lastMessage !== 'string') return chat;

    if (!isEncryptedContent(chat.lastMessage)) {
      return chat;
    }

    const chatKey = await resolveChatKey(chat, userId);
    if (!chatKey) {
      return { ...chat, lastMessage: '' };
    }

    const decryptedLastMessage = decryptContent(chat.lastMessage, chatKey);
    if (decryptedLastMessage === '' && isEncryptedContent(chat.lastMessage)) {
      await clearStoredChatKey(chat.$id);
      const refreshedKey = await resolveChatKey(chat, userId, { forceRefresh: true });
      if (refreshedKey) {
        return {
          ...chat,
          lastMessage: decryptContent(chat.lastMessage, refreshedKey),
        };
      }
    }
    return { ...chat, lastMessage: decryptedLastMessage };
  } catch {
    return { ...chat, lastMessage: '' };
  }
};

export const decryptChatPreviews = async (chats, userId) => {
  if (!Array.isArray(chats) || chats.length === 0) return chats;

  const results = [];
  for (const chat of chats) {
    results.push(await decryptChatPreview(chat, userId));
  }

  return results;
};

export const decryptMessageForChat = async (chatId, message, userId) => {
  try {
    if (!chatId || !message || !userId) return message;
    const chat = await getChat(chatId);
    const chatKey = await resolveChatKey(chat, userId);
    return await decryptMessageFieldsWithRecovery(chat, userId, message, chatKey);
  } catch {
    return sanitizeEncryptedMessage(message);
  }
};
