import { account, databases, config } from '../config';
import { Permission, Role } from 'appwrite';
import * as SecureStore from 'expo-secure-store';
import nacl from 'tweetnacl';
import { encodeBase64, decodeBase64, encodeUTF8, decodeUTF8 } from 'tweetnacl-util';
import { getUserById, updateUserPublicKey } from '../users';

const E2EE_PREFIX = 'enc:v1:';
const CHAT_KEY_PREFIX = 'e2ee_chat_key_';
const PUBLIC_KEY_PREFIX = 'e2ee_public_key_';
const PRIVATE_KEY_PREFIX = 'e2ee_private_key_';

const isByteArray = (value) => value instanceof Uint8Array;
const hasExpectedByteLength = (value, length) => isByteArray(value) && value.length === length;

export const decodeBytesOfLength = (value, length) => {
  if (!value || typeof value !== 'string') {
    return null;
  }

  try {
    const decoded = decodeBytes(value);
    return hasExpectedByteLength(decoded, length) ? decoded : null;
  } catch {
    return null;
  }
};

const isValidPublicKeyBase64 = (value) => Boolean(decodeBytesOfLength(value, nacl.box.publicKeyLength));
const isValidChatKey = (value) => hasExpectedByteLength(value, nacl.secretbox.keyLength);

export const buildParticipantPermissions = () => {
  return [
    Permission.read(Role.users()),
    Permission.update(Role.users()),
    Permission.delete(Role.users()),
  ];
};

export const getAuthenticatedUserId = async () => {
  const currentUser = await account.get();
  const currentUserId = currentUser?.$id;
  if (!currentUserId) {
    throw new Error('Authentication required');
  }
  return currentUserId;
};

export const canManageChat = (chat, userId) => {
  if (!chat || !userId) return false;

  const participants = Array.isArray(chat.participants) ? chat.participants : [];
  const admins = Array.isArray(chat.admins) ? chat.admins : [];
  const representatives = Array.isArray(chat.representatives) ? chat.representatives : [];

  if (chat.type === 'private') {
    return participants.includes(userId);
  }

  return admins.includes(userId) || representatives.includes(userId);
};

export const getSecureRandomBytes = (size) => {
  if (!Number.isInteger(size) || size <= 0) {
    return null;
  }

  try {
    const { randomBytes } = require('react-native-quick-crypto');
    if (typeof randomBytes === 'function') {
      return new Uint8Array(randomBytes(size));
    }
  } catch {
  }

  if (typeof global !== 'undefined' && global?.crypto?.getRandomValues) {
    const buffer = new Uint8Array(size);
    global.crypto.getRandomValues(buffer);
    return buffer;
  }

  if (typeof nacl?.randomBytes === 'function') {
    return nacl.randomBytes(size);
  }

  return null;
};

const generateBoxKeypair = () => {
  const secretKey = getSecureRandomBytes(nacl.box.secretKeyLength);
  if (!secretKey) return null;
  return nacl.box.keyPair.fromSecretKey(secretKey);
};

const getSecureStoreKey = (prefix, id) => `${prefix}${id}`;

export const encodeBytes = (bytes) => encodeBase64(bytes);
export const decodeBytes = (value) => decodeBase64(value);

export const getOrCreateUserKeypair = async (userId) => {
  const publicKeyKey = getSecureStoreKey(PUBLIC_KEY_PREFIX, userId);
  const privateKeyKey = getSecureStoreKey(PRIVATE_KEY_PREFIX, userId);

  const storedPublicKey = await SecureStore.getItemAsync(publicKeyKey);
  const storedPrivateKey = await SecureStore.getItemAsync(privateKeyKey);

  if (storedPublicKey && storedPrivateKey) {
    const decodedPublicKey = decodeBytesOfLength(storedPublicKey, nacl.box.publicKeyLength);
    const decodedPrivateKey = decodeBytesOfLength(storedPrivateKey, nacl.box.secretKeyLength);

    if (decodedPublicKey && decodedPrivateKey) {
      return {
        publicKey: decodedPublicKey,
        secretKey: decodedPrivateKey,
      };
    }

    await SecureStore.deleteItemAsync(publicKeyKey).catch(() => {});
    await SecureStore.deleteItemAsync(privateKeyKey).catch(() => {});
  }

  const keypair = generateBoxKeypair();
  if (!keypair || !hasExpectedByteLength(keypair.publicKey, nacl.box.publicKeyLength) || !hasExpectedByteLength(keypair.secretKey, nacl.box.secretKeyLength)) {
    return null;
  }

  await SecureStore.setItemAsync(publicKeyKey, encodeBytes(keypair.publicKey));
  await SecureStore.setItemAsync(privateKeyKey, encodeBytes(keypair.secretKey));

  return keypair;
};

