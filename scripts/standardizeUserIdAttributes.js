/* eslint-disable no-console */

const fs = require('fs');
const path = require('path');
const { Client } = require('appwrite');

const TARGET_KEY = 'userId';
const LEGACY_KEY = 'userID';
const TARGET_SIZE = 255;
const PAGE_LIMIT = 100;
const WAIT_TIMEOUT_MS = 180000;
const WAIT_POLL_MS = 2000;
const USERS_COLLECTION_ID = process.env.EXPO_PUBLIC_APPWRITE_USERS_COLLECTION_ID || '68fc7b42001bf7efbba3';

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

const required = { endpoint, projectId, databaseId, apiKey };
const missing = Object.entries(required)
  .filter(([, value]) => !value)
  .map(([key]) => key);

if (missing.length) {
  console.error('Missing required Appwrite configuration:', missing.join(', '));
  process.exit(1);
}

const client = new Client().setEndpoint(endpoint).setProject(projectId);

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

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const listAllCollections = async () => {
  const collections = [];
  let offset = 0;

  while (true) {
    const page = await request('GET', `/databases/${databaseId}/collections?limit=${PAGE_LIMIT}&offset=${offset}`);
    const docs = Array.isArray(page?.collections) ? page.collections : [];
    collections.push(...docs);
    if (docs.length < PAGE_LIMIT) break;
    offset += PAGE_LIMIT;
  }

  return collections;
};

const listAllAttributes = async (collectionId) => {
  const attributes = [];
  let offset = 0;

  while (true) {
    const page = await request(
      'GET',
      `/databases/${databaseId}/collections/${collectionId}/attributes?limit=${PAGE_LIMIT}&offset=${offset}`,
    );
    const docs = Array.isArray(page?.attributes) ? page.attributes : [];
    attributes.push(...docs);
    if (docs.length < PAGE_LIMIT) break;
    offset += PAGE_LIMIT;
  }

  return attributes;
};

const listAllDocuments = async (collectionId) => {
  const documents = [];
  let offset = 0;

  while (true) {
    const page = await request(
      'GET',
      `/databases/${databaseId}/collections/${collectionId}/documents?limit=${PAGE_LIMIT}&offset=${offset}`,
    );

    const docs = Array.isArray(page?.documents) ? page.documents : [];
    documents.push(...docs);
    if (docs.length < PAGE_LIMIT) break;
    offset += PAGE_LIMIT;
  }

  return documents;
};

const waitForAttribute = async (collectionId, key, type, expectedStatus = 'available') => {
  const started = Date.now();

  while (Date.now() - started < WAIT_TIMEOUT_MS) {
    const attrs = await listAllAttributes(collectionId);
    const attr = attrs.find((item) => item.key === key && item.type === type);

    if (!attr) {
      if (expectedStatus === 'missing') return null;
      await sleep(WAIT_POLL_MS);
      continue;
    }

    if (expectedStatus === 'available' && String(attr.status || '').toLowerCase() === 'available') {
      return attr;
    }

    if (expectedStatus === 'missing') {
      await sleep(WAIT_POLL_MS);
      continue;
    }

    if (String(attr.status || '').toLowerCase() === 'failed') {
      throw new Error(`Attribute ${collectionId}.${key} is in failed state`);
    }

    await sleep(WAIT_POLL_MS);
  }

  if (expectedStatus === 'missing') {
    const attrs = await listAllAttributes(collectionId);
    const attr = attrs.find((item) => item.key === key && item.type === type);
    if (!attr) return null;
  }

  throw new Error(`Timed out waiting for ${collectionId}.${key} to reach state ${expectedStatus}`);
};

const tryDeleteAttributeIfExists = async (collectionId, key, type) => {
  try {
    await request(
      'DELETE',
      `/databases/${databaseId}/collections/${collectionId}/attributes/${key}`,
    );
    return true;
  } catch (error) {
    const message = String(error.message || '').toLowerCase();
    if (message.includes('not found') || message.includes('unknown') || message.includes('does not exist')) {
      return false;
    }
    return false;
  }
};

