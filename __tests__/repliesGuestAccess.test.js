jest.mock('appwrite', () => ({
  ID: { unique: jest.fn(() => 'reply-id-1') },
  Query: {
    equal: jest.fn(),
    orderDesc: jest.fn(),
    limit: jest.fn(),
    offset: jest.fn(),
    orderAsc: jest.fn(),
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
    getDocument: jest.fn(),
    createDocument: jest.fn(),
    updateDocument: jest.fn(),
    listDocuments: jest.fn(),
    deleteDocument: jest.fn(),
  },
  config: {
    databaseId: 'db-1',
    postsCollectionId: 'posts',
    repliesCollectionId: 'replies',
  },
}));

jest.mock('../app/utils/cacheManager', () => ({
  repliesCacheManager: {
    getCachedReplies: jest.fn().mockResolvedValue(null),
    cacheReplies: jest.fn().mockResolvedValue(undefined),
    invalidateReplies: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('../database/securityGuards', () => ({
  enforceRateLimit: jest.fn(),
}));

jest.mock('../database/users', () => ({
  getUserById: jest.fn(),
}));

jest.mock('../database/notifications', () => ({
  notifyPostReply: jest.fn(),
  notifyReplyLike: jest.fn(),
  notifyReplyReply: jest.fn(),
}));

jest.mock('../app/utils/telemetry', () => ({
  __esModule: true,
  default: {
    recordEvent: jest.fn(),
  },
}));

describe('createReply guest access rules', () => {
  const { account, databases } = require('../database/config');
  const { getUserById } = require('../database/users');
  const { createReply } = require('../database/replies');

  beforeEach(() => {
    jest.clearAllMocks();

    account.get.mockResolvedValue({ $id: 'guest-1' });
    databases.getDocument.mockResolvedValue({
      $id: 'post-1',
      userId: 'student-1',
      replyCount: 0,
    });
  });

  it('rejects guest replies when author is not a mutual friend', async () => {
    getUserById
      .mockResolvedValueOnce({
        $id: 'guest-1',
        role: 'guest',
        following: [],
        followers: [],
      })
      .mockResolvedValueOnce({
        $id: 'student-1',
        role: 'student',
        following: [],
        followers: [],
      });

    await expect(
      createReply({
        postId: 'post-1',
        text: 'Hello there',
      })
    ).rejects.toMatchObject({ code: 'GUEST_REPLY_RESTRICTED' });

    expect(databases.createDocument).not.toHaveBeenCalled();
  });

  it('rejects guest replies on one-way follow relationships', async () => {
    getUserById
      .mockResolvedValueOnce({
        $id: 'guest-1',
        role: 'guest',
        following: ['student-1'],
        followers: [],
      })
      .mockResolvedValueOnce({
        $id: 'student-1',
        role: 'student',
        following: [],
        followers: ['guest-1'],
      });

    await expect(
      createReply({
        postId: 'post-1',
        text: 'One-way follow should fail',
      })
    ).rejects.toMatchObject({ code: 'GUEST_REPLY_RESTRICTED' });

    expect(databases.createDocument).not.toHaveBeenCalled();
  });

  it('applies stricter rate limits for allowed guest replies', async () => {
    getUserById
      .mockResolvedValueOnce({
        $id: 'guest-1',
        role: 'guest',
        following: ['student-1'],
        followers: ['student-1'],
      })
      .mockResolvedValueOnce({
        $id: 'student-1',
        role: 'student',
        following: ['guest-1'],
        followers: ['guest-1'],
      });

    databases.createDocument.mockResolvedValueOnce({
      $id: 'reply-1',
      postId: 'post-1',
      userId: 'guest-1',
      text: 'Mutual friends can reply',
    });

    await expect(
      createReply({
        postId: 'post-1',
        text: 'Mutual friends can reply',
      })
    ).resolves.toMatchObject({ $id: 'reply-1' });

    const { enforceRateLimit } = require('../database/securityGuards');
    expect(enforceRateLimit).toHaveBeenCalledWith(expect.objectContaining({
      action: 'create_reply',
      userId: 'guest-1',
      maxActions: 3,
      windowMs: 60 * 1000,
    }));
    expect(databases.createDocument).toHaveBeenCalled();
  });
});
