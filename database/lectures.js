import { account, databases, config } from './config';
import { ID, Query, Permission, Role } from 'appwrite';
import * as Linking from 'expo-linking';
import { uploadFileToAppwrite } from '../services/appwriteFileUpload';
import { CHAT_TYPES, getChat, sendMessage } from './chats';
import { createNotification } from './notifications';
import { sendGeneralPushNotification } from '../services/pushNotificationService';
import { extractLectureMentionUserIds, sortLectureAssetsPinnedFirst } from '../app/utils/lectureUtils';

export const LECTURE_CHANNEL_TYPES = {
  OFFICIAL: 'official',
  COMMUNITY: 'community',
};

export const LECTURE_ACCESS_TYPES = {
  APPROVAL_REQUIRED: 'approval_required',
  OPEN: 'open',
};

export const LECTURE_UPLOAD_TYPES = {
  FILE: 'file',
  YOUTUBE: 'youtube',
  LINK: 'link',
};

const logLecturesDb = (event, payload = {}) => {
  console.log('[LecturesDB]', event, payload);
};

const logLecturesDbError = (event, error, payload = {}) => {
  console.error('[LecturesDB]', event, {
    ...payload,
    message: error?.message || String(error),
  });
};

const assertLecturesConfigured = () => {
  if (!config.databaseId) {
    throw new Error('LECTURES_DATABASE_ID_MISSING');
  }

  if (!config.lectureChannelsCollectionId) {
    throw new Error('LECTURES_CHANNELS_COLLECTION_ID_MISSING');
  }

  if (!config.lectureMembershipsCollectionId) {
    throw new Error('LECTURES_MEMBERSHIPS_COLLECTION_ID_MISSING');
  }

  if (!config.lectureAssetsCollectionId) {
    throw new Error('LECTURES_ASSETS_COLLECTION_ID_MISSING');
  }

};

const getCurrentUserId = async () => {
  const currentUser = await account.get();
  const userId = currentUser?.$id;
  if (!userId) {
    throw new Error('Authentication required');
  }
  return userId;
};

const normalizeChannelType = (channelType) => {
  if (channelType === LECTURE_CHANNEL_TYPES.OFFICIAL) {
    return LECTURE_CHANNEL_TYPES.OFFICIAL;
  }
  return LECTURE_CHANNEL_TYPES.COMMUNITY;
};

const normalizeAccessType = (channelType, accessType) => {
  if (normalizeChannelType(channelType) === LECTURE_CHANNEL_TYPES.OFFICIAL) {
    return LECTURE_ACCESS_TYPES.APPROVAL_REQUIRED;
  }

  if (accessType === LECTURE_ACCESS_TYPES.OPEN) {
    return LECTURE_ACCESS_TYPES.OPEN;
  }

  return LECTURE_ACCESS_TYPES.APPROVAL_REQUIRED;
};

const normalizeJoinStatus = (joinStatus) => {
  if (joinStatus === 'approved' || joinStatus === 'rejected') {
    return joinStatus;
  }
  return 'pending';
};

const sanitizeText = (value = '') => {
  return String(value || '').trim();
};

const parseStringList = (value) => {
  if (Array.isArray(value)) {
    return value.filter(Boolean).map(item => sanitizeText(item)).filter(Boolean);
  }

  const raw = sanitizeText(value);
  if (!raw) {
    return [];
  }

  if (raw.startsWith('[') && raw.endsWith(']')) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.filter(Boolean).map(item => sanitizeText(item)).filter(Boolean);
      }
    } catch {
      // Fallback to comma-separated parser
    }
  }

  return raw
    .split(',')
    .map(item => sanitizeText(item))
    .filter(Boolean);
};

const toUniqueList = (items = []) => {
  const output = [];
  const seen = new Set();

  items.forEach((item) => {
    const id = sanitizeText(item);
    if (!id || seen.has(id)) {
      return;
    }

    seen.add(id);
    output.push(id);
  });

  return output;
};

const getManagerIds = (channel) => {
  return toUniqueList(parseStringList(channel?.managerIds));
};

const serializeManagerIds = (managerIds) => {
  return toUniqueList(Array.isArray(managerIds) ? managerIds : [managerIds]).join(',');
};

const invokeLectureGuard = async (action, payload = {}) => {
  const endpoint = sanitizeText(config.lectureGuardEndpoint);
  if (!endpoint) {
    return null;
  }

  const jwt = await account.createJWT();
  const token = jwt?.jwt;
  if (!token) {
    throw new Error('Failed to authorize lecture guard request');
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      action,
      payload,
    }),
  });

  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok || data?.success === false) {
    throw new Error(data?.error || 'Lecture guard request failed');
  }

  return data;
};

