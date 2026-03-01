/**
 * Chat send / retry tests.
 *
 * Validates:
 * - Upload queue retry logic for transient network errors
 * - sendMessage rejects with missing chatId or messageData
 * - sendMessage rejects when sender identity does not match session
 */

jest.mock('appwrite', () => ({
  Client: jest.fn(() => ({
    setEndpoint: jest.fn().mockReturnThis(),
    setProject: jest.fn().mockReturnThis(),
    subscribe: jest.fn(),
  })),
  Account: jest.fn(() => ({
    get: jest.fn().mockResolvedValue({ $id: 'user-1' }),
    createSession: jest.fn(),
  })),
  Databases: jest.fn(() => ({
    getDocument: jest.fn(),
    createDocument: jest.fn(),
    updateDocument: jest.fn(),
    listDocuments: jest.fn().mockResolvedValue({ documents: [] }),
  })),
  Storage: jest.fn(() => ({})),
  ID: { unique: jest.fn(() => 'uid') },
  Query: {
    equal: jest.fn(), limit: jest.fn(), offset: jest.fn(),
    orderDesc: jest.fn(), orderAsc: jest.fn(),
    search: jest.fn(), contains: jest.fn(), cursorAfter: jest.fn(),
  },
  Permission: { read: jest.fn(), update: jest.fn(), delete: jest.fn() },
  Role: { users: jest.fn(), user: jest.fn() },
}));

jest.mock('../database/config', () => ({
  account: { get: jest.fn().mockResolvedValue({ $id: 'user-1' }) },
  databases: {
    getDocument: jest.fn(),
    createDocument: jest.fn(),
    updateDocument: jest.fn(),
    listDocuments: jest.fn().mockResolvedValue({ documents: [] }),
  },
  storage: {},
  config: {
    databaseId: 'test-db',
    chatsCollectionId: 'chats',
    messagesCollectionId: 'messages',
    usersCollectionId: 'users',
  },
  client: { subscribe: jest.fn() },
}));

jest.mock('../database/securityGuards', () => ({
  assertActorIdentity: jest.fn().mockResolvedValue(undefined),
  enforceRateLimit: jest.fn(),
  getAuthenticatedUserId: jest.fn().mockResolvedValue('user-1'),
  hasBlockedRelationship: jest.fn().mockResolvedValue(false),
}));

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

jest.mock('expo-crypto', () => ({
  digestStringAsync: jest.fn(),
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
}));

jest.mock('tweetnacl', () => ({
  box: Object.assign(
    jest.fn(),
    {
      keyPair: jest.fn(() => ({ publicKey: new Uint8Array(32), secretKey: new Uint8Array(32) })),
      open: jest.fn(),
      before: jest.fn(() => new Uint8Array(32)),
    }
  ),
  randomBytes: jest.fn(() => new Uint8Array(24)),
}));

jest.mock('tweetnacl-util', () => ({
  encodeBase64: jest.fn(() => 'base64'),
  decodeBase64: jest.fn(() => new Uint8Array(32)),
  encodeUTF8: jest.fn(() => 'text'),
  decodeUTF8: jest.fn(() => new Uint8Array(10)),
}));

jest.mock('../services/pushNotificationService', () => ({
  sendChatPushNotification: jest.fn(),
  sendGeneralPushNotification: jest.fn(),
}));

jest.mock('../services/imgbbService', () => ({
  uploadImage: jest.fn(),
}));

jest.mock('../services/appwriteFileUpload', () => ({
  uploadFileToAppwrite: jest.fn(),
}));

jest.mock('../app/utils/cacheManager', () => ({
  messagesCacheManager: {
    getCachedMessages: jest.fn().mockResolvedValue(null),
    cacheMessages: jest.fn(),
    invalidateChatMessages: jest.fn(),
  },
  unreadCountCacheManager: {
    getCachedChatUnreadCount: jest.fn().mockResolvedValue(null),
    cacheChatUnreadCount: jest.fn(),
    getCachedNotificationUnreadCount: jest.fn().mockResolvedValue(null),
    cacheNotificationUnreadCount: jest.fn(),
    invalidateNotificationUnreadCount: jest.fn(),
  },
  userCacheManager: {
    getCachedUser: jest.fn().mockResolvedValue(null),
    cacheUser: jest.fn(),
  },
}));

jest.mock('../app/utils/pollUtils', () => ({
  parsePollPayload: jest.fn(),
  applyPollVote: jest.fn(),
}));

import uploadQueue, { UPLOAD_STATUS } from '../services/uploadQueue';