const purgeGhostKey = async (collectionId, key) => {
  const candidateTypes = ['string', 'text', 'longtext', 'integer', 'double', 'boolean', 'datetime'];
  let deletedSomething = false;

  for (const type of candidateTypes) {
    const deleted = await tryDeleteAttributeIfExists(collectionId, key, type);
    if (deleted) {
      deletedSomething = true;
    }
  }

  return deletedSomething;
};

const getAttrByKeyAnyType = (attrs, key) => {
  return attrs.find((item) => item.key === key) || null;
};

const probeUserIdWritable = async (collectionId, sampleDocumentId, sampleValue) => {
  if (!sampleDocumentId) return false;

  try {
    await updateDocumentUserId(collectionId, sampleDocumentId, sampleValue || 'probe-user-id');
    return true;
  } catch (error) {
    return false;
  }
};

const ensureUserIdAttribute = async (collectionId, sampleDocumentId = null, sampleValue = null) => {
  const attrs = await listAllAttributes(collectionId);
  const userIdAttr = attrs.find((item) => item.key === TARGET_KEY && item.type === 'string');

  if (!userIdAttr) {
    try {
      await request(
        'POST',
        `/databases/${databaseId}/collections/${collectionId}/attributes/string`,
        {
          key: TARGET_KEY,
          size: TARGET_SIZE,
          required: false,
          default: null,
          array: false,
        },
      );

      return waitForAttribute(collectionId, TARGET_KEY, 'string', 'available');
    } catch (error) {
      const message = String(error.message || '').toLowerCase();
      if (!message.includes('already exists')) {
        throw error;
      }

      const refreshed = await listAllAttributes(collectionId);
      const existingString = refreshed.find((item) => item.key === TARGET_KEY && item.type === 'string');
      if (existingString) {
        if (String(existingString.status || '').toLowerCase() !== 'available') {
          return waitForAttribute(collectionId, TARGET_KEY, 'string', 'available');
        }

        if (Number(existingString.size) < TARGET_SIZE) {
          await request(
            'PATCH',
            `/databases/${databaseId}/collections/${collectionId}/attributes/string/${TARGET_KEY}`,
            {
              required: Boolean(existingString.required),
              default: Object.prototype.hasOwnProperty.call(existingString, 'default') ? existingString.default : null,
              array: Boolean(existingString.array),
              size: TARGET_SIZE,
            },
          );

          return waitForAttribute(collectionId, TARGET_KEY, 'string', 'available');
        }

        return existingString;
      }

      const existingAny = getAttrByKeyAnyType(refreshed, TARGET_KEY);
      if (existingAny) {
        throw new Error(
          `Collection ${collectionId} has ${TARGET_KEY} as non-string type (${existingAny.type}); manual type replacement required before migration`,
        );
      }

      const purged = await purgeGhostKey(collectionId, TARGET_KEY);
      if (purged) {
        await sleep(1500);
        await request(
          'POST',
          `/databases/${databaseId}/collections/${collectionId}/attributes/string`,
          {
            key: TARGET_KEY,
            size: TARGET_SIZE,
            required: false,
            default: null,
            array: false,
          },
        );

        return waitForAttribute(collectionId, TARGET_KEY, 'string', 'available');
      }

      try {
        await request(
          'PATCH',
          `/databases/${databaseId}/collections/${collectionId}/attributes/string/${TARGET_KEY}`,
          {
            required: false,
            default: null,
            array: false,
            size: TARGET_SIZE,
          },
        );
      } catch (_) {
      }

      const writable = await probeUserIdWritable(collectionId, sampleDocumentId, sampleValue);
      if (writable) {
        return {
          key: TARGET_KEY,
          type: 'string',
          size: TARGET_SIZE,
          required: false,
          array: false,
          status: 'available',
          inferred: true,
        };
      }

      throw new Error(
        `Collection ${collectionId} reports ${TARGET_KEY} already exists but attribute metadata is inaccessible (possible ghost attribute).`,
      );
    }
  }

  if (Number(userIdAttr.size) < TARGET_SIZE) {
    await request(
      'PATCH',
      `/databases/${databaseId}/collections/${collectionId}/attributes/string/${TARGET_KEY}`,
      {
        required: Boolean(userIdAttr.required),
        default: Object.prototype.hasOwnProperty.call(userIdAttr, 'default') ? userIdAttr.default : null,
        array: Boolean(userIdAttr.array),
        size: TARGET_SIZE,
      },
    );

    return waitForAttribute(collectionId, TARGET_KEY, 'string', 'available');
  }

  return userIdAttr;
};