export const ensureUserPublicKeyStored = async (userId, publicKeyBase64) => {
  if (!isValidPublicKeyBase64(publicKeyBase64)) {
    return;
  }

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

  await databases.updateDocument({
    databaseId: config.databaseId,
    collectionId: config.chatsCollectionId,
    documentId: chat.$id,
    data: { settings: JSON.stringify(nextSettings) }
  });

  return { publicKey, settings: nextSettings };
};

export const getParticipantPublicKey = async (settings, userId) => {
  const storedKey = settings?.e2ee?.publicKeys?.[userId];
  if (storedKey && typeof storedKey === 'string' && isValidPublicKeyBase64(storedKey)) {
    return storedKey;
  }

  return await getUserPublicKey(userId);
};

const getUserPublicKey = async (userId) => {
  const userDoc = await getUserById(userId, true);
  if (userDoc?.publicKey && typeof userDoc.publicKey === 'string' && isValidPublicKeyBase64(userDoc.publicKey)) {
    return userDoc.publicKey;
  }
  return null;
};

export const encryptWithBox = (dataBytes, senderSecretKey, recipientPublicKey) => {
  if (!isByteArray(dataBytes) || !hasExpectedByteLength(senderSecretKey, nacl.box.secretKeyLength) || !hasExpectedByteLength(recipientPublicKey, nacl.box.publicKeyLength)) {
    return null;
  }

  const nonce = getSecureRandomBytes(nacl.box.nonceLength);
  if (!hasExpectedByteLength(nonce, nacl.box.nonceLength)) return null;

  try {
    const cipher = nacl.box(dataBytes, nonce, recipientPublicKey, senderSecretKey);
    return { nonce, cipher };
  } catch {
    return null;
  }
};

const decryptWithBox = (cipherBytes, nonceBytes, recipientSecretKey, senderPublicKey) => {
  if (!isByteArray(cipherBytes) || !hasExpectedByteLength(nonceBytes, nacl.box.nonceLength) || !hasExpectedByteLength(recipientSecretKey, nacl.box.secretKeyLength) || !hasExpectedByteLength(senderPublicKey, nacl.box.publicKeyLength)) {
    return null;
  }

  try {
    return nacl.box.open(cipherBytes, nonceBytes, senderPublicKey, recipientSecretKey);
  } catch {
    return null;
  }
};

export const encryptContent = (content, chatKey) => {
  if (!content) return '';
  if (!isValidChatKey(chatKey)) {
    throw new Error('Invalid chat encryption key');
  }

  const nonce = getSecureRandomBytes(nacl.secretbox.nonceLength);
  if (!hasExpectedByteLength(nonce, nacl.secretbox.nonceLength)) {
    throw new Error('Secure random generator unavailable');
  }

  const contentBytes = decodeUTF8(content);
  const cipher = nacl.secretbox(contentBytes, nonce, chatKey);
  return `${E2EE_PREFIX}${encodeBytes(nonce)}:${encodeBytes(cipher)}`;
};

export const decryptContent = (content, chatKey) => {
  if (!content || typeof content !== 'string') return content;
  if (!content.startsWith(E2EE_PREFIX)) return content;
  if (!isValidChatKey(chatKey)) return '';

  const payload = content.substring(E2EE_PREFIX.length);
  const [nonceB64, cipherB64] = payload.split(':');
  if (!nonceB64 || !cipherB64) return '';

  try {
    const nonce = decodeBytesOfLength(nonceB64, nacl.secretbox.nonceLength);
    const cipher = decodeBytes(cipherB64);
    if (!nonce || !isByteArray(cipher) || cipher.length === 0) {
      return '';
    }

    const decrypted = nacl.secretbox.open(cipher, nonce, chatKey);
    if (!decrypted) return '';
    return encodeUTF8(decrypted);
  } catch {
    return '';
  }
};

export const isEncryptedContent = (value) => typeof value === 'string' && value.startsWith(E2EE_PREFIX);

