/**
 * Notifications routing tests.
 *
 * Validates:
 * - createNotification skips self-notifications
 * - createNotification skips when userId or type is missing
 * - getNotificationsCursor returns proper cursor structure
 * - markNotificationAsRead updates isRead field
 */

const mockListDocuments = jest.fn().mockResolvedValue({
  documents: [
    { $id: 'n1', userId: 'user-1', type: 'post_like', isRead: false, $createdAt: '2026-02-20T00:00:00Z' },
    { $id: 'n2', userId: 'user-1', type: 'follow', isRead: false, $createdAt: '2026-02-19T00:00:00Z' },
  ],
  total: 2,
});

const mockGetDocument = jest.fn().mockImplementation((dbId, collId, docId) => {
  if (docId === 'n1') return Promise.resolve({ $id: 'n1', userId: 'user-1', type: 'post_like', isRead: false });
  if (docId === 'n2') return Promise.resolve({ $id: 'n2', userId: 'user-1', type: 'follow', isRead: false });
  return Promise.reject(new Error('Not found'));
});

const mockCreateDocument = jest.fn().mockImplementation((dbId, collId, docId, data) =>
  Promise.resolve({ $id: docId, ...data })
);

const mockUpdateDocument = jest.fn().mockImplementation((dbId, collId, docId, data) =>
  Promise.resolve({ $id: docId, userId: 'user-1', ...data })
);

jest.mock('appwrite', () => ({
  ID: { unique: jest.fn(() => 'notif-unique') },
  Query: {
    equal: jest.fn((...a) => `equal:${a.join(',')}`),
    limit: jest.fn((n) => `limit:${n}`),
    offset: jest.fn((n) => `offset:${n}`),
    orderDesc: jest.fn((f) => `orderDesc:${f}`),
    orderAsc: jest.fn((f) => `orderAsc:${f}`),
    cursorAfter: jest.fn((c) => `cursorAfter:${c}`),
  },
  Permission: {
    read: jest.fn((r) => `read(${r})`),
    update: jest.fn((r) => `update(${r})`),
    delete: jest.fn((r) => `delete(${r})`),
  },
  Role: {
    users: jest.fn(() => 'role:users'),
    user: jest.fn((id) => `role:user:${id}`),
  },
}));

jest.mock('../database/config', () => ({
  databases: {
    getDocument: (...args) => mockGetDocument(...args),
    createDocument: (...args) => mockCreateDocument(...args),
    updateDocument: (...args) => mockUpdateDocument(...args),
    listDocuments: (...args) => mockListDocuments(...args),
  },
  account: {
    get: jest.fn().mockResolvedValue({ $id: 'user-1' }),
  },
  config: {
    databaseId: 'test-db',
    notificationsCollectionId: 'notifications-col',
    usersCollectionId: 'users-col',
  },
}));

jest.mock('../database/securityGuards', () => ({
  getAuthenticatedUserId: jest.fn().mockResolvedValue('user-1'),
  hasBlockedRelationship: jest.fn().mockResolvedValue(false),
  assertActorIdentity: jest.fn().mockResolvedValue(undefined),
  enforceRateLimit: jest.fn(),
}));

jest.mock('../services/pushNotificationService', () => ({
  sendChatPushNotification: jest.fn(),
  sendGeneralPushNotification: jest.fn(),
}));

jest.mock('../app/utils/cacheManager', () => ({
  unreadCountCacheManager: {
    getCachedNotificationUnreadCount: jest.fn().mockResolvedValue(null),
    cacheNotificationUnreadCount: jest.fn(),
    invalidateNotificationUnreadCount: jest.fn(),
    getCachedChatUnreadCount: jest.fn().mockResolvedValue(null),
    cacheChatUnreadCount: jest.fn(),
  },
  notificationsCacheManager: {
    getCachedNotifications: jest.fn().mockResolvedValue(null),
    cacheNotifications: jest.fn(),
    invalidateUserNotifications: jest.fn(),
  },
}));

import {
  createNotification,
  getNotifications,
  getNotificationsCursor,
  markNotificationAsRead,
  NOTIFICATION_TYPES,
} from '../database/notifications';

describe('createNotification', () => {
  it('returns null when userId and senderId are the same (self-notification)', async () => {
    const result = await createNotification({
      userId: 'user-1',
      senderId: 'user-1',
      type: NOTIFICATION_TYPES.POST_LIKE,
    });
    expect(result).toBeNull();
  });

  it('returns null when userId is missing', async () => {
    const result = await createNotification({ senderId: 'user-2', type: 'follow' });
    expect(result).toBeNull();
  });

  it('returns null when type is missing', async () => {
    const result = await createNotification({ userId: 'user-1', senderId: 'user-2' });
    expect(result).toBeNull();
  });

  it('returns null for null input', async () => {
    const result = await createNotification(null);
    expect(result).toBeNull();
  });

  it('creates notification when valid data is provided', async () => {
    const { getAuthenticatedUserId } = require('../database/securityGuards');
    getAuthenticatedUserId.mockResolvedValueOnce('user-2');
    const result = await createNotification({
      userId: 'user-1',
      senderId: 'user-2',
      senderName: 'John',
      type: NOTIFICATION_TYPES.FOLLOW,
    });
    expect(result).not.toBeNull();
    expect(result.userId).toBe('user-1');
    expect(result.type).toBe('follow');
    expect(result.isRead).toBe(false);
  });
});

describe('getNotifications', () => {
  it('returns empty array for invalid userId', async () => {
    const result = await getNotifications('', 20, 0);
    expect(result).toEqual([]);
  });

  it('returns documents for valid userId', async () => {
    const result = await getNotifications('user-1', 20, 0, { useCache: false });
    expect(result).toHaveLength(2);
    expect(result[0].$id).toBe('n1');
  });
});

describe('getNotificationsCursor', () => {
  it('returns proper cursor structure', async () => {
    const result = await getNotificationsCursor('user-1', 20, null);
    expect(result).toHaveProperty('documents');
    expect(result).toHaveProperty('lastCursor');
    expect(result).toHaveProperty('hasMore');
    expect(result.documents).toHaveLength(2);
    expect(result.lastCursor).toBe('n2');
  });

  it('returns empty result for invalid userId', async () => {
    const result = await getNotificationsCursor('', 20, null);
    expect(result.documents).toEqual([]);
    expect(result.lastCursor).toBeNull();
    expect(result.hasMore).toBe(false);
  });
});

describe('markNotificationAsRead', () => {
  it('rejects for empty notificationId', async () => {
    await expect(markNotificationAsRead('')).rejects.toThrow('Invalid notification ID');
  });

  it('rejects for null notificationId', async () => {
    await expect(markNotificationAsRead(null)).rejects.toThrow('Invalid notification ID');
  });

  it('marks notification as read', async () => {
    const result = await markNotificationAsRead('n1');
    expect(result.isRead).toBe(true);
  });
});
