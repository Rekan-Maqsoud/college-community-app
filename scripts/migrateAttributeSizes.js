/* eslint-disable no-console */

const fs = require('fs');
const path = require('path');
const { Client } = require('appwrite');

const TARGET_KEYS = new Set([
  'profileViews',
  'chatBlockedUsers',
  'pinnedChannelsJson',
  'originalPostOwnerId',
  'coverImageUrl',
  'openedBy',
  'stage',
  'department',
]);

const TARGET_SIZE = 16384;
const MIN_LARGE_STRING_SIZE = 1000;
const MAX_VARCHAR_SIZE = 16383;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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

const endpoint = String(
  process.env.APPWRITE_ENDPOINT || process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT || '',
).replace(/\/+$/, '');
const projectId = process.env.APPWRITE_PROJECT_ID || process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID;
const databaseId = process.env.APPWRITE_DATABASE_ID || process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID;
const apiKey = process.env.APPWRITE_API_KEY;

const client = new Client()
  .setEndpoint(endpoint)
  .setProject(projectId);

const required = {
  endpoint,
  projectId,
  databaseId,
  apiKey,
};

const missing = Object.entries(required)
  .filter(([, value]) => !value)
  .map(([key]) => key);

if (missing.length) {
  console.error('Missing required Appwrite configuration:', missing.join(', '));
  process.exit(1);
}

const request = async (method, requestPath, body = null) => {
  try {
    return await client.call(
      method,
      `${endpoint}${requestPath}`,
      {
        'X-Appwrite-Key': apiKey,
        'content-type': 'application/json',
      },
      body || {},
    );
  } catch (error) {
    throw new Error(`${method} ${requestPath} failed: ${error?.message || 'Unknown error'}`);
  }
};

const listAllCollections = async () => {
  const collections = [];
  let offset = 0;
  const limit = 100;

  while (true) {
    const page = await request('GET', `/databases/${databaseId}/collections?limit=${limit}&offset=${offset}`);
    const docs = Array.isArray(page?.collections) ? page.collections : [];
    collections.push(...docs);
    if (docs.length < limit) break;
    offset += limit;
  }

  return collections;
};

const listAllAttributes = async (collectionId) => {
  const attributes = [];
  let offset = 0;
  const limit = 100;

  while (true) {
    const page = await request(
      'GET',
      `/databases/${databaseId}/collections/${collectionId}/attributes?limit=${limit}&offset=${offset}`,
    );
    const docs = Array.isArray(page?.attributes) ? page.attributes : [];
    attributes.push(...docs);
    if (docs.length < limit) break;
    offset += limit;
  }

  return attributes;
};

const waitForAttributeReady = async (collectionId, key, timeoutMs = 180000) => {
  const started = Date.now();

  while (Date.now() - started < timeoutMs) {
    const attrs = await listAllAttributes(collectionId);
    const attr = attrs.find((item) => item.key === key && item.type === 'string');

    if (!attr) {
      throw new Error(`Attribute not found during verification for ${collectionId}.${key}`);
    }

    if (attr?.status === 'available' && Number(attr?.size) === TARGET_SIZE) {
      return attr;
    }

    if (attr?.status === 'failed') {
      throw new Error(`Attribute update failed for ${collectionId}.${key}`);
    }

    await sleep(2000);
  }

  throw new Error(`Timed out waiting for ${collectionId}.${key} to reach size ${TARGET_SIZE}`);
};

const main = async () => {
  console.log('Starting Appwrite schema migration...');
  console.log(`Target size: ${TARGET_SIZE}`);
  console.log(`Target keys: ${Array.from(TARGET_KEYS).join(', ')}`);

  const collections = await listAllCollections();
  const discovered = [];
  const matches = [];

  for (const collection of collections) {
    const attributes = await listAllAttributes(collection.$id);

    for (const attr of attributes) {
      const item = {
        collectionId: collection.$id,
        collectionName: collection.name,
        key: attr.key,
        type: attr.type,
        size: Number(attr.size),
        required: Boolean(attr.required),
        default: Object.prototype.hasOwnProperty.call(attr, 'default') ? attr.default : null,
        array: Boolean(attr.array),
      };

      const isTargetKey = TARGET_KEYS.has(attr.key);
      const isLargeString = (
        attr.type === 'string'
        && Number(attr.size) >= MIN_LARGE_STRING_SIZE
        && Number(attr.size) <= MAX_VARCHAR_SIZE
      );

      if (!isTargetKey && !isLargeString) continue;

      discovered.push(item);

      if (attr.type !== 'string') continue;

      matches.push({
        ...item,
      });
    }
  }

  const foundKeys = new Set(
    discovered
      .filter((item) => TARGET_KEYS.has(item.key))
      .map((item) => item.key),
  );
  const missingKeys = Array.from(TARGET_KEYS).filter((key) => !foundKeys.has(key));
  const nonStringMatches = discovered.filter((item) => item.type !== 'string');

  console.log('\nDiscovery summary:');
  if (discovered.length) {
    discovered.forEach((item) => {
      console.log(`- ${item.collectionId}.${item.key} (type=${item.type}, size=${item.size}, array=${item.array})`);
    });
  } else {
    console.log('- No requested keys found in any collection attributes.');
  }

  if (missingKeys.length) {
    console.log(`Missing requested keys: ${missingKeys.join(', ')}`);
  } else {
    console.log('All requested keys were found at least once.');
  }

  if (nonStringMatches.length) {
    console.log('Non-string target attributes found (left unchanged by design):');
    nonStringMatches.forEach((item) => {
      console.log(`- ${item.collectionId}.${item.key} (type=${item.type})`);
    });
  }

  if (!matches.length) {
    console.log('No matching string attributes found for update.');
    return;
  }

  console.log(`Found ${matches.length} matching string attribute(s):`);
  matches.forEach((item) => {
    console.log(`- ${item.collectionId}.${item.key} (size=${item.size}, array=${item.array})`);
  });

  const updates = [];

  for (const item of matches) {
    const shouldUpdate = (
      item.size !== TARGET_SIZE
      && (
        TARGET_KEYS.has(item.key)
        || (item.size >= MIN_LARGE_STRING_SIZE && item.size <= MAX_VARCHAR_SIZE)
      )
    );

    if (!shouldUpdate) {
      console.log(`Skipping ${item.collectionId}.${item.key}: already size ${TARGET_SIZE}`);
      updates.push({ ...item, updated: false, finalSize: item.size });
      continue;
    }

    console.log(`Updating ${item.collectionId}.${item.key} from ${item.size} -> ${TARGET_SIZE}`);

    await request(
      'PATCH',
      `/databases/${databaseId}/collections/${item.collectionId}/attributes/string/${item.key}`,
      {
        required: item.required,
        default: item.default,
        array: item.array,
        size: TARGET_SIZE,
      },
    );

    const ready = await waitForAttributeReady(item.collectionId, item.key);

    updates.push({
      ...item,
      updated: true,
      finalSize: Number(ready.size),
      finalStatus: ready.status,
    });

    console.log(`Updated ${item.collectionId}.${item.key} to size=${ready.size}`);
  }

  console.log('\nMigration complete. Summary:');
  updates.forEach((item) => {
    console.log(
      `- ${item.collectionId}.${item.key}: ${item.updated ? 'updated' : 'unchanged'} (finalSize=${item.finalSize})`,
    );
  });
};

main().catch((error) => {
  console.error('Migration failed:', error.message);
  process.exit(1);
});