const tryInvokeLectureGuard = async (action, payload = {}) => {
  try {
    return await invokeLectureGuard(action, payload);
  } catch (error) {
    const message = sanitizeText(error?.message || '').toLowerCase();
    const shouldFallback =
      message.includes('function env is not configured') ||
      message.includes('lecture guard') ||
      message.includes('failed to fetch') ||
      message.includes('network request failed');

    if (!shouldFallback) {
      throw error;
    }

    logLecturesDb('lectureGuard:fallback', {
      action,
      message: error?.message || 'fallback',
    });

    return null;
  }
};

const parseLectureSettings = (settingsJson) => {
  if (!settingsJson) {
    return {
      allowComments: true,
      allowUploadsFromMembers: false,
      suggestToDepartment: false,
      suggestToStage: false,
      suggestedStage: '',
      suggestedDepartment: '',
    };
  }

  try {
    const parsed = typeof settingsJson === 'string' ? JSON.parse(settingsJson) : settingsJson;
    return {
      allowComments: parsed?.allowComments !== false,
      allowUploadsFromMembers: !!parsed?.allowUploadsFromMembers,
      suggestToDepartment: !!parsed?.suggestToDepartment,
      suggestToStage: !!parsed?.suggestToStage,
      suggestedStage: sanitizeText(parsed?.suggestedStage),
      suggestedDepartment: sanitizeText(parsed?.suggestedDepartment),
    };
  } catch {
    return {
      allowComments: true,
      allowUploadsFromMembers: false,
      suggestToDepartment: false,
      suggestToStage: false,
      suggestedStage: '',
      suggestedDepartment: '',
    };
  }
};

const canUserUploadToChannel = (channel, userId) => {
  if (!channel || !userId) {
    return false;
  }

  if (channel.ownerId === userId) {
    return true;
  }

  const managerIds = getManagerIds(channel);
  if (managerIds.includes(userId)) {
    return true;
  }

  const settings = parseLectureSettings(channel.settingsJson);
  return !!settings.allowUploadsFromMembers;
};

const assertChannelManager = (channel, userId) => {
  const ownerId = channel?.ownerId || '';
  const managerIds = getManagerIds(channel);

  if (ownerId !== userId && !managerIds.includes(userId)) {
    throw new Error('Not authorized');
  }
};

const assertLinkedChatAllowed = ({ chat, userId }) => {
  if (!chat?.$id) {
    throw new Error('Invalid linked chat');
  }

  const chatType = sanitizeText(chat.type);
  if (chatType === CHAT_TYPES.DEPARTMENT_GROUP) {
    throw new Error('Department group chats cannot be linked');
  }

  if (chatType === 'private') {
    throw new Error('Private chats cannot be linked');
  }

  const representatives = Array.isArray(chat.representatives) ? chat.representatives : [];
  const admins = Array.isArray(chat.admins) ? chat.admins : [];

  if (chatType === CHAT_TYPES.STAGE_GROUP && !representatives.includes(userId)) {
    throw new Error('Only stage representatives can link to stage groups');
  }

  if (chatType !== CHAT_TYPES.STAGE_GROUP) {
    const canManage = admins.includes(userId) || representatives.includes(userId);
    if (!canManage) {
      throw new Error('Only group admins or representatives can link this chat');
    }
  }
};

const resolveValidatedLinkedChatId = async (linkedChatId, userId) => {
  const normalizedLinkedChatId = sanitizeText(linkedChatId);
  if (!normalizedLinkedChatId) {
    return '';
  }

  const chat = await getChat(normalizedLinkedChatId, true);
  assertLinkedChatAllowed({ chat, userId });
  return normalizedLinkedChatId;
};

const isMemberApproved = async (channelId, userId) => {
  const memberships = await databases.listDocuments(
    config.databaseId,
    config.lectureMembershipsCollectionId,
    [
      Query.equal('channelId', channelId),
      Query.equal('userId', userId),
      Query.equal('joinStatus', 'approved'),
      Query.limit(1),
    ]
  );

  return memberships.total > 0;
};

const ensureChannelAccessForUser = async (channel, userId) => {
  if (!channel || !userId) {
    throw new Error('Invalid access check');
  }

  if (channel.ownerId === userId) {
    return true;
  }

  const managerIds = getManagerIds(channel);
  if (managerIds.includes(userId)) {
    return true;
  }

  const approved = await isMemberApproved(channel.$id, userId);
  if (!approved) {
    throw new Error('Membership required');
  }

  return true;
};

const buildChannelDeeplink = (channelId) => {
  if (!channelId) {
    return '';
  }
  return Linking.createURL(`lecture-channel/${channelId}`);
};

const mapMembershipStatusToCounts = (channel) => {
  return {
    membersCount: Number(channel?.membersCount || 0),
    pendingCount: Number(channel?.pendingCount || 0),
  };
};

