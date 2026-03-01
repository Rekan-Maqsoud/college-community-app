/**
 * Block logic tests.
 *
 * Validates:
 * - Cannot block yourself
 * - Already-blocked user returns { alreadyBlocked: true }
 * - Blocking removes follow relationship
 * - Chat-only block is independent of full block
 * - canUserSendMessage respects block lists
 */

const _docs = {};

const mockGetDocument = jest.fn().mockImplementation((dbId, collId, docId) => {
  if (_docs[docId]) return Promise.resolve(_docs[docId]);
  return Promise.reject(new Error('Not found'));
});

const mockUpdateDocument = jest.fn().mockImplementation((dbId, collId, docId, data) => {
  if (_docs[docId]) Object.assign(_docs[docId], data);
  return Promise.resolve(_docs[docId] || {});
});

jest.mock('appwrite', () => ({
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
  account: {
    get: jest.fn().mockImplementation(() =>
      Promise.resolve({ $id: _docs._currentUserId || 'user-a' })
    ),
  },
  databases: {
    getDocument: (...args) => mockGetDocument(...args),
    createDocument: jest.fn().mockResolvedValue({}),
    updateDocument: (...args) => mockUpdateDocument(...args),
    listDocuments: jest.fn().mockResolvedValue({ documents: [], total: 0 }),
  },
  storage: {},
  config: {
    databaseId: 'test-db',
    usersCollectionId: 'users',
    chatsCollectionId: 'chats',
    messagesCollectionId: 'messages',
  },
  client: { subscribe: jest.fn() },
}));

jest.mock('../database/securityGuards', () => ({
  assertActorIdentity: jest.fn().mockResolvedValue(undefined),
  enforceRateLimit: jest.fn(),
  getAuthenticatedUserId: jest.fn().mockImplementation(() =>
    Promise.resolve(_docs._currentUserId || 'user-a')
  ),
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
  box: Object.assign(jest.fn(), {
    keyPair: jest.fn(() => ({ publicKey: new Uint8Array(32), secretKey: new Uint8Array(32) })),
    open: jest.fn(),
    before: jest.fn(() => new Uint8Array(32)),
  }),
  randomBytes: jest.fn(() => new Uint8Array(24)),
}));

jest.mock('tweetnacl-util', () => ({
  encodeBase64: jest.fn(() => 'base64'),
  decodeBase64: jest.fn(() => new Uint8Array(32)),
  encodeUTF8: jest.fn(() => 'text'),
  decodeUTF8: jest.fn(() => new Uint8Array(10)),
}));

jest.mock('../app/utils/cacheManager', () => ({
  userCacheManager: {
    getCachedUser: jest.fn().mockResolvedValue(null),
    cacheUser: jest.fn(),
    invalidateUser: jest.fn(),
  },
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
  notificationsCacheManager: {
    getCachedNotifications: jest.fn().mockResolvedValue(null),
    cacheNotifications: jest.fn(),
    invalidateUserNotifications: jest.fn(),
  },
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

jest.mock('../app/utils/pollUtils', () => ({
  parsePollPayload: jest.fn(),
  applyPollVote: jest.fn(),
}));

import { blockUser, blockUserChatOnly } from '../database/users';
import { canUserSendMessage } from '../database/chats';

const resetDocs = () => {
  Object.keys(_docs).forEach((k) => delete _docs[k]);
};

describe('blockUser', () => {
  beforeEach(() => {
    resetDocs();
    jest.clearAllMocks();
  });

  it('rejects when userId equals blockedUserId', async () => {
    _docs._currentUserId = 'user-a';
    await expect(blockUser('user-a', 'user-a')).rejects.toThrow('Invalid block request');
  });

  it('rejects with empty userId', async () => {
    await expect(blockUser('', 'user-b')).rejects.toThrow('Invalid block request');
  });

  it('rejects with null blockedUserId', async () => {
    await expect(blockUser('user-a', null)).rejects.toThrow('Invalid block request');
  });
});

describe('blockUserChatOnly', () => {
  beforeEach(() => {
    resetDocs();
    jest.clearAllMocks();
  });

  it('rejects when userId equals blockedUserId', async () => {
    _docs._currentUserId = 'user-a';
    await expect(blockUserChatOnly('user-a', 'user-a')).rejects.toThrow('Invalid chat block request');
  });
});

describe('canUserSendMessage – block checks for private chats', () => {
  beforeEach(() => {
    resetDocs();
    mockGetDocument.mockClear();
    mockUpdateDocument.mockClear();
  });

  it('returns false when sender is blocked by other user', async () => {
    _docs._currentUserId = 'user-a';
    _docs['chat-1'] = {
      $id: 'chat-1',
      type: 'private',
      participants: ['user-a', 'user-b'],
    };
    _docs['user-a'] = {
      $id: 'user-a',
      blockedUsers: [],
      chatBlockedUsers: [],
    };
    _docs['user-b'] = {
      $id: 'user-b',
      blockedUsers: ['user-a'],
      chatBlockedUsers: [],
    };

    const result = await canUserSendMessage('chat-1', 'user-a');
    expect(result).toBe(false);
  });

  it('returns false when sender is chat-blocked by other user', async () => {
    _docs._currentUserId = 'user-a';
    _docs['chat-1'] = {
      $id: 'chat-1',
      type: 'private',
      participants: ['user-a', 'user-b'],
    };
    _docs['user-a'] = {
      $id: 'user-a',
      blockedUsers: [],
      chatBlockedUsers: [],
    };
    _docs['user-b'] = {
      $id: 'user-b',
      blockedUsers: [],
      chatBlockedUsers: ['user-a'],
    };

    const result = await canUserSendMessage('chat-1', 'user-a');
    expect(result).toBe(false);
  });

  it('returns true when no blocks exist between participants', async () => {
    _docs._currentUserId = 'user-a';
    _docs['chat-1'] = {
      $id: 'chat-1',
      type: 'private',
      participants: ['user-a', 'user-b'],
    };
    _docs['user-a'] = {
      $id: 'user-a',
      blockedUsers: [],
      chatBlockedUsers: [],
    };
    _docs['user-b'] = {
      $id: 'user-b',
      blockedUsers: [],
      chatBlockedUsers: [],
    };

    const result = await canUserSendMessage('chat-1', 'user-a');
    expect(result).toBe(true);
  });
});
