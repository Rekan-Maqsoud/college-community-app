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
const collectionId = process.env.APPWRITE_SUGGESTIONS_COLLECTION_ID || process.env.EXPO_PUBLIC_APPWRITE_SUGGESTIONS_COLLECTION_ID || 'suggestions';

const request = async (method, requestPath, body = null, allow404 = false) => {
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

  if (allow404 && response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(json?.message || `HTTP ${response.status}`);
  }

  return json;
};

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isAlreadyExistsError = (error) => {
  const message = String(error?.message || '').toLowerCase();
  return message.includes('already exists') || message.includes('duplicate');
};

const ensureCollection = async () => {
  const existing = await request('GET', `/databases/${databaseId}/collections/${collectionId}`, null, true);
  if (existing?.$id) {
    console.log(`collection exists: ${collectionId}`);
    return;
  }

  await request('POST', `/databases/${databaseId}/collections`, {
    collectionId,
    name: 'Suggestions',
    documentSecurity: true,
    permissions: [
      'create("users")',
      'read("team:admins")',
      'update("team:admins")',
      'delete("team:admins")',
    ],
    enabled: true,
  });

  console.log(`collection created: ${collectionId}`);
};

const ensureStringAttribute = async ({ key, size, required = false, defaultValue = null }) => {
  try {
    await request('POST', `/databases/${databaseId}/collections/${collectionId}/attributes/string`, {
      key,
      size,
      required,
      default: defaultValue,
      array: false,
    });
    console.log(`attribute created: ${key}`);
  } catch (error) {
    if (isAlreadyExistsError(error)) {
      console.log(`attribute exists: ${key}`);
      return;
    }
    throw error;
  }

  for (let i = 0; i < 20; i += 1) {
    const attribute = await request('GET', `/databases/${databaseId}/collections/${collectionId}/attributes/${key}`, null, true);
    if (attribute?.status === 'available') {
      return;
    }
    await delay(500);
  }
};

const ensureIndex = async ({ key, attributes, orders }) => {
  try {
    await request('POST', `/databases/${databaseId}/collections/${collectionId}/indexes`, {
      key,
      type: 'key',
      attributes,
      orders,
    });
    console.log(`index created: ${key}`);
  } catch (error) {
    if (isAlreadyExistsError(error)) {
      console.log(`index exists: ${key}`);
      return;
    }
    throw error;
  }
};

const run = async () => {
  if (!endpoint || !projectId || !databaseId || !apiKey) {
    throw new Error('Missing APPWRITE endpoint/project/database/api-key env variables');
  }

  await ensureCollection();

  await ensureStringAttribute({ key: 'userId', size: 255, required: true });
  await ensureStringAttribute({ key: 'userName', size: 255, required: false });
  await ensureStringAttribute({ key: 'userEmail', size: 320, required: false });
  await ensureStringAttribute({ key: 'category', size: 32, required: true });
  await ensureStringAttribute({ key: 'title', size: 120, required: true });
  await ensureStringAttribute({ key: 'message', size: 1500, required: true });
  await ensureStringAttribute({ key: 'status', size: 32, required: true });
  await ensureStringAttribute({ key: 'appVersion', size: 64, required: false });
  await ensureStringAttribute({ key: 'platform', size: 32, required: false });

  await ensureIndex({ key: 'idx_suggestions_userId', attributes: ['userId'], orders: ['ASC'] });
  await ensureIndex({ key: 'idx_suggestions_status', attributes: ['status'], orders: ['ASC'] });
  await ensureIndex({ key: 'idx_suggestions_category', attributes: ['category'], orders: ['ASC'] });

  console.log('Suggestions collection setup completed successfully.');
};

run().catch((error) => {
  console.error('createSuggestionsCollection failed:', error?.message || error);
  process.exit(1);
});