const syncChannelCounts = async (channelId) => {
  const [approved, pending] = await Promise.all([
    databases.listDocuments(
      config.databaseId,
      config.lectureMembershipsCollectionId,
      [
        Query.equal('channelId', channelId),
        Query.equal('joinStatus', 'approved'),
        Query.limit(1),
      ]
    ),
    databases.listDocuments(
      config.databaseId,
      config.lectureMembershipsCollectionId,
      [
        Query.equal('channelId', channelId),
        Query.equal('joinStatus', 'pending'),
        Query.limit(1),
      ]
    ),
  ]);

  await databases.updateDocument(
    config.databaseId,
    config.lectureChannelsCollectionId,
    channelId,
    {
      membersCount: approved.total,
      pendingCount: pending.total,
    }
  );
};

export const createLectureChannel = async (payload = {}) => {
  assertLecturesConfigured();

  logLecturesDb('createLectureChannel:start', {
    hasName: !!sanitizeText(payload.name),
    channelType: payload.channelType || '',
  });

  const currentUserId = await getCurrentUserId();

  const name = sanitizeText(payload.name);
  if (!name) {
    throw new Error('Channel name is required');
  }

  const channelType = normalizeChannelType(payload.channelType);
  const accessType = normalizeAccessType(channelType, payload.accessType);
  const linkedChatId = await resolveValidatedLinkedChatId(payload.linkedChatId, currentUserId);

  const documentData = {
    name,
    description: sanitizeText(payload.description),
    channelType,
    accessType,
    ownerId: currentUserId,
    managerIds: currentUserId,
    linkedChatId,
    isActive: true,
    membersCount: 1,
    pendingCount: 0,
    notificationsDefaultOn: payload.notificationsDefaultOn !== false,
    settingsJson: payload.settingsJson
      ? (typeof payload.settingsJson === 'string' ? payload.settingsJson : JSON.stringify(payload.settingsJson))
      : JSON.stringify({
          allowComments: true,
          allowUploadsFromMembers: false,
          suggestToDepartment: false,
          suggestToStage: false,
          suggestedStage: '',
          suggestedDepartment: '',
        }),
    tags: Array.isArray(payload.tags) ? payload.tags.filter(Boolean).map(tag => sanitizeText(tag)) : [],
    coverImageUrl: sanitizeText(payload.coverImageUrl),
  };

  try {
    const channel = await databases.createDocument(
      config.databaseId,
      config.lectureChannelsCollectionId,
      ID.unique(),
      documentData,
      [
        Permission.read(Role.users()),
        Permission.update(Role.user(currentUserId)),
        Permission.delete(Role.user(currentUserId)),
      ]
    );

    await databases.createDocument(
      config.databaseId,
      config.lectureMembershipsCollectionId,
      ID.unique(),
      {
        channelId: channel.$id,
        userId: currentUserId,
        joinStatus: 'approved',
        role: 'owner',
        requestedAt: new Date().toISOString(),
        approvedAt: new Date().toISOString(),
        notificationsEnabled: true,
        settingsJson: JSON.stringify({
          muteUntil: null,
        }),
      }
    );

    logLecturesDb('createLectureChannel:success', {
      channelId: channel.$id,
      userId: currentUserId,
    });
    return channel;
  } catch (error) {
    logLecturesDbError('createLectureChannel:error', error, {
      userId: currentUserId,
    });
    throw error;
  }
};

export const getLectureChannelById = async (channelId) => {
  assertLecturesConfigured();

  if (!channelId || typeof channelId !== 'string') {
    throw new Error('Invalid channel ID');
  }

  return databases.getDocument(
    config.databaseId,
    config.lectureChannelsCollectionId,
    channelId
  );
};

export const getLectureChannels = async ({ search = '', channelType = 'all', limit = 20, offset = 0 } = {}) => {
  assertLecturesConfigured();
  logLecturesDb('getLectureChannels:start', {
    hasSearch: !!sanitizeText(search),
    channelType,
    limit,
    offset,
  });

  const queries = [
    Query.equal('isActive', true),
    Query.orderDesc('$updatedAt'),
    Query.limit(Math.min(Math.max(limit, 1), 100)),
    Query.offset(Math.max(offset, 0)),
  ];

  const normalizedSearch = sanitizeText(search);
  if (normalizedSearch) {
    queries.push(Query.search('name', normalizedSearch));
  }

  if (channelType === LECTURE_CHANNEL_TYPES.OFFICIAL || channelType === LECTURE_CHANNEL_TYPES.COMMUNITY) {
    queries.push(Query.equal('channelType', channelType));
  }

  try {
    const result = await databases.listDocuments(
      config.databaseId,
      config.lectureChannelsCollectionId,
      queries
    );

    const documents = result.documents || [];
    logLecturesDb('getLectureChannels:success', {
      count: documents.length,
      total: result.total || documents.length,
    });
    return documents;
  } catch (error) {
    logLecturesDbError('getLectureChannels:error', error, {
      channelType,
      hasSearch: !!sanitizeText(search),
    });
    throw error;
  }
};

