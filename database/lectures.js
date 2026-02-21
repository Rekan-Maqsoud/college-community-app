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

const logLecturesDb = () => {};
const logLecturesDbError = () => {};

const isMissingDocumentError = (error) => {
  const code = Number(error?.code || error?.status || 0);
  if (code === 404) {
    return true;
  }

  const message = String(error?.message || '').toLowerCase();
  return message.includes('could not be found') || message.includes('document not found');
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

const parsePinnedChannelsJson = (value) => {
  if (!value) {
    return [];
  }

  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return toUniqueList(parsed);
  } catch {
    return [];
  }
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

const buildChannelDeeplink = (channelId, assetId = '') => {
  if (!channelId) {
    return '';
  }

  const normalizedAssetId = sanitizeText(assetId);
  if (!normalizedAssetId) {
    return Linking.createURL(`lecture-channel/${channelId}`);
  }

  return Linking.createURL(`lecture-channel/${channelId}`, {
    queryParams: {
      assetId: normalizedAssetId,
    },
  });
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

  logLecturesDb('getLectureChannelById:start', {
    channelId,
  });

  if (!channelId || typeof channelId !== 'string') {
    throw new Error('Invalid channel ID');
  }

  try {
    const channel = await databases.getDocument(
      config.databaseId,
      config.lectureChannelsCollectionId,
      channelId
    );

    logLecturesDb('getLectureChannelById:success', {
      channelId,
      ownerId: channel?.ownerId || '',
    });

    return channel;
  } catch (error) {
    if (isMissingDocumentError(error)) {
      logLecturesDb('getLectureChannelById:missing', {
        channelId,
      });
    } else {
      logLecturesDbError('getLectureChannelById:error', error, {
        channelId,
      });
    }
    throw error;
  }
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

  logLecturesDb('getMyLectureChannels:start', {
    userId: currentUserId,
  });

  try {
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
      logLecturesDb('getMyLectureChannels:success', {
        userId: currentUserId,
        count: 0,
      });
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

    const channels = channelsResponse.documents || [];
    logLecturesDb('getMyLectureChannels:success', {
      userId: currentUserId,
      count: channels.length,
    });
    return channels;
  } catch (error) {
    logLecturesDbError('getMyLectureChannels:error', error, {
      userId: currentUserId,
    });
    throw error;
  }
};

export const getMyPendingLectureChannelIds = async (userId) => {
  assertLecturesConfigured();

  const currentUserId = userId || await getCurrentUserId();

  logLecturesDb('getMyPendingLectureChannelIds:start', {
    userId: currentUserId,
  });

  try {
    const memberships = await databases.listDocuments(
      config.databaseId,
      config.lectureMembershipsCollectionId,
      [
        Query.equal('userId', currentUserId),
        Query.equal('joinStatus', 'pending'),
        Query.limit(200),
        Query.orderDesc('$updatedAt'),
      ]
    );

    const channelIds = (memberships.documents || []).map(item => item.channelId).filter(Boolean);
    logLecturesDb('getMyPendingLectureChannelIds:success', {
      userId: currentUserId,
      count: channelIds.length,
    });
    return channelIds;
  } catch (error) {
    logLecturesDbError('getMyPendingLectureChannelIds:error', error, {
      userId: currentUserId,
    });
    return [];
  }
};

export const getLecturePinnedChannelIds = async (userId) => {
  assertLecturesConfigured();

  const currentUserId = userId || await getCurrentUserId();

  logLecturesDb('getLecturePinnedChannelIds:start', {
    userId: currentUserId,
  });

  try {
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

    const documents = memberships.documents || [];
    const fromAnyMembership = documents.find((membership) => sanitizeText(membership?.pinnedChannelsJson));
    const pinnedChannelIds = parsePinnedChannelsJson(fromAnyMembership?.pinnedChannelsJson);

    logLecturesDb('getLecturePinnedChannelIds:success', {
      userId: currentUserId,
      membershipCount: documents.length,
      pinnedCount: pinnedChannelIds.length,
    });

    return pinnedChannelIds;
  } catch (error) {
    logLecturesDbError('getLecturePinnedChannelIds:error', error, {
      userId: currentUserId,
    });
    throw error;
  }
};

export const setLecturePinnedChannelIds = async (channelIds = [], userId) => {
  assertLecturesConfigured();

  const currentUserId = userId || await getCurrentUserId();
  const pinnedChannelIds = toUniqueList(Array.isArray(channelIds) ? channelIds : []);
  const pinnedChannelsJson = JSON.stringify(pinnedChannelIds);

  logLecturesDb('setLecturePinnedChannelIds:start', {
    userId: currentUserId,
    pinnedCount: pinnedChannelIds.length,
  });

  try {
    const memberships = await databases.listDocuments(
      config.databaseId,
      config.lectureMembershipsCollectionId,
      [
        Query.equal('userId', currentUserId),
        Query.equal('joinStatus', 'approved'),
        Query.limit(200),
      ]
    );

    const approvedMemberships = memberships.documents || [];
    if (!approvedMemberships.length) {
      logLecturesDb('setLecturePinnedChannelIds:success_no_memberships', {
        userId: currentUserId,
        pinnedCount: pinnedChannelIds.length,
      });
      return pinnedChannelIds;
    }

    await Promise.all(
      approvedMemberships.map((membership) => databases.updateDocument(
        config.databaseId,
        config.lectureMembershipsCollectionId,
        membership.$id,
        {
          pinnedChannelsJson,
        }
      ))
    );

    logLecturesDb('setLecturePinnedChannelIds:success', {
      userId: currentUserId,
      membershipsUpdated: approvedMemberships.length,
      pinnedCount: pinnedChannelIds.length,
    });

    return pinnedChannelIds;
  } catch (error) {
    logLecturesDbError('setLecturePinnedChannelIds:error', error, {
      userId: currentUserId,
      pinnedCount: pinnedChannelIds.length,
    });
    throw error;
  }
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

  logLecturesDb('getLectureJoinRequests:start', {
    channelId,
  });

  try {
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

    const requests = memberships.documents || [];
    logLecturesDb('getLectureJoinRequests:success', {
      channelId,
      count: requests.length,
    });
    return requests;
  } catch (error) {
    if (isMissingDocumentError(error)) {
      logLecturesDb('getLectureJoinRequests:missing_channel', {
        channelId,
      });
    } else {
      logLecturesDbError('getLectureJoinRequests:error', error, {
        channelId,
      });
    }
    throw error;
  }
};

export const updateLectureChannelSettings = async (channelId, updates = {}) => {
  assertLecturesConfigured();

  logLecturesDb('updateLectureChannelSettings:start', {
    channelId,
    keys: Object.keys(updates || {}),
  });

  const secureResult = await tryInvokeLectureGuard('update_channel_settings', {
    channelId,
    updates,
  });

  if (secureResult?.success) {
    const channel = await getLectureChannelById(channelId);
    logLecturesDb('updateLectureChannelSettings:success_guard', {
      channelId,
    });
    return channel;
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

  try {
    const updated = await databases.updateDocument(
      config.databaseId,
      config.lectureChannelsCollectionId,
      channelId,
      payload
    );

    logLecturesDb('updateLectureChannelSettings:success', {
      channelId,
      keys: Object.keys(payload),
    });

    return updated;
  } catch (error) {
    logLecturesDbError('updateLectureChannelSettings:error', error, {
      channelId,
      keys: Object.keys(payload),
    });
    throw error;
  }
};

export const addLectureManager = async (channelId, managerUserId) => {
  assertLecturesConfigured();

  logLecturesDb('addLectureManager:start', {
    channelId,
    managerUserId,
  });

  const secureResult = await tryInvokeLectureGuard('add_manager', {
    channelId,
    managerUserId,
  });

  if (secureResult?.success) {
    const channel = await getLectureChannelById(channelId);
    logLecturesDb('addLectureManager:success_guard', {
      channelId,
      managerUserId,
    });
    return channel;
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

  try {
    const updated = await databases.updateDocument(
      config.databaseId,
      config.lectureChannelsCollectionId,
      channelId,
      {
        managerIds: serializeManagerIds(nextManagerIds),
      }
    );

    logLecturesDb('addLectureManager:success', {
      channelId,
      managerUserId: managerId,
      count: nextManagerIds.length,
    });
    return updated;
  } catch (error) {
    logLecturesDbError('addLectureManager:error', error, {
      channelId,
      managerUserId: managerId,
    });
    throw error;
  }
};

export const removeLectureManager = async (channelId, managerUserId) => {
  assertLecturesConfigured();

  logLecturesDb('removeLectureManager:start', {
    channelId,
    managerUserId,
  });

  const channel = await getLectureChannelById(channelId);
  const currentUserId = await getCurrentUserId();

  if (sanitizeText(channel?.ownerId) !== sanitizeText(currentUserId)) {
    throw new Error('Only channel owner can remove managers');
  }

  const secureResult = await tryInvokeLectureGuard('remove_manager', {
    channelId,
    managerUserId,
  });

  if (secureResult?.success) {
    const channel = await getLectureChannelById(channelId);
    logLecturesDb('removeLectureManager:success_guard', {
      channelId,
      managerUserId,
    });
    return channel;
  }

  const managerId = sanitizeText(managerUserId);
  if (!managerId || managerId === channel.ownerId) {
    throw new Error('Cannot remove owner');
  }

  const managerIds = getManagerIds(channel);
  const nextManagerIds = managerIds.filter(id => id !== managerId);

  try {
    const updated = await databases.updateDocument(
      config.databaseId,
      config.lectureChannelsCollectionId,
      channelId,
      {
        managerIds: serializeManagerIds(nextManagerIds),
      }
    );

    logLecturesDb('removeLectureManager:success', {
      channelId,
      managerUserId: managerId,
      count: nextManagerIds.length,
    });
    return updated;
  } catch (error) {
    logLecturesDbError('removeLectureManager:error', error, {
      channelId,
      managerUserId: managerId,
    });
    throw error;
  }
};

export const setLectureMembershipNotification = async ({ channelId, enabled }) => {
  assertLecturesConfigured();

  const currentUserId = await getCurrentUserId();

  logLecturesDb('setLectureMembershipNotification:start', {
    channelId,
    userId: currentUserId,
    enabled: !!enabled,
  });

  try {
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

    const updated = await databases.updateDocument(
      config.databaseId,
      config.lectureMembershipsCollectionId,
      memberships.documents[0].$id,
      {
        notificationsEnabled: !!enabled,
      }
    );

    logLecturesDb('setLectureMembershipNotification:success', {
      channelId,
      userId: currentUserId,
      enabled: !!updated?.notificationsEnabled,
    });
    return updated;
  } catch (error) {
    logLecturesDbError('setLectureMembershipNotification:error', error, {
      channelId,
      userId: currentUserId,
      enabled: !!enabled,
    });
    throw error;
  }
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
  const payload = {
    channelName: sanitizeText(channel?.name) || 'Lecture channel',
    fileName: sanitizeText(asset?.title) || sanitizeText(asset?.fileName) || 'Lecture file',
    deeplink: sanitizeText(deeplink),
    uploadType: sanitizeText(asset?.uploadType),
  };

  return JSON.stringify(payload);
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
        const deeplink = buildChannelDeeplink(channelId, asset.$id);
        const bridgeMessage = buildLectureBridgeMessage({ channel, asset, deeplink });

        await sendMessage(channel.linkedChatId, {
          senderId: currentUserId,
          senderName: 'Lectures',
          content: bridgeMessage,
          type: 'lecture_asset_banner',
          metadata: {
            bannerType: 'lecture_asset',
            channelId,
            channelName: sanitizeText(channel?.name),
            assetId: asset.$id,
            fileName: sanitizeText(asset?.title) || sanitizeText(asset?.fileName),
            uploadType: resolvedUploadType,
            deeplink,
          },
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

export const trackLectureAssetInteraction = async ({
  channelId,
  assetId,
  action,
  userId,
} = {}) => {
  assertLecturesConfigured();

  const normalizedAction = sanitizeText(action).toLowerCase();
  const fieldMap = {
    view: { countFields: ['viewsCount', 'viewCount'], usersFields: ['viewedBy'] },
    open: { countFields: ['opensCount', 'openCount'], usersFields: ['openedBy'] },
    download: { countFields: ['downloadsCount', 'downloadCount'], usersFields: ['downloadedBy'] },
  };

  const mapped = fieldMap[normalizedAction];
  if (!mapped || !channelId || !assetId) {
    return null;
  }

  const currentUserId = userId || await getCurrentUserId();

  logLecturesDb('trackLectureAssetInteraction:start', {
    channelId,
    assetId,
    action: normalizedAction,
    userId: currentUserId,
  });

  try {
    const channel = await getLectureChannelById(channelId);
    await ensureChannelAccessForUser(channel, currentUserId);

    const asset = await databases.getDocument(
      config.databaseId,
      config.lectureAssetsCollectionId,
      assetId
    );

    if (sanitizeText(asset?.channelId) !== sanitizeText(channelId)) {
      throw new Error('Asset channel mismatch');
    }

    const resolvedUsersField = (mapped.usersFields || []).find((field) => {
      return Object.prototype.hasOwnProperty.call(asset || {}, field);
    }) || '';

    const currentIds = resolvedUsersField
      ? toUniqueList(parseStringList(asset?.[resolvedUsersField]))
      : [];
    const nextIds = toUniqueList([...currentIds, currentUserId]);
    const resolvedCountField = (mapped.countFields || []).find((field) => {
      return Object.prototype.hasOwnProperty.call(asset || {}, field);
    }) || '';

    const currentCount = resolvedCountField
      ? Number(asset?.[resolvedCountField] || 0)
      : 0;
    const nextCount = Math.max(currentCount, nextIds.length);

    const payload = {};

    if (resolvedCountField) {
      payload[resolvedCountField] = nextCount;
    }

    if (resolvedUsersField) {
      payload[resolvedUsersField] = nextIds;
    }

    if (!Object.keys(payload).length) {
      logLecturesDb('trackLectureAssetInteraction:skip_no_schema_fields', {
        channelId,
        assetId,
        action: normalizedAction,
      });
      return asset;
    }

    let updated = null;
    try {
      updated = await databases.updateDocument(
        config.databaseId,
        config.lectureAssetsCollectionId,
        assetId,
        payload
      );
    } catch {
      const fallbackPayload = {};
      if (resolvedCountField) {
        fallbackPayload[resolvedCountField] = nextCount;
      }

      if (resolvedUsersField) {
        fallbackPayload[resolvedUsersField] = nextIds.join(',');
      }

      updated = await databases.updateDocument(
        config.databaseId,
        config.lectureAssetsCollectionId,
        assetId,
        fallbackPayload
      );
    }

    logLecturesDb('trackLectureAssetInteraction:success', {
      channelId,
      assetId,
      action: normalizedAction,
      count: nextCount,
    });

    return updated;
  } catch (error) {
    logLecturesDbError('trackLectureAssetInteraction:error', error, {
      channelId,
      assetId,
      action: normalizedAction,
      userId: currentUserId,
    });
    return null;
  }
};

export const updateLectureAssetPinStatus = async ({ channelId, assetId, isPinned }) => {
  assertLecturesConfigured();

  logLecturesDb('updateLectureAssetPinStatus:start', {
    channelId,
    assetId,
    isPinned: !!isPinned,
  });

  if (!channelId || !assetId) {
    throw new Error('Invalid pin request');
  }

  const secureResult = await tryInvokeLectureGuard('pin_asset', {
    channelId,
    assetId,
    isPinned: !!isPinned,
  });

  if (secureResult?.success) {
    const asset = await databases.getDocument(
      config.databaseId,
      config.lectureAssetsCollectionId,
      assetId
    );

    logLecturesDb('updateLectureAssetPinStatus:success_guard', {
      channelId,
      assetId,
      isPinned: !!asset?.isPinned,
    });
    return asset;
  }

  const currentUserId = await getCurrentUserId();
  const channel = await getLectureChannelById(channelId);
  assertChannelManager(channel, currentUserId);

  try {
    const updated = await databases.updateDocument(
      config.databaseId,
      config.lectureAssetsCollectionId,
      assetId,
      {
        isPinned: !!isPinned,
      }
    );

    logLecturesDb('updateLectureAssetPinStatus:success', {
      channelId,
      assetId,
      isPinned: !!updated?.isPinned,
    });
    return updated;
  } catch (error) {
    logLecturesDbError('updateLectureAssetPinStatus:error', error, {
      channelId,
      assetId,
      isPinned: !!isPinned,
    });
    throw error;
  }
};

export const getLectureChannelShareLink = (channelId) => {
  return buildChannelDeeplink(channelId);
};

export const getLectureMembershipSummary = async (channelId, userId) => {
  assertLecturesConfigured();

  const currentUserId = userId || await getCurrentUserId();

  logLecturesDb('getLectureMembershipSummary:start', {
    channelId,
    userId: currentUserId,
  });

  try {
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

    const summary = {
      membership,
      counts: mapMembershipStatusToCounts(channel),
    };

    logLecturesDb('getLectureMembershipSummary:success', {
      channelId,
      userId: currentUserId,
      joinStatus: membership?.joinStatus || '',
      membersCount: summary.counts.membersCount,
      pendingCount: summary.counts.pendingCount,
    });

    return summary;
  } catch (error) {
    if (isMissingDocumentError(error)) {
      logLecturesDb('getLectureMembershipSummary:missing_channel', {
        channelId,
        userId: currentUserId,
      });
    } else {
      logLecturesDbError('getLectureMembershipSummary:error', error, {
        channelId,
        userId: currentUserId,
      });
    }
    throw error;
  }
};

export const getLectureManagers = async (channelId) => {
  assertLecturesConfigured();

  logLecturesDb('getLectureManagers:start', {
    channelId,
  });

  try {
    const channel = await getLectureChannelById(channelId);
    const managerIds = getManagerIds(channel);

    logLecturesDb('getLectureManagers:success', {
      channelId,
      count: managerIds.length,
    });

    return managerIds;
  } catch (error) {
    if (isMissingDocumentError(error)) {
      logLecturesDb('getLectureManagers:missing_channel', {
        channelId,
      });
    } else {
      logLecturesDbError('getLectureManagers:error', error, {
        channelId,
      });
    }
    throw error;
  }
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
  logLecturesDb('getLectureComments:start', {
    channelId,
    assetId,
    limit,
  });

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

  const comments = result.documents || [];
  logLecturesDb('getLectureComments:success', {
    channelId,
    assetId,
    count: comments.length,
  });

  return comments;
};

export const updateLectureComment = async ({ channelId, commentId, text }) => {
  assertLecturesConfigured();
  logLecturesDb('updateLectureComment:start', {
    channelId,
    commentId,
    textLength: sanitizeText(text).length,
  });

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

  try {
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

    logLecturesDb('updateLectureComment:success', {
      channelId,
      commentId,
    });
    return updated;
  } catch (error) {
    logLecturesDbError('updateLectureComment:error', error, {
      channelId,
      commentId,
    });
    throw error;
  }
};

export const deleteLectureComment = async ({ channelId, commentId }) => {
  assertLecturesConfigured();
  logLecturesDb('deleteLectureComment:start', {
    channelId,
    commentId,
  });

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
    const updated = await databases.updateDocument(
      config.databaseId,
      config.lectureCommentsCollectionId,
      commentId,
      {
        isActive: false,
      }
    );

    logLecturesDb('deleteLectureComment:success_softDelete', {
      channelId,
      commentId,
    });
    return updated;
  } catch {
    await databases.deleteDocument(
      config.databaseId,
      config.lectureCommentsCollectionId,
      commentId
    );
    logLecturesDb('deleteLectureComment:success_hardDelete', {
      channelId,
      commentId,
    });
    return { success: true };
  }
};
