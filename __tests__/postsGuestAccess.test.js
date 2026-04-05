import { createPost } from '../database/posts';
import { account, databases } from '../database/config';
import { getUserById } from '../database/users';
import { enforceRateLimit } from '../database/securityGuards';

jest.mock('appwrite', () => ({
  ID: {
    unique: jest.fn(() => 'post-id-1'),
  },
  Query: {
    equal: jest.fn(),
    orderDesc: jest.fn(),
    limit: jest.fn(),
    offset: jest.fn(),
    orderAsc: jest.fn(),
    contains: jest.fn(),
  },
  Permission: {
    read: jest.fn(() => 'read'),
    update: jest.fn(() => 'update'),
    delete: jest.fn(() => 'delete'),
  },
  Role: {
    users: jest.fn(() => 'users'),
    user: jest.fn((id) => `user:${id}`),
  },
}));

jest.mock('../database/config', () => ({
  account: {
    get: jest.fn(),
  },
  databases: {
    createDocument: jest.fn(),
    updateDocument: jest.fn(),
    listDocuments: jest.fn(),
    getDocument: jest.fn(),
  },
  storage: {},
  config: {
    databaseId: 'db-1',
    postsCollectionId: 'posts',
    usersCollectionId: 'users',
  },
}));

jest.mock('../database/users', () => ({
  getUserById: jest.fn(),
}));

jest.mock('../database/notifications', () => ({
  notifyDepartmentPost: jest.fn(() => Promise.resolve()),
  notifyPostHiddenByReports: jest.fn(() => Promise.resolve()),
  notifyPostLike: jest.fn(() => Promise.resolve()),
}));

jest.mock('../database/securityGuards', () => ({
  enforceRateLimit: jest.fn(),
}));

jest.mock('../app/utils/networkErrorHandler', () => ({
  handleNetworkError: jest.fn(),
}));

jest.mock('../app/utils/cacheManager', () => ({
  postsCacheManager: {
    generateCacheKey: jest.fn(() => 'posts-cache-key'),
    getCachedPosts: jest.fn().mockResolvedValue(null),
    cachePosts: jest.fn().mockResolvedValue(undefined),
    invalidatePostsCache: jest.fn().mockResolvedValue(undefined),
    invalidateSinglePost: jest.fn().mockResolvedValue(undefined),
  },
}));

describe('createPost guest protections', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    databases.createDocument.mockResolvedValue({ $id: 'post-1' });
  });

  it('rejects guest posts at daily limit even when payload spoofs isGuestPost=false', async () => {
    const today = new Date().toISOString().slice(0, 10);

    account.get.mockResolvedValue({ $id: 'guest-1' });
    getUserById.mockResolvedValue({
      $id: 'guest-1',
      role: 'guest',
      profileViews: JSON.stringify({
        guestLastPostDate: today,
        guestPostCountToday: 1,
      }),
    });

    await expect(createPost({
      topic: 'Guest post attempt',
      text: 'Should be blocked',
      postType: 'discussion',
      department: 'general',
      stage: 'stage_1',
      isGuestPost: false,
    })).rejects.toMatchObject({ code: 'GUEST_LIMIT_REACHED' });

    expect(databases.createDocument).not.toHaveBeenCalled();
  });

  it('enforces guest post rate limits and persists guest tracking from server-side role', async () => {
    account.get.mockResolvedValue({ $id: 'guest-2' });
    getUserById.mockResolvedValue({
      $id: 'guest-2',
      role: 'guest',
      profileViews: JSON.stringify({
        someExistingFlag: true,
      }),
    });

    await createPost({
      topic: 'Allowed guest post',
      text: 'Hello',
      postType: 'discussion',
      department: 'general',
      stage: 'stage_1',
      isGuestPost: false,
    });

    expect(enforceRateLimit).toHaveBeenCalledWith(expect.objectContaining({
      action: 'create_post',
      userId: 'guest-2',
      maxActions: 1,
      windowMs: 24 * 60 * 60 * 1000,
    }));

    expect(databases.createDocument).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        userId: 'guest-2',
        isGuestPost: true,
      }),
    }));

    expect(databases.updateDocument).toHaveBeenCalledWith(expect.objectContaining({
      collectionId: 'users',
      documentId: 'guest-2',
      data: expect.objectContaining({
        profileViews: expect.any(String),
      }),
    }));
  });

  it('ignores spoofed guest payload flags for student accounts', async () => {
    account.get.mockResolvedValue({ $id: 'student-1' });
    getUserById.mockResolvedValue({
      $id: 'student-1',
      role: 'student',
      profileViews: '{}',
    });

    await createPost({
      topic: 'Student post',
      text: 'Legit',
      postType: 'discussion',
      department: 'general',
      stage: 'stage_1',
      isGuestPost: true,
    });

    expect(enforceRateLimit).toHaveBeenCalledWith(expect.objectContaining({
      action: 'create_post',
      userId: 'student-1',
      maxActions: 4,
      windowMs: 60 * 1000,
    }));

    expect(databases.createDocument).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        userId: 'student-1',
        isGuestPost: false,
      }),
    }));

    expect(databases.updateDocument).not.toHaveBeenCalled();
  });
});
