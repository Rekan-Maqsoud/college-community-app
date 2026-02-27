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

const endpoint = process.env.APPWRITE_ENDPOINT || process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT;
const projectId = process.env.APPWRITE_PROJECT_ID || process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID;
const apiKey = process.env.APPWRITE_API_KEY;
const databaseId = process.env.APPWRITE_DATABASE_ID || process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID;

const collectionEnvMap = {
  chats: process.env.APPWRITE_CHATS_COLLECTION_ID || process.env.EXPO_PUBLIC_APPWRITE_CHATS_COLLECTION_ID,
  messages: process.env.APPWRITE_MESSAGES_COLLECTION_ID || process.env.EXPO_PUBLIC_APPWRITE_MESSAGES_COLLECTION_ID,
  notifications:
    process.env.APPWRITE_NOTIFICATIONS_COLLECTION_ID ||
    process.env.EXPO_PUBLIC_APPWRITE_NOTIFICATIONS_COLLECTION_ID,
  userChatSettings:
    process.env.APPWRITE_USER_CHAT_SETTINGS_COLLECTION_ID ||
    process.env.EXPO_PUBLIC_APPWRITE_USER_CHAT_SETTINGS_COLLECTION_ID,
  posts: process.env.APPWRITE_POSTS_COLLECTION_ID || process.env.EXPO_PUBLIC_APPWRITE_POSTS_COLLECTION_ID,
  replies: process.env.APPWRITE_REPLIES_COLLECTION_ID || process.env.EXPO_PUBLIC_APPWRITE_REPLIES_COLLECTION_ID,
  users: process.env.APPWRITE_USERS_COLLECTION_ID || process.env.EXPO_PUBLIC_APPWRITE_USERS_COLLECTION_ID,
  pushTokens:
    process.env.APPWRITE_PUSH_TOKENS_COLLECTION_ID || process.env.EXPO_PUBLIC_APPWRITE_PUSH_TOKENS_COLLECTION_ID,
  repElections:
    process.env.APPWRITE_REP_ELECTIONS_COLLECTION_ID || process.env.EXPO_PUBLIC_APPWRITE_REP_ELECTIONS_COLLECTION_ID,
  repVotes: process.env.APPWRITE_REP_VOTES_COLLECTION_ID || process.env.EXPO_PUBLIC_APPWRITE_REP_VOTES_COLLECTION_ID,
  lectureChannels:
    process.env.APPWRITE_LECTURE_CHANNELS_COLLECTION_ID || process.env.EXPO_PUBLIC_APPWRITE_LECTURE_CHANNELS_COLLECTION_ID,
  lectureMemberships:
    process.env.APPWRITE_LECTURE_MEMBERSHIPS_COLLECTION_ID ||
    process.env.EXPO_PUBLIC_APPWRITE_LECTURE_MEMBERSHIPS_COLLECTION_ID,
  lectureAssets:
    process.env.APPWRITE_LECTURE_ASSETS_COLLECTION_ID || process.env.EXPO_PUBLIC_APPWRITE_LECTURE_ASSETS_COLLECTION_ID,
  lectureComments:
    process.env.APPWRITE_LECTURE_COMMENTS_COLLECTION_ID || process.env.EXPO_PUBLIC_APPWRITE_LECTURE_COMMENTS_COLLECTION_ID,
  suggestions:
    process.env.APPWRITE_SUGGESTIONS_COLLECTION_ID || process.env.EXPO_PUBLIC_APPWRITE_SUGGESTIONS_COLLECTION_ID,
};

const policyMap = {
  chats: { allowBroadReadRows: false, requireRowSecurity: true },
  messages: { allowBroadReadRows: false, requireRowSecurity: true },
  notifications: { allowBroadReadRows: false, requireRowSecurity: true },
  userChatSettings: { allowBroadReadRows: false, requireRowSecurity: true },
  pushTokens: { allowBroadReadRows: false, requireRowSecurity: true },
  repVotes: { allowBroadReadRows: false, requireRowSecurity: true },

  posts: { allowBroadReadRows: true, requireRowSecurity: true },
  replies: { allowBroadReadRows: true, requireRowSecurity: true },
  users: { allowBroadReadRows: true, requireRowSecurity: true },
  repElections: { allowBroadReadRows: true, requireRowSecurity: true },

  lectureChannels: { allowBroadReadRows: true, requireRowSecurity: true },
  lectureAssets: { allowBroadReadRows: true, requireRowSecurity: true },
  lectureComments: { allowBroadReadRows: true, requireRowSecurity: true },
  lectureMemberships: { allowBroadReadRows: false, requireRowSecurity: true },
  suggestions: { allowBroadReadRows: false, requireRowSecurity: true },
};

