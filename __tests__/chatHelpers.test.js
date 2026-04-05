jest.mock('appwrite', () => ({
  ID: { unique: jest.fn(() => 'generated-id') },
  Query: {
    equal: jest.fn((field, value) => ({ type: 'equal', field, value })),
    orderDesc: jest.fn((field) => ({ type: 'orderDesc', field })),
    limit: jest.fn((value) => ({ type: 'limit', value })),
    contains: jest.fn((field, value) => ({ type: 'contains', field, value })),
  },
}));

jest.mock('../database/config', () => ({
  databases: {
    listDocuments: jest.fn(),
  },
  config: {
    databaseId: 'test-db',
    chatsCollectionId: 'chats',
  },
}));

jest.mock('../database/chats', () => ({
  CHAT_TYPES: {
    STAGE_GROUP: 'stage_group',
    DEPARTMENT_GROUP: 'department_group',
  },
  createChat: jest.fn(),
  createGroupChat: jest.fn(),
  getUserGroupChats: jest.fn(),
  decryptChatPreviews: jest.fn((value) => value),
  ensureChatParticipant: jest.fn(),
}));

jest.mock('../database/users', () => ({
  getUserById: jest.fn(),
}));

jest.mock('../app/utils/cacheManager', () => ({
  chatsCacheManager: {
    generateCacheKey: jest.fn(() => 'chat-cache-key'),
    getCachedChats: jest.fn().mockResolvedValue(null),
    cacheChats: jest.fn(),
  },
}));

const flushPromises = () => new Promise((resolve) => setImmediate(resolve));

describe('initializeUserGroups', () => {
  const { databases } = require('../database/config');
  const chatsModule = require('../database/chats');
  const { initializeUserGroups } = require('../database/chatHelpers');

  beforeEach(() => {
    jest.clearAllMocks();
    databases.listDocuments.mockResolvedValue({
      documents: [{ $id: 'existing-group' }],
    });
  });

  it('skips membership writes for chats that already contain the user', async () => {
    chatsModule.getUserGroupChats.mockResolvedValue([
      { $id: 'chat-1', participants: ['user-1'] },
      { $id: 'chat-2', participants: ['someone-else'] },
    ]);
    chatsModule.ensureChatParticipant.mockResolvedValue({
      $id: 'chat-2',
      participants: ['someone-else', 'user-1'],
    });

    const result = await initializeUserGroups('CS', '2', 'user-1');

    expect(chatsModule.ensureChatParticipant).toHaveBeenCalledTimes(1);
    expect(chatsModule.ensureChatParticipant).toHaveBeenCalledWith('chat-2', 'user-1');
    expect(result.allChats).toEqual([
      { $id: 'chat-1', participants: ['user-1'] },
      { $id: 'chat-2', participants: ['someone-else', 'user-1'] },
    ]);
  });

  it('dedupes duplicate chat IDs and falls back to the original chat when ensure returns null', async () => {
    const duplicatedChat = { $id: 'chat-dup', participants: [] };
    chatsModule.getUserGroupChats.mockResolvedValue([
      duplicatedChat,
      duplicatedChat,
      { $id: 'chat-ok', participants: [] },
    ]);
    chatsModule.ensureChatParticipant
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ $id: 'chat-ok', participants: ['user-1'] });

    const result = await initializeUserGroups('CS', '2', 'user-1');

    expect(chatsModule.ensureChatParticipant).toHaveBeenCalledTimes(2);
    expect(result.allChats).toEqual([
      duplicatedChat,
      duplicatedChat,
      { $id: 'chat-ok', participants: ['user-1'] },
    ]);
  });

  it('ensures missing memberships concurrently with a bounded in-flight cap', async () => {
    const totalChats = 6;
    let activeCount = 0;
    let maxActiveCount = 0;
    const releaseQueue = [];

    chatsModule.getUserGroupChats.mockResolvedValue(
      Array.from({ length: totalChats }, (_, index) => ({
        $id: `chat-${index + 1}`,
        participants: [],
      }))
    );

    chatsModule.ensureChatParticipant.mockImplementation(async (chatId, userId) => {
      activeCount += 1;
      maxActiveCount = Math.max(maxActiveCount, activeCount);

      await new Promise((resolve) => {
        releaseQueue.push(() => {
          activeCount -= 1;
          resolve();
        });
      });

      return { $id: chatId, participants: [userId] };
    });

    const pendingInitialization = initializeUserGroups('CS', '2', 'user-1');

    await flushPromises();
    expect(chatsModule.ensureChatParticipant).toHaveBeenCalledTimes(4);
    expect(maxActiveCount).toBe(4);

    while (releaseQueue.length > 0) {
      const release = releaseQueue.shift();
      release();
      await flushPromises();
    }

    const result = await pendingInitialization;

    expect(result.allChats).toHaveLength(totalChats);
    expect(chatsModule.ensureChatParticipant).toHaveBeenCalledTimes(totalChats);
    expect(maxActiveCount).toBe(4);
  });
});

