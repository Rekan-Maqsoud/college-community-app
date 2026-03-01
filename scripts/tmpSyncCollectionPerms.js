/* eslint-disable no-console */
const fs = require('fs');
const { Client } = require('appwrite');

const loadEnv = () => {
  const raw = fs.readFileSync('.env', 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx < 1) continue;
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
};

const oldCloudKeyFromEnvFile = () => {
  const raw = fs.readFileSync('.env', 'utf8');
  const line = raw.split(/\r?\n/).find((item) => item.startsWith('# OLD_CLOUD_API_KEY='));
  return line ? line.replace('# OLD_CLOUD_API_KEY=', '').trim() : '';
};

const listCollections = async (cfg) => {
  const client = new Client().setEndpoint(cfg.endpoint).setProject(cfg.projectId);
  const headers = { 'X-Appwrite-Key': cfg.key, 'content-type': 'application/json' };
  const all = [];
  let offset = 0;

  while (true) {
    const response = await client.call(
      'get',
      `${cfg.endpoint}/databases/${cfg.databaseId}/collections?limit=100&offset=${offset}`,
      headers,
      {},
    );

    const items = Array.isArray(response?.collections) ? response.collections : [];
    all.push(...items);
    if (items.length < 100) break;
    offset += 100;
  }

  return all;
};

const normalizePermissions = (permissions = []) => [...permissions].sort();

const sameArray = (a = [], b = []) => {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
};

const updateCollectionPermissions = async (cfg, collection) => {
  const client = new Client().setEndpoint(cfg.endpoint).setProject(cfg.projectId);
  const headers = { 'X-Appwrite-Key': cfg.key, 'content-type': 'application/json' };

  return client.call(
    'put',
    `${cfg.endpoint}/databases/${cfg.databaseId}/collections/${collection.$id}`,
    headers,
    {
      name: collection.name,
      permissions: collection.permissions,
      documentSecurity: collection.documentSecurity,
      enabled: collection.enabled,
    },
  );
};

const main = async () => {
  loadEnv();

  const source = {
    endpoint: 'https://fra.cloud.appwrite.io/v1',
    projectId: '6973c51d0000bdd71f7a',
    key: oldCloudKeyFromEnvFile(),
    databaseId: '68fc78fd0030f049a781',
  };

  const target = {
    endpoint: String(process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT || '').replace(/\/+$/, ''),
    projectId: process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID,
    key: process.env.APPWRITE_API_KEY,
    databaseId: process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID,
  };

  if (!source.key) throw new Error('Missing OLD_CLOUD_API_KEY in .env comments');
  if (!target.endpoint || !target.projectId || !target.key || !target.databaseId) {
    throw new Error('Missing target env values');
  }

  const [sourceCollections, targetCollections] = await Promise.all([
    listCollections(source),
    listCollections(target),
  ]);

  const sourceMap = new Map(sourceCollections.map((c) => [c.$id, c]));
  const targetMap = new Map(targetCollections.map((c) => [c.$id, c]));

  const missingInTarget = [];
  const updated = [];
  const unchanged = [];

  for (const [collectionId, sourceCollection] of sourceMap.entries()) {
    const targetCollection = targetMap.get(collectionId);
    if (!targetCollection) {
      missingInTarget.push(collectionId);
      continue;
    }

    const sourcePerms = normalizePermissions(sourceCollection.$permissions || sourceCollection.permissions || []);
    const targetPerms = normalizePermissions(targetCollection.$permissions || targetCollection.permissions || []);

    const samePerms = sameArray(sourcePerms, targetPerms);
    const sameDocSec = Boolean(sourceCollection.documentSecurity) === Boolean(targetCollection.documentSecurity);
    const sameEnabled = Boolean(sourceCollection.enabled) === Boolean(targetCollection.enabled);

    if (samePerms && sameDocSec && sameEnabled) {
      unchanged.push(collectionId);
      continue;
    }

    await updateCollectionPermissions(target, {
      $id: collectionId,
      name: targetCollection.name,
      permissions: sourcePerms,
      documentSecurity: Boolean(sourceCollection.documentSecurity),
      enabled: Boolean(sourceCollection.enabled),
    });

    updated.push({
      collectionId,
      from: {
        permissions: targetPerms,
        documentSecurity: Boolean(targetCollection.documentSecurity),
        enabled: Boolean(targetCollection.enabled),
      },
      to: {
        permissions: sourcePerms,
        documentSecurity: Boolean(sourceCollection.documentSecurity),
        enabled: Boolean(sourceCollection.enabled),
      },
    });
  }

  const postTargetCollections = await listCollections(target);
  const postTargetMap = new Map(postTargetCollections.map((c) => [c.$id, c]));

  const verificationMismatches = [];
  for (const [collectionId, sourceCollection] of sourceMap.entries()) {
    const targetCollection = postTargetMap.get(collectionId);
    if (!targetCollection) continue;

    const sourcePerms = normalizePermissions(sourceCollection.$permissions || sourceCollection.permissions || []);
    const targetPerms = normalizePermissions(targetCollection.$permissions || targetCollection.permissions || []);

    const samePerms = sameArray(sourcePerms, targetPerms);
    const sameDocSec = Boolean(sourceCollection.documentSecurity) === Boolean(targetCollection.documentSecurity);
    const sameEnabled = Boolean(sourceCollection.enabled) === Boolean(targetCollection.enabled);

    if (!samePerms || !sameDocSec || !sameEnabled) {
      verificationMismatches.push({
        collectionId,
        source: {
          permissions: sourcePerms,
          documentSecurity: Boolean(sourceCollection.documentSecurity),
          enabled: Boolean(sourceCollection.enabled),
        },
        target: {
          permissions: targetPerms,
          documentSecurity: Boolean(targetCollection.documentSecurity),
          enabled: Boolean(targetCollection.enabled),
        },
      });
    }
  }

  const report = {
    timestamp: new Date().toISOString(),
    sourceProject: source.projectId,
    targetProject: target.projectId,
    sourceCollectionCount: sourceCollections.length,
    targetCollectionCount: targetCollections.length,
    updatedCount: updated.length,
    unchangedCount: unchanged.length,
    missingInTarget,
    verificationMismatches,
    updated,
  };

  fs.writeFileSync('scripts/permissions-sync-report.json', JSON.stringify(report, null, 2));

  console.log(`Updated collections: ${updated.length}`);
  console.log(`Unchanged collections: ${unchanged.length}`);
  console.log(`Missing in target: ${missingInTarget.length}`);
  console.log(`Verification mismatches: ${verificationMismatches.length}`);
  console.log('Report: scripts/permissions-sync-report.json');

  if (verificationMismatches.length > 0) {
    process.exitCode = 2;
  }
};

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
