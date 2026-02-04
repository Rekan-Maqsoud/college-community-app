import { databases, config } from './config';
import { ID, Query } from 'appwrite';
import * as SecureStore from 'expo-secure-store';
import * as Random from 'expo-random';
import nacl from 'tweetnacl';
import { encodeBase64, decodeBase64, encodeUTF8, decodeUTF8 } from 'tweetnacl-util';
import { messagesCacheManager } from '../app/utils/cacheManager';
import { sendChatPushNotification } from '../services/pushNotificationService';
import { getUserById, updateUserPublicKey } from './users';

export const CHAT_TYPES = {
    STAGE_GROUP: 'stage_group',
    DEPARTMENT_GROUP: 'department_group',
};

const E2EE_PREFIX = 'enc:v1:';
const CHAT_KEY_PREFIX = 'e2ee_chat_key_';
const PUBLIC_KEY_PREFIX = 'e2ee_public_key_';
const PRIVATE_KEY_PREFIX = 'e2ee_private_key_';
const getSecureRandomBytes = (size) => {
    if (Random && typeof Random.getRandomBytes === 'function') {
        return Random.getRandomBytes(size);
    }

    if (typeof global !== 'undefined' && global?.crypto?.getRandomValues) {
        const buffer = new Uint8Array(size);
        global.crypto.getRandomValues(buffer);
        return buffer;
    }

    return null;
};

const generateBoxKeypair = () => {
    const secretKey = getSecureRandomBytes(nacl.box.secretKeyLength);
    if (!secretKey) return null;
    return nacl.box.keyPair.fromSecretKey(secretKey);
};

const getSecureStoreKey = (prefix, id) => `${prefix}${id}`;

const encodeBytes = (bytes) => encodeBase64(bytes);
const decodeBytes = (value) => decodeBase64(value);

const getOrCreateUserKeypair = async (userId) => {
    const publicKeyKey = getSecureStoreKey(PUBLIC_KEY_PREFIX, userId);
    const privateKeyKey = getSecureStoreKey(PRIVATE_KEY_PREFIX, userId);

    const storedPublicKey = await SecureStore.getItemAsync(publicKeyKey);
    const storedPrivateKey = await SecureStore.getItemAsync(privateKeyKey);

    if (storedPublicKey && storedPrivateKey) {
        return {
            publicKey: decodeBytes(storedPublicKey),
            secretKey: decodeBytes(storedPrivateKey),
        };
    }

    const keypair = generateBoxKeypair();
    if (!keypair) return null;

    await SecureStore.setItemAsync(publicKeyKey, encodeBytes(keypair.publicKey));
    await SecureStore.setItemAsync(privateKeyKey, encodeBytes(keypair.secretKey));

    return keypair;
};

const ensureUserPublicKeyStored = async (userId, publicKeyBase64) => {
    const userDoc = await getUserById(userId, true);
    if (!userDoc?.publicKey) {
        await updateUserPublicKey(userId, publicKeyBase64);
    }
};

const ensureChatPublicKeyStored = async (chat, userId) => {
    if (!chat || !userId) return null;

    const keypair = await getOrCreateUserKeypair(userId);
    if (!keypair) return null;

    const publicKey = encodeBytes(keypair.publicKey);
    const settings = parseChatSettings(chat.settings);
    const existing = settings?.e2ee?.publicKeys?.[userId];

    if (existing === publicKey) {
        return { publicKey, settings };
    }

    const nextSettings = {
        ...settings,
        e2ee: {
            ...settings.e2ee,
            publicKeys: {
                ...(settings.e2ee?.publicKeys || {}),
                [userId]: publicKey,
            },
        },
    };

    await databases.updateDocument(
        config.databaseId,
        config.chatsCollectionId,
        chat.$id,
        { settings: JSON.stringify(nextSettings) }
    );

    return { publicKey, settings: nextSettings };
};

const getParticipantPublicKey = async (settings, userId) => {
    const storedKey = settings?.e2ee?.publicKeys?.[userId];
    if (storedKey && typeof storedKey === 'string') {
        return storedKey;
    }

    return await getUserPublicKey(userId);
};

