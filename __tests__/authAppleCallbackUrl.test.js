const mockCreateOAuth2Token = jest.fn();
const mockCreateSession = jest.fn();
const mockDeleteSession = jest.fn();
const mockOpenAuthSessionAsync = jest.fn();

jest.mock('../database/config', () => ({
  account: {
    get: jest.fn().mockRejectedValue({ code: 401 }),
    createOAuth2Token: (...args) => mockCreateOAuth2Token(...args),
    createSession: (...args) => mockCreateSession(...args),
    deleteSession: (...args) => mockDeleteSession(...args),
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
    projectId: 'project-from-config',
    databaseId: 'test-db',
    usersCollectionId: 'users',
  },
}));

jest.mock('expo-web-browser', () => ({
  maybeCompleteAuthSession: jest.fn(),
  openAuthSessionAsync: (...args) => mockOpenAuthSessionAsync(...args),
}));

jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn().mockResolvedValue(),
  getItemAsync: jest.fn().mockResolvedValue(null),
  deleteItemAsync: jest.fn().mockResolvedValue(),
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

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    expoConfig: {
      scheme: ['collegecommunity', 'appwrite-callback-69a46b6f0020cf0d5e4b'],
    },
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
  OAuthProvider: { Apple: 'apple' },
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
}));

describe('Apple OAuth callback URL selection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID = 'mismatched-project-id';

    mockCreateOAuth2Token.mockImplementation(({ success }) => `https://example.appwrite.io/auth/oauth2/apple?success=${encodeURIComponent(success)}`);
    mockOpenAuthSessionAsync.mockResolvedValue({
      type: 'success',
      url: 'appwrite-callback-69a46b6f0020cf0d5e4b://?userId=user-1&secret=secret-1',
    });
    mockCreateSession.mockResolvedValue({ $id: 'session-1' });
    mockDeleteSession.mockResolvedValue(undefined);
  });

  it('uses the registered appwrite callback scheme from app config when env project id mismatches', async () => {
    const { signInWithApple } = require('../database/auth');

    const result = await signInWithApple();

    expect(result).toEqual({ success: true });

    expect(mockCreateOAuth2Token).toHaveBeenCalledWith(expect.objectContaining({
      provider: 'apple',
      success: 'appwrite-callback-69a46b6f0020cf0d5e4b://',
      failure: 'appwrite-callback-69a46b6f0020cf0d5e4b://',
    }));

    expect(mockOpenAuthSessionAsync).toHaveBeenCalledWith(
      expect.any(String),
      'appwrite-callback-69a46b6f0020cf0d5e4b://',
      expect.any(Object)
    );
  });
});
