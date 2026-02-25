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
const apiKey = process.env.APPWRITE_API_KEY;

const collectionIds = {
  memberships: process.env.EXPO_PUBLIC_APPWRITE_LECTURE_MEMBERSHIPS_COLLECTION_ID,
  assets: process.env.EXPO_PUBLIC_APPWRITE_LECTURE_ASSETS_COLLECTION_ID,
  comments: process.env.EXPO_PUBLIC_APPWRITE_LECTURE_COMMENTS_COLLECTION_ID,
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

const listDocuments = async (collectionId) => {
  return request('GET', `/databases/${databaseId}/collections/${collectionId}/documents`);
};

const updatePermissions = async (collectionId, docId, permissions) => {
  return request('PATCH', `/databases/${databaseId}/collections/${collectionId}/documents/${docId}`, {
    data: {},
    permissions,
  });
};

const buildPermissions = (doc, kind) => {
  let ownerId = '';
  if (kind === 'memberships') ownerId = String(doc.userId || '').trim();
  if (kind === 'assets') ownerId = String(doc.uploaderId || '').trim();
  if (kind === 'comments') ownerId = String(doc.userId || '').trim();
  if (!ownerId) return null;

  return [
    'read("users")',
    `update("user:${ownerId}")`,
    `delete("user:${ownerId}")`,
  ];
};

const runKind = async (kind, collectionId) => {
  if (!collectionId) {
    console.log(`${kind}: collection id missing, skip`);
    return;
  }

  const page = await listDocuments(collectionId);
  const docs = page?.documents || [];
  let updated = 0;

  for (const doc of docs) {
    const next = buildPermissions(doc, kind);
    if (!next) continue;

    const current = Array.isArray(doc.$permissions) ? doc.$permissions : [];
    const same = current.length === next.length && next.every((perm) => current.includes(perm));
    if (same) continue;

    await updatePermissions(collectionId, doc.$id, next);
    updated += 1;
  }

  console.log(`${kind}: scanned=${docs.length}, updated=${updated}`);
};

const run = async () => {
  if (!endpoint || !projectId || !databaseId || !apiKey) {
    throw new Error('Missing required env for Appwrite migration');
  }

  await runKind('memberships', collectionIds.memberships);
  await runKind('assets', collectionIds.assets);
  await runKind('comments', collectionIds.comments);
};

run().catch((error) => {
  console.error('fixLectureAcl failed:', error?.message || error);
  process.exit(1);
});
