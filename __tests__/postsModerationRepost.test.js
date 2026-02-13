import { createRepost, getPost, reportPost, requestPostReview } from '../database/posts';
import { databases } from '../database/config';
import { notifyPostHiddenByReports } from '../database/notifications';

jest.mock('appwrite', () => ({
  ID: {
    unique: jest.fn(() => 'new-doc-id'),
  },
  Query: {
    equal: jest.fn((field, value) => ({ op: 'equal', field, value })),
    limit: jest.fn((value) => ({ op: 'limit', value })),
    offset: jest.fn((value) => ({ op: 'offset', value })),
    orderAsc: jest.fn((field) => ({ op: 'orderAsc', field })),
    orderDesc: jest.fn((field) => ({ op: 'orderDesc', field })),
    contains: jest.fn((field, value) => ({ op: 'contains', field, value })),
  },
}));

jest.mock('../database/config', () => ({
  databases: {
    createDocument: jest.fn(),
    getDocument: jest.fn(),
    listDocuments: jest.fn(),
    updateDocument: jest.fn(),
    deleteDocument: jest.fn(),
  },
  storage: {},
  config: {
    databaseId: 'db',
    postsCollectionId: 'posts',
    repliesCollectionId: 'replies',
    postReportsCollectionId: 'postReports',
    reportReviewWebhookUrl: 'https://example.com/report-webhook',
  },
}));

jest.mock('../database/notifications', () => ({
  notifyDepartmentPost: jest.fn(() => Promise.resolve()),
  notifyPostHiddenByReports: jest.fn(() => Promise.resolve()),
}));

jest.mock('../app/utils/cacheManager', () => ({
  postsCacheManager: {
    generateCacheKey: jest.fn(() => 'cache-key'),
    getCachedPosts: jest.fn(() => Promise.resolve(null)),
    cachePosts: jest.fn(() => Promise.resolve()),
    invalidatePostsCache: jest.fn(() => Promise.resolve()),
    invalidateSinglePost: jest.fn(() => Promise.resolve()),
  },
}));

jest.mock('../app/utils/networkErrorHandler', () => ({
  handleNetworkError: jest.fn(() => ({
    isNetworkError: false,
    messageKey: 'error.genericError',
    fallbackMessage: 'Error',
  })),
}));

jest.mock('../database/users', () => ({
  getUserById: jest.fn(() => Promise.resolve(null)),
}));