const getUserPublicKey = async (userId) => {
    const userDoc = await getUserById(userId, true);
    if (userDoc?.publicKey && typeof userDoc.publicKey === 'string') {
        return userDoc.publicKey;
    }
    return null;
};

const encryptWithBox = (dataBytes, senderSecretKey, recipientPublicKey) => {
    const nonce = getSecureRandomBytes(nacl.box.nonceLength);
    if (!nonce) return null;
    const cipher = nacl.box(dataBytes, nonce, recipientPublicKey, senderSecretKey);
    return { nonce, cipher };
};

const decryptWithBox = (cipherBytes, nonceBytes, recipientSecretKey, senderPublicKey) => {
    return nacl.box.open(cipherBytes, nonceBytes, senderPublicKey, recipientSecretKey);
};

const encryptContent = (content, chatKey) => {
    if (!content) return '';
    const nonce = getSecureRandomBytes(nacl.secretbox.nonceLength);
    if (!nonce) return content;
    const contentBytes = decodeUTF8(content);
    const cipher = nacl.secretbox(contentBytes, nonce, chatKey);
    return `${E2EE_PREFIX}${encodeBytes(nonce)}:${encodeBytes(cipher)}`;
};

const decryptContent = (content, chatKey) => {
    if (!content || typeof content !== 'string') return content;
    if (!content.startsWith(E2EE_PREFIX)) return content;

    const payload = content.substring(E2EE_PREFIX.length);
    const [nonceB64, cipherB64] = payload.split(':');
    if (!nonceB64 || !cipherB64) return '';

    try {
        const nonce = decodeBytes(nonceB64);
        const cipher = decodeBytes(cipherB64);
        const decrypted = nacl.secretbox.open(cipher, nonce, chatKey);
        if (!decrypted) return '';
        return encodeUTF8(decrypted);
    } catch (error) {
        return '';
    }
};

const parseChatSettings = (settingsString) => {
    try {
        return settingsString ? JSON.parse(settingsString) : {};
    } catch (e) {
        return {};
    }
};

const storeChatKey = async (chatId, chatKey) => {
    const key = getSecureStoreKey(CHAT_KEY_PREFIX, chatId);
    await SecureStore.setItemAsync(key, encodeBytes(chatKey));
};

const getStoredChatKey = async (chatId) => {
    const key = getSecureStoreKey(CHAT_KEY_PREFIX, chatId);
    const stored = await SecureStore.getItemAsync(key);
    if (!stored) return null;
    return decodeBytes(stored);
};

const buildE2eeSettings = async (chat, creatorId) => {
    if (!chat || !creatorId) return null;

    const participants = Array.isArray(chat.participants)
        ? Array.from(new Set([...chat.participants, creatorId]))
        : [creatorId];

    if (!participants || participants.length === 0) {
        return null;
    }

    const keypair = await getOrCreateUserKeypair(creatorId);
    if (!keypair) return null;
    const creatorPublicKey = encodeBytes(keypair.publicKey);
    await ensureUserPublicKeyStored(creatorId, creatorPublicKey);

    const settings = parseChatSettings(chat.settings);
    const publicKeys = {
        ...(settings.e2ee?.publicKeys || {}),
        [creatorId]: creatorPublicKey,
    };

    const chatKey = getSecureRandomBytes(nacl.secretbox.keyLength);
    if (!chatKey) return null;
    const keys = {};

    for (const participantId of participants) {
        const participantPublicKey =
            participantId === creatorId
                ? creatorPublicKey
                : await getParticipantPublicKey(settings, participantId);
        if (!participantPublicKey) {
            continue;
        }

        if (!publicKeys[participantId]) {
            publicKeys[participantId] = participantPublicKey;
        }

        const encrypted = encryptWithBox(
            chatKey,
            keypair.secretKey,
            decodeBytes(participantPublicKey)
        );
        if (!encrypted) {
            continue;
        }

        keys[participantId] = {
            nonce: encodeBytes(encrypted.nonce),
            cipher: encodeBytes(encrypted.cipher),
            senderPublicKey: creatorPublicKey,
        };
    }

    return {
        chatKey,
        e2ee: {
            version: 1,
            creatorId,
            creatorPublicKey,
            publicKeys,
            keys,
        },
    };
};