export const sanitizeEncryptedMessage = (message) => {
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

export const parseChatSettings = (settingsString) => {
  try {
    return settingsString ? JSON.parse(settingsString) : {};
  } catch {
    return {};
  }
};

const storeChatKey = async (chatId, chatKey) => {
  if (!isValidChatKey(chatKey)) {
    return;
  }

  const key = getSecureStoreKey(CHAT_KEY_PREFIX, chatId);
  await SecureStore.setItemAsync(key, encodeBytes(chatKey));
};

const getStoredChatKey = async (chatId) => {
  const key = getSecureStoreKey(CHAT_KEY_PREFIX, chatId);
  const stored = await SecureStore.getItemAsync(key);
  if (!stored) return null;

  const decoded = decodeBytesOfLength(stored, nacl.secretbox.keyLength);
  if (decoded) {
    return decoded;
  }

  await SecureStore.deleteItemAsync(key).catch(() => {});
  return null;
};

export const clearStoredChatKey = async (chatId) => {
  if (!chatId) return;
  const key = getSecureStoreKey(CHAT_KEY_PREFIX, chatId);
  try {
    await SecureStore.deleteItemAsync(key);
  } catch {
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

    const participantPublicKeyBytes = decodeBytesOfLength(participantPublicKey, nacl.box.publicKeyLength);
    if (!participantPublicKeyBytes) {
      continue;
    }

    if (!publicKeys[participantId]) {
      publicKeys[participantId] = participantPublicKey;
    }

    const encrypted = encryptWithBox(
      chatKey,
      keypair.secretKey,
      participantPublicKeyBytes
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

export const resolveChatKey = async (chat, userId, options = {}) => {
  if (!chat || !userId) return null;

  const { forceRefresh = false } = options;

  const publicKeyResult = await ensureChatPublicKeyStored(chat, userId);
  const settingsStr = publicKeyResult?.settings
    ? JSON.stringify(publicKeyResult.settings)
    : chat.settings;

  if (!forceRefresh) {
    const cached = await getStoredChatKey(chat.$id);
    if (cached) {
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

    let cipherBytes = null;
    try {
      cipherBytes = decodeBytes(candidate.cipher);
    } catch {
      cipherBytes = null;
    }
    const nonceBytes = decodeBytesOfLength(candidate.nonce, nacl.box.nonceLength);
    const senderPublicKeyBytes = decodeBytesOfLength(senderPublicKey, nacl.box.publicKeyLength);
    if (!isByteArray(cipherBytes) || !nonceBytes || !senderPublicKeyBytes) {
      continue;
    }

    const decrypted = decryptWithBox(
      cipherBytes,
      nonceBytes,
      keypair.secretKey,
      senderPublicKeyBytes
    );

    if (!isValidChatKey(decrypted)) {
      continue;
    }

    await storeChatKey(chat.$id, decrypted);
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

    const participantPublicKeyBytes = decodeBytesOfLength(participantPublicKey, nacl.box.publicKeyLength);
    if (!participantPublicKeyBytes) {
      continue;
    }

    if (!publicKeys[participantId]) {
      publicKeys[participantId] = participantPublicKey;
    }

    const encrypted = encryptWithBox(
      chatKey,
      senderKeypair.secretKey,
      participantPublicKeyBytes
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

  await databases.updateDocument({
    databaseId: config.databaseId,
    collectionId: config.chatsCollectionId,
    documentId: chat.$id,
    data: { settings: JSON.stringify(nextSettings) }
  });
};

export const ensureChatEncryption = async (chat, userId) => {
  if (!chat || !userId) return null;

  const publicKeyResult = await ensureChatPublicKeyStored(chat, userId);
  const settingsStr = publicKeyResult?.settings
    ? JSON.stringify(publicKeyResult.settings)
    : chat.settings;

  const existingKey = await resolveChatKey(chat, userId);
  if (existingKey) {
    await addMissingE2eeKeys(chat, existingKey, userId);
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

  await databases.updateDocument({
    databaseId: config.databaseId,
    collectionId: config.chatsCollectionId,
    documentId: chat.$id,
    data: { settings: JSON.stringify(nextSettings) }
  });

  await storeChatKey(chat.$id, built.chatKey);
  return built.chatKey;
};

export const decryptMessageFields = (message, chatKey) => {
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

export const decryptMessageFieldsWithRecovery = async (chat, userId, message, chatKey) => {
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

export const decryptMessagesWithRecovery = async (chat, userId, messages, chatKey) => {
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

export const parseMessageReactions = (value) => {
  if (!value) return {};
  if (typeof value === 'object' && !Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return typeof parsed === 'object' && parsed ? parsed : {};
    } catch {
      return {};
    }
  }
  return {};
};

export const checkForEveryoneMention = (content) => {
  if (!content) return false;
  const lowerContent = content.toLowerCase();
  return lowerContent.includes('@everyone') || lowerContent.includes('@all');
};

export const removeStoredChatKey = async (chatId) => {
  await SecureStore.deleteItemAsync(getSecureStoreKey(CHAT_KEY_PREFIX, chatId));
};
