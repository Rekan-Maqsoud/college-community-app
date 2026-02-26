import { account, databases, storage, config } from './config';
import { ID, Query, Permission, Role } from 'appwrite';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import nacl from 'tweetnacl';
import { encodeBase64, decodeBase64, encodeUTF8, decodeUTF8 } from 'tweetnacl-util';
import { messagesCacheManager, unreadCountCacheManager } from '../app/utils/cacheManager';
import { sendChatPushNotification } from '../services/pushNotificationService';
import { getUserById, updateUserPublicKey } from './users';
import { uploadImage } from '../services/imgbbService';
import { uploadFileToAppwrite } from '../services/appwriteFileUpload';
import { parsePollPayload, applyPollVote } from '../app/utils/pollUtils';
import { broadcastChatMeta } from '../app/hooks/useFirebaseRealtime';
import { assertActorIdentity, enforceRateLimit } from './securityGuards';

export const CHAT_TYPES = {
    STAGE_GROUP: 'stage_group',
    DEPARTMENT_GROUP: 'department_group',
};

/**
 * Upload an image to ImgBB for chat messages
 * @param {Object} file - File object with uri, name, type
 * @returns {Promise<Object>} Upload result with viewUrl and deleteUrl
 */
export const uploadChatImage = async (file) => {
    try {
        if (!file || !file.uri) {
            throw new Error('Invalid file object');
        }
        const result = await uploadImage(file.uri);

        if (!result?.success || !result.url) {
            throw new Error(result?.error || 'Upload failed');
        }

        return {
            fileId: null,
            viewUrl: result.url,
            deleteUrl: result.deleteUrl || null,
        };
    } catch (error) {
        throw error;
    }
};

export const uploadChatVoiceMessage = async (file) => {
    try {
        if (!file || !file.uri) {
            throw new Error('Invalid voice file');
        }

        if (!config.voiceMessagesStorageId) {
            throw new Error('Voice storage bucket is not configured');
        }

        const fileName = file.name || `voice_${Date.now()}.m4a`;
        const mimeType = file.type || 'audio/m4a';
        const currentUser = await account.get();
        const uploaderUserId = currentUser?.$id;

        if (!uploaderUserId) {
            throw new Error('Authentication required for voice upload');
        }

        const uploadResult = await uploadFileToAppwrite({
            file: {
                uri: file.uri,
                name: fileName,
                type: mimeType,
                size: file.size,
            },
            bucketId: config.voiceMessagesStorageId,
        });

        return {
            fileId: uploadResult?.fileId || null,
            viewUrl: uploadResult?.viewUrl || '',
            mimeType: uploadResult?.mimeType || mimeType,
            size: Number(uploadResult?.size || file.size || 0),
        };
    } catch (error) {
        throw error;
    }
};

export const uploadChatFile = async (file) => {
    try {
        if (!config.storageId) {
            throw new Error('File storage bucket is not configured');
        }

        const normalizedFile = {
            uri: file?.uri,
            name: file?.name || `file_${Date.now()}`,
            type: file?.type || file?.mimeType || 'application/octet-stream',
            size: file?.size,
        };

        return await uploadFileToAppwrite({
            file: normalizedFile,
            bucketId: config.storageId,
        });
    } catch (error) {
        console.error('[chats.uploadChatFile] failed', {
            bucketId: config.storageId,
            fileName: file?.name,
            code: error?.code,
            status: error?.status,
            message: error?.message,
        });
        throw error;
    }
};

const E2EE_PREFIX = 'enc:v1:';
const CHAT_KEY_PREFIX = 'e2ee_chat_key_';
const PUBLIC_KEY_PREFIX = 'e2ee_public_key_';
const PRIVATE_KEY_PREFIX = 'e2ee_private_key_';

// In-memory cache for resolved chat keys to avoid repeated SecureStore reads
const chatKeyMemCache = new Map();
const CHAT_KEY_MEM_TTL = 5 * 60 * 1000; // 5 minutes

