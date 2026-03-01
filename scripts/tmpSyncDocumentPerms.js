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

const getOldCloudApiKey = () => {
  const raw = fs.readFileSync('.env', 'utf8');
  const line = raw.split(/\r?\n/).find((item) => item.startsWith('# OLD_CLOUD_API_KEY='));
  return line ? line.replace('# OLD_CLOUD_API_KEY=', '').trim() : '';
};

const makeClient = (cfg) => new Client().setEndpoint(cfg.endpoint).setProject(cfg.projectId);

const call = (client, cfg, method, route, body = {}) => {
  return client.call(method, `${cfg.endpoint}${route}`, {
    'X-Appwrite-Key': cfg.key,
    'content-type': 'application/json',
  }, body);
};

const listCollections = async (client, cfg) => {
  const items = [];
  let offset = 0;
  while (true) {
    const response = await call(
      client,
      cfg,
      'get',
      `/databases/${cfg.databaseId}/collections?limit=100&offset=${offset}`,
      {},
    );
    const page = Array.isArray(response?.collections) ? response.collections : [];
    items.push(...page);
    if (page.length < 100) break;
    offset += 100;
  }
  return items;
};

const listAllDocuments = async (client, cfg, collectionId) => {
  const items = [];
  let offset = 0;
  while (true) {
    const response = await call(
      client,
      cfg,
      'get',
      `/databases/${cfg.databaseId}/collections/${collectionId}/documents?limit=100&offset=${offset}`,
      {},
    );
    const page = Array.isArray(response?.documents) ? response.documents : [];
    items.push(...page);
    if (page.length < 100) break;
    offset += 100;
  }
  return items;
};

const normalizePerms = (permissions = []) => [...permissions].sort();

const samePerms = (left = [], right = []) => {
  if (left.length !== right.length) return false;
  for (let i = 0; i < left.length; i += 1) {
    if (left[i] !== right[i]) return false;
  }
  return true;
};

const updateDocPermissions = async (client, cfg, collectionId, documentId, permissions) => {
  return call(
    client,
    cfg,
    'patch',
    `/databases/${cfg.databaseId}/collections/${collectionId}/documents/${documentId}`,
    {
      data: {},
      permissions,
    },
  );
};

const main = async () => {
  loadEnv();

  const source = {
    endpoint: 'https://fra.cloud.appwrite.io/v1',
    projectId: '6973c51d0000bdd71f7a',
    databaseId: '68fc78fd0030f049a781',
    key: getOldCloudApiKey(),
  };

  const target = {
    endpoint: String(process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT || '').replace(/\/+$/, ''),
    projectId: process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID,
    databaseId: process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID,
    key: process.env.APPWRITE_API_KEY,
  };

  if (!source.key) throw new Error('Missing OLD_CLOUD_API_KEY in .env comments');

  const sourceClient = makeClient(source);
  const targetClient = makeClient(target);

  const [sourceCollections, targetCollections] = await Promise.all([
    listCollections(sourceClient, source),
    listCollections(targetClient, target),
  ]);

  const targetCollectionIds = new Set(targetCollections.map((collection) => collection.$id));
  const collectionsToProcess = sourceCollections.filter((collection) => targetCollectionIds.has(collection.$id));

  const report = {
    timestamp: new Date().toISOString(),
    sourceProject: source.projectId,
    targetProject: target.projectId,
    collectionCount: collectionsToProcess.length,
    processedDocuments: 0,
    updatedDocuments: 0,
    missingInTarget: [],
    missingInSource: [],
    mismatchesAfterSync: [],
    updatesByCollection: {},
    errors: [],
  };

  for (const collection of collectionsToProcess) {
    const collectionId = collection.$id;

    const [sourceDocs, targetDocs] = await Promise.all([
      listAllDocuments(sourceClient, source, collectionId),
      listAllDocuments(targetClient, target, collectionId),
    ]);

    const sourceMap = new Map(sourceDocs.map((document) => [document.$id, document]));
    const targetMap = new Map(targetDocs.map((document) => [document.$id, document]));

    report.processedDocuments += sourceDocs.length;
    report.updatesByCollection[collectionId] = {
      collectionName: collection.name,
      sourceCount: sourceDocs.length,
      targetCount: targetDocs.length,
      updated: 0,
      unchanged: 0,
      missingInTarget: 0,
      missingInSource: 0,
    };

    for (const sourceDoc of sourceDocs) {
      const targetDoc = targetMap.get(sourceDoc.$id);
      if (!targetDoc) {
        report.updatesByCollection[collectionId].missingInTarget += 1;
        report.missingInTarget.push({ collectionId, documentId: sourceDoc.$id });
        continue;
      }

      const sourcePerms = normalizePerms(sourceDoc.$permissions || []);
      const targetPerms = normalizePerms(targetDoc.$permissions || []);

      if (samePerms(sourcePerms, targetPerms)) {
        report.updatesByCollection[collectionId].unchanged += 1;
        continue;
      }

      try {
        await updateDocPermissions(targetClient, target, collectionId, sourceDoc.$id, sourcePerms);
        report.updatedDocuments += 1;
        report.updatesByCollection[collectionId].updated += 1;
      } catch (error) {
        report.errors.push({
          stage: 'update',
          collectionId,
          documentId: sourceDoc.$id,
          message: error?.message || String(error),
        });
      }
    }

    for (const targetDoc of targetDocs) {
      if (!sourceMap.has(targetDoc.$id)) {
        report.updatesByCollection[collectionId].missingInSource += 1;
        report.missingInSource.push({ collectionId, documentId: targetDoc.$id });
      }
    }
  }

  for (const collection of collectionsToProcess) {
    const collectionId = collection.$id;
    const [sourceDocs, targetDocs] = await Promise.all([
      listAllDocuments(sourceClient, source, collectionId),
      listAllDocuments(targetClient, target, collectionId),
    ]);

    const targetMap = new Map(targetDocs.map((document) => [document.$id, document]));

    for (const sourceDoc of sourceDocs) {
      const targetDoc = targetMap.get(sourceDoc.$id);
      if (!targetDoc) continue;

      const sourcePerms = normalizePerms(sourceDoc.$permissions || []);
      const targetPerms = normalizePerms(targetDoc.$permissions || []);

      if (!samePerms(sourcePerms, targetPerms)) {
        report.mismatchesAfterSync.push({
          collectionId,
          documentId: sourceDoc.$id,
          sourcePerms,
          targetPerms,
        });
      }
    }
  }

  fs.writeFileSync('scripts/document-permissions-sync-report.json', JSON.stringify(report, null, 2));

  console.log(`Collections processed: ${report.collectionCount}`);
  console.log(`Documents processed: ${report.processedDocuments}`);
  console.log(`Documents updated: ${report.updatedDocuments}`);
  console.log(`Errors: ${report.errors.length}`);
  console.log(`Mismatches after sync: ${report.mismatchesAfterSync.length}`);
  console.log('Report: scripts/document-permissions-sync-report.json');

  if (report.errors.length || report.mismatchesAfterSync.length) {
    process.exitCode = 2;
  }
};

main().catch((error) => {
  console.error(error?.message || String(error));
  process.exit(1);
});
