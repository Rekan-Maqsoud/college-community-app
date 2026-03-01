/* eslint-disable no-console */

const fs = require('fs');
const path = require('path');
const { Client } = require('appwrite');

const TARGET_SIZE = 16384;
const WAIT_STUCK_MS = 60000;
const WAIT_POLL_MS = 3000;

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

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

loadDotEnv();

const endpoint = String(process.env.APPWRITE_ENDPOINT || process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT || '').replace(/\/+$/, '');
const projectId = process.env.APPWRITE_PROJECT_ID || process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID;
const databaseId = process.env.APPWRITE_DATABASE_ID || process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID;
const apiKey = process.env.APPWRITE_API_KEY;

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

const client = new Client()
  .setEndpoint(endpoint)
  .setProject(projectId);

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
  const results = [];
  let offset = 0;
  const limit = 100;

  while (true) {
    const page = await request('GET', `/databases/${databaseId}/collections?limit=${limit}&offset=${offset}`);
    const docs = Array.isArray(page?.collections) ? page.collections : [];
    results.push(...docs);
    if (docs.length < limit) break;
    offset += limit;
  }

  return results;
};

const listAllAttributes = async (collectionId) => {
  const results = [];
  let offset = 0;
  const limit = 100;

  while (true) {
    const page = await request(
      'GET',
      `/databases/${databaseId}/collections/${collectionId}/attributes?limit=${limit}&offset=${offset}`,
    );
    const docs = Array.isArray(page?.attributes) ? page.attributes : [];
    results.push(...docs);
    if (docs.length < limit) break;
    offset += limit;
  }

  return results;
};

const findAttribute = (attributes, key, type) => {
  return attributes.find((item) => item.key === key && item.type === type);
};

const buildCreatePayload = (attr) => {
  const payload = {};

  payload.key = attr.key;

  if (Object.prototype.hasOwnProperty.call(attr, 'required')) {
    payload.required = Boolean(attr.required);
  }

  if (Object.prototype.hasOwnProperty.call(attr, 'default')) {
    payload.default = attr.default;
  }

  if (Object.prototype.hasOwnProperty.call(attr, 'array')) {
    payload.array = Boolean(attr.array);
  }

  if (attr.type === 'string') {
    payload.size = Number(attr.size);
  }

  if (Object.prototype.hasOwnProperty.call(attr, 'min')) {
    payload.min = attr.min;
  }

  if (Object.prototype.hasOwnProperty.call(attr, 'max')) {
    payload.max = attr.max;
  }

  if (Object.prototype.hasOwnProperty.call(attr, 'elements') && Array.isArray(attr.elements)) {
    payload.elements = attr.elements;
  }

  if (Object.prototype.hasOwnProperty.call(attr, 'format') && attr.format) {
    payload.format = attr.format;
  }

  if (Object.prototype.hasOwnProperty.call(attr, 'relatedCollection') && attr.relatedCollection) {
    payload.relatedCollection = attr.relatedCollection;
  }

  if (Object.prototype.hasOwnProperty.call(attr, 'relationType') && attr.relationType) {
    payload.relationType = attr.relationType;
  }

  if (Object.prototype.hasOwnProperty.call(attr, 'twoWay')) {
    payload.twoWay = Boolean(attr.twoWay);
  }

  if (Object.prototype.hasOwnProperty.call(attr, 'twoWayKey') && attr.twoWayKey) {
    payload.twoWayKey = attr.twoWayKey;
  }

  if (Object.prototype.hasOwnProperty.call(attr, 'onDelete') && attr.onDelete) {
    payload.onDelete = attr.onDelete;
  }

  return payload;
};

