/* eslint-disable no-console */

const fs = require('fs');
const path = require('path');

const loadDotEnv = () => {
  const envPath = path.resolve(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) return;

  const raw = fs.readFileSync(envPath, 'utf8');
  raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .forEach((line) => {
      const idx = line.indexOf('=');
      if (idx <= 0) return;
      const key = line.slice(0, idx).trim();
      if (!key || process.env[key]) return;

      let value = line.slice(idx + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"'))
        || (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      process.env[key] = value;
    });
};

loadDotEnv();

const endpoint = String(process.env.APPWRITE_ENDPOINT || process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT || '').replace(/\/+$/, '');
const projectId = process.env.APPWRITE_PROJECT_ID || process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID;
const databaseId = process.env.APPWRITE_DATABASE_ID || process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID;
const apiKey = process.env.APPWRITE_API_KEY;

const collectionIds = {
  chats: process.env.APPWRITE_CHATS_COLLECTION_ID || process.env.EXPO_PUBLIC_APPWRITE_CHATS_COLLECTION_ID,
  messages: process.env.APPWRITE_MESSAGES_COLLECTION_ID || process.env.EXPO_PUBLIC_APPWRITE_MESSAGES_COLLECTION_ID,
  userChatSettings: process.env.APPWRITE_USER_CHAT_SETTINGS_COLLECTION_ID || process.env.EXPO_PUBLIC_APPWRITE_USER_CHAT_SETTINGS_COLLECTION_ID,
  pushTokens: process.env.APPWRITE_PUSH_TOKENS_COLLECTION_ID || process.env.EXPO_PUBLIC_APPWRITE_PUSH_TOKENS_COLLECTION_ID,
  notifications: process.env.APPWRITE_NOTIFICATIONS_COLLECTION_ID || process.env.EXPO_PUBLIC_APPWRITE_NOTIFICATIONS_COLLECTION_ID,
};

const request = async (method, requestPath, body = null) => {
  const url = `${endpoint}${requestPath}`;
  const response = await fetch(url, {
    method,
    headers: {
      'X-Appwrite-Project': projectId,
      'X-Appwrite-Key': apiKey,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  const json = text ? JSON.parse(text) : {};

  if (!response.ok) {
    throw new Error(json?.message || `HTTP ${response.status}`);
  }

  return json;
};

const listAllDocuments = async (collectionId, limit = 100) => {
  let offset = 0;
  const documents = [];

  while (true) {
    const page = await request(
      'GET',
      `/databases/${databaseId}/collections/${collectionId}/documents?limit=${limit}&offset=${offset}`,
    );

    const docs = Array.isArray(page?.documents) ? page.documents : [];
    documents.push(...docs);

    if (docs.length < limit) break;
    offset += limit;
  }

  return documents;
};

const updatePermissions = async (collectionId, docId, permissions) => {
  await request('PATCH', `/databases/${databaseId}/collections/${collectionId}/documents/${docId}`, {
    data: {},
    permissions,
  });
};

const arraysEqualSet = (a = [], b = []) => {
  if (a.length !== b.length) return false;
  const setA = new Set(a);
  return b.every((item) => setA.has(item));
};

const buildSharedChatPermissions = () => [
  'read("users")',
  'update("users")',
  'delete("users")',
];

const buildOwnerOnlyPermissions = (ownerId) => {
  const normalizedOwnerId = String(ownerId || '').trim();
  if (!normalizedOwnerId) return null;

  return [
    `read("user:${normalizedOwnerId}")`,
    `update("user:${normalizedOwnerId}")`,
    `delete("user:${normalizedOwnerId}")`,
  ];
};

const runKind = async (kind, collectionId) => {
  if (!collectionId) {
    console.log(`${kind}: collection id missing, skipped`);
    return;
  }

  const docs = await listAllDocuments(collectionId);
  let updated = 0;
  let skipped = 0;

  for (const doc of docs) {
    let nextPermissions = null;

    if (kind === 'chats' || kind === 'messages') {
      nextPermissions = buildSharedChatPermissions();
    } else {
      nextPermissions = buildOwnerOnlyPermissions(doc?.userId);
    }

    if (!Array.isArray(nextPermissions) || nextPermissions.length === 0) {
      skipped += 1;
      continue;
    }

    const currentPermissions = Array.isArray(doc?.$permissions) ? doc.$permissions : [];
    if (arraysEqualSet(currentPermissions, nextPermissions)) {
      continue;
    }

    await updatePermissions(collectionId, doc.$id, nextPermissions);
    updated += 1;
  }

  console.log(`${kind}: scanned=${docs.length}, updated=${updated}, skipped=${skipped}`);
};

const run = async () => {
  if (!endpoint || !projectId || !databaseId || !apiKey) {
    throw new Error('Missing required env vars (endpoint/project/database/api key)');
  }

  await runKind('chats', collectionIds.chats);
  await runKind('messages', collectionIds.messages);
  await runKind('userChatSettings', collectionIds.userChatSettings);
  await runKind('pushTokens', collectionIds.pushTokens);
  await runKind('notifications', collectionIds.notifications);
};

run().catch((error) => {
  console.error('fixChatAcl failed:', error?.message || error);
  process.exit(1);
});
