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
const postsCollectionId = process.env.APPWRITE_POSTS_COLLECTION_ID || process.env.EXPO_PUBLIC_APPWRITE_POSTS_COLLECTION_ID;
const apiKey = process.env.APPWRITE_API_KEY;

const POLL_DATA_KEY = 'pollData';
const POLL_DATA_SIZE = 16384;

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

const listAttributes = async () => {
  const response = await request(
    'GET',
    `/databases/${databaseId}/collections/${postsCollectionId}/attributes?limit=200`
  );

  return Array.isArray(response?.attributes) ? response.attributes : [];
};

const waitUntilAvailable = async (key) => {
  for (let i = 0; i < 30; i += 1) {
    const attr = await request(
      'GET',
      `/databases/${databaseId}/collections/${postsCollectionId}/attributes/${encodeURIComponent(key)}`,
      null,
      true
    );

    if (attr?.status === 'available') {
      return;
    }

    await delay(500);
  }

  throw new Error(`Timed out waiting for attribute ${key} to become available`);
};

const ensurePollDataAttribute = async () => {
  const attributes = await listAttributes();
  const existing = attributes.find((attr) => attr?.key === POLL_DATA_KEY && attr?.type === 'string');

  if (existing?.status === 'available') {
    console.log(`[ok] ${POLL_DATA_KEY} already exists and is available`);
    return;
  }

  if (existing) {
    console.log(`[wait] ${POLL_DATA_KEY} exists with status: ${existing.status}`);
    await waitUntilAvailable(POLL_DATA_KEY);
    console.log(`[ok] ${POLL_DATA_KEY} is now available`);
    return;
  }

  try {
    await request('POST', `/databases/${databaseId}/collections/${postsCollectionId}/attributes/string`, {
      key: POLL_DATA_KEY,
      size: POLL_DATA_SIZE,
      required: false,
      default: null,
      array: false,
    });
    console.log(`[create] ${POLL_DATA_KEY} attribute created`);
  } catch (error) {
    if (!isAlreadyExistsError(error)) {
      throw error;
    }
    console.log(`[exists] ${POLL_DATA_KEY} attribute already exists`);
  }

  await waitUntilAvailable(POLL_DATA_KEY);
  console.log(`[ok] ${POLL_DATA_KEY} attribute available`);
};

const run = async () => {
  if (!endpoint || !projectId || !databaseId || !postsCollectionId || !apiKey) {
    throw new Error('Missing required Appwrite env vars: endpoint, projectId, databaseId, postsCollectionId, apiKey');
  }

  await ensurePollDataAttribute();
};

run().catch((error) => {
  console.error('ensurePostsPollDataAttribute failed:', error?.message || error);
  process.exit(1);
});