const resolveChatKey = async (chat, userId) => {
    if (!chat || !userId) return null;

    const publicKeyResult = await ensureChatPublicKeyStored(chat, userId);
    if (publicKeyResult?.settings) {
        chat.settings = JSON.stringify(publicKeyResult.settings);
    }

    const cached = await getStoredChatKey(chat.$id);
    if (cached) return cached;

    const settings = parseChatSettings(chat.settings);
    const e2ee = settings.e2ee;
    if (!e2ee?.keys || !e2ee?.creatorPublicKey) return null;

    const entry = e2ee.keys[userId];
    if (!entry?.nonce || !entry?.cipher) return null;

    const keypair = await getOrCreateUserKeypair(userId);
    if (!keypair) return null;
    const userPublicKey = encodeBytes(keypair.publicKey);
    await ensureUserPublicKeyStored(userId, userPublicKey);

    const senderPublicKey = entry.senderPublicKey || e2ee.creatorPublicKey;
    if (!senderPublicKey) return null;

    const decrypted = decryptWithBox(
        decodeBytes(entry.cipher),
        decodeBytes(entry.nonce),
        keypair.secretKey,
        decodeBytes(senderPublicKey)
    );

    if (!decrypted) return null;

    await storeChatKey(chat.$id, decrypted);
    return decrypted;
};

const addMissingE2eeKeys = async (chat, chatKey, senderId) => {
    if (!chat || !chatKey || !senderId) return;

    const settings = parseChatSettings(chat.settings);
    if (!settings.e2ee || !settings.e2ee.keys) return;

    const participants = Array.isArray(chat.participants) ? chat.participants : [];
    if (participants.length === 0) return;

    const senderKeypair = await getOrCreateUserKeypair(senderId);
    if (!senderKeypair) return;
    const senderPublicKey = encodeBytes(senderKeypair.publicKey);
    await ensureUserPublicKeyStored(senderId, senderPublicKey);

    const publicKeyResult = await ensureChatPublicKeyStored(chat, senderId);
    const publicKeys = {
        ...(settings.e2ee?.publicKeys || {}),
        ...(publicKeyResult?.settings?.e2ee?.publicKeys || {}),
    };

    const nextKeys = { ...settings.e2ee.keys };
    let updated = false;

    for (const participantId of participants) {
        if (nextKeys[participantId]) {
            continue;
        }

        const participantPublicKey = await getParticipantPublicKey({ e2ee: { publicKeys } }, participantId);
        if (!participantPublicKey) {
            continue;
        }

        if (!publicKeys[participantId]) {
            publicKeys[participantId] = participantPublicKey;
        }

        const encrypted = encryptWithBox(
            chatKey,
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
        updated = true;
    }

    if (!updated) return;

    const nextSettings = {
        ...settings,
        e2ee: {
            ...settings.e2ee,
            publicKeys,
            keys: nextKeys,
        },
    };

    await databases.updateDocument(
        config.databaseId,
        config.chatsCollectionId,
        chat.$id,
        { settings: JSON.stringify(nextSettings) }
    );
};

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

        return updatedChat;
    } catch (error) {
        return null;
    }
};

const ensureChatEncryption = async (chat, userId) => {
    if (!chat || !userId) return null;

    const publicKeyResult = await ensureChatPublicKeyStored(chat, userId);
    if (publicKeyResult?.settings) {
        chat.settings = JSON.stringify(publicKeyResult.settings);
    }

    const existingKey = await resolveChatKey(chat, userId);
    if (existingKey) {
        await addMissingE2eeKeys(chat, existingKey, userId);
        return existingKey;
    }

    const settings = parseChatSettings(chat.settings);
    if (settings.e2ee?.version) {
        return null;
    }

    const built = await buildE2eeSettings(chat, userId);
    if (!built) return null;

    const nextSettings = {
        ...settings,
        e2ee: built.e2ee,
    };

    await databases.updateDocument(
        config.databaseId,
        config.chatsCollectionId,
        chat.$id,
        { settings: JSON.stringify(nextSettings) }
    );

    await storeChatKey(chat.$id, built.chatKey);
    return built.chatKey;
};