const broadRolePatterns = [/\("any"\)/i, /\("users"\)/i, /\("guests"\)/i];

const isBroad = (permissionString) => {
  if (!permissionString || typeof permissionString !== 'string') return false;
  return broadRolePatterns.some((pattern) => pattern.test(permissionString));
};

const parseAction = (permissionString) => {
  const match = String(permissionString).match(/^(create|read|update|delete|write)\(/i);
  return match ? match[1].toLowerCase() : 'unknown';
};

const readRowSecurityFlag = (collection) => {
  if (typeof collection?.documentSecurity === 'boolean') return collection.documentSecurity;
  if (typeof collection?.rowSecurity === 'boolean') return collection.rowSecurity;
  return null;
};

const printHeader = (title) => {
  console.log('\n==================================================');
  console.log(title);
  console.log('==================================================');
};

const printWarning = (message) => console.log(`⚠️  ${message}`);
const printOk = (message) => console.log(`✅ ${message}`);
const printInfo = (message) => console.log(`ℹ️  ${message}`);

const cleanEndpoint = (rawEndpoint) => String(rawEndpoint || '').replace(/\/+$/, '');

const appwriteRequest = async (requestPath, params = null) => {
  const base = cleanEndpoint(endpoint);
  const url = new URL(`${base}${requestPath}`);

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
    method: 'GET',
    headers: {
      'X-Appwrite-Project': projectId,
      'X-Appwrite-Key': apiKey,
      'Content-Type': 'application/json',
    },
  });

  const text = await response.text();
  let parsed;
  try {
    parsed = text ? JSON.parse(text) : {};
  } catch (_) {
    parsed = { message: text };
  }

  if (!response.ok) {
    const message = parsed?.message || `HTTP ${response.status}`;
    throw new Error(message);
  }

  return parsed;
};

const getCollection = async (collectionId) => {
  return appwriteRequest(`/databases/${databaseId}/collections/${collectionId}`);
};

const fetchAllDocuments = async (collectionId) => {
  const page = await appwriteRequest(`/databases/${databaseId}/collections/${collectionId}/documents`);
  return {
    documents: page?.documents || [],
    total: Number(page?.total || 0),
  };
};