export const getMyLectureChannels = async (userId) => {
  assertLecturesConfigured();

  const currentUserId = userId || await getCurrentUserId();

  const memberships = await databases.listDocuments(
    config.databaseId,
    config.lectureMembershipsCollectionId,
    [
      Query.equal('userId', currentUserId),
      Query.equal('joinStatus', 'approved'),
      Query.limit(200),
      Query.orderDesc('$updatedAt'),
    ]
  );

  const channelIds = memberships.documents.map(item => item.channelId).filter(Boolean);

  if (!channelIds.length) {
    return [];
  }

  const channelsResponse = await databases.listDocuments(
    config.databaseId,
    config.lectureChannelsCollectionId,
    [
      Query.equal('$id', channelIds),
      Query.equal('isActive', true),
      Query.limit(200),
      Query.orderDesc('$updatedAt'),
    ]
  );

  return channelsResponse.documents || [];
};

export const requestJoinLectureChannel = async (channelId) => {
  assertLecturesConfigured();

  logLecturesDb('requestJoinLectureChannel:start', { channelId });

  if (!channelId || typeof channelId !== 'string') {
    throw new Error('Invalid channel ID');
  }

  const currentUserId = await getCurrentUserId();
  const channel = await getLectureChannelById(channelId);

  const existingMembership = await databases.listDocuments(
    config.databaseId,
    config.lectureMembershipsCollectionId,
    [
      Query.equal('channelId', channelId),
      Query.equal('userId', currentUserId),
      Query.limit(1),
    ]
  );

  if (existingMembership.total > 0) {
    return existingMembership.documents[0];
  }

  const approvedDirectly = channel.accessType === LECTURE_ACCESS_TYPES.OPEN;
  const nowIso = new Date().toISOString();

  try {
    const membership = await databases.createDocument(
      config.databaseId,
      config.lectureMembershipsCollectionId,
      ID.unique(),
      {
        channelId,
        userId: currentUserId,
        joinStatus: approvedDirectly ? 'approved' : 'pending',
        role: 'member',
        requestedAt: nowIso,
        approvedAt: approvedDirectly ? nowIso : '',
        notificationsEnabled: true,
        settingsJson: JSON.stringify({
          muteUntil: null,
        }),
      }
    );

    await syncChannelCounts(channelId);
    logLecturesDb('requestJoinLectureChannel:success', {
      channelId,
      userId: currentUserId,
      joinStatus: membership?.joinStatus || '',
    });
    return membership;
  } catch (error) {
    logLecturesDbError('requestJoinLectureChannel:error', error, {
      channelId,
      userId: currentUserId,
    });
    throw error;
  }
};

export const updateLectureMembershipStatus = async ({ channelId, membershipId, status }) => {
  assertLecturesConfigured();

  logLecturesDb('updateLectureMembershipStatus:start', {
    channelId,
    membershipId,
    status,
  });

  const secureResult = await tryInvokeLectureGuard('update_membership_status', {
    channelId,
    membershipId,
    status,
  });

  if (secureResult?.success) {
    await syncChannelCounts(channelId).catch(() => {});
    const membership = await databases.getDocument(
      config.databaseId,
      config.lectureMembershipsCollectionId,
      membershipId
    );
    logLecturesDb('updateLectureMembershipStatus:success_guard', {
      channelId,
      membershipId,
      joinStatus: membership?.joinStatus || '',
    });
    return membership;
  }

  const normalizedStatus = normalizeJoinStatus(status);
  const currentUserId = await getCurrentUserId();
  const channel = await getLectureChannelById(channelId);

  assertChannelManager(channel, currentUserId);

  const updatePayload = {
    joinStatus: normalizedStatus,
  };

  const membershipDoc = await databases.getDocument(
    config.databaseId,
    config.lectureMembershipsCollectionId,
    membershipId
  );

  if (sanitizeText(membershipDoc?.channelId) !== sanitizeText(channelId)) {
    throw new Error('Membership channel mismatch');
  }

  if (normalizedStatus === 'approved') {
    updatePayload.approvedAt = new Date().toISOString();
  }

  try {
    const updated = await databases.updateDocument(
      config.databaseId,
      config.lectureMembershipsCollectionId,
      membershipId,
      updatePayload
    );

    await syncChannelCounts(channelId);
    logLecturesDb('updateLectureMembershipStatus:success', {
      channelId,
      membershipId,
      joinStatus: updated?.joinStatus || normalizedStatus,
    });
    return updated;
  } catch (error) {
    logLecturesDbError('updateLectureMembershipStatus:error', error, {
      channelId,
      membershipId,
      status,
    });
    throw error;
  }
};

export const getLectureJoinRequests = async (channelId) => {
  assertLecturesConfigured();

  const currentUserId = await getCurrentUserId();
  const channel = await getLectureChannelById(channelId);

  assertChannelManager(channel, currentUserId);

  const memberships = await databases.listDocuments(
    config.databaseId,
    config.lectureMembershipsCollectionId,
    [
      Query.equal('channelId', channelId),
      Query.equal('joinStatus', 'pending'),
      Query.orderAsc('$createdAt'),
      Query.limit(200),
    ]
  );

  return memberships.documents || [];
};