const updateDocumentUserId = async (collectionId, documentId, value) => {
  await request(
    'PATCH',
    `/databases/${databaseId}/collections/${collectionId}/documents/${documentId}`,
    {
      data: {
        [TARGET_KEY]: value,
      },
    },
  );
};

const ensureUsersCollectionHasUserId = async (backups, migrationLog) => {
  const collectionId = USERS_COLLECTION_ID;
  const attrs = await listAllAttributes(collectionId);
  const hasLegacy = attrs.some((item) => item.key === LEGACY_KEY);
  const existing = attrs.find((item) => item.key === TARGET_KEY && item.type === 'string');

  if (hasLegacy || existing) {
    return;
  }

  const docs = await listAllDocuments(collectionId);
  const backupRows = docs.map((doc) => ({
    documentId: doc.$id,
    source: '$id',
    inferredUserId: doc.$id,
    currentStandardValue: Object.prototype.hasOwnProperty.call(doc, TARGET_KEY) ? doc[TARGET_KEY] : null,
  }));

  backups.collections.push({
    collectionId,
    collectionName: 'users',
    legacyAttribute: null,
    rows: backupRows,
    recoveryNote: 'Recovered missing userId by inferring from document $id',
  });

  try {
    await request(
      'POST',
      `/databases/${databaseId}/collections/${collectionId}/attributes/string`,
      {
        key: TARGET_KEY,
        size: TARGET_SIZE,
        required: false,
        default: null,
        array: false,
      },
    );

    await waitForAttribute(collectionId, TARGET_KEY, 'string', 'available');
  } catch (error) {
    const message = String(error.message || '').toLowerCase();
    if (!message.includes('already exists')) {
      throw error;
    }
  }

  try {
    await request(
      'PATCH',
      `/databases/${databaseId}/collections/${collectionId}/attributes/string/${TARGET_KEY}`,
      {
        required: false,
        default: null,
        array: false,
        size: TARGET_SIZE,
      },
    );
  } catch (_) {
  }

  for (const row of backupRows) {
    await updateDocumentUserId(collectionId, row.documentId, row.inferredUserId);
  }

  try {
    await request(
      'PATCH',
      `/databases/${databaseId}/collections/${collectionId}/attributes/string/${TARGET_KEY}`,
      {
        required: true,
        default: null,
        array: false,
        size: TARGET_SIZE,
      },
    );
    await waitForAttribute(collectionId, TARGET_KEY, 'string', 'available');
  } catch (_) {
  }

  migrationLog.push({
    collectionId,
    collectionName: 'users',
    action: 'recovered_missing_userId_from_document_id',
    documentsTotal: backupRows.length,
    valuesMigrated: backupRows.length,
    ensuredUserIdSize: TARGET_SIZE,
  });
};

