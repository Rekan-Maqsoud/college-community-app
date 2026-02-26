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
const collectionId = process.env.APPWRITE_REPLIES_COLLECTION_ID || process.env.EXPO_PUBLIC_APPWRITE_REPLIES_COLLECTION_ID;
const apiKey = process.env.APPWRITE_API_KEY;

const request = async (method, requestPath, body = null) => {
  const response = await fetch(`${endpoint}${requestPath}`, {
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

const expectedCollectionPermissions = [
  'create("users")',
  'read("users")',
  'update("users")',
];

const expectedDocPermissions = (ownerId) => [
  'read("users")',
  'update("users")',
  `update("user:${ownerId}")`,
  `delete("user:${ownerId}")`,
];

const samePermissions = (current, expected) => {
  if (!Array.isArray(current)) return false;
  if (current.length !== expected.length) return false;
  return expected.every((perm) => current.includes(perm));
};

const listDocumentsPage = async (limit, offset) => {
  return request(
    'GET',
    `/databases/${databaseId}/collections/${collectionId}/documents?limit=${limit}&offset=${offset}`,
  );
};

const run = async () => {
  if (!endpoint || !projectId || !databaseId || !collectionId || !apiKey) {
    throw new Error('Missing required Appwrite env variables');
  }

  const collection = await request('GET', `/databases/${databaseId}/collections/${collectionId}`);
  const currentCollectionPermissions = Array.isArray(collection?.$permissions) ? collection.$permissions : [];

  if (!samePermissions(currentCollectionPermissions, expectedCollectionPermissions)) {
    await request('PUT', `/databases/${databaseId}/collections/${collectionId}`, {
      name: collection.name,
      permissions: expectedCollectionPermissions,
      documentSecurity: true,
      enabled: collection.enabled !== false,
    });
    console.log('Updated collection-level permissions for replies.');
  } else {
    console.log('Collection-level permissions already correct.');
  }

  let offset = 0;
  const limit = 100;
  let scanned = 0;
  let updated = 0;
  let skipped = 0;

  while (true) {
    const page = await listDocumentsPage(limit, offset);
    const docs = page?.documents || [];

    for (const doc of docs) {
      scanned += 1;
      const ownerId = String(doc?.userId || '').trim();
      if (!ownerId) {
        skipped += 1;
        continue;
      }

      const nextPermissions = expectedDocPermissions(ownerId);
      const current = Array.isArray(doc?.$permissions) ? doc.$permissions : [];
      if (samePermissions(current, nextPermissions)) continue;

      await request('PATCH', `/databases/${databaseId}/collections/${collectionId}/documents/${doc.$id}`, {
        data: {},
        permissions: nextPermissions,
      });
      updated += 1;
    }

    if (docs.length < limit) break;
    offset += limit;
  }

  console.log(`Replies ACL check complete. scanned=${scanned}, updated=${updated}, skipped=${skipped}`);
};

run().catch((error) => {
  console.error('fixRepliesAcl failed:', error?.message || error);
  process.exit(1);
});