describe('posts moderation and repost flows', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn(() => Promise.resolve({ ok: true }));
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it('hides post when moderation score or report count threshold is reached and views are less than 20', async () => {
    databases.getDocument.mockResolvedValue({
      $id: 'post-1',
      userId: 'owner-1',
      topic: 'Topic',
      text: 'Body',
      reportedBy: ['u1', 'u2', 'u3', 'u4'],
      reportReasons: ['spam'],
      viewCount: 8,
      isHidden: false,
    });
    databases.updateDocument.mockResolvedValue({});

    const result = await reportPost('post-1', 'u5', 'spam');

    expect(databases.updateDocument).toHaveBeenCalledWith(
      'db',
      'posts',
      'post-1',
      expect.objectContaining({
        reportCount: 5,
        isHidden: true,
      })
    );
    expect(notifyPostHiddenByReports).toHaveBeenCalledTimes(1);
    expect(result.isHidden).toBe(true);
  });

  it('does not hide post when views are 20 or more', async () => {
    databases.getDocument.mockResolvedValue({
      $id: 'post-2',
      userId: 'owner-2',
      reportedBy: ['u1', 'u2', 'u3', 'u4'],
      reportReasons: [],
      viewCount: 20,
      isHidden: false,
    });
    databases.updateDocument.mockResolvedValue({});

    const result = await reportPost('post-2', 'u5', 'misinformation');

    expect(databases.updateDocument).toHaveBeenCalledWith(
      'db',
      'posts',
      'post-2',
      expect.objectContaining({
        reportCount: 5,
        isHidden: false,
      })
    );
    expect(notifyPostHiddenByReports).not.toHaveBeenCalled();
    expect(result.isHidden).toBe(false);
  });

  it('treats dont_like as feedback and does not count as moderation report', async () => {
    databases.getDocument.mockResolvedValue({
      $id: 'post-3',
      userId: 'owner-3',
      reportCount: 2,
      reportedBy: ['u1', 'u2'],
      viewCount: 3,
      isHidden: false,
    });
    databases.createDocument.mockResolvedValue({ $id: 'feedback-1' });

    const result = await reportPost('post-3', 'u5', 'dont_like');

    expect(result.treatedAsFeedback).toBe(true);
    expect(result.reportCount).toBe(2);
    expect(databases.createDocument).toHaveBeenCalledWith(
      'db',
      'postReports',
      'new-doc-id',
      expect.objectContaining({
        reason: 'dont_like',
      })
    );
  });

  it('prevents repost when original disallows reposts for others', async () => {
    databases.getDocument.mockResolvedValue({
      $id: 'orig-1',
      userId: 'owner-1',
      canOthersRepost: false,
      isHidden: false,
      topic: 'T',
      text: 'B',
      department: 'd',
      stage: 'stage_1',
      postType: 'discussion',
    });

    await expect(createRepost('orig-1', 'other-user', {})).rejects.toThrow(
      'Repost is not allowed for this post'
    );
  });

  it('creates repost and links back to root original post', async () => {
    databases.getDocument.mockResolvedValue({
      $id: 'orig-2',
      userId: 'owner-2',
      canOthersRepost: true,
      isHidden: false,
      topic: 'Original topic',
      text: 'Original body',
      department: 'public',
      stage: 'stage_2',
      postType: 'discussion',
      repostCount: 0,
    });

    databases.listDocuments.mockResolvedValueOnce({ documents: [] });
    databases.createDocument.mockResolvedValueOnce({ $id: 'repost-1' });
    databases.updateDocument.mockResolvedValue({});

    const result = await createRepost('orig-2', 'user-2', {
      userName: 'User 2',
      profilePicture: null,
    });

    expect(result.success).toBe(true);
    expect(databases.createDocument).toHaveBeenCalledWith(
      'db',
      'posts',
      'new-doc-id',
      expect.objectContaining({
        isRepost: true,
        originalPostId: 'orig-2',
        originalPostOwnerId: 'owner-2',
      })
    );
  });

  it('blocks hidden posts for non-owners in getPost', async () => {
    databases.getDocument.mockResolvedValue({
      $id: 'post-4',
      userId: 'owner-4',
      isHidden: true,
    });

    await expect(getPost('post-4', 'viewer-1')).rejects.toThrow('Post not found');
  });

  it('allows hidden posts for owner in getPost', async () => {
    const hiddenPost = {
      $id: 'post-5',
      userId: 'owner-5',
      isHidden: true,
    };
    databases.getDocument.mockResolvedValue(hiddenPost);

    await expect(getPost('post-5', 'owner-5')).resolves.toEqual(hiddenPost);
  });

  it('sends review request webhook for hidden post by owner', async () => {
    databases.getDocument.mockResolvedValue({
      $id: 'post-6',
      userId: 'owner-6',
      isHidden: true,
      reportCount: 5,
      viewCount: 2,
      likeCount: 0,
      replyCount: 0,
      topic: 'Need review',
      reviewRequestedAt: null,
    });
    databases.updateDocument.mockResolvedValue({});

    const result = await requestPostReview('post-6', 'owner-6');

    expect(result.success).toBe(true);
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(databases.updateDocument).toHaveBeenCalledWith(
      'db',
      'posts',
      'post-6',
      expect.objectContaining({
        reviewRequestedBy: 'owner-6',
      })
    );
  });
});