const auditCollection = async (databases, tableName, collectionId) => {
  const policy = policyMap[tableName] || {
    allowBroadReadRows: false,
    requireRowSecurity: true,
  };

  printHeader(`Table: ${tableName} (${collectionId})`);

  let collection;
  try {
    collection = await getCollection(collectionId);
  } catch (error) {
    printWarning(`Cannot read collection metadata: ${error?.message || error}`);
    return { tableName, totalRows: 0, badRows: 0, errors: 1 };
  }

  const rowSecurity = readRowSecurityFlag(collection);
  if (rowSecurity === null) {
    printWarning('Could not detect Row security flag from API response.');
  } else if (policy.requireRowSecurity && rowSecurity !== true) {
    printWarning('Row security is OFF. Turn it ON in console.');
  } else {
    printOk(`Row security is ${rowSecurity ? 'ON' : 'OFF'}.`);
  }

  const tablePerms = Array.isArray(collection.$permissions) ? collection.$permissions : [];

  const broadTableRead = tablePerms.some((perm) => isBroad(perm) && parseAction(perm) === 'read');
  const broadTableUpdate = tablePerms.some((perm) => isBroad(perm) && parseAction(perm) === 'update');
  const broadTableDelete = tablePerms.some((perm) => isBroad(perm) && parseAction(perm) === 'delete');

  if (broadTableRead) printWarning('Table-level broad READ found. Remove broad read from table permissions.');
  if (broadTableUpdate) printWarning('Table-level broad UPDATE found. Remove broad update from table permissions.');
  if (broadTableDelete) printWarning('Table-level broad DELETE found. Remove broad delete from table permissions.');

  if (!broadTableRead && !broadTableUpdate && !broadTableDelete) {
    printOk('No broad table-level read/update/delete permissions detected.');
  }

  let docs = [];
  let total = 0;
  try {
    const result = await fetchAllDocuments(collectionId);
    docs = result.documents;
    total = result.total;
  } catch (error) {
    printWarning(`Could not list rows for audit: ${error?.message || error}`);
    return { tableName, totalRows: 0, badRows: 0, errors: 1 };
  }

  if (total > docs.length) {
    printWarning(`Scanned ${docs.length} row(s) from ${total} total (API default page).`);
  }

  let badRows = 0;
  const sample = [];

  docs.forEach((doc) => {
    const perms = Array.isArray(doc.$permissions) ? doc.$permissions : [];

    const broadRead = perms.some((perm) => isBroad(perm) && parseAction(perm) === 'read');
    const broadUpdate = perms.some((perm) => isBroad(perm) && parseAction(perm) === 'update');
    const broadDelete = perms.some((perm) => isBroad(perm) && parseAction(perm) === 'delete');

    const invalidRead = broadRead && !policy.allowBroadReadRows;
    const invalidWrite = broadUpdate || broadDelete;

    if (invalidRead || invalidWrite) {
      badRows += 1;
      if (sample.length < 10) {
        sample.push({
          id: doc.$id,
          broadRead,
          broadUpdate,
          broadDelete,
          permissions: perms,
        });
      }
    }
  });

  if (badRows === 0) {
    printOk(`Row ACL scan clean. ${docs.length} row(s) checked.`);
  } else {
    printWarning(`Found ${badRows} row(s) with risky ACL out of ${docs.length}.`);
    sample.forEach((item, idx) => {
      printInfo(`${idx + 1}. row ${item.id}`);
      printInfo(`   broadRead=${item.broadRead}, broadUpdate=${item.broadUpdate}, broadDelete=${item.broadDelete}`);
      printInfo(`   perms: ${item.permissions.join(' | ')}`);
    });
  }

  return {
    tableName,
    totalRows: total || docs.length,
    badRows,
    errors: 0,
  };
};

const run = async () => {
  const missing = [];
  if (!endpoint) missing.push('APPWRITE_ENDPOINT or EXPO_PUBLIC_APPWRITE_ENDPOINT');
  if (!projectId) missing.push('APPWRITE_PROJECT_ID or EXPO_PUBLIC_APPWRITE_PROJECT_ID');
  if (!databaseId) missing.push('APPWRITE_DATABASE_ID or EXPO_PUBLIC_APPWRITE_DATABASE_ID');
  if (!apiKey) missing.push('APPWRITE_API_KEY');

  if (missing.length > 0) {
    console.error('Missing required environment variables:');
    missing.forEach((entry) => console.error(`- ${entry}`));
    console.error('Tip: .env is auto-loaded by this script.');
    console.error('Tip: APPWRITE_API_KEY must be a Server API key with Databases read scope.');
    process.exit(1);
  }

  const configured = Object.entries(collectionEnvMap).filter(([, id]) => Boolean(id));
  if (configured.length === 0) {
    console.error('No collection IDs found in env.');
    process.exit(1);
  }

  printHeader('Appwrite ACL Audit');
  console.log(`Endpoint: ${endpoint}`);
  console.log(`Project: ${projectId}`);
  console.log(`Database: ${databaseId}`);
  console.log(`Collections to audit: ${configured.map(([name]) => name).join(', ')}`);

  const results = [];
  for (const [name, id] of configured) {
    const result = await auditCollection(null, name, id);
    results.push(result);
  }

  const totalRows = results.reduce((sum, r) => sum + r.totalRows, 0);
  const totalBadRows = results.reduce((sum, r) => sum + r.badRows, 0);
  const totalErrors = results.reduce((sum, r) => sum + r.errors, 0);

  printHeader('Summary');
  console.log(`Tables checked: ${results.length}`);
  console.log(`Rows checked: ${totalRows}`);
  console.log(`Risky rows: ${totalBadRows}`);
  console.log(`Collection errors: ${totalErrors}`);

  if (totalBadRows > 0 || totalErrors > 0) {
    process.exitCode = 2;
  }
};

run().catch((error) => {
  console.error('Audit crashed:', error?.message || error);
  process.exit(1);
});