const getCachedChatKey = (chatId) => {
    const entry = chatKeyMemCache.get(chatId);
    if (!entry) return null;
    if (Date.now() - entry.ts > CHAT_KEY_MEM_TTL) {
        chatKeyMemCache.delete(chatId);
        return null;
    }
    return entry.key;
};

const setCachedChatKey = (chatId, key) => {
    chatKeyMemCache.set(chatId, { key, ts: Date.now() });
};

// In-memory cache for chat documents during sendMessage pipeline
const chatDocCache = new Map();
const CHAT_DOC_TTL = 10 * 1000; // 10 seconds

const buildParticipantPermissions = () => {
    return [
        Permission.read(Role.users()),
        Permission.update(Role.users()),
        Permission.delete(Role.users()),
    ];
};

const getCachedChat = (chatId) => {
    const entry = chatDocCache.get(chatId);
    if (!entry) return null;
    if (Date.now() - entry.ts > CHAT_DOC_TTL) {
        chatDocCache.delete(chatId);
        return null;
    }
    return entry.doc;
};

const setCachedChatDoc = (chatId, doc) => {
    chatDocCache.set(chatId, { doc, ts: Date.now() });
};

const getAuthenticatedUserId = async () => {
    const currentUser = await account.get();
    const currentUserId = currentUser?.$id;
    if (!currentUserId) {
        throw new Error('Authentication required');
    }
    return currentUserId;
};