export const updateLectureChannelSettings = async (channelId, updates = {}) => {
  assertLecturesConfigured();

  const secureResult = await tryInvokeLectureGuard('update_channel_settings', {
    channelId,
    updates,
  });

  if (secureResult?.success) {
    return getLectureChannelById(channelId);
  }

  const currentUserId = await getCurrentUserId();
  const channel = await getLectureChannelById(channelId);

  assertChannelManager(channel, currentUserId);

  const payload = {};

  if (updates.name !== undefined) {
    payload.name = sanitizeText(updates.name);
  }

  if (updates.description !== undefined) {
    payload.description = sanitizeText(updates.description);
  }

  if (updates.linkedChatId !== undefined) {
    payload.linkedChatId = await resolveValidatedLinkedChatId(updates.linkedChatId, currentUserId);
  }

  if (updates.accessType !== undefined) {
    payload.accessType = normalizeAccessType(channel.channelType, updates.accessType);
  }

  if (updates.notificationsDefaultOn !== undefined) {
    payload.notificationsDefaultOn = !!updates.notificationsDefaultOn;
  }

  if (updates.settingsJson !== undefined) {
    payload.settingsJson = typeof updates.settingsJson === 'string'
      ? updates.settingsJson
      : JSON.stringify(updates.settingsJson || {});
  }

  if (updates.managerIds !== undefined && Array.isArray(updates.managerIds)) {
    payload.managerIds = serializeManagerIds(updates.managerIds);
  }

  if (updates.coverImageUrl !== undefined) {
    payload.coverImageUrl = sanitizeText(updates.coverImageUrl);
  }

  if (updates.tags !== undefined && Array.isArray(updates.tags)) {
    payload.tags = updates.tags.filter(Boolean).map(tag => sanitizeText(tag));
  }

  return databases.updateDocument(
    config.databaseId,
    config.lectureChannelsCollectionId,
    channelId,
    payload
  );
};

export const addLectureManager = async (channelId, managerUserId) => {
  assertLecturesConfigured();

  const secureResult = await tryInvokeLectureGuard('add_manager', {
    channelId,
    managerUserId,
  });

  if (secureResult?.success) {
    return getLectureChannelById(channelId);
  }

  const channel = await getLectureChannelById(channelId);
  const currentUserId = await getCurrentUserId();
  assertChannelManager(channel, currentUserId);

  const managerId = sanitizeText(managerUserId);
  if (!managerId) {
    throw new Error('Manager ID is required');
  }

  const managerIds = getManagerIds(channel);
  const nextManagerIds = toUniqueList([...managerIds, managerId]);

  return databases.updateDocument(
    config.databaseId,
    config.lectureChannelsCollectionId,
    channelId,
    {
      managerIds: serializeManagerIds(nextManagerIds),
    }
  );
};

export const removeLectureManager = async (channelId, managerUserId) => {
  assertLecturesConfigured();

  const secureResult = await tryInvokeLectureGuard('remove_manager', {
    channelId,
    managerUserId,
  });

  if (secureResult?.success) {
    return getLectureChannelById(channelId);
  }

  const channel = await getLectureChannelById(channelId);
  const currentUserId = await getCurrentUserId();
  assertChannelManager(channel, currentUserId);

  const managerId = sanitizeText(managerUserId);
  if (!managerId || managerId === channel.ownerId) {
    throw new Error('Cannot remove owner');
  }

  const managerIds = getManagerIds(channel);
  const nextManagerIds = managerIds.filter(id => id !== managerId);

  return databases.updateDocument(
    config.databaseId,
    config.lectureChannelsCollectionId,
    channelId,
    {
      managerIds: serializeManagerIds(nextManagerIds),
    }
  );
};

export const setLectureMembershipNotification = async ({ channelId, enabled }) => {
  assertLecturesConfigured();

  const currentUserId = await getCurrentUserId();

  const memberships = await databases.listDocuments(
    config.databaseId,
    config.lectureMembershipsCollectionId,
    [
      Query.equal('channelId', channelId),
      Query.equal('userId', currentUserId),
      Query.limit(1),
    ]
  );

  if (!memberships.total) {
    throw new Error('Membership required');
  }

  return databases.updateDocument(
    config.databaseId,
    config.lectureMembershipsCollectionId,
    memberships.documents[0].$id,
    {
      notificationsEnabled: !!enabled,
    }
  );
};

const normalizeYoutubeUrl = (youtubeUrl = '') => {
  const raw = sanitizeText(youtubeUrl);
  if (!raw) {
    return '';
  }

  if (!raw.includes('youtube.com') && !raw.includes('youtu.be')) {
    throw new Error('Invalid YouTube URL');
  }

  return raw;
};

const buildLectureBridgeMessage = ({ channel, asset, deeplink }) => {
  const title = sanitizeText(asset?.title) || 'New lecture upload';
  const channelName = sanitizeText(channel?.name) || 'Lecture channel';
  const urlPart = deeplink ? `\n${deeplink}` : '';
  return `📚 ${channelName}\n${title}${urlPart}`;
};

