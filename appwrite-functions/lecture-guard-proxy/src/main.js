import { Client, Account, Databases } from 'node-appwrite';

const json = (res, status, payload) => res.json(payload, status);

const parseBody = (req) => {
  if (req.body && typeof req.body === 'object') {
    return req.body;
  }

  const candidates = [req.bodyText, req.bodyRaw, req.body];
  for (const candidate of candidates) {
    if (typeof candidate !== 'string' || !candidate.trim()) {
      continue;
    }

    try {
      return JSON.parse(candidate);
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
  return key ? String(headers[key] || '') : '';
};

const normalizeList = (value) => {
  if (Array.isArray(value)) {
    return [...new Set(value.map(item => String(item || '').trim()).filter(Boolean))];
  }

  const raw = String(value || '').trim();
  if (!raw) {
    return [];
  }

  return [...new Set(raw.split(',').map(item => item.trim()).filter(Boolean))];
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

const assertManager = (channel, userId) => {
  const ownerId = String(channel?.ownerId || '');
  const managerIds = normalizeList(channel?.managerIds);

  if (ownerId !== userId && !managerIds.includes(userId)) {
    throw new Error('Not authorized');
  }
};

export default async ({ req, res }) => {
  try {
    if (req.method !== 'POST') {
      return json(res, 405, { success: false, error: 'Method not allowed' });
    }

    const authHeader = getHeader(req.headers, 'authorization');
    if (!authHeader.startsWith('Bearer ')) {
      return json(res, 401, { success: false, error: 'Missing bearer token' });
    }

    const jwt = authHeader.slice('Bearer '.length).trim();
    if (!jwt) {
      return json(res, 401, { success: false, error: 'Invalid bearer token' });
    }

    const endpoint = getEnv('APPWRITE_ENDPOINT', 'EXPO_PUBLIC_APPWRITE_ENDPOINT');
    const projectId = getEnv('APPWRITE_PROJECT_ID', 'EXPO_PUBLIC_APPWRITE_PROJECT_ID');
    const apiKey = getEnv('APPWRITE_API_KEY', 'EXPO_PUBLIC_APPWRITE_API_KEY', 'APPWRITE_FUNCTION_API_KEY');
    const databaseId = getEnv('APPWRITE_DATABASE_ID', 'EXPO_PUBLIC_APPWRITE_DATABASE_ID');
    const channelsCollectionId = getEnv(
      'APPWRITE_LECTURE_CHANNELS_COLLECTION_ID',
      'EXPO_PUBLIC_APPWRITE_LECTURE_CHANNELS_COLLECTION_ID'
    );
    const membershipsCollectionId = getEnv(
      'APPWRITE_LECTURE_MEMBERSHIPS_COLLECTION_ID',
      'EXPO_PUBLIC_APPWRITE_LECTURE_MEMBERSHIPS_COLLECTION_ID'
    );
    const assetsCollectionId = getEnv(
      'APPWRITE_LECTURE_ASSETS_COLLECTION_ID',
      'EXPO_PUBLIC_APPWRITE_LECTURE_ASSETS_COLLECTION_ID'
    );

    if (!endpoint || !projectId || !apiKey || !databaseId || !channelsCollectionId || !membershipsCollectionId || !assetsCollectionId) {
      return json(res, 500, { success: false, error: 'Function env is not configured' });
    }

    const authClient = new Client()
      .setEndpoint(endpoint)
      .setProject(projectId)
      .setJWT(jwt);

    const account = new Account(authClient);
    const currentUser = await account.get();
    const currentUserId = String(currentUser?.$id || '');

    if (!currentUserId) {
      return json(res, 401, { success: false, error: 'Unauthorized' });
    }

    const serviceClient = new Client()
      .setEndpoint(endpoint)
      .setProject(projectId)
      .setKey(apiKey);

    const db = new Databases(serviceClient);

    const body = parseBody(req);
    if (!body || typeof body !== 'object') {
      return json(res, 400, { success: false, error: 'Invalid JSON body' });
    }

    const action = String(body.action || '');
    const payload = body.payload && typeof body.payload === 'object' ? body.payload : {};

    if (!action) {
      return json(res, 400, { success: false, error: 'Missing action' });
    }

    const channelId = String(payload.channelId || '');
    if (!channelId) {
      return json(res, 400, { success: false, error: 'Missing channelId' });
    }

    const channel = await db.getDocument(databaseId, channelsCollectionId, channelId);
    assertManager(channel, currentUserId);

    if (action === 'update_membership_status') {
      const membershipId = String(payload.membershipId || '');
      const status = String(payload.status || 'pending');
      const allowedStatus = status === 'approved' || status === 'rejected' ? status : 'pending';

      if (!membershipId) {
        return json(res, 400, { success: false, error: 'Missing membershipId' });
      }

      const membership = await db.getDocument(databaseId, membershipsCollectionId, membershipId);
      if (String(membership?.channelId || '') !== channelId) {
        return json(res, 400, { success: false, error: 'Membership channel mismatch' });
      }

      const updatePayload = {
        joinStatus: allowedStatus,
      };

      if (allowedStatus === 'approved') {
        updatePayload.approvedAt = new Date().toISOString();
      }

      await db.updateDocument(databaseId, membershipsCollectionId, membershipId, updatePayload);
      return json(res, 200, { success: true });
    }

    if (action === 'update_channel_settings') {
      const updates = payload.updates && typeof payload.updates === 'object' ? payload.updates : {};
      const next = {};

      if (Object.prototype.hasOwnProperty.call(updates, 'name')) {
        next.name = String(updates.name || '').trim();
      }
      if (Object.prototype.hasOwnProperty.call(updates, 'description')) {
        next.description = String(updates.description || '').trim();
      }
      if (Object.prototype.hasOwnProperty.call(updates, 'linkedChatId')) {
        next.linkedChatId = String(updates.linkedChatId || '').trim();
      }
      if (Object.prototype.hasOwnProperty.call(updates, 'accessType')) {
        const requested = String(updates.accessType || '');
        if (channel.channelType === 'official') {
          next.accessType = 'approval_required';
        } else {
          next.accessType = requested === 'open' ? 'open' : 'approval_required';
        }
      }
      if (Object.prototype.hasOwnProperty.call(updates, 'notificationsDefaultOn')) {
        next.notificationsDefaultOn = !!updates.notificationsDefaultOn;
      }
      if (Object.prototype.hasOwnProperty.call(updates, 'settingsJson')) {
        next.settingsJson = typeof updates.settingsJson === 'string'
          ? updates.settingsJson
          : JSON.stringify(updates.settingsJson || {});
      }
      if (Object.prototype.hasOwnProperty.call(updates, 'coverImageUrl')) {
        next.coverImageUrl = String(updates.coverImageUrl || '').trim();
      }
      if (Object.prototype.hasOwnProperty.call(updates, 'managerIds')) {
        next.managerIds = normalizeList(updates.managerIds).join(',');
      }

      await db.updateDocument(databaseId, channelsCollectionId, channelId, next);
      return json(res, 200, { success: true });
    }

    if (action === 'add_manager') {
      const managerUserId = String(payload.managerUserId || '').trim();
      if (!managerUserId) {
        return json(res, 400, { success: false, error: 'Missing managerUserId' });
      }

      const currentManagers = normalizeList(channel.managerIds);
      const nextManagers = [...new Set([...currentManagers, managerUserId])];

      await db.updateDocument(databaseId, channelsCollectionId, channelId, {
        managerIds: nextManagers.join(','),
      });

      return json(res, 200, { success: true });
    }

    if (action === 'remove_manager') {
      const managerUserId = String(payload.managerUserId || '').trim();
      if (!managerUserId) {
        return json(res, 400, { success: false, error: 'Missing managerUserId' });
      }

      if (String(channel.ownerId || '') === managerUserId) {
        return json(res, 400, { success: false, error: 'Cannot remove owner' });
      }

      const currentManagers = normalizeList(channel.managerIds);
      const nextManagers = currentManagers.filter(id => id !== managerUserId);

      await db.updateDocument(databaseId, channelsCollectionId, channelId, {
        managerIds: nextManagers.join(','),
      });

      return json(res, 200, { success: true });
    }

    if (action === 'pin_asset') {
      const assetId = String(payload.assetId || '').trim();
      const isPinned = !!payload.isPinned;

      if (!assetId) {
        return json(res, 400, { success: false, error: 'Missing assetId' });
      }

      const asset = await db.getDocument(databaseId, assetsCollectionId, assetId);
      if (String(asset.channelId || '') !== channelId) {
        return json(res, 400, { success: false, error: 'Asset channel mismatch' });
      }

      await db.updateDocument(databaseId, assetsCollectionId, assetId, {
        isPinned,
      });

      return json(res, 200, { success: true });
    }

    return json(res, 400, { success: false, error: 'Unsupported action' });
  } catch (error) {
    return json(res, 500, {
      success: false,
      error: error?.message || 'Internal server error',
    });
  }
};