describe('createPrivateChat guest restrictions', () => {
  const { databases } = require('../database/config');
  const chatsModule = require('../database/chats');
  const usersModule = require('../database/users');
  const { createPrivateChat } = require('../database/chatHelpers');

  beforeEach(() => {
    jest.clearAllMocks();
    databases.listDocuments.mockResolvedValue({ documents: [] });
    chatsModule.createChat.mockResolvedValue({ $id: 'chat-new' });
  });

  it('blocks guest chat creation when users are not mutual friends', async () => {
    usersModule.getUserById
      .mockResolvedValueOnce({
        $id: 'guest-1',
        role: 'guest',
        name: 'Guest One',
        following: [],
        followers: [],
      })
      .mockResolvedValueOnce({
        $id: 'student-1',
        role: 'student',
        name: 'Student One',
        following: [],
        followers: [],
      });

    await expect(
      createPrivateChat(
        { $id: 'guest-1', name: 'Guest One' },
        { $id: 'student-1', name: 'Student One' }
      )
    ).rejects.toMatchObject({ code: 'GUEST_CHAT_RESTRICTED' });

    expect(chatsModule.createChat).not.toHaveBeenCalled();
  });

  it('blocks guest chat creation when only one user follows back', async () => {
    usersModule.getUserById
      .mockResolvedValueOnce({
        $id: 'guest-1',
        role: 'guest',
        name: 'Guest One',
        following: ['student-1'],
        followers: [],
      })
      .mockResolvedValueOnce({
        $id: 'student-1',
        role: 'student',
        name: 'Student One',
        following: [],
        followers: ['guest-1'],
      });

    await expect(
      createPrivateChat(
        { $id: 'guest-1', name: 'Guest One' },
        { $id: 'student-1', name: 'Student One' }
      )
    ).rejects.toMatchObject({ code: 'GUEST_CHAT_RESTRICTED' });

    expect(chatsModule.createChat).not.toHaveBeenCalled();
  });

  it('allows guest chat creation when both users are mutual friends', async () => {
    usersModule.getUserById
      .mockResolvedValueOnce({
        $id: 'guest-1',
        role: 'guest',
        name: 'Guest One',
        following: ['student-1'],
        followers: ['student-1'],
      })
      .mockResolvedValueOnce({
        $id: 'student-1',
        role: 'student',
        name: 'Student One',
        following: ['guest-1'],
        followers: ['guest-1'],
      });

    const result = await createPrivateChat(
      { $id: 'guest-1', name: 'Guest One' },
      { $id: 'student-1', name: 'Student One' }
    );

    expect(chatsModule.createChat).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({ $id: 'chat-new' });
  });
});

describe('createCustomGroup guest restrictions', () => {
  const chatsModule = require('../database/chats');
  const usersModule = require('../database/users');
  const { createCustomGroup } = require('../database/chatHelpers');

  beforeEach(() => {
    jest.clearAllMocks();
    chatsModule.createChat.mockResolvedValue({ $id: 'group-new' });
  });

  it('blocks group creation for guest creators', async () => {
    usersModule.getUserById.mockResolvedValueOnce({
      $id: 'guest-1',
      role: 'guest',
      name: 'Guest One',
      following: [],
      followers: [],
    });

    await expect(
      createCustomGroup({ name: 'Study Team', members: ['student-1'] }, 'guest-1')
    ).rejects.toMatchObject({ code: 'GUEST_GROUP_CHAT_RESTRICTED' });

    expect(chatsModule.createChat).not.toHaveBeenCalled();
  });

  it('creates group for non-guest creators and ensures creator is a participant', async () => {
    usersModule.getUserById.mockResolvedValueOnce({
      $id: 'student-1',
      role: 'student',
      name: 'Student One',
      following: [],
      followers: [],
    });

    const result = await createCustomGroup(
      {
        name: 'Project Team',
        members: ['student-2'],
      },
      'student-1'
    );

    expect(chatsModule.createChat).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Project Team',
      participants: expect.arrayContaining(['student-1', 'student-2']),
      representatives: ['student-1'],
      admins: ['student-1'],
    }));
    expect(result).toMatchObject({ $id: 'group-new' });
  });
});