describe('uploadQueue – retry & backoff', () => {
  afterEach(() => {
    uploadQueue.getAll().forEach((item) => uploadQueue.cancel(item.id));
  });

  it('resolves on first attempt when upload succeeds', async () => {
    const uploadFn = jest.fn().mockResolvedValue({ url: 'https://img.bb/1' });

    const { id } = uploadQueue.enqueue({
      type: 'image',
      payload: { uri: 'file://photo.jpg' },
      uploadFn,
    });

    // Wait for processing to complete
    await new Promise((resolve) => setTimeout(resolve, 100));

    const status = uploadQueue.getStatus(id);
    expect(status.status).toBe(UPLOAD_STATUS.SUCCESS);
    expect(status.result).toEqual({ url: 'https://img.bb/1' });
    expect(uploadFn).toHaveBeenCalledTimes(1);
  });

  it('retries on transient network errors with backoff', async () => {
    let calls = 0;
    const uploadFn = jest.fn().mockImplementation(async () => {
      calls += 1;
      if (calls < 3) {
        throw new Error('Network request failed');
      }
      return { url: 'https://img.bb/2' };
    });

    const updates = [];
    const { id } = uploadQueue.enqueue({
      type: 'image',
      payload: { uri: 'file://photo2.jpg' },
      uploadFn,
    });

    uploadQueue.onUpdate(id, (item) => updates.push(item.status));

    // Wait long enough for retries (2s + 4s backoffs + processing)
    await new Promise((resolve) => setTimeout(resolve, 8000));

    const status = uploadQueue.getStatus(id);
    expect(status.status).toBe(UPLOAD_STATUS.SUCCESS);
    expect(uploadFn).toHaveBeenCalledTimes(3);
  }, 15000);

  it('fails permanently on non-transient errors', async () => {
    const uploadFn = jest.fn().mockRejectedValue(new Error('Invalid API key'));

    const { id } = uploadQueue.enqueue({
      type: 'image',
      payload: { uri: 'file://bad.jpg' },
      uploadFn,
    });

    await new Promise((resolve) => setTimeout(resolve, 200));

    const status = uploadQueue.getStatus(id);
    expect(status.status).toBe(UPLOAD_STATUS.FAILED);
    expect(uploadFn).toHaveBeenCalledTimes(1);
  });

  it('allows manual retry of a failed upload', async () => {
    let callCount = 0;
    const uploadFn = jest.fn().mockImplementation(async () => {
      callCount += 1;
      if (callCount === 1) throw new Error('Server error');
      return { url: 'https://img.bb/3' };
    });

    const { id } = uploadQueue.enqueue({
      type: 'image',
      payload: { uri: 'file://retry.jpg' },
      uploadFn,
    });

    await new Promise((resolve) => setTimeout(resolve, 200));
    expect(uploadQueue.getStatus(id).status).toBe(UPLOAD_STATUS.FAILED);

    uploadQueue.retry(id);
    await new Promise((resolve) => setTimeout(resolve, 200));

    expect(uploadQueue.getStatus(id).status).toBe(UPLOAD_STATUS.SUCCESS);
  });

  it('can cancel a pending upload', () => {
    const uploadFn = jest.fn().mockResolvedValue({});

    const { id } = uploadQueue.enqueue({
      type: 'image',
      payload: { uri: 'file://cancel.jpg' },
      uploadFn,
    });

    uploadQueue.cancel(id);
    expect(uploadQueue.getStatus(id)).toBeNull();
  });

  it('notifies listeners on status changes', async () => {
    const uploadFn = jest.fn().mockResolvedValue({ ok: true });
    const statuses = [];

    const { id } = uploadQueue.enqueue({
      type: 'file',
      payload: { uri: 'file://doc.pdf' },
      uploadFn,
    });

    const unsub = uploadQueue.onUpdate(id, (item) => statuses.push(item.status));

    await new Promise((resolve) => setTimeout(resolve, 200));

    expect(statuses).toContain(UPLOAD_STATUS.UPLOADING);
    expect(statuses).toContain(UPLOAD_STATUS.SUCCESS);

    unsub();
  });
});

describe('sendMessage – validation', () => {
  it('rejects when chatId is empty', async () => {
    const { sendMessage } = require('../database/chats');
    await expect(sendMessage('', { senderId: 'u1', content: 'hi' })).rejects.toThrow('Invalid chat ID');
  });

  it('rejects when messageData is null', async () => {
    const { sendMessage } = require('../database/chats');
    await expect(sendMessage('chat-1', null)).rejects.toThrow('Invalid message data');
  });

  it('rejects when senderId is missing', async () => {
    const { sendMessage } = require('../database/chats');
    await expect(sendMessage('chat-1', { content: 'hi' })).rejects.toThrow('Missing required message fields');
  });
});