const notifyLectureUpload = async ({ channel, uploaderId, asset }) => {
  try {
    if (!config.notificationsCollectionId || !channel?.$id || !uploaderId || !asset?.title) {
      return;
    }

    const memberships = await databases.listDocuments(
      config.databaseId,
      config.lectureMembershipsCollectionId,
      [
        Query.equal('channelId', channel.$id),
        Query.equal('joinStatus', 'approved'),
        Query.limit(400),
      ]
    );

    const recipients = (memberships.documents || [])
      .filter(member => member?.userId && member.userId !== uploaderId && member.notificationsEnabled !== false)
      .map(member => member.userId);

    if (!recipients.length) {
      return;
    }

    const notificationPreview = sanitizeText(asset.title).substring(0, 90);

    await Promise.all(
      recipients.map(async (recipientUserId) => {
        await createNotification({
          userId: recipientUserId,
          senderId: uploaderId,
          senderName: 'Lectures',
          type: 'lecture_upload',
          postId: channel.$id,
          postPreview: notificationPreview,
        });

        sendGeneralPushNotification({
          recipientUserId,
          senderId: uploaderId,
          senderName: 'Lectures',
          type: 'lecture_upload',
          title: channel?.name || 'Lecture update',
          body: notificationPreview,
          postId: channel.$id,
        }).catch(() => {});
      })
    );
  } catch {
    // Non-blocking notifications
  }
};

export const createLectureAsset = async ({
  channelId,
  title,
  description,
  uploadType,
  youtubeUrl,
  externalUrl,
  file,
  tags = [],
}) => {
  assertLecturesConfigured();

  logLecturesDb('createLectureAsset:start', {
    channelId,
    uploadType,
    hasTitle: !!sanitizeText(title),
    hasFile: !!file,
  });

  if (!channelId || typeof channelId !== 'string') {
    throw new Error('Invalid channel ID');
  }

  const currentUserId = await getCurrentUserId();
  const channel = await getLectureChannelById(channelId);

  await ensureChannelAccessForUser(channel, currentUserId);

  if (!canUserUploadToChannel(channel, currentUserId)) {
    throw new Error('Only admins can upload in this channel');
  }

  const resolvedUploadType = uploadType === LECTURE_UPLOAD_TYPES.YOUTUBE
    ? LECTURE_UPLOAD_TYPES.YOUTUBE
    : uploadType === LECTURE_UPLOAD_TYPES.LINK
      ? LECTURE_UPLOAD_TYPES.LINK
      : LECTURE_UPLOAD_TYPES.FILE;

  const assetTitle = sanitizeText(title);
  if (!assetTitle) {
    throw new Error('Asset title is required');
  }

  const data = {
    channelId,
    title: assetTitle,
    description: sanitizeText(description),
    uploadType: resolvedUploadType,
    uploaderId: currentUserId,
    youtubeUrl: '',
    externalUrl: '',
    fileUrl: '',
    fileId: '',
    fileName: '',
    fileSize: 0,
    mimeType: '',
    tags: Array.isArray(tags) ? tags.filter(Boolean).map(tag => sanitizeText(tag)) : [],
    isPinned: false,
    isActive: true,
  };

  if (resolvedUploadType === LECTURE_UPLOAD_TYPES.YOUTUBE) {
    data.youtubeUrl = normalizeYoutubeUrl(youtubeUrl);
  } else if (resolvedUploadType === LECTURE_UPLOAD_TYPES.LINK) {
    data.externalUrl = sanitizeText(externalUrl);
    if (!data.externalUrl) {
      throw new Error('Link URL is required');
    }
  } else {
    if (!config.lectureStorageId) {
      throw new Error('LECTURES_STORAGE_ID_MISSING');
    }

    if (!file) {
      throw new Error('File is required');
    }

    const uploadResult = await uploadFileToAppwrite({
      file: {
        uri: file.uri,
        name: file.name,
        type: file.type || file.mimeType || 'application/octet-stream',
        size: file.size,
      },
      bucketId: config.lectureStorageId,
    });

    data.fileUrl = uploadResult.viewUrl || '';
    data.fileId = uploadResult.fileId || '';
    data.fileName = uploadResult.name || file.name || '';
    data.fileSize = Number(uploadResult.size || file.size || 0);
    data.mimeType = uploadResult.mimeType || file.type || file.mimeType || '';
  }

  try {
    const asset = await databases.createDocument(
      config.databaseId,
      config.lectureAssetsCollectionId,
      ID.unique(),
      data
    );

    notifyLectureUpload({
      channel,
      uploaderId: currentUserId,
      asset,
    }).catch((notifyError) => {
      logLecturesDbError('createLectureAsset:notifyUploadError', notifyError, {
        channelId,
        assetId: asset?.$id || '',
      });
    });

    if (channel.linkedChatId) {
      try {
        const deeplink = buildChannelDeeplink(channelId);
        const bridgeMessage = buildLectureBridgeMessage({ channel, asset, deeplink });

        await sendMessage(channel.linkedChatId, {
          senderId: currentUserId,
          senderName: 'Lectures',
          content: bridgeMessage,
          type: 'text',
        });
      } catch (bridgeError) {
        logLecturesDbError('createLectureAsset:chatBridgeError', bridgeError, {
          channelId,
          linkedChatId: channel.linkedChatId,
          assetId: asset?.$id || '',
        });
      }
    }

    logLecturesDb('createLectureAsset:success', {
      channelId,
      assetId: asset.$id,
      uploadType: resolvedUploadType,
    });
    return asset;
  } catch (error) {
    logLecturesDbError('createLectureAsset:error', error, {
      channelId,
      uploadType: resolvedUploadType,
    });
    throw error;
  }
};