const canManageChat = (chat, userId) => {
    if (!chat || !userId) return false;

    const participants = Array.isArray(chat.participants) ? chat.participants : [];
    const admins = Array.isArray(chat.admins) ? chat.admins : [];
    const representatives = Array.isArray(chat.representatives) ? chat.representatives : [];

    if (chat.type === 'private') {
        return participants.includes(userId);
    }

    return admins.includes(userId) || representatives.includes(userId);
};
const getSecureRandomBytes = (size) => {
    if (Crypto && typeof Crypto.getRandomBytes === 'function') {
        return Crypto.getRandomBytes(size);
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

const isEncryptedContent = (value) => typeof value === 'string' && value.startsWith(E2EE_PREFIX);

const sanitizeEncryptedMessage = (message) => {
    if (!message || typeof message !== 'object') return message;

    const sanitized = { ...message };
    let hasEncryptedFailure = false;

    if (isEncryptedContent(sanitized.content)) {
        sanitized.content = '';
        hasEncryptedFailure = true;
    }

    if (isEncryptedContent(sanitized.replyToContent)) {
        sanitized.replyToContent = '';
    }

    if (hasEncryptedFailure) {
        sanitized._isEncryptedUnavailable = true;
    }

    return sanitized;
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

const clearStoredChatKey = async (chatId) => {
    if (!chatId) return;
    chatKeyMemCache.delete(chatId);
    const key = getSecureStoreKey(CHAT_KEY_PREFIX, chatId);
    try {
        await SecureStore.deleteItemAsync(key);
    } catch (error) {
        // Ignore secure storage cleanup failures
    }
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
    const rotatedAt = new Date().toISOString();

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
            keyVersion: 1,
            rotatedAt,
            creatorId,
            creatorPublicKey,
            publicKeys,
            keys,
            keyHistory: [
                {
                    keyVersion: 1,
                    creatorId,
                    creatorPublicKey,
                    keys,
                    rotatedAt,
                },
            ],
        },
    };
};

const resolveChatKey = async (chat, userId, options = {}) => {
    if (!chat || !userId) return null;

    const { forceRefresh = false } = options;

    // Check in-memory cache first (fastest)
    if (!forceRefresh) {
        const memCached = getCachedChatKey(chat.$id);
        if (memCached) return memCached;
    }

    const publicKeyResult = await ensureChatPublicKeyStored(chat, userId);
    // Use updated settings string without mutating the (possibly frozen) chat object
    const settingsStr = publicKeyResult?.settings
        ? JSON.stringify(publicKeyResult.settings)
        : chat.settings;

    if (!forceRefresh) {
        const cached = await getStoredChatKey(chat.$id);
        if (cached) {
            setCachedChatKey(chat.$id, cached);
            return cached;
        }
    }

    const settings = parseChatSettings(settingsStr);
    const e2ee = settings.e2ee;
    if (!e2ee?.keys || !e2ee?.creatorPublicKey) return null;

    const entry = e2ee.keys[userId];
    const keyHistory = Array.isArray(e2ee.keyHistory) ? e2ee.keyHistory : [];

    const candidateEntries = [];
    if (entry?.nonce && entry?.cipher) {
        candidateEntries.push(entry);
    }

    for (let index = keyHistory.length - 1; index >= 0; index -= 1) {
        const historyItem = keyHistory[index];
        const historyEntry = historyItem?.keys?.[userId];
        if (historyEntry?.nonce && historyEntry?.cipher) {
            candidateEntries.push({
                ...historyEntry,
                senderPublicKey: historyEntry.senderPublicKey || historyItem?.creatorPublicKey,
            });
        }
    }

    if (candidateEntries.length === 0) return null;

    const keypair = await getOrCreateUserKeypair(userId);
    if (!keypair) return null;
    const userPublicKey = encodeBytes(keypair.publicKey);
    await ensureUserPublicKeyStored(userId, userPublicKey);

    for (const candidate of candidateEntries) {
        const senderPublicKey = candidate.senderPublicKey || e2ee.creatorPublicKey;
        if (!senderPublicKey) {
            continue;
        }

        const decrypted = decryptWithBox(
            decodeBytes(candidate.cipher),
            decodeBytes(candidate.nonce),
            keypair.secretKey,
            decodeBytes(senderPublicKey)
        );

        if (!decrypted) {
            continue;
        }

        await storeChatKey(chat.$id, decrypted);
        setCachedChatKey(chat.$id, decrypted);
        return decrypted;
    }

    return null;
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

const ensureChatKeyCoverage = async (chat, chatKey, senderId) => {
    if (!chat || !chatKey || !senderId) return false;

    const participants = Array.isArray(chat.participants) ? chat.participants : [];
    if (participants.length === 0) return false;

    await addMissingE2eeKeys(chat, chatKey, senderId);

    const refreshed = await getChat(chat.$id);
    const settings = parseChatSettings(refreshed.settings);
    const keys = settings?.e2ee?.keys || {};

    return participants.every((participantId) => !!keys[participantId]);
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

        await rotateChatE2eeKeys(chatId, userId).catch(() => null);

        return updatedChat;
    } catch (error) {
        return null;
    }
};

const ensureChatEncryption = async (chat, userId) => {
    if (!chat || !userId) return null;

    const publicKeyResult = await ensureChatPublicKeyStored(chat, userId);
    // Use updated settings string without mutating the (possibly frozen) chat object
    const settingsStr = publicKeyResult?.settings
        ? JSON.stringify(publicKeyResult.settings)
        : chat.settings;

    const existingKey = await resolveChatKey(chat, userId);
    if (existingKey) {
        await addMissingE2eeKeys(chat, existingKey, userId);
        // Refresh the doc cache after potential settings write
        const refreshed = await getChat(chat.$id, true);
        setCachedChatDoc(chat.$id, refreshed);
        return existingKey;
    }

    const settings = parseChatSettings(settingsStr);
    if (settings.e2ee?.version) {
        return null;
    }

    const built = await buildE2eeSettings(chat, userId);
    if (!built) return null;

    const nextSettings = {
        ...settings,
        e2ee: built.e2ee,
    };

    const updatedChat = await databases.updateDocument(
        config.databaseId,
        config.chatsCollectionId,
        chat.$id,
        { settings: JSON.stringify(nextSettings) }
    );
    setCachedChatDoc(chat.$id, updatedChat);

    await storeChatKey(chat.$id, built.chatKey);
    setCachedChatKey(chat.$id, built.chatKey);
    return built.chatKey;
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

        const updatedChat = await databases.updateDocument(
            config.databaseId,
            config.chatsCollectionId,
            chatId,
            { settings: JSON.stringify(nextSettings) }
        );

        await storeChatKey(chatId, nextChatKey);
        setCachedChatKey(chatId, nextChatKey);
        setCachedChatDoc(chatId, updatedChat);

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
    } catch (error) {
        return null;
    }
};