const decryptMessageFields = (message, chatKey) => {
    if (!message || !chatKey) return message;

    const decrypted = {
        ...message,
        content: decryptContent(message.content, chatKey),
    };

    if (message.replyToContent) {
        decrypted.replyToContent = decryptContent(message.replyToContent, chatKey);
    }

    return decrypted;
};

export const decryptChatPreview = async (chat, userId) => {
    try {
        if (!chat || !userId) return chat;
        if (!chat.lastMessage || typeof chat.lastMessage !== 'string') return chat;

        if (!chat.lastMessage.startsWith(E2EE_PREFIX)) {
            return chat;
        }

        const chatKey = await resolveChatKey(chat, userId);
        if (!chatKey) {
            return { ...chat, lastMessage: '' };
        }

        const decryptedLastMessage = decryptContent(chat.lastMessage, chatKey);
        return { ...chat, lastMessage: decryptedLastMessage };
    } catch (error) {
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
        if (!chatKey) return message;
        return decryptMessageFields(message, chatKey);
    } catch (error) {
        return message;
    }
};

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
        
        const chat = await databases.createDocument(
            config.databaseId,
            config.chatsCollectionId,
            ID.unique(),
            {
                ...chatData,
                messageCount: 0,
            }
        );
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
        
        const chat = await databases.createDocument(
            config.databaseId,
            config.chatsCollectionId,
            ID.unique(),
            chatData
        );
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
        
        if (!config.chatsCollectionId) {
            throw new Error('Chat collection not configured. Please check your .env file.');
        }
        
        const departmentQuery = Query.equal('department', department);
        const allChats = [];
        
        const departmentChats = await databases.listDocuments(
            config.databaseId,
            config.chatsCollectionId,
            [
                departmentQuery,
                Query.equal('type', CHAT_TYPES.DEPARTMENT_GROUP),
                Query.orderDesc('lastMessageAt')
            ]
        );
        allChats.push(...departmentChats.documents);
        
        if (stage) {
            const stageValue = typeof stage === 'number' ? String(stage) : stage;
            const stageChats = await databases.listDocuments(
                config.databaseId,
                config.chatsCollectionId,
                [
                    departmentQuery,
                    Query.equal('stage', stageValue),
                    Query.equal('type', CHAT_TYPES.STAGE_GROUP),
                    Query.orderDesc('lastMessageAt')
                ]
            );
            allChats.push(...stageChats.documents);
        }
        
        const sorted = allChats.sort((a, b) => {
            const dateA = new Date(a.lastMessageAt || a.createdAt);
            const dateB = new Date(b.lastMessageAt || b.createdAt);
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

export const getChats = async (userId) => {
    try {
        if (!userId || typeof userId !== 'string') {
            throw new Error('Invalid user ID');
        }
        
        const chats = await databases.listDocuments(
            config.databaseId,
            config.chatsCollectionId,
            [
                Query.equal('participants', userId),
                Query.orderDesc('$updatedAt')
            ]
        );
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
        
        const chat = await databases.getDocument(
            config.databaseId,
            config.chatsCollectionId,
            chatId
        );
        return chat;
    } catch (error) {
        throw error;
    }
};

export const deleteChat = async (chatId) => {
    try {
        if (!chatId || typeof chatId !== 'string') {
            throw new Error('Invalid chat ID');
        }
        
        const { deleteUserChatSettingsByChatId } = require('./userChatSettings');
        
        await clearChatMessages(chatId);
        await deleteUserChatSettingsByChatId(chatId);
        
        await databases.deleteDocument(
            config.databaseId,
            config.chatsCollectionId,
            chatId
        );

        await SecureStore.deleteItemAsync(getSecureStoreKey(CHAT_KEY_PREFIX, chatId));
    } catch (error) {
        throw error;
    }
};

export const canUserSendMessage = async (chatId, userId) => {
    try {
        if (!chatId || !userId) {
            return false;
        }
        
        const chat = await databases.getDocument(
            config.databaseId,
            config.chatsCollectionId,
            chatId
        );
        
        if (chat.type === 'private') {
            return chat.participants?.includes(userId) || false;
        }
        
        if (chat.type === 'custom_group') {
            // Must be a participant first
            if (!chat.participants?.includes(userId)) {
                return false;
            }
            
            // Check if onlyAdminsCanPost is enabled in settings
            let settings = {};
            try {
                settings = chat.settings ? JSON.parse(chat.settings) : {};
            } catch (e) {
                settings = {};
            }
            
            // If only admins can post, check if user is admin
            if (settings.onlyAdminsCanPost) {
                return chat.admins?.includes(userId) || 
                       chat.representatives?.includes(userId) || 
                       false;
            }
            
            return true;
        }
        
        if (!chat.requiresRepresentative) {
            return true;
        }
        
        return chat.representatives?.includes(userId) || false;
    } catch (error) {
        return false;
    }
};

export const sendMessage = async (chatId, messageData) => {
    try {
        if (!chatId || typeof chatId !== 'string') {
            throw new Error('Invalid chat ID');
        }
        
        if (!messageData || typeof messageData !== 'object') {
            throw new Error('Invalid message data');
        }
        
        if (!messageData.senderId) {
            throw new Error('Missing required message fields');
        }

        const hasContent = messageData.content && messageData.content.trim().length > 0;
        const hasImages = messageData.images && messageData.images.length > 0;

        if (!hasContent && !hasImages) {
            throw new Error('Message must have either content or an image');
        }
        
        const canSend = await canUserSendMessage(chatId, messageData.senderId);
        if (!canSend) {
            throw new Error('User does not have permission to send messages in this chat');
        }

        const chat = await ensureChatParticipant(chatId, messageData.senderId) || await getChat(chatId);
        const chatKey = await ensureChatEncryption(chat, messageData.senderId);
        const shouldEncrypt = !!chatKey;

        // Check for @everyone mention
        const mentionsAll = checkForEveryoneMention(messageData.content);
        const encryptedContent = hasContent
            ? (shouldEncrypt ? encryptContent(messageData.content, chatKey) : messageData.content)
            : '';
        const encryptedReplyContent = messageData.replyToContent
            ? (shouldEncrypt ? encryptContent(messageData.replyToContent, chatKey) : messageData.replyToContent)
            : '';
        
        // Build document with only valid fields matching Appwrite schema
        const documentData = {
            chatId,
            senderId: messageData.senderId,
            senderName: messageData.senderName,
            content: encryptedContent,
            mentionsAll,
            status: 'sent', // Message status: sent -> delivered -> read
            deliveredTo: [], // Array of userIds who received push notification
            readBy: [], // Array of userIds who have read the message
        };
        
        // Handle image - use imageUrl field only (most reliable)
        if (hasImages) {
            documentData.imageUrl = messageData.images[0];
        }
        
        // Add reply fields if this is a reply
        if (messageData.replyToId) {
            documentData.replyToId = messageData.replyToId;
            documentData.replyToContent = encryptedReplyContent || '';
            documentData.replyToSender = messageData.replyToSender || '';
        }
        
        const message = await databases.createDocument(
            config.databaseId,
            config.messagesCollectionId,
            ID.unique(),
            documentData
        );
        
        const currentCount = chat.messageCount || 0;
        
        const lastMessagePreview = hasContent ? encryptedContent : '';
        const notificationPreview = typeof messageData.notificationPreview === 'string'
            ? messageData.notificationPreview
            : '';
        
        await databases.updateDocument(
            config.databaseId,
            config.chatsCollectionId,
            chatId,
            {
                lastMessage: lastMessagePreview,
                lastMessageAt: new Date().toISOString(),
                messageCount: currentCount + 1,
            }
        );
        
        // Add message to cache
        await messagesCacheManager.addMessageToCache(chatId, message, 100);
        
        // Send push notifications to other participants
        try {
            await sendChatPushNotification({
                chatId,
                messageId: message.$id,
                senderId: messageData.senderId,
                senderName: messageData.senderName,
                content: notificationPreview,
                chatName: chat.name,
                chatType: chat.type,
            });
        } catch (pushError) {
            // Push notification failed but message was sent successfully
        }
        
        return decryptMessageFields(message, chatKey);
    } catch (error) {
        throw error;
    }
};

export const getMessages = async (chatId, userIdOrLimit = 50, limitOrOffset = 0, offsetOrUseCache = 0, useCache = true) => {
    let userId = null;
    let limit = 50;
    let offset = 0;
    let shouldUseCache = true;

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
            offset = typeof offsetOrUseCache === 'number' ? offsetOrUseCache : 0;
            shouldUseCache = typeof useCache === 'boolean' ? useCache : true;
        } else {
            limit = typeof userIdOrLimit === 'number' ? userIdOrLimit : 50;
            offset = typeof limitOrOffset === 'number' ? limitOrOffset : 0;
            shouldUseCache = typeof offsetOrUseCache === 'boolean' ? offsetOrUseCache : true;
        }

        // Try to get cached data first (only for initial load without offset)
        if (shouldUseCache && offset === 0) {
            const cached = await messagesCacheManager.getCachedMessages(chatId, limit);
            if (cached?.value && !cached.isStale) {
                return cached.value;
            }
        }
        
        const messages = await databases.listDocuments(
            config.databaseId,
            config.messagesCollectionId,
            [
                Query.equal('chatId', chatId),
                Query.orderDesc('$createdAt'),
                Query.limit(Math.min(limit, 100)),
                Query.offset(offset)
            ]
        );
        
        let documents = messages.documents;
        if (userId) {
            const chat = await getChat(chatId);
            const chatKey = await resolveChatKey(chat, userId);
            if (chatKey) {
                documents = documents.map(message => decryptMessageFields(message, chatKey));
            }
        }

        // Cache the messages for initial load
        if (offset === 0) {
            await messagesCacheManager.cacheMessages(chatId, documents, limit);
        }
        
        return documents;
    } catch (error) {
        // On network error, try to return stale cache
        if (offset === 0) {
            const cached = await messagesCacheManager.getCachedMessages(chatId, limit);
            if (cached?.value) {
                return cached.value;
            }
        }
        throw error;
    }
};