export const getLectureAssets = async ({ channelId, limit = 30, offset = 0 } = {}) => {
  assertLecturesConfigured();

  logLecturesDb('getLectureAssets:start', {
    channelId,
    limit,
    offset,
  });

  if (!channelId || typeof channelId !== 'string') {
    throw new Error('Invalid channel ID');
  }

  const currentUserId = await getCurrentUserId();
  const channel = await getLectureChannelById(channelId);
  await ensureChannelAccessForUser(channel, currentUserId);

  try {
    const result = await databases.listDocuments(
      config.databaseId,
      config.lectureAssetsCollectionId,
      [
        Query.equal('channelId', channelId),
        Query.equal('isActive', true),
        Query.orderDesc('$createdAt'),
        Query.limit(Math.min(Math.max(limit, 1), 100)),
        Query.offset(Math.max(offset, 0)),
      ]
    );

    const assets = sortLectureAssetsPinnedFirst(result.documents || []);
    logLecturesDb('getLectureAssets:success', {
      channelId,
      count: assets.length,
    });
    return assets;
  } catch (error) {
    logLecturesDbError('getLectureAssets:error', error, {
      channelId,
    });
    throw error;
  }
};

export const updateLectureAssetPinStatus = async ({ channelId, assetId, isPinned }) => {
  assertLecturesConfigured();

  if (!channelId || !assetId) {
    throw new Error('Invalid pin request');
  }

  const secureResult = await tryInvokeLectureGuard('pin_asset', {
    channelId,
    assetId,
    isPinned: !!isPinned,
  });

  if (secureResult?.success) {
    return databases.getDocument(
      config.databaseId,
      config.lectureAssetsCollectionId,
      assetId
    );
  }

  const currentUserId = await getCurrentUserId();
  const channel = await getLectureChannelById(channelId);
  assertChannelManager(channel, currentUserId);

  return databases.updateDocument(
    config.databaseId,
    config.lectureAssetsCollectionId,
    assetId,
    {
      isPinned: !!isPinned,
    }
  );
};

export const getLectureChannelShareLink = (channelId) => {
  return buildChannelDeeplink(channelId);
};

export const getLectureMembershipSummary = async (channelId, userId) => {
  assertLecturesConfigured();

  const currentUserId = userId || await getCurrentUserId();

  const memberships = await databases.listDocuments(
    config.databaseId,
    config.lectureMembershipsCollectionId,
    [
      Query.equal('channelId', channelId),
      Query.equal('userId', currentUserId),
      Query.limit(1),
    ]
  );

  const membership = memberships.documents[0] || null;
  const channel = await getLectureChannelById(channelId);

  return {
    membership,
    counts: mapMembershipStatusToCounts(channel),
  };
};

export const getLectureManagers = async (channelId) => {
  assertLecturesConfigured();

  const channel = await getLectureChannelById(channelId);
  return getManagerIds(channel);
};

const notifyLectureMentions = async ({
  channelId,
  assetId,
  commentText,
  senderId,
}) => {
  try {
    const mentionedIds = extractLectureMentionUserIds(commentText).filter(id => id !== senderId);
    if (!mentionedIds.length || !config.notificationsCollectionId) {
      return;
    }

    const preview = `[lecture_asset:${assetId}] ${sanitizeText(commentText).slice(0, 120)}`;

    await Promise.all(
      mentionedIds.map(async (userId) => {
        await createNotification({
          userId,
          senderId,
          senderName: 'Lectures',
          type: 'lecture_mention',
          postId: channelId,
          postPreview: preview,
        });

        sendGeneralPushNotification({
          recipientUserId: userId,
          senderId,
          senderName: 'Lectures',
          type: 'lecture_mention',
          title: 'Mentioned in lecture discussion',
          body: sanitizeText(commentText).slice(0, 80) || 'You were mentioned',
          postId: channelId,
        }).catch(() => {});
      })
    );
  } catch {
    // Non-blocking mention notification fanout
  }
};