const waitForAvailableOrStuck = async (collectionId, key, type) => {
  const started = Date.now();

  while (Date.now() - started < WAIT_STUCK_MS) {
    const attrs = await listAllAttributes(collectionId);
    const attr = findAttribute(attrs, key, type);

    if (!attr) {
      return { state: 'missing', attr: null };
    }

    const status = String(attr.status || '').toLowerCase();
    if (status === 'available') {
      return { state: 'available', attr };
    }

    if (status === 'failed') {
      return { state: 'failed', attr };
    }

    await sleep(WAIT_POLL_MS);
  }

  const attrs = await listAllAttributes(collectionId);
  const attr = findAttribute(attrs, key, type);
  if (!attr) {
    return { state: 'missing', attr: null };
  }

  return { state: 'stuck', attr };
};

const deleteAttribute = async (collectionId, attr) => {
  await request(
    'DELETE',
    `/databases/${databaseId}/collections/${collectionId}/attributes/${attr.type}/${encodeURIComponent(attr.key)}`,
  );
};

const createAttribute = async (collectionId, attr) => {
  const payload = buildCreatePayload(attr);

  await request(
    'POST',
    `/databases/${databaseId}/collections/${collectionId}/attributes/${attr.type}`,
    payload,
  );
};

const main = async () => {
  const report = {
    scannedCollections: 0,
    scannedAttributes: 0,
    caseConflictsInCollection: [],
    caseVariantsGlobal: [],
    nearNameClusters: [],
    nonAvailableInitial: [],
    remediated: [],
    remediationFailures: [],
    sized16384String: [],
    potentialConflicts: [],
  };

  console.log('Starting deep schema audit and harmonization...');

  const collections = await listAllCollections();
  report.scannedCollections = collections.length;

  const allAttrs = [];

  for (const collection of collections) {
    const attrs = await listAllAttributes(collection.$id);

    report.scannedAttributes += attrs.length;

    const byLowerInCollection = new Map();

    for (const attr of attrs) {
      const row = {
        collectionId: collection.$id,
        collectionName: collection.name,
        key: attr.key,
        lowerKey: String(attr.key || '').toLowerCase(),
        normKey: String(attr.key || '').toLowerCase().replace(/[^a-z0-9]/g, ''),
        type: attr.type,
        status: String(attr.status || ''),
        size: Number(attr.size),
        required: Boolean(attr.required),
        array: Boolean(attr.array),
      };

      allAttrs.push({ ...row, raw: attr });

      if (!byLowerInCollection.has(row.lowerKey)) byLowerInCollection.set(row.lowerKey, []);
      byLowerInCollection.get(row.lowerKey).push(row.key);

      if (String(attr.status || '').toLowerCase() !== 'available') {
        report.nonAvailableInitial.push({
          collectionId: collection.$id,
          collectionName: collection.name,
          key: attr.key,
          type: attr.type,
          status: attr.status,
        });
      }

      if (attr.type === 'string' && Number(attr.size) === TARGET_SIZE && String(attr.status || '').toLowerCase() === 'available') {
        report.sized16384String.push({
          collectionId: collection.$id,
          collectionName: collection.name,
          key: attr.key,
          type: attr.type,
          status: attr.status,
          size: Number(attr.size),
        });
      }
    }

    for (const [lowerKey, variants] of byLowerInCollection.entries()) {
      const uniq = Array.from(new Set(variants));
      if (uniq.length > 1) {
        report.caseConflictsInCollection.push({
          collectionId: collection.$id,
          collectionName: collection.name,
          lowerKey,
          variants: uniq,
        });
      }
    }
  }

  const byLowerGlobal = new Map();
  const byNormGlobal = new Map();

  for (const attr of allAttrs) {
    if (!byLowerGlobal.has(attr.lowerKey)) byLowerGlobal.set(attr.lowerKey, []);
    byLowerGlobal.get(attr.lowerKey).push(attr);

    if (!byNormGlobal.has(attr.normKey)) byNormGlobal.set(attr.normKey, []);
    byNormGlobal.get(attr.normKey).push(attr);
  }

  for (const [lowerKey, rows] of byLowerGlobal.entries()) {
    const variants = Array.from(new Set(rows.map((row) => row.key)));
    if (variants.length > 1) {
      report.caseVariantsGlobal.push({
        lowerKey,
        variants,
        where: rows.map((row) => `${row.collectionId}.${row.key}`),
      });
    }
  }

  for (const [normKey, rows] of byNormGlobal.entries()) {
    const distinctKeys = Array.from(new Set(rows.map((row) => row.key)));
    if (distinctKeys.length > 1) {
      report.nearNameClusters.push({
        normKey,
        keys: distinctKeys,
        where: rows.map((row) => `${row.collectionId}.${row.key}`),
      });
    }
  }

  for (const item of report.nonAvailableInitial) {
    const original = allAttrs.find(
      (row) => row.collectionId === item.collectionId && row.key === item.key && row.type === item.type,
    );

    if (!original) {
      report.remediationFailures.push({
        ...item,
        reason: 'Original attribute metadata missing in audit snapshot',
      });
      continue;
    }

    const waitResult = await waitForAvailableOrStuck(item.collectionId, item.key, item.type);

    if (waitResult.state === 'available') {
      report.remediated.push({
        collectionId: item.collectionId,
        collectionName: item.collectionName,
        key: item.key,
        type: item.type,
        action: 'resolved_after_wait',
      });
      continue;
    }

    try {
      await deleteAttribute(item.collectionId, original.raw);
      await createAttribute(item.collectionId, original.raw);

      const finalResult = await waitForAvailableOrStuck(item.collectionId, item.key, item.type);

      if (finalResult.state === 'available') {
        report.remediated.push({
          collectionId: item.collectionId,
          collectionName: item.collectionName,
          key: item.key,
          type: item.type,
          action: 'delete_recreate',
        });
      } else {
        report.remediationFailures.push({
          collectionId: item.collectionId,
          collectionName: item.collectionName,
          key: item.key,
          type: item.type,
          reason: `Delete/recreate attempted but final state=${finalResult.state}`,
        });
      }
    } catch (error) {
      report.remediationFailures.push({
        collectionId: item.collectionId,
        collectionName: item.collectionName,
        key: item.key,
        type: item.type,
        reason: error.message,
      });
    }
  }

  const postCollections = await listAllCollections();
  const postAttrs = [];

  for (const collection of postCollections) {
    const attrs = await listAllAttributes(collection.$id);
    attrs.forEach((attr) => {
      postAttrs.push({
        collectionId: collection.$id,
        collectionName: collection.name,
        key: attr.key,
        type: attr.type,
        status: attr.status,
        size: Number(attr.size),
      });
    });
  }

  report.sized16384String = postAttrs.filter(
    (attr) => attr.type === 'string' && Number(attr.size) === TARGET_SIZE && String(attr.status || '').toLowerCase() === 'available',
  );

  report.potentialConflicts = [
    ...report.caseConflictsInCollection.map((item) => ({ kind: 'case_conflict_in_collection', ...item })),
    ...report.caseVariantsGlobal.map((item) => ({ kind: 'case_variant_global', ...item })),
    ...report.remediationFailures.map((item) => ({ kind: 'remediation_failure', ...item })),
  ];

  const outPath = path.resolve(process.cwd(), 'scripts', 'deepSchemaAuditReport.json');
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2), 'utf8');

  console.log('\nDeep scan complete.');
  console.log(`Collections scanned: ${report.scannedCollections}`);
  console.log(`Attributes scanned: ${report.scannedAttributes}`);
  console.log(`Initial non-available attributes: ${report.nonAvailableInitial.length}`);
  console.log(`Remediated attributes: ${report.remediated.length}`);
  console.log(`Remediation failures: ${report.remediationFailures.length}`);
  console.log(`Case conflicts (same collection): ${report.caseConflictsInCollection.length}`);
  console.log(`Global case variants: ${report.caseVariantsGlobal.length}`);
  console.log(`Near-name clusters: ${report.nearNameClusters.length}`);
  console.log(`String attributes at size 16384 and available: ${report.sized16384String.length}`);
  console.log(`Report saved: ${outPath}`);
};

main().catch((error) => {
  console.error('Deep scan failed:', error.message);
  process.exit(1);
});