export const deleteMessage = async (messageId, imageDeleteUrl = null) => {
    try {
        if (!messageId || typeof messageId !== 'string') {
            throw new Error('Invalid message ID');
        }
        
        await databases.deleteDocument(
            config.databaseId,
            config.messagesCollectionId,
            messageId
        );
        
        // Delete image from imgbb if delete URL is provided
        if (imageDeleteUrl) {
            try {
                const { deleteImageFromImgbb } = require('../services/imgbbService');
                await deleteImageFromImgbb(imageDeleteUrl);
            } catch (imgError) {
                // Image deletion failed but message was deleted
            }
        }
    } catch (error) {
        throw error;
    }
};

export const clearChatMessages = async (chatId) => {
    try {
        if (!chatId || typeof chatId !== 'string') {
            throw new Error('Invalid chat ID');
        }
        
        // Get all messages in batches and delete them
        let hasMore = true;
        let deletedCount = 0;
        
        while (hasMore) {
            const messages = await databases.listDocuments(
                config.databaseId,
                config.messagesCollectionId,
                [
                    Query.equal('chatId', chatId),
                    Query.limit(100)
                ]
            );
            
            if (messages.documents.length === 0) {
                hasMore = false;
                break;
            }
            
            // Delete messages in parallel (batch of 10 at a time)
            const deletePromises = messages.documents.map(async (msg) => {
                try {
                    await databases.deleteDocument(
                        config.databaseId,
                        config.messagesCollectionId,
                        msg.$id
                    );
                    
                    // Try to delete associated image
                    if (msg.imageDeleteUrl) {
                        try {
                            const { deleteImageFromImgbb } = require('../services/imgbbService');
                            await deleteImageFromImgbb(msg.imageDeleteUrl);
                        } catch (imgError) {
                            // Image deletion failed but continue
                        }
                    }
                    return true;
                } catch (error) {
                    return false;
                }
            });
            
            const results = await Promise.all(deletePromises);
            deletedCount += results.filter(r => r).length;
            
            // If we got less than 100, we're done
            if (messages.documents.length < 100) {
                hasMore = false;
            }
        }
        
        // Clear messages cache for this chat
        await messagesCacheManager.invalidateChatMessages(chatId);
        
        return { success: true, deletedCount };
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
        
        const message = await databases.updateDocument(
            config.databaseId,
            config.messagesCollectionId,
            messageId,
            messageData
        );
        return message;
    } catch (error) {
        throw error;
    }
};