const tryPromoteRequired = async (collectionId, userIdAttr, sourceWasRequired, nullCount) => {
  if (!sourceWasRequired || nullCount > 0) return null;

  try {
    await request(
      'PATCH',
      `/databases/${databaseId}/collections/${collectionId}/attributes/string/${TARGET_KEY}`,
      {
        required: true,
        default: Object.prototype.hasOwnProperty.call(userIdAttr, 'default') ? userIdAttr.default : null,
        array: Boolean(userIdAttr.array),
        size: TARGET_SIZE,
      },
    );

    await waitForAttribute(collectionId, TARGET_KEY, 'string', 'available');

    return { promoted: true };
  } catch (error) {
    return { promoted: false, reason: error.message };
  }
};

const main = async () => {
  const collections = await listAllCollections();

  const usage = {
    usingLegacyUserID: [],
    usingStandardUserId: [],
    usingBoth: [],
  };

  const backups = {
    generatedAt: new Date().toISOString(),
    databaseId,
    notes: 'Temporary backup for legacy userID to userId schema refactor',
    collections: [],
  };

  const migrationLog = [];

  for (const collection of collections) {
    const attrs = await listAllAttributes(collection.$id);
    const hasLegacy = attrs.some((item) => item.key === LEGACY_KEY);
    const hasStandard = attrs.some((item) => item.key === TARGET_KEY);

    if (hasLegacy) usage.usingLegacyUserID.push({ collectionId: collection.$id, collectionName: collection.name });
    if (hasStandard) usage.usingStandardUserId.push({ collectionId: collection.$id, collectionName: collection.name });
    if (hasLegacy && hasStandard) usage.usingBoth.push({ collectionId: collection.$id, collectionName: collection.name });
  }

  const targets = usage.usingLegacyUserID;

  await ensureUsersCollectionHasUserId(backups, migrationLog);

  const refreshedCollections = await listAllCollections();
  const refreshedUsage = {
    usingLegacyUserID: [],
    usingStandardUserId: [],
    usingBoth: [],
  };

  for (const collection of refreshedCollections) {
    const attrs = await listAllAttributes(collection.$id);
    const hasLegacy = attrs.some((item) => item.key === LEGACY_KEY);
    const hasStandard = attrs.some((item) => item.key === TARGET_KEY);
    if (hasLegacy) refreshedUsage.usingLegacyUserID.push({ collectionId: collection.$id, collectionName: collection.name });
    if (hasStandard) refreshedUsage.usingStandardUserId.push({ collectionId: collection.$id, collectionName: collection.name });
    if (hasLegacy && hasStandard) refreshedUsage.usingBoth.push({ collectionId: collection.$id, collectionName: collection.name });
  }

  const activeTargets = refreshedUsage.usingLegacyUserID;

  if (!activeTargets.length) {
    const reportPath = path.resolve(process.cwd(), 'scripts', `userId-standardization-report-${Date.now()}.json`);
    fs.writeFileSync(
      reportPath,
      JSON.stringify({ usageBefore: usage, usageAfter: refreshedUsage, migrationLog, backups }, null, 2),
      'utf8',
    );

    console.log('No legacy userID attributes found.');
    console.log(`Report saved: ${reportPath}`);
    return;
  }

  for (const target of activeTargets) {
    const collectionId = target.collectionId;
    const collectionName = target.collectionName;

    const attrs = await listAllAttributes(collectionId);
    const legacyAttr = attrs.find((item) => item.key === LEGACY_KEY);
    const standardAttr = attrs.find((item) => item.key === TARGET_KEY);

    if (!legacyAttr) {
      migrationLog.push({ collectionId, collectionName, action: 'skip_missing_legacy_after_rescan' });
      continue;
    }

    const docs = await listAllDocuments(collectionId);
    const backupRows = docs.map((doc) => ({
      documentId: doc.$id,
      legacyValue: Object.prototype.hasOwnProperty.call(doc, LEGACY_KEY) ? doc[LEGACY_KEY] : null,
      currentStandardValue: Object.prototype.hasOwnProperty.call(doc, TARGET_KEY) ? doc[TARGET_KEY] : null,
    }));

    backups.collections.push({
      collectionId,
      collectionName,
      legacyAttribute: {
        key: legacyAttr.key,
        type: legacyAttr.type,
        size: Number(legacyAttr.size),
        required: Boolean(legacyAttr.required),
        array: Boolean(legacyAttr.array),
        status: legacyAttr.status,
      },
      rows: backupRows,
    });

    let legacyDeletedEarly = false;

    if (!standardAttr && String(legacyAttr.key || '').toLowerCase() === String(TARGET_KEY).toLowerCase()) {
      await request(
        'DELETE',
        `/databases/${databaseId}/collections/${collectionId}/attributes/${LEGACY_KEY}`,
      );
      await waitForAttribute(collectionId, LEGACY_KEY, legacyAttr.type, 'missing');
      legacyDeletedEarly = true;
    }

    const probeRow = backupRows.find((row) => row.legacyValue !== null && row.legacyValue !== undefined) || backupRows[0] || null;
    const ensured = await ensureUserIdAttribute(
      collectionId,
      probeRow?.documentId || null,
      probeRow?.legacyValue || null,
    );

    let migratedCount = 0;
    let nullCount = 0;

    for (const row of backupRows) {
      if (row.legacyValue === null || row.legacyValue === undefined) {
        nullCount += 1;
        continue;
      }

      await updateDocumentUserId(collectionId, row.documentId, row.legacyValue);
      migratedCount += 1;
    }

    let promotedRequired = null;
    if (ensured) {
      promotedRequired = await tryPromoteRequired(
        collectionId,
        ensured,
        Boolean(legacyAttr.required),
        nullCount,
      );
    }

    if (!legacyDeletedEarly) {
      await request(
        'DELETE',
        `/databases/${databaseId}/collections/${collectionId}/attributes/${LEGACY_KEY}`,
      );

      await waitForAttribute(collectionId, LEGACY_KEY, legacyAttr.type, 'missing');
    }

    migrationLog.push({
      collectionId,
      collectionName,
      action: 'migrated_legacy_to_standard',
      documentsTotal: backupRows.length,
      valuesMigrated: migratedCount,
      valuesNullOrMissing: nullCount,
      ensuredUserIdSize: TARGET_SIZE,
      requiredPromotion: promotedRequired,
    });
  }

  const stamp = Date.now();
  const backupPath = path.resolve(process.cwd(), 'scripts', `userId-standardization-backup-${stamp}.json`);
  const reportPath = path.resolve(process.cwd(), 'scripts', `userId-standardization-report-${stamp}.json`);

  fs.writeFileSync(backupPath, JSON.stringify(backups, null, 2), 'utf8');

  const verification = [];
  const finalCollections = await listAllCollections();

  for (const collection of finalCollections) {
    const attrs = await listAllAttributes(collection.$id);
    const legacy = attrs.find((item) => item.key === LEGACY_KEY);
    const standard = attrs.find((item) => item.key === TARGET_KEY);

    verification.push({
      collectionId: collection.$id,
      collectionName: collection.name,
      hasLegacyUserID: Boolean(legacy),
      hasStandardUserId: Boolean(standard),
      standardType: standard?.type || null,
      standardSize: standard?.size ? Number(standard.size) : null,
      standardStatus: standard?.status || null,
    });
  }

  const report = {
    completedAt: new Date().toISOString(),
    databaseId,
    targetKey: TARGET_KEY,
    legacyKey: LEGACY_KEY,
    targetSize: TARGET_SIZE,
    usageBefore: usage,
    usageAfter: refreshedUsage,
    migrationLog,
    backupPath,
    verification,
  };

  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');

  console.log('userID -> userId standardization complete.');
  console.log(`Legacy collections processed: ${targets.length}`);
  console.log(`Backup file: ${backupPath}`);
  console.log(`Report file: ${reportPath}`);
};

main().catch((error) => {
  console.error('Standardization failed:', error.message);
  process.exit(1);
});