const decryptMessageFields = (message, chatKey) => {
    if (!message || !chatKey) return message;

    const contentWasEncrypted = isEncryptedContent(message.content);
    const decryptedContent = decryptContent(message.content, chatKey);
    const encryptedContentFailed = contentWasEncrypted && decryptedContent === '';

    const decrypted = {
        ...message,
        content: decryptedContent,
    };

    if (encryptedContentFailed) {
        decrypted._isEncryptedUnavailable = true;
    }

    if (message.replyToContent) {
        decrypted.replyToContent = decryptContent(message.replyToContent, chatKey);
    }

    return decrypted;
};

const decryptMessageFieldsWithRecovery = async (chat, userId, message, chatKey) => {
    if (!message || !chat || !userId) return message;
    if (!chatKey) return sanitizeEncryptedMessage(message);

    const decrypted = decryptMessageFields(message, chatKey);
    const needsRetry = Boolean(decrypted?._isEncryptedUnavailable) && isEncryptedContent(message.content);
    if (!needsRetry) {
        return decrypted;
    }

    await clearStoredChatKey(chat.$id);
    const refreshedKey = await resolveChatKey(chat, userId, { forceRefresh: true });
    if (!refreshedKey) {
        return sanitizeEncryptedMessage(message);
    }

    return decryptMessageFields(message, refreshedKey);
};

const decryptMessagesWithRecovery = async (chat, userId, messages, chatKey) => {
    if (!Array.isArray(messages) || messages.length === 0) return [];
    if (!chat || !userId) return messages;
    if (!chatKey) {
        return messages.map(message => sanitizeEncryptedMessage(message));
    }

    let decrypted = messages.map(message => decryptMessageFields(message, chatKey));
    const hasFailure = decrypted.some((message, index) => {
        return Boolean(message?._isEncryptedUnavailable) && isEncryptedContent(messages[index]?.content);
    });

    if (!hasFailure) {
        return decrypted;
    }

    await clearStoredChatKey(chat.$id);
    const refreshedKey = await resolveChatKey(chat, userId, { forceRefresh: true });
    if (!refreshedKey) {
        return messages.map(message => sanitizeEncryptedMessage(message));
    }

    decrypted = messages.map(message => decryptMessageFields(message, refreshedKey));
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
        return await decryptMessageFieldsWithRecovery(chat, userId, message, chatKey);
    } catch (error) {
        return sanitizeEncryptedMessage(message);
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

        const currentUserId = await getAuthenticatedUserId();
        const participants = Array.isArray(chatData.participants)
            ? Array.from(new Set([...chatData.participants, currentUserId]))
            : [currentUserId];
        
        const chat = await databases.createDocument(
            config.databaseId,
            config.chatsCollectionId,
            ID.unique(),
            {
                ...chatData,
                participants,
                messageCount: 0,
            },
            buildParticipantPermissions(participants)
        );

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
        
        const chat = await databases.createDocument(
            config.databaseId,
            config.chatsCollectionId,
            ID.unique(),
            {
                ...chatData,
                participants,
                createdBy: currentUserId,
            },
            buildParticipantPermissions(participants)
        );

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
                Query.orderDesc('lastMessageAt')
            ]
        );
        return await decryptChatPreviews(chats.documents, userId);
    } catch (error) {
        throw error;
    }
};