// Mark a message as delivered to a user (when push notification is received)
export const markMessageAsDelivered = async (messageId, userId) => {
    try {
        if (!messageId || !userId) {
            return null;
        }
        
        const message = await databases.getDocument(
            config.databaseId,
            config.messagesCollectionId,
            messageId
        );
        
        const currentDeliveredTo = message.deliveredTo || [];
        if (currentDeliveredTo.includes(userId)) {
            return message;
        }
        
        const updatedMessage = await databases.updateDocument(
            config.databaseId,
            config.messagesCollectionId,
            messageId,
            {
                deliveredTo: [...currentDeliveredTo, userId],
                status: 'delivered',
            }
        );
        
        return updatedMessage;
    } catch (error) {
        // Silently fail - delivery receipts are not critical
        return null;
    }
};

// Mark a message as read by a user
export const markMessageAsRead = async (messageId, userId) => {
    try {
        if (!messageId || !userId) {
            return null;
        }
        
        const message = await databases.getDocument(
            config.databaseId,
            config.messagesCollectionId,
            messageId
        );
        
        const currentReadBy = message.readBy || [];
        if (currentReadBy.includes(userId)) {
            return message;
        }
        
        const updatedMessage = await databases.updateDocument(
            config.databaseId,
            config.messagesCollectionId,
            messageId,
            {
                readBy: [...currentReadBy, userId],
                status: 'read',
            }
        );
        
        return updatedMessage;
    } catch (error) {
        // Silently fail - read receipts are not critical
        return null;
    }
};

