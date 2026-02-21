import { account, databases, storage, config } from './config';
import { Query } from 'appwrite';
import { getLectureChannelById } from './lectures';

const sanitizeText = (value = '') => String(value || '').trim();

const listAllDocuments = async (collectionId, queries = []) => {
  const all = [];
  let offset = 0;
  const pageSize = 100;

  while (true) {
    const result = await databases.listDocuments(
      config.databaseId,
      collectionId,
      [
        ...queries,
        Query.limit(pageSize),
        Query.offset(offset),
      ]
    );

    const docs = Array.isArray(result?.documents) ? result.documents : [];
    all.push(...docs);

    if (docs.length < pageSize) {
      break;
    }

    offset += docs.length;
  }

  return all;
};

const safeParseJson = (value) => {
  const raw = String(value || '').trim();
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

export const deleteLectureChannelWithCleanup = async (channelId) => {
  if (!config.databaseId || !config.lectureChannelsCollectionId || !config.lectureAssetsCollectionId || !config.lectureMembershipsCollectionId) {
    throw new Error('Lecture collections are not configured');
  }

  const normalizedChannelId = sanitizeText(channelId);
  if (!normalizedChannelId) {
    throw new Error('Invalid channel ID');
  }

  const currentUser = await account.get();
  const currentUserId = sanitizeText(currentUser?.$id);
  if (!currentUserId) {
    throw new Error('Authentication required');
  }

  const channel = await getLectureChannelById(normalizedChannelId);
  if (sanitizeText(channel?.ownerId) !== currentUserId) {
    throw new Error('Only channel owner can delete this channel');
  }

  const assets = await listAllDocuments(config.lectureAssetsCollectionId, [
    Query.equal('channelId', normalizedChannelId),
  ]);
  const assetIds = new Set(assets.map(asset => sanitizeText(asset?.$id)).filter(Boolean));

  const comments = config.lectureCommentsCollectionId
    ? await listAllDocuments(config.lectureCommentsCollectionId, [
      Query.equal('channelId', normalizedChannelId),
    ])
    : [];

  const memberships = await listAllDocuments(config.lectureMembershipsCollectionId, [
    Query.equal('channelId', normalizedChannelId),
  ]);

  const notifications = config.notificationsCollectionId
    ? await listAllDocuments(config.notificationsCollectionId, [
      Query.equal('postId', normalizedChannelId),
      Query.equal('type', 'lecture_upload'),
    ])
    : [];

  const linkedChatId = sanitizeText(channel?.linkedChatId);
  let linkedChatMessages = [];

  if (linkedChatId && config.messagesCollectionId) {
    linkedChatMessages = await listAllDocuments(config.messagesCollectionId, [
      Query.equal('chatId', linkedChatId),
      Query.equal('type', 'lecture_asset_banner'),
    ]);
  }

  const messagesToDelete = linkedChatMessages.filter((message) => {
    const parsed = safeParseJson(message?.content);
    if (parsed) {
      const messageChannelId = sanitizeText(parsed?.channelId);
      const messageAssetId = sanitizeText(parsed?.assetId);
      return messageChannelId === normalizedChannelId || assetIds.has(messageAssetId);
    }

    return !!linkedChatId;
  });

  await Promise.all(
    assets.map(async (asset) => {
      const uploadType = sanitizeText(asset?.uploadType);
      const fileId = sanitizeText(asset?.fileId);

      if (uploadType === 'file' && fileId && config.lectureStorageId) {
        try {
          await storage.deleteFile(config.lectureStorageId, fileId);
        } catch {
        }
      }
    })
  );

  await Promise.all(
    comments.map(async (comment) => {
      const commentId = sanitizeText(comment?.$id);
      if (!commentId) {
        return;
      }

      await databases.deleteDocument(
        config.databaseId,
        config.lectureCommentsCollectionId,
        commentId
      );
    })
  );

  await Promise.all(
    messagesToDelete.map(async (message) => {
      const messageId = sanitizeText(message?.$id);
      if (!messageId) {
        return;
      }

      await databases.deleteDocument(
        config.databaseId,
        config.messagesCollectionId,
        messageId
      );
    })
  );

  await Promise.all(
    assets.map(async (asset) => {
      const assetId = sanitizeText(asset?.$id);
      if (!assetId) {
        return;
      }

      await databases.deleteDocument(
        config.databaseId,
        config.lectureAssetsCollectionId,
        assetId
      );
    })
  );

  await Promise.all(
    memberships.map(async (membership) => {
      const membershipId = sanitizeText(membership?.$id);
      if (!membershipId) {
        return;
      }

      await databases.deleteDocument(
        config.databaseId,
        config.lectureMembershipsCollectionId,
        membershipId
      );
    })
  );

  await Promise.all(
    notifications.map(async (notification) => {
      const notificationId = sanitizeText(notification?.$id);
      if (!notificationId) {
        return;
      }

      await databases.deleteDocument(
        config.databaseId,
        config.notificationsCollectionId,
        notificationId
      );
    })
  );

  await databases.deleteDocument(
    config.databaseId,
    config.lectureChannelsCollectionId,
    normalizedChannelId
  );

  return {
    success: true,
    deleted: {
      assets: assets.length,
      comments: comments.length,
      memberships: memberships.length,
      linkedMessages: messagesToDelete.length,
      notifications: notifications.length,
    },
  };
};
