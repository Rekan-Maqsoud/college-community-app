import { signIn, signInWithGoogle } from '../database/auth';

const mockCreateEmailPasswordSession = jest.fn();
const mockDeleteSession = jest.fn();
const mockCreateOAuth2Token = jest.fn();
const mockCreateSession = jest.fn();

jest.mock('../database/config', () => ({
  account: {
    get: jest.fn().mockRejectedValue({ code: 401 }),
    createEmailPasswordSession: (...args) => mockCreateEmailPasswordSession(...args),
    deleteSession: (...args) => mockDeleteSession(...args),
    createOAuth2Token: (...args) => mockCreateOAuth2Token(...args),
    createSession: (...args) => mockCreateSession(...args),
  },
  databases: {
    getDocument: jest.fn(),
    createDocument: jest.fn(),
    updateDocument: jest.fn(),
    listDocuments: jest.fn().mockResolvedValue({ documents: [] }),
    deleteDocument: jest.fn(),
  },
  storage: {},
  config: {
    endpoint: 'https://example.appwrite.io/v1',
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

const mockOpenAuthSessionAsync = jest.fn();

jest.mock('expo-web-browser', () => ({
  maybeCompleteAuthSession: jest.fn(),
  openAuthSessionAsync: (...args) => mockOpenAuthSessionAsync(...args),
}));

jest.mock('../app/utils/safeStorage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn().mockResolvedValue(null),
    setItem: jest.fn().mockResolvedValue(),
    removeItem: jest.fn().mockResolvedValue(),
  },
}));

jest.mock('../app/utils/cacheManager', () => ({
  userCacheManager: {
    getCachedUser: jest.fn().mockResolvedValue(null),
    cacheUser: jest.fn(),
    invalidateUser: jest.fn(),
  },
}));

jest.mock('../app/utils/telemetry', () => ({
  recordEvent: jest.fn(),
}));

describe('auth session recovery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID = 'project-123';
  });

  it('retries email sign-in after clearing a stale current session', async () => {
    const session = { $id: 'session-1' };
    mockCreateEmailPasswordSession
      .mockRejectedValueOnce(new Error('session is active'))
      .mockResolvedValueOnce(session);
    mockDeleteSession.mockResolvedValue(undefined);

    const result = await signIn('student@example.edu', 'password123');

    expect(result).toBe(session);
    expect(mockDeleteSession).toHaveBeenCalledWith({ sessionId: 'current' });
    expect(mockCreateEmailPasswordSession).toHaveBeenCalledTimes(2);
  });

  it('clears any current session before Google OAuth and creates the callback session', async () => {
    mockDeleteSession.mockResolvedValue(undefined);
    mockCreateOAuth2Token.mockReturnValue('https://example.appwrite.io/oauth/google');
    mockOpenAuthSessionAsync.mockResolvedValue({
      type: 'success',
      url: 'appwrite-callback-project-123://?userId=user-123&secret=secret-456',
    });
    mockCreateSession.mockResolvedValue({ $id: 'session-1' });

    const result = await signInWithGoogle();

    expect(result).toEqual({ success: true });
    expect(mockDeleteSession).toHaveBeenCalledWith({ sessionId: 'current' });
    expect(mockCreateSession).toHaveBeenCalledWith({ userId: 'user-123', secret: 'secret-456' });
  });
});