// Mark all messages in a chat as read by a user
export const markAllMessagesAsRead = async (chatId, userId) => {
    try {
        if (!chatId || !userId) {
            return;
        }
        
        // Get recent unread messages (limit to last 50 for performance)
        const messages = await databases.listDocuments(
            config.databaseId,
            config.messagesCollectionId,
            [
                Query.equal('chatId', chatId),
                Query.orderDesc('$createdAt'),
                Query.limit(50)
            ]
        );
        
        // Update each message that doesn't have this user in readBy
        const updatePromises = messages.documents
            .filter(msg => msg.senderId !== userId && !(msg.readBy || []).includes(userId))
            .map(msg => markMessageAsRead(msg.$id, userId));
        
        await Promise.all(updatePromises);
    } catch (error) {
        // Silently fail
    }
};

// Get participants who have read a message
export const getMessageReadReceipts = async (messageId) => {
    try {
        if (!messageId) {
            return [];
        }
        
        const message = await databases.getDocument(
            config.databaseId,
            config.messagesCollectionId,
            messageId
        );
        
        return message.readBy || [];
    } catch (error) {
        return [];
    }
};

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
                representatives: [...currentReps, userId]
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
                representatives: updatedReps
            }
        );
        
        return updatedChat;
    } catch (error) {
        throw error;
    }
};

/**
 * Pin a message in a chat
 */
