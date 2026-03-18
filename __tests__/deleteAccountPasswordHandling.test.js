import { deleteAccount, __resetDeleteAccountReauthStateForTests } from '../database/auth';

const mockCreateEmailPasswordSession = jest.fn();
const mockGet = jest.fn();
const mockListDocuments = jest.fn();
const mockGetDocument = jest.fn();
const mockUpdateDocument = jest.fn();
const mockDeleteDocument = jest.fn();

jest.mock('../database/config', () => ({
  account: {
    get: (...args) => mockGet(...args),
    createEmailPasswordSession: (...args) => mockCreateEmailPasswordSession(...args),
    updateStatus: jest.fn(),
    deleteSession: jest.fn(),
  },
  databases: {
    listDocuments: (...args) => mockListDocuments(...args),
    getDocument: (...args) => mockGetDocument(...args),
    updateDocument: (...args) => mockUpdateDocument(...args),
    deleteDocument: (...args) => mockDeleteDocument(...args),
    createDocument: jest.fn(),
  },
  storage: {},
  config: {
    databaseId: 'test-db',
    usersCollectionId: 'users',
    postsCollectionId: 'posts',
    repliesCollectionId: 'replies',
    notificationsCollectionId: 'notifications',
    pushTokensCollectionId: 'pushTokens',
    userChatSettingsCollectionId: 'userChatSettings',
    messagesCollectionId: 'messages',
    chatsCollectionId: 'chats',
  },
}));

jest.mock('../app/utils/safeStorage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    getAllKeys: jest.fn(() => Promise.resolve([])),
  },
}));

jest.mock('../app/utils/cacheManager', () => ({
  userCacheManager: {
    getCachedUser: jest.fn().mockResolvedValue(null),
    cacheUser: jest.fn(),
    invalidateUser: jest.fn(),
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

describe('deleteAccount password handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    __resetDeleteAccountReauthStateForTests();
    mockGet.mockResolvedValue({
      $id: 'user-1',
      email: 'student@example.edu',
      name: 'Student User',
    });
    mockCreateEmailPasswordSession.mockResolvedValue({ $id: 'session-1' });
    mockListDocuments.mockResolvedValue({ documents: [] });
    mockGetDocument.mockResolvedValue({ followers: [], following: [] });
    mockUpdateDocument.mockResolvedValue({});
    mockDeleteDocument.mockResolvedValue({});
  });

  it('uses the exact password string for delete re-authentication', async () => {
    const passwordWithSpaces = ' lead-and-trail ';

    await deleteAccount(passwordWithSpaces);

    expect(mockCreateEmailPasswordSession).toHaveBeenCalledWith({
      email: 'student@example.edu',
      password: passwordWithSpaces,
    });
  });

  it('throws explicit invalid-password error for bad delete-account password', async () => {
    mockCreateEmailPasswordSession.mockRejectedValueOnce({
      code: 401,
      message: 'Invalid credentials',
    });

    await expect(deleteAccount('wrong-pass')).rejects.toMatchObject({
      message: 'DELETE_ACCOUNT_INVALID_PASSWORD',
      code: 'DELETE_ACCOUNT_INVALID_PASSWORD',
    });
  });

  it('maps Appwrite re-auth rate-limit errors to explicit delete-account code', async () => {
    mockCreateEmailPasswordSession.mockRejectedValueOnce({
      code: 429,
      type: 'general_rate_limit_exceeded',
      message: 'Rate limit for the current endpoint has been exceeded. Please try again after some time.',
    });

    await expect(deleteAccount('correct-password')).rejects.toMatchObject({
      message: 'DELETE_ACCOUNT_REAUTH_RATE_LIMITED',
      code: 'DELETE_ACCOUNT_REAUTH_RATE_LIMITED',
    });
  });

  it('short-circuits immediate repeat attempts during delete re-auth cooldown', async () => {
    mockCreateEmailPasswordSession.mockRejectedValueOnce({
      code: 429,
      type: 'general_rate_limit_exceeded',
      message: 'Rate limit for the current endpoint has been exceeded. Please try again after some time.',
    });

    await expect(deleteAccount('correct-password')).rejects.toMatchObject({
      code: 'DELETE_ACCOUNT_REAUTH_RATE_LIMITED',
    });

    await expect(deleteAccount('correct-password')).rejects.toMatchObject({
      code: 'DELETE_ACCOUNT_REAUTH_RATE_LIMITED',
    });

    expect(mockCreateEmailPasswordSession).toHaveBeenCalledTimes(1);
  });

  it('does not send unknown attributes while anonymizing the user record', async () => {
    await deleteAccount('correct-password');

    const userUpdateCall = mockUpdateDocument.mock.calls.find(
      ([request]) => request?.collectionId === 'users' && request?.documentId === 'user-1',
    );

    expect(userUpdateCall).toBeTruthy();
    expect(userUpdateCall[0].data).not.toHaveProperty('pronouns');
  });

  it('throws explicit cleanup error when user document update and delete fallback both fail', async () => {
    mockUpdateDocument.mockRejectedValueOnce({
      code: 400,
      message: 'Unknown attribute: pronouns',
    });
    mockDeleteDocument.mockRejectedValueOnce({
      code: 401,
      message: 'Missing delete permission',
    });

    await expect(deleteAccount('correct-password')).rejects.toMatchObject({
      message: 'DELETE_ACCOUNT_USER_RECORD_CLEANUP_FAILED',
      code: 'DELETE_ACCOUNT_USER_RECORD_CLEANUP_FAILED',
    });
  });
});
