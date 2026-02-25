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

const endpoint = String(process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT || '').replace(/\/+$/, '');
const projectId = process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID;
const databaseId = process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID;
const usersCollectionId = process.env.EXPO_PUBLIC_APPWRITE_USERS_COLLECTION_ID;
const apiKey = process.env.APPWRITE_API_KEY;

const request = async (method, requestPath, body = null, params = null) => {
  const url = new URL(`${endpoint}${requestPath}`);
  if (params && typeof params === 'object') {
    Object.entries(params).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value.forEach((item) => url.searchParams.append(key, item));
      } else if (value !== undefined && value !== null) {
        url.searchParams.append(key, value);
      }
    });
  }

  const response = await fetch(url.toString(), {
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

const listUsers = async () => {
  return request(
    'GET',
    `/databases/${databaseId}/collections/${usersCollectionId}/documents`,
  );
};

const ensurePermissions = (doc) => {
  const userId = doc?.$id || doc?.userID;
  if (!userId) return null;

  const next = [
    'read("users")',
    `read("user:${userId}")`,
    `update("user:${userId}")`,
    `delete("user:${userId}")`,
  ];

  return Array.from(new Set(next));
};

const updateUserAcl = async (docId, permissions) => {
  return request(
    'PATCH',
    `/databases/${databaseId}/collections/${usersCollectionId}/documents/${docId}`,
    {
      data: {},
      permissions,
    },
  );
};

const run = async () => {
  if (!endpoint || !projectId || !databaseId || !usersCollectionId || !apiKey) {
    console.error('Missing required env. Need EXPO_PUBLIC_APPWRITE_* + APPWRITE_API_KEY.');
    process.exit(1);
  }

  const result = await listUsers();
  const docs = result?.documents || [];

  let updated = 0;
  for (const doc of docs) {
    const permissions = ensurePermissions(doc);
    if (!permissions) continue;
    const existing = Array.isArray(doc.$permissions) ? doc.$permissions : [];
    const same =
      existing.length === permissions.length
      && permissions.every((perm) => existing.includes(perm));

    if (same) continue;

    await updateUserAcl(doc.$id, permissions);
    updated += 1;
  }

  console.log(`Users scanned: ${docs.length}`);
  console.log(`Users ACL updated: ${updated}`);
};

run().catch((error) => {
  console.error('fixUsersReadAcl failed:', error?.message || error);
  process.exit(1);
});