export const getChat = async (chatId, skipCache = false) => {
    try {
        if (!chatId || typeof chatId !== 'string') {
            throw new Error('Invalid chat ID');
        }

        if (!skipCache) {
            const cached = getCachedChat(chatId);
            if (cached) return cached;
        }
        
        const chat = await databases.getDocument(
            config.databaseId,
            config.chatsCollectionId,
            chatId
        );
        setCachedChatDoc(chatId, chat);
        return chat;
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
        
        const { deleteUserChatSettingsByChatId } = require('./userChatSettings');
        
        await clearChatMessages(chatId, effectiveActorUserId);
        await deleteUserChatSettingsByChatId(chatId);
        
        await databases.deleteDocument(
            config.databaseId,
            config.chatsCollectionId,
            chatId
        );

        chatKeyMemCache.delete(chatId);
        chatDocCache.delete(chatId);
        await SecureStore.deleteItemAsync(getSecureStoreKey(CHAT_KEY_PREFIX, chatId));
    } catch (error) {
        throw error;
    }
};

/**
 * Remove a private chat for a single user.
 * First user to remove: chat is hidden for them (stored in settings.removedBy).
 * Second user to remove: chat is fully deleted from the database.
 * Returns 'hidden' if only hidden for the user, 'deleted' if fully deleted.
 */
export const removePrivateChatForUser = async (chatId, userId) => {
    try {
        if (!chatId || !userId) {
            throw new Error('Invalid chat ID or user ID');
        }

        const chat = await databases.getDocument(
            config.databaseId,
            config.chatsCollectionId,
            chatId
        );

        if (chat.type !== 'private') {
            throw new Error('This function is only for private chats');
        }

        const settings = parseChatSettings(chat.settings);
        const removedBy = Array.isArray(settings.removedBy) ? settings.removedBy : [];

        if (!removedBy.includes(userId)) {
            removedBy.push(userId);
        }

        // Check if all participants have removed the chat
        const participants = Array.isArray(chat.participants) ? chat.participants : [];
        const allRemoved = participants.length > 0 && participants.every(p => removedBy.includes(p));

        if (allRemoved) {
            await deleteChat(chatId, userId);
            return 'deleted';
        } else {
            const updatedSettings = { ...settings, removedBy };
            await databases.updateDocument(
                config.databaseId,
                config.chatsCollectionId,
                chatId,
                { settings: JSON.stringify(updatedSettings) }
            );
            return 'hidden';
        }
    } catch (error) {
        throw error;
    }
};

/**
 * Check if a private chat has been removed by a specific user.
 */
export const isChatRemovedByUser = (chat, userId) => {
    const settings = parseChatSettings(chat.settings);
    const removedBy = Array.isArray(settings.removedBy) ? settings.removedBy : [];
    return removedBy.includes(userId);
};

/**
 * Clear the removedBy flag for a user when they send a new message,
 * so the chat reappears in both users' lists.
 */