export const createLectureComment = async ({
  channelId,
  assetId,
  text,
  parentCommentId = '',
}) => {
  assertLecturesConfigured();
    logLecturesDb('createLectureComment:start', {
      channelId,
      assetId,
      textLength: sanitizeText(text).length,
    });

  if (!config.lectureCommentsCollectionId) {
    throw new Error('LECTURES_COMMENTS_COLLECTION_ID_MISSING');
  }

  if (!channelId || !assetId) {
    throw new Error('Invalid comment payload');
  }

  const commentText = sanitizeText(text);
  if (!commentText) {
    throw new Error('Comment is required');
  }

  const currentUserId = await getCurrentUserId();
  const channel = await getLectureChannelById(channelId);
  await ensureChannelAccessForUser(channel, currentUserId);

  const commentDocumentId = ID.unique();

  try {
    const comment = await databases.createDocument(
      config.databaseId,
      config.lectureCommentsCollectionId,
      commentDocumentId,
      {
        commentId: commentDocumentId,
        channelId,
        assetId,
        userId: currentUserId,
        text: commentText,
        parentCommentId: sanitizeText(parentCommentId),
      }
    );

    notifyLectureMentions({
      channelId,
      assetId,
      commentText,
      senderId: currentUserId,
    }).catch((mentionError) => {
      logLecturesDbError('createLectureComment:mentionNotifyError', mentionError, {
        channelId,
        assetId,
        commentId: comment.$id,
      });
    });

    logLecturesDb('createLectureComment:success', {
      channelId,
      assetId,
      commentId: comment.$id,
    });
    return comment;
  } catch (error) {
    logLecturesDbError('createLectureComment:error', error, {
      channelId,
      assetId,
    });
    throw error;
  }
};

export const getLectureComments = async ({ channelId, assetId, limit = 200 } = {}) => {
  assertLecturesConfigured();
  if (!config.lectureCommentsCollectionId) {
    throw new Error('LECTURES_COMMENTS_COLLECTION_ID_MISSING');
  }

  if (!channelId || !assetId) {
    throw new Error('Invalid comment query');
  }

  const currentUserId = await getCurrentUserId();
  const channel = await getLectureChannelById(channelId);
  await ensureChannelAccessForUser(channel, currentUserId);

  let result;
  try {
    result = await databases.listDocuments(
      config.databaseId,
      config.lectureCommentsCollectionId,
      [
        Query.equal('channelId', channelId),
        Query.equal('assetId', assetId),
        Query.equal('isActive', true),
        Query.orderAsc('$createdAt'),
        Query.limit(Math.min(Math.max(limit, 1), 500)),
      ]
    );
  } catch {
    result = await databases.listDocuments(
      config.databaseId,
      config.lectureCommentsCollectionId,
      [
        Query.equal('channelId', channelId),
        Query.equal('assetId', assetId),
        Query.orderAsc('$createdAt'),
        Query.limit(Math.min(Math.max(limit, 1), 500)),
      ]
    );
  }

  return result.documents || [];
};

export const updateLectureComment = async ({ channelId, commentId, text }) => {
  assertLecturesConfigured();
  if (!config.lectureCommentsCollectionId) {
    throw new Error('LECTURES_COMMENTS_COLLECTION_ID_MISSING');
  }

  const currentUserId = await getCurrentUserId();
  const comment = await databases.getDocument(
    config.databaseId,
    config.lectureCommentsCollectionId,
    commentId
  );

  if (comment?.userId !== currentUserId) {
    throw new Error('Not authorized');
  }

  const nextText = sanitizeText(text);
  if (!nextText) {
    throw new Error('Comment is required');
  }

  const updated = await databases.updateDocument(
    config.databaseId,
    config.lectureCommentsCollectionId,
    commentId,
    {
      text: nextText,
    }
  );

  notifyLectureMentions({
    channelId,
    assetId: comment.assetId,
    commentText: nextText,
    senderId: currentUserId,
  }).catch(() => {});

  return updated;
};

export const deleteLectureComment = async ({ channelId, commentId }) => {
  assertLecturesConfigured();
  if (!config.lectureCommentsCollectionId) {
    throw new Error('LECTURES_COMMENTS_COLLECTION_ID_MISSING');
  }

  const currentUserId = await getCurrentUserId();
  const channel = await getLectureChannelById(channelId);
  const comment = await databases.getDocument(
    config.databaseId,
    config.lectureCommentsCollectionId,
    commentId
  );

  const isOwner = comment?.userId === currentUserId;
  const isManager = channel?.ownerId === currentUserId || getManagerIds(channel).includes(currentUserId);
  if (!isOwner && !isManager) {
    throw new Error('Not authorized');
  }

  try {
    return await databases.updateDocument(
      config.databaseId,
      config.lectureCommentsCollectionId,
      commentId,
      {
        isActive: false,
      }
    );
  } catch {
    await databases.deleteDocument(
      config.databaseId,
      config.lectureCommentsCollectionId,
      commentId
    );
    return { success: true };
  }
};
