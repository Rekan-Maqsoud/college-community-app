/**
 * Auth OTP edge-case tests.
 *
 * These tests exercise the verifyOTPCode path, including:
 * - Invalid code format
 * - Expired code
 * - Lockout after max failed attempts
 * - Missing pending verification data
 */

const mockStore = {};

jest.mock('../app/utils/safeStorage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn((key) => Promise.resolve(mockStore[key] || null)),
    setItem: jest.fn((key, value) => {
      mockStore[key] = value;
      return Promise.resolve();
    }),
    removeItem: jest.fn((key) => {
      delete mockStore[key];
      return Promise.resolve();
    }),
    getAllKeys: jest.fn(() => Promise.resolve(Object.keys(mockStore))),
  },
}));

const mockCreateSession = jest.fn();

jest.mock('../database/config', () => ({
  account: {
    get: jest.fn().mockResolvedValue({ $id: 'user-1' }),
    createSession: (...args) => mockCreateSession(...args),
    createEmailPasswordSession: jest.fn(),
  },
  databases: {
    getDocument: jest.fn(),
    createDocument: jest.fn(),
    updateDocument: jest.fn(),
    listDocuments: jest.fn().mockResolvedValue({ documents: [] }),
  },
  storage: {},
  config: {
    databaseId: 'test-db',
    usersCollectionId: 'users',
  },
}));

jest.mock('appwrite', () => ({
  Client: jest.fn(() => ({
    setEndpoint: jest.fn().mockReturnThis(),
    setProject: jest.fn().mockReturnThis(),
    subscribe: jest.fn(),
  })),
  Account: jest.fn(),
  Databases: jest.fn(),
  Storage: jest.fn(),
  ID: { unique: jest.fn(() => 'unique-id') },
  Query: {
    equal: jest.fn(),
    limit: jest.fn(),
    offset: jest.fn(),
    orderDesc: jest.fn(),
    orderAsc: jest.fn(),
    search: jest.fn(),
    contains: jest.fn(),
    cursorAfter: jest.fn(),
  },
  Permission: { read: jest.fn(), update: jest.fn(), delete: jest.fn() },
  Role: { users: jest.fn(), user: jest.fn() },
  OAuthProvider: { Google: 'google' },
}));

jest.mock('expo-web-browser', () => ({
  maybeCompleteAuthSession: jest.fn(),
  openAuthSessionAsync: jest.fn(),
}));

jest.mock('expo-linking', () => ({
  createURL: jest.fn(() => 'exp://test'),
}));

jest.mock('../services/pushNotificationService', () => ({
  sendChatPushNotification: jest.fn(),
  sendGeneralPushNotification: jest.fn(),
}));

jest.mock('../services/firebase', () => ({
  ensureFirebaseAuth: jest.fn(),
}));

jest.mock('../app/utils/cacheManager', () => ({
  userCacheManager: {
    getCachedUser: jest.fn().mockResolvedValue(null),
    cacheUser: jest.fn(),
    invalidateUser: jest.fn(),
  },
}));

const PENDING_VERIFICATION_KEY = 'pending_verification';

const resetStore = () => {
  Object.keys(mockStore).forEach((k) => delete mockStore[k]);
};

import { verifyOTPCode } from '../database/auth';

describe('Auth OTP edge cases', () => {
  beforeEach(() => {
    resetStore();
    jest.clearAllMocks();
  });

  it('rejects non-6-digit codes immediately', async () => {
    await expect(verifyOTPCode('abc')).rejects.toThrow('Invalid verification code');
    await expect(verifyOTPCode('12345')).rejects.toThrow('Invalid verification code');
    await expect(verifyOTPCode('')).rejects.toThrow('Invalid verification code');
    await expect(verifyOTPCode(null)).rejects.toThrow('Invalid verification code');
  });

  it('throws when no pending verification exists', async () => {
    await expect(verifyOTPCode('123456')).rejects.toThrow('No pending verification found');
  });

  it('throws when verification code is expired', async () => {
    const expired = {
      otpUserId: 'user-1',
      userId: 'user-1',
      name: 'Test',
      email: 'test@edu.com',
      expiresAt: Date.now() - 1000,
    };
    mockStore[PENDING_VERIFICATION_KEY] = JSON.stringify(expired);

    await expect(verifyOTPCode('123456')).rejects.toThrow('expired');

    const remaining = mockStore[PENDING_VERIFICATION_KEY];
    expect(remaining).toBeUndefined();
  });

  it('locks after too many failed attempts', async () => {
    const pending = {
      otpUserId: 'user-1',
      userId: 'user-1',
      name: 'Test',
      email: 'test@edu.com',
      expiresAt: Date.now() + 600_000,
      otpLockedUntil: Date.now() + 300_000,
      otpFailedAttempts: 5,
    };
    mockStore[PENDING_VERIFICATION_KEY] = JSON.stringify(pending);

    await expect(verifyOTPCode('123456')).rejects.toThrow('Too many verification attempts');
  });
});