export const pinMessage = async (chatId, messageId, userId) => {
    try {
        if (!chatId || !messageId || !userId) {
            throw new Error('Chat ID, message ID, and user ID are required');
        }

        // Update the message to mark it as pinned
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

        // Also update the chat's pinnedMessages array
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

/**
 * Unpin a message in a chat
 */
export const unpinMessage = async (chatId, messageId) => {
    try {
        if (!chatId || !messageId) {
            throw new Error('Chat ID and message ID are required');
        }

        // Update the message to mark it as unpinned
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

        // Also update the chat's pinnedMessages array
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

/**
 * Get all pinned messages in a chat
 */
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
                Query.limit(50)
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
    } catch (error) {
        return [];
    }
};

/**
 * Check if user can pin messages in a chat
 */
export const canUserPinMessage = async (chatId, userId) => {
    try {
        const chat = await databases.getDocument(
            config.databaseId,
            config.chatsCollectionId,
            chatId
        );

        // In private chats, both users can pin
        if (chat.type === 'private') {
            return chat.participants?.includes(userId) || false;
        }

        // Parse settings
        let settings = {};
        try {
            settings = chat.settings ? JSON.parse(chat.settings) : {};
        } catch (e) {
            settings = {};
        }

        // If onlyAdminsCanPin is set, check if user is admin
        if (settings.onlyAdminsCanPin) {
            return chat.admins?.includes(userId) || 
                   chat.representatives?.includes(userId) || 
                   false;
        }

        // Otherwise, all participants can pin
        return chat.participants?.includes(userId) || true;
    } catch (error) {
        return false;
    }
};

/**
 * Check if message contains @everyone or @all mention
 */
export const checkForEveryoneMention = (content) => {
    if (!content) return false;
    const lowerContent = content.toLowerCase();
    return lowerContent.includes('@everyone') || lowerContent.includes('@all');
};

/**
 * Check if user can use @everyone mention
 */
export const canUserMentionEveryone = async (chatId, userId) => {
    try {
        const chat = await databases.getDocument(
            config.databaseId,
            config.chatsCollectionId,
            chatId
        );

        // Private chats don't have @everyone
        if (chat.type === 'private') {
            return false;
        }

        // Parse settings
        let settings = {};
        try {
            settings = chat.settings ? JSON.parse(chat.settings) : {};
        } catch (e) {
            settings = {};
        }

        // Check if @everyone is allowed
        if (settings.allowEveryoneMention === false) {
            return false;
        }

        // If only admins can mention, check if user is admin
        if (settings.onlyAdminsCanMention) {
            return chat.admins?.includes(userId) || 
                   chat.representatives?.includes(userId) || 
                   false;
        }

        // Otherwise, all participants can use @everyone
        return true;
    } catch (error) {
        return false;
    }
};

/**
 * Update chat settings
 */
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

/**
 * Get chat settings
 */
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
        } catch (e) {
            return {};
        }
    } catch (error) {
        return {};
    }
};

/**
 * Get unread message count for a specific chat
 */
export const getUnreadCount = async (chatId, userId) => {
    try {
        if (!chatId || !userId) {
            return 0;
        }

        // Get recent messages that the user hasn't read
        const messages = await databases.listDocuments(
            config.databaseId,
            config.messagesCollectionId,
            [
                Query.equal('chatId', chatId),
                Query.limit(100),
                Query.orderDesc('$createdAt')
            ]
        );

        // Count messages not sent by user and not in readBy array
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
    } catch (error) {
        return 0;
    }
};

/**
 * Mark all messages in a chat as read by user
 */
export const markChatAsRead = async (chatId, userId) => {
    try {
        if (!chatId || !userId) {
            return;
        }

        // Get unread messages
        const messages = await databases.listDocuments(
            config.databaseId,
            config.messagesCollectionId,
            [
                Query.equal('chatId', chatId),
                Query.limit(100),
                Query.orderDesc('$createdAt')
            ]
        );

        // Update each unread message to include user in readBy
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
    } catch (error) {
        // Silently fail - reading messages is not critical
    }
};

/**
 * Get total unread count across all user chats
 */
export const getTotalUnreadCount = async (userId, chatIds) => {
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
    } catch (error) {
        return 0;
    }
};