export const restorePrivateChatForUser = async (chatId, userId) => {
    try {
        const chat = await databases.getDocument(
            config.databaseId,
            config.chatsCollectionId,
            chatId
        );

        const settings = parseChatSettings(chat.settings);
        if (!Array.isArray(settings.removedBy) || settings.removedBy.length === 0) return;

        const updatedRemovedBy = settings.removedBy.filter(id => id !== userId);
        const updatedSettings = { ...settings, removedBy: updatedRemovedBy };

        await databases.updateDocument(
            config.databaseId,
            config.chatsCollectionId,
            chatId,
            { settings: JSON.stringify(updatedSettings) }
        );
    } catch (error) {
        // Non-critical — silently fail
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

        const participants = Array.isArray(chat.participants) ? chat.participants : [];
        if (!participants.includes(userId)) {
            return false;
        }
        
        if (chat.type === 'private') {
            if (!chat.participants?.includes(userId)) return false;
            // Check if either user has blocked the other
            const otherUserId = chat.participants.find(id => id !== userId);
            if (otherUserId) {
                try {
                    const [currentUserDoc, otherUserDoc] = await Promise.all([
                        databases.getDocument(config.databaseId, config.usersCollectionId, userId),
                        databases.getDocument(config.databaseId, config.usersCollectionId, otherUserId),
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
                } catch (e) {
                    return false;
                }
            }
            return true;
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
            return participants.includes(userId);
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
        // Cache the chat document to prevent redundant fetches during encryption pipeline
        setCachedChatDoc(chatId, chat);

        // If user had previously removed this private DM, restore it
        if (chat.type === 'private') {
            restorePrivateChatForUser(chatId, senderId).catch(() => {});
        }

        const chatKey = await ensureChatEncryption(chat, senderId);

        // ensureChatEncryption already calls addMissingE2eeKeys, so we only
        // need to verify coverage without re-adding keys.
        let shouldEncrypt = false;
        if (chatKey) {
            const refreshed = getCachedChat(chatId) || await getChat(chatId);
            const covSettings = parseChatSettings(refreshed.settings);
            const covKeys = covSettings?.e2ee?.keys || {};
            const participants = Array.isArray(chat.participants) ? chat.participants : [];
            shouldEncrypt = participants.every((pid) => !!covKeys[pid]);
        }

        // Check for @everyone mention
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
        
        // Build document with only valid fields matching Appwrite schema
        const documentData = {
            chatId,
            senderId,
            senderName: messageData.senderName,
            content: encryptedContent,
            mentionsAll,
            status: 'sent', // Message status: sent -> delivered -> read
            deliveredTo: [], // Array of userIds who received push notification
            readBy: [], // Array of userIds who have read the message
        };
        
        // Add message type (text, image, post_share, location)
        if (messageData.type) {
            documentData.type = messageData.type;
        }

        // Add metadata for special message types (post_share, location, gif, etc.)
        if (messageData.metadata) {
            documentData.content = encryptedMetadata;
        }

        // Handle GIF/Sticker metadata - store as content JSON, do NOT upload the file
        if (messageData.type === 'gif' && messageData.gif_metadata) {
            const serializedGifMetadata = typeof messageData.gif_metadata === 'string'
                ? messageData.gif_metadata
                : JSON.stringify(messageData.gif_metadata);
            documentData.content = shouldEncrypt
                ? encryptContent(serializedGifMetadata, chatKey)
                : serializedGifMetadata;
        }
        
        // Handle image - use imageUrl field only (most reliable)
        if (hasImages) {
            documentData.imageUrl = messageData.images[0];
            // Set type to image if not already set
            if (!documentData.type) {
                documentData.type = 'image';
            }
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
            documentData,
            buildParticipantPermissions(chat.participants || [senderId])
        );

        const currentCount = chat.messageCount || 0;
        
        // Build smart lastMessage preview based on message type
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
        
        await databases.updateDocument(
            config.databaseId,
            config.chatsCollectionId,
            chatId,
            {
                lastMessage: lastMessagePreview,
                lastMessageAt: lastMessageAtTimestamp,
                lastMessageSenderId: senderId,
                messageCount: currentCount + 1,
            }
        );

        // Broadcast to Firebase so other clients update instantly
        broadcastChatMeta(chatId, {
            lastMessage: lastMessagePreview,
            lastMessageAt: lastMessageAtTimestamp,
            messageCount: currentCount + 1,
            lastSenderId: senderId,
        });
        
        // Add message to cache
        await messagesCacheManager.addMessageToCache(chatId, message, 100);
        
        // Send push notifications to other participants
        try {
            await sendChatPushNotification({
                chatId,
                messageId: message.$id,
                senderId,
                senderName: messageData.senderName,
                content: notificationPreview,
                chatName: chat.name,
                chatType: chat.type,
            });
        } catch {
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
                if (userId) {
                    const chat = await getChat(chatId);
                    const chatKey = await resolveChatKey(chat, userId);
                    return await decryptMessagesWithRecovery(chat, userId, cached.value, chatKey);
                }
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
            documents = await decryptMessagesWithRecovery(chat, userId, documents, chatKey);
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
        const message = await databases.getDocument(
            config.databaseId,
            config.messagesCollectionId,
            messageId
        );

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

        const updatedMessage = await databases.updateDocument(
            config.databaseId,
            config.messagesCollectionId,
            messageId,
            {
                content: contentToSave,
            }
        );

        await messagesCacheManager.invalidateChatMessages(chatId);

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
        const message = await databases.getDocument(
            config.databaseId,
            config.messagesCollectionId,
            messageId
        );

        const chat = await getChat(message.chatId, true);
        const canDelete = message.senderId === currentUserId || canManageChat(chat, currentUserId);
        if (!canDelete) {
            throw new Error('Not authorized to delete this message');
        }
        
        await databases.deleteDocument(
            config.databaseId,
            config.messagesCollectionId,
            messageId
        );
        
        // Delete image from imgbb if delete URL is provided
        const deleteUrl = message?.imageDeleteUrl || imageDeleteUrl;
        if (deleteUrl) {
            try {
                const { deleteImageFromImgbb } = require('../services/imgbbService');
                await deleteImageFromImgbb(deleteUrl);
            } catch (imgError) {
                // Image deletion failed but message was deleted
            }
        }
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

        const currentUserId = await getAuthenticatedUserId();
        const existingMessage = await databases.getDocument(
            config.databaseId,
            config.messagesCollectionId,
            messageId
        );

        const chat = await getChat(existingMessage.chatId, true);
        const canEdit = existingMessage.senderId === currentUserId || canManageChat(chat, currentUserId);
        if (!canEdit) {
            throw new Error('Not authorized to update this message');
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

const parseMessageReactions = (value) => {
    if (!value) return {};
    if (typeof value === 'object' && !Array.isArray(value)) return value;
    if (typeof value === 'string') {
        try {
            const parsed = JSON.parse(value);
            return typeof parsed === 'object' && parsed ? parsed : {};
        } catch (error) {
            return {};
        }
    }
    return {};
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

        const message = await databases.getDocument(
            config.databaseId,
            config.messagesCollectionId,
            messageId
        );

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

        const updatedMessage = await databases.updateDocument(
            config.databaseId,
            config.messagesCollectionId,
            messageId,
            { reactions: JSON.stringify(nextReactions) }
        );

        if (chatId) {
            await messagesCacheManager.invalidateChatMessages(chatId);
        }

        return updatedMessage;
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
        await unreadCountCacheManager.cacheChatUnreadCount(chatId, userId, 0);
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
export const getUnreadCount = async (chatId, userId, options = {}) => {
    try {
        if (!chatId || !userId) {
            return 0;
        }

        const { useCache = true, cacheOnly = false } = options;

        if (useCache) {
            const cached = await unreadCountCacheManager.getCachedChatUnreadCount(chatId, userId);
            if (cached && typeof cached.value === 'number') {
                return cached.value;
            }
        }

        if (cacheOnly) {
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

        await unreadCountCacheManager.cacheChatUnreadCount(chatId, userId, unreadCount);

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
        await unreadCountCacheManager.cacheChatUnreadCount(chatId, userId, 0);
    } catch (error) {
        // Silently fail - reading messages is not critical
    }
};

/**
 * Get total unread count across all user chats
 */
export const getTotalUnreadCount = async (userId, chatIds, options = {}) => {
    try {
        if (!userId || !chatIds || chatIds.length === 0) {
            return 0;
        }

        const { useCache = true, cacheOnly = false } = options;

        let totalUnread = 0;
        for (const chatId of chatIds) {
            const count = await getUnreadCount(chatId, userId, { useCache, cacheOnly });
            totalUnread += count;
        }

        return totalUnread;
    } catch (error) {
        return 0;
    }
};

// ─── Cursor-based message pagination ─────────────────────────────────
/**
 * Fetch messages using cursor-based pagination.
 * Avoids duplicate / missing items under concurrent writes.
 *
 * @param {string}      chatId       - Chat room ID.
 * @param {string|null} userId       - Current user ID (for decryption).
 * @param {number}      limit        - Page size (default 50).
 * @param {string|null} afterCursor  - `$id` of the last document from the previous page.
 * @returns {Promise<{documents: Array, lastCursor: string|null, hasMore: boolean}>}
 */
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

        const response = await databases.listDocuments(
            config.databaseId,
            config.messagesCollectionId,
            queries
        );

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