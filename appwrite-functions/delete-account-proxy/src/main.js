import { Client, Account, Databases, Users, Query } from 'node-appwrite';

const LIST_LIMIT = 100;
const DELETED_ACCOUNT_NAME = 'Deleted Account';
const DELETED_CHAT_MARKER = '[deleted_chat]';
const DELETED_MESSAGE_MARKER = '[deleted_message]';
const DELETED_MESSAGE_SENDER_ID = 'deleted_user';

const json = (res, status, payload) => res.json(payload, status);

const parseBody = (req) => {
  if (req.body && typeof req.body === 'object') {
    return req.body;
  }

  const rawCandidates = [req.bodyText, req.bodyRaw, req.body];
  for (const raw of rawCandidates) {
    if (typeof raw !== 'string' || !raw.trim()) {
      continue;
    }

    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  return {};
};

const getHeader = (headers, name) => {
  if (!headers || typeof headers !== 'object') {
    return '';
  }

  const target = String(name || '').toLowerCase();
  const key = Object.keys(headers).find((item) => item.toLowerCase() === target);
  return key ? String(headers[key] || '').trim() : '';
};

const getEnv = (...keys) => {
  for (const key of keys) {
    const value = process.env[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  return '';
};

const isNotFoundError = (err) => {
  const code = Number(err?.code ?? err?.response?.code ?? 0);
  const type = String(err?.type ?? err?.response?.type ?? '').toLowerCase();
  const message = `${String(err?.message ?? '')} ${String(err?.response?.message ?? '')}`.toLowerCase();
  return code === 404 || type.includes('not_found') || message.includes('not found');
};

const normalizeIds = (...values) => {
  const result = new Set();

  values.flat().forEach((value) => {
    const normalized = String(value || '').trim();
    if (normalized) {
      result.add(normalized);
    }
  });

  return [...result];
};

const runPaginatedList = async ({ db, databaseId, collectionId, baseQueries, onDocument }) => {
  let cursorAfter = null;

  while (true) {
    const queries = [
      ...(Array.isArray(baseQueries) ? baseQueries : []),
      Query.orderAsc('$id'),
      Query.limit(LIST_LIMIT),
    ];

    if (cursorAfter) {
      queries.push(Query.cursorAfter(cursorAfter));
    }

    const response = await db.listDocuments(databaseId, collectionId, queries);

    const documents = Array.isArray(response?.documents) ? response.documents : [];
    if (documents.length === 0) {
      break;
    }

    for (const document of documents) {
      await onDocument(document);
    }

    if (documents.length < LIST_LIMIT) {
      break;
    }

    cursorAfter = documents[documents.length - 1]?.$id || null;
    if (!cursorAfter) {
      break;
    }
  }
};

const deleteDocumentsByQueries = async ({ db, databaseId, collectionId, baseQueries, stats, statsKey }) => {
  await runPaginatedList({
    db,
    databaseId,
    collectionId,
    baseQueries,
    onDocument: async (document) => {
      await db.deleteDocument(databaseId, collectionId, document.$id);

      stats[statsKey] = (stats[statsKey] || 0) + 1;
    },
  });
};

const resolveProfileDocument = async ({ db, databaseId, usersCollectionId, userId }) => {
  try {
    return await db.getDocument(databaseId, usersCollectionId, userId);
  } catch {
  }

  const candidates = ['userId', 'userID', 'accountId'];
  for (const fieldName of candidates) {
    try {
      const listed = await db.listDocuments(databaseId, usersCollectionId, [
          Query.equal(fieldName, [userId]),
          Query.orderAsc('$id'),
          Query.limit(1),
        ]);

      const profile = listed?.documents?.[0] || null;
      if (profile) {
        return profile;
      }
    } catch {
    }
  }

  return null;
};

const removeIdentityFromChats = async ({
  db,
  databaseId,
  chatsCollectionId,
  messagesCollectionId,
  userChatSettingsCollectionId,
  identityIds,
  candidateChatIds,
  deletedChatIds,
  stats,
}) => {
  const idsSet = new Set(identityIds);

  for (const chatId of candidateChatIds) {
    let chat = null;
    try {
      chat = await db.getDocument(databaseId, chatsCollectionId, chatId);
    } catch {
      continue;
    }

    const currentParticipants = Array.isArray(chat.participants) ? chat.participants : [];
    const currentAdmins = Array.isArray(chat.admins) ? chat.admins : [];
    const currentRepresentatives = Array.isArray(chat.representatives) ? chat.representatives : [];

    const nextParticipants = currentParticipants.filter((value) => !idsSet.has(String(value || '').trim()));
    const nextAdmins = currentAdmins.filter((value) => !idsSet.has(String(value || '').trim()));
    const nextRepresentatives = currentRepresentatives.filter((value) => !idsSet.has(String(value || '').trim()));

    const lastMessageSenderId = String(chat.lastMessageSenderId || '').trim();
    const clearLastSender = idsSet.has(lastMessageSenderId);

    const changed =
      nextParticipants.length !== currentParticipants.length
      || nextAdmins.length !== currentAdmins.length
      || nextRepresentatives.length !== currentRepresentatives.length
      || clearLastSender;

    const isPrivateChat = String(chat.type || '').toLowerCase() === 'private';
    const shouldDeleteChat = nextParticipants.length === 0 || (isPrivateChat && nextParticipants.length < 2);

    if (shouldDeleteChat) {
      await deleteDocumentsByQueries({
        db,
        databaseId,
        collectionId: messagesCollectionId,
        baseQueries: [Query.equal('chatId', [chat.$id])],
        stats,
        statsKey: 'messagesDeleted',
      });

      await deleteDocumentsByQueries({
        db,
        databaseId,
        collectionId: userChatSettingsCollectionId,
        baseQueries: [Query.equal('chatId', [chat.$id])],
        stats,
        statsKey: 'userChatSettingsDeleted',
      });

      await db.deleteDocument(databaseId, chatsCollectionId, chat.$id);
      deletedChatIds.add(chat.$id);
      stats.chatsDeleted = (stats.chatsDeleted || 0) + 1;
      continue;
    }

    if (!changed) {
      continue;
    }

    await db.updateDocument(databaseId, chatsCollectionId, chat.$id, {
        participants: nextParticipants,
        admins: nextAdmins,
        representatives: nextRepresentatives,
        ...(clearLastSender ? { lastMessageSenderId: '' } : {}),
    });

    stats.chatsUpdated = (stats.chatsUpdated || 0) + 1;
  }
};

const recomputeChatMetadata = async ({
  db,
  databaseId,
  chatsCollectionId,
  messagesCollectionId,
  chatIds,
  deletedMessageMarker,
  stats,
}) => {
  for (const chatId of chatIds) {
    const latestResponse = await db.listDocuments(databaseId, messagesCollectionId, [
        Query.equal('chatId', [chatId]),
        Query.orderDesc('$createdAt'),
        Query.limit(1),
      ]);

    const total = Number(latestResponse?.total || 0);
    const latest = latestResponse?.documents?.[0] || null;

    const nextData = {
      messageCount: Math.max(0, total),
      lastMessage: latest ? String(latest.content || '') : deletedMessageMarker,
      lastMessageAt: latest ? latest.$createdAt : null,
      lastMessageSenderId: latest ? String(latest.senderId || '') : '',
    };

    await db.updateDocument(databaseId, chatsCollectionId, chatId, nextData);

    stats.chatsMetadataRecomputed = (stats.chatsMetadataRecomputed || 0) + 1;
  }
};

const removeIdentityFromUserArrays = async ({
  db,
  databaseId,
  usersCollectionId,
  identityIds,
  stats,
}) => {
  const idsSet = new Set(identityIds);
  const targetDocuments = new Map();

  for (const fieldName of ['followers', 'following', 'blockedUsers']) {
    for (const identityId of identityIds) {
      await runPaginatedList({
        db,
        databaseId,
        collectionId: usersCollectionId,
        baseQueries: [Query.contains(fieldName, [identityId])],
        onDocument: async (document) => {
          targetDocuments.set(document.$id, document);
        },
      });
    }
  }

  for (const document of targetDocuments.values()) {
    const followers = Array.isArray(document.followers) ? document.followers : [];
    const following = Array.isArray(document.following) ? document.following : [];
    const blockedUsers = Array.isArray(document.blockedUsers) ? document.blockedUsers : [];

    const nextFollowers = followers.filter((value) => !idsSet.has(String(value || '').trim()));
    const nextFollowing = following.filter((value) => !idsSet.has(String(value || '').trim()));
    const nextBlockedUsers = blockedUsers.filter((value) => !idsSet.has(String(value || '').trim()));

    const changed =
      nextFollowers.length !== followers.length
      || nextFollowing.length !== following.length
      || nextBlockedUsers.length !== blockedUsers.length;

    if (!changed) {
      continue;
    }

    await db.updateDocument(databaseId, usersCollectionId, document.$id, {
        followers: nextFollowers,
        following: nextFollowing,
        blockedUsers: nextBlockedUsers,
        followersCount: nextFollowers.length,
        followingCount: nextFollowing.length,
    });

    stats.usersSocialCleaned = (stats.usersSocialCleaned || 0) + 1;
  }
};

export default async ({ req, res, log, error }) => {
  const stats = {
    postsDeleted: 0,
    repliesDeleted: 0,
    messagesDeleted: 0,
    chatsDeleted: 0,
    notificationsDeleted: 0,
    pushTokensDeleted: 0,
    userChatSettingsDeleted: 0,
    lectureMembershipsDeleted: 0,
    lectureAssetsDeleted: 0,
    lectureCommentsDeleted: 0,
    repVotesDeleted: 0,
    suggestionsDeleted: 0,
    chatsUpdated: 0,
    chatsMetadataRecomputed: 0,
    usersSocialCleaned: 0,
    userDocumentsDeleted: 0,
    authUsersDeleted: 0,
  };

  try {
    if (req.method !== 'POST') {
      return json(res, 405, { success: false, error: 'Method not allowed' });
    }

    const rawBody = parseBody(req);
    if (rawBody === null || typeof rawBody !== 'object') {
      return json(res, 400, { success: false, error: 'Invalid JSON body' });
    }

    const action = String(rawBody.action || '').trim();
    if (action !== 'delete_account') {
      return json(res, 400, { success: false, error: 'Invalid action' });
    }

    const authHeader = getHeader(req.headers, 'authorization');
    const bodyToken = String(rawBody.authToken || '').trim();
    const jwt = authHeader.startsWith('Bearer ')
      ? authHeader.slice('Bearer '.length).trim()
      : bodyToken;

    if (!jwt) {
      return json(res, 401, { success: false, error: 'Invalid bearer token' });
    }

    const endpoint = getEnv('APPWRITE_ENDPOINT', 'EXPO_PUBLIC_APPWRITE_ENDPOINT');
    const projectId = getEnv('APPWRITE_PROJECT_ID', 'EXPO_PUBLIC_APPWRITE_PROJECT_ID');
    const apiKey = getEnv('APPWRITE_API_KEY', 'APPWRITE_FUNCTION_API_KEY', 'EXPO_PUBLIC_APPWRITE_API_KEY');

    const databaseId = getEnv('APPWRITE_DATABASE_ID', 'EXPO_PUBLIC_APPWRITE_DATABASE_ID');
    const usersCollectionId = getEnv('APPWRITE_USERS_COLLECTION_ID', 'EXPO_PUBLIC_APPWRITE_USERS_COLLECTION_ID');
    const postsCollectionId = getEnv('APPWRITE_POSTS_COLLECTION_ID', 'EXPO_PUBLIC_APPWRITE_POSTS_COLLECTION_ID');
    const repliesCollectionId = getEnv('APPWRITE_REPLIES_COLLECTION_ID', 'EXPO_PUBLIC_APPWRITE_REPLIES_COLLECTION_ID');
    const chatsCollectionId = getEnv('APPWRITE_CHATS_COLLECTION_ID', 'EXPO_PUBLIC_APPWRITE_CHATS_COLLECTION_ID');
    const messagesCollectionId = getEnv('APPWRITE_MESSAGES_COLLECTION_ID', 'EXPO_PUBLIC_APPWRITE_MESSAGES_COLLECTION_ID');
    const userChatSettingsCollectionId = getEnv('APPWRITE_USER_CHAT_SETTINGS_COLLECTION_ID', 'EXPO_PUBLIC_APPWRITE_USER_CHAT_SETTINGS_COLLECTION_ID');
    const notificationsCollectionId = getEnv('APPWRITE_NOTIFICATIONS_COLLECTION_ID', 'EXPO_PUBLIC_APPWRITE_NOTIFICATIONS_COLLECTION_ID');
    const pushTokensCollectionId = getEnv('APPWRITE_PUSH_TOKENS_COLLECTION_ID', 'EXPO_PUBLIC_APPWRITE_PUSH_TOKENS_COLLECTION_ID');
    const lectureMembershipsCollectionId = getEnv('APPWRITE_LECTURE_MEMBERSHIPS_COLLECTION_ID', 'EXPO_PUBLIC_APPWRITE_LECTURE_MEMBERSHIPS_COLLECTION_ID');
    const lectureAssetsCollectionId = getEnv('APPWRITE_LECTURE_ASSETS_COLLECTION_ID', 'EXPO_PUBLIC_APPWRITE_LECTURE_ASSETS_COLLECTION_ID');
    const lectureCommentsCollectionId = getEnv('APPWRITE_LECTURE_COMMENTS_COLLECTION_ID', 'EXPO_PUBLIC_APPWRITE_LECTURE_COMMENTS_COLLECTION_ID');
    const repVotesCollectionId = getEnv('APPWRITE_REP_VOTES_COLLECTION_ID', 'EXPO_PUBLIC_APPWRITE_REP_VOTES_COLLECTION_ID');
    const suggestionsCollectionId = getEnv('APPWRITE_SUGGESTIONS_COLLECTION_ID', 'EXPO_PUBLIC_APPWRITE_SUGGESTIONS_COLLECTION_ID');

    if (
      !endpoint
      || !projectId
      || !apiKey
      || !databaseId
      || !usersCollectionId
      || !postsCollectionId
      || !repliesCollectionId
      || !chatsCollectionId
      || !messagesCollectionId
      || !userChatSettingsCollectionId
      || !notificationsCollectionId
      || !pushTokensCollectionId
      || !lectureMembershipsCollectionId
      || !lectureAssetsCollectionId
      || !lectureCommentsCollectionId
      || !repVotesCollectionId
      || !suggestionsCollectionId
    ) {
      return json(res, 500, { success: false, error: 'Function env is not configured' });
    }

    const authClient = new Client()
      .setEndpoint(endpoint)
      .setProject(projectId)
      .setJWT(jwt);

    const account = new Account(authClient);
    const authUser = await account.get();
    const authUserId = String(authUser?.$id || '').trim();

    if (!authUserId) {
      return json(res, 401, { success: false, error: 'Unauthorized' });
    }

    const serviceClient = new Client()
      .setEndpoint(endpoint)
      .setProject(projectId)
      .setKey(apiKey);

    const db = new Databases(serviceClient);
    const users = new Users(serviceClient);

    const profileDoc = await resolveProfileDocument({
      db,
      databaseId,
      usersCollectionId,
      userId: authUserId,
    });

    const identityIds = normalizeIds(
      authUserId,
      profileDoc?.$id,
      profileDoc?.userId,
      profileDoc?.userID,
      profileDoc?.accountId,
    );

    const affectedChatIds = new Set();
    const deletedChatIds = new Set();

    await runPaginatedList({
      db,
      databaseId,
      collectionId: postsCollectionId,
      baseQueries: [Query.equal('userId', identityIds)],
      onDocument: async (post) => {
        await deleteDocumentsByQueries({
          db,
          databaseId,
          collectionId: repliesCollectionId,
          baseQueries: [Query.equal('postId', [post.$id])],
          stats,
          statsKey: 'repliesDeleted',
        });

        await deleteDocumentsByQueries({
          db,
          databaseId,
          collectionId: notificationsCollectionId,
          baseQueries: [Query.equal('postId', [post.$id])],
          stats,
          statsKey: 'notificationsDeleted',
        });

        await db.deleteDocument(databaseId, postsCollectionId, post.$id);
        stats.postsDeleted += 1;
      },
    });

    await deleteDocumentsByQueries({
      db,
      databaseId,
      collectionId: repliesCollectionId,
      baseQueries: [Query.equal('userId', identityIds)],
      stats,
      statsKey: 'repliesDeleted',
    });

    await deleteDocumentsByQueries({
      db,
      databaseId,
      collectionId: lectureCommentsCollectionId,
      baseQueries: [Query.equal('userId', identityIds)],
      stats,
      statsKey: 'lectureCommentsDeleted',
    });

    await deleteDocumentsByQueries({
      db,
      databaseId,
      collectionId: lectureAssetsCollectionId,
      baseQueries: [Query.equal('uploaderId', identityIds)],
      stats,
      statsKey: 'lectureAssetsDeleted',
    });

    await deleteDocumentsByQueries({
      db,
      databaseId,
      collectionId: lectureMembershipsCollectionId,
      baseQueries: [Query.equal('userId', identityIds)],
      stats,
      statsKey: 'lectureMembershipsDeleted',
    });

    await deleteDocumentsByQueries({
      db,
      databaseId,
      collectionId: userChatSettingsCollectionId,
      baseQueries: [Query.equal('userId', identityIds)],
      stats,
      statsKey: 'userChatSettingsDeleted',
    });

    await deleteDocumentsByQueries({
      db,
      databaseId,
      collectionId: pushTokensCollectionId,
      baseQueries: [Query.equal('userId', identityIds)],
      stats,
      statsKey: 'pushTokensDeleted',
    });

    await deleteDocumentsByQueries({
      db,
      databaseId,
      collectionId: notificationsCollectionId,
      baseQueries: [Query.equal('userId', identityIds)],
      stats,
      statsKey: 'notificationsDeleted',
    });

    await deleteDocumentsByQueries({
      db,
      databaseId,
      collectionId: notificationsCollectionId,
      baseQueries: [Query.equal('senderId', identityIds)],
      stats,
      statsKey: 'notificationsDeleted',
    });

    await deleteDocumentsByQueries({
      db,
      databaseId,
      collectionId: repVotesCollectionId,
      baseQueries: [Query.equal('voterId', identityIds)],
      stats,
      statsKey: 'repVotesDeleted',
    });

    await deleteDocumentsByQueries({
      db,
      databaseId,
      collectionId: repVotesCollectionId,
      baseQueries: [Query.equal('candidateId', identityIds)],
      stats,
      statsKey: 'repVotesDeleted',
    });

    await deleteDocumentsByQueries({
      db,
      databaseId,
      collectionId: suggestionsCollectionId,
      baseQueries: [Query.equal('userId', identityIds)],
      stats,
      statsKey: 'suggestionsDeleted',
    });

    await runPaginatedList({
      db,
      databaseId,
      collectionId: messagesCollectionId,
      baseQueries: [Query.equal('senderId', identityIds)],
      onDocument: async (message) => {
        const chatId = String(message.chatId || '').trim();
        if (chatId) {
          affectedChatIds.add(chatId);
        }

        await db.updateDocument(databaseId, messagesCollectionId, message.$id, {
            senderId: DELETED_MESSAGE_SENDER_ID,
            senderName: DELETED_ACCOUNT_NAME,
            content: DELETED_MESSAGE_MARKER,
            type: 'deleted',
            images: [],
            imageUrl: '',
            replyToId: '',
            replyToContent: '',
            replyToSender: '',
            mentionsAll: false,
            mentions: [],
            reactions: '{}',
        });
        stats.messagesDeleted += 1;
      },
    });

    for (const identityId of identityIds) {
      for (const fieldName of ['participants', 'admins', 'representatives']) {
        await runPaginatedList({
          db,
          databaseId,
          collectionId: chatsCollectionId,
          baseQueries: [Query.contains(fieldName, [identityId])],
          onDocument: async (chat) => {
            affectedChatIds.add(String(chat.$id || ''));
          },
        });
      }

      await runPaginatedList({
        db,
        databaseId,
        collectionId: chatsCollectionId,
        baseQueries: [Query.equal('lastMessageSenderId', [identityId])],
        onDocument: async (chat) => {
          affectedChatIds.add(String(chat.$id || ''));
        },
      });
    }

    await removeIdentityFromChats({
      db,
      databaseId,
      chatsCollectionId,
      messagesCollectionId,
      userChatSettingsCollectionId,
      identityIds,
      candidateChatIds: [...affectedChatIds].filter(Boolean),
      deletedChatIds,
      stats,
    });

    await recomputeChatMetadata({
      db,
      databaseId,
      chatsCollectionId,
      messagesCollectionId,
      chatIds: [...affectedChatIds].filter((chatId) => chatId && !deletedChatIds.has(chatId)),
      deletedMessageMarker: DELETED_CHAT_MARKER,
      stats,
    });

    await removeIdentityFromUserArrays({
      db,
      databaseId,
      usersCollectionId,
      identityIds,
      stats,
    });

    const userDocumentId = String(profileDoc?.$id || authUserId || '').trim();
    if (userDocumentId) {
      try {
        await db.deleteDocument(databaseId, usersCollectionId, userDocumentId);
        stats.userDocumentsDeleted += 1;
      } catch (docError) {
        if (!isNotFoundError(docError)) {
          throw new Error(`USER_DOCUMENT_DELETE_FAILED: ${docError?.message || 'unknown'}`);
        }
      }
    }

    try {
      await users.delete(authUserId);
      stats.authUsersDeleted += 1;
    } catch (deleteUserError) {
      if (!isNotFoundError(deleteUserError)) {
        throw new Error(`AUTH_USER_DELETE_FAILED: ${deleteUserError?.message || 'unknown'}`);
      }
    }

    return json(res, 200, {
      success: true,
      deletedUserId: authUserId,
      stats,
    });
  } catch (functionError) {
    error(functionError?.message || 'delete-account-proxy unknown error');
    return json(res, 500, {
      success: false,
      error: 'Delete account flow failed',
      details: functionError?.message || null,
      stats,
    });
  }
};
