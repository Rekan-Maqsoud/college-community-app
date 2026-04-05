'use strict';

/**
 * purgeAllData.js
 *
 * !! DESTRUCTIVE AND IRREVERSIBLE !!
 * Deletes ALL documents from every collection, ALL files from every storage
 * bucket, and ALL auth users in the Appwrite project.
 *
 * Run ONLY when you are certain you want a clean slate (e.g. moving to production).
 *
 * Required .env variables (or shell env):
 *   APPWRITE_ENDPOINT            e.g. https://cloud.appwrite.io/v1
 *   APPWRITE_PROJECT_ID
 *   APPWRITE_DATABASE_ID
 *   APPWRITE_API_KEY             Server API key with databases, files, users scopes
 *
 * Optional .env variables (buckets skipped if not set):
 *   APPWRITE_BUCKET_ID           Main upload bucket
 *   APPWRITE_STORAGE_ID          Secondary storage bucket (same or different)
 *   APPWRITE_LECTURE_STORAGE_ID  Lecture assets bucket
 *
 * Usage:
 *   node scripts/purgeAllData.js
 *   node scripts/purgeAllData.js --dry-run   (preview counts, delete nothing)
 */

const fs   = require('fs');
const path = require('path');
const { Client } = require('appwrite');

// ─── Config ──────────────────────────────────────────────────────────────────

const BATCH_LIMIT  = 100; // Appwrite max per page
const DELAY_MS     = 120; // ms between individual delete calls (avoid rate limit)
const DRY_RUN      = process.argv.includes('--dry-run');

const DATABASE_ID = '68fc78fd0030f049a781';

const COLLECTIONS = [
  { name: 'users',              id: '68fc7b42001bf7efbba3' },
  { name: 'posts',              id: '68ff7914000948dbd572' },
  { name: 'replies',            id: '68ff7b8f000492463724' },
  { name: 'chats',              id: 'chats' },
  { name: 'messages',           id: 'messages' },
  { name: 'userChatSettings',   id: '69500c9c000bd955c984' },
  { name: 'notifications',      id: '69554fd5001d447c8c1c' },
  { name: 'pushTokens',         id: 'pushtokens' },
  { name: 'Lecture Channels',   id: '699733ee001cbf86e7a4' },
  { name: 'Lecture Memberships',id: '699734170003f998b862' },
  { name: 'Lecture Assets',     id: '6997342b0012ee32448b' },
  { name: 'lectureComments',    id: '69973f680024de7fd9fe' },
  { name: 'repElections',       id: '6999f9de00313552a9c9' },
  { name: 'repVotes',           id: '6999fed2001ac021d056' },
  { name: 'Suggestions',        id: 'suggestions' },
];

// ─── .env loader ─────────────────────────────────────────────────────────────

const loadDotEnv = () => {
  const envPath = path.resolve(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) return;

  fs.readFileSync(envPath, 'utf8')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'))
    .forEach((line) => {
      const idx = line.indexOf('=');
      if (idx <= 0) return;
      const key = line.slice(0, idx).trim();
      if (!key || process.env[key]) return;
      let value = line.slice(idx + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"'))
        || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      process.env[key] = value;
    });
};

loadDotEnv();

// ─── Validation ───────────────────────────────────────────────────────────────

const endpoint  = String(process.env.APPWRITE_ENDPOINT  || process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT  || '').replace(/\/+$/, '');
const projectId = process.env.APPWRITE_PROJECT_ID  || process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID;
const apiKey    = process.env.APPWRITE_API_KEY;

const missing = Object.entries({ endpoint, projectId, apiKey })
  .filter(([, v]) => !v)
  .map(([k]) => k);

if (missing.length) {
  console.error('❌  Missing required env vars:', missing.join(', '));
  console.error('    Create a .env file at project root — see script header for details.');
  process.exit(1);
}

// Buckets — optional, warn instead of fail
const BUCKETS = [
  process.env.APPWRITE_BUCKET_ID          || process.env.EXPO_PUBLIC_APPWRITE_BUCKET_ID,
  process.env.APPWRITE_STORAGE_ID         || process.env.EXPO_PUBLIC_APPWRITE_STORAGE_ID,
  process.env.APPWRITE_LECTURE_STORAGE_ID || process.env.EXPO_PUBLIC_APPWRITE_LECTURE_STORAGE_ID,
]
  // deduplicate and drop empty values
  .filter(Boolean)
  .filter((v, i, arr) => arr.indexOf(v) === i);

if (BUCKETS.length === 0) {
  console.warn('⚠️  No bucket IDs found in env — storage files will NOT be deleted.');
  console.warn('    Set APPWRITE_BUCKET_ID / APPWRITE_LECTURE_STORAGE_ID etc. to include them.');
}

// ─── Appwrite client ─────────────────────────────────────────────────────────

const client = new Client()
  .setEndpoint(endpoint)
  .setProject(projectId);

const adminHeaders = {
  'X-Appwrite-Key': apiKey,
  'content-type': 'application/json',
};

const apw = async (method, urlPath, params = {}) => {
  const url = `${endpoint}${urlPath}`;
  return client.call(method, url, adminHeaders, params);
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const withRetry = async (fn, label, retries = 3) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const isLast = attempt === retries;
      if (isLast) {
        console.error(`    ✗ ${label} — ${err?.message || err} (giving up after ${retries} attempts)`);
        return null;
      }
      const backoff = attempt * 600;
      console.warn(`    ⟳ ${label} — retry ${attempt}/${retries - 1} in ${backoff}ms`);
      await sleep(backoff);
    }
  }
};

// ─── Collection cleaner ───────────────────────────────────────────────────────

const clearCollection = async ({ name, id }) => {
  console.log(`\n📂  Collection: ${name} (${id})`);
  let totalDeleted = 0;

  while (true) {
    let result;
    try {
      result = await apw('GET', `/databases/${DATABASE_ID}/collections/${id}/documents?limit=${BATCH_LIMIT}`);
    } catch (err) {
      console.error(`  ✗ Could not list documents: ${err?.message || err}`);
      break;
    }

    const docs = result?.documents ?? [];
    if (docs.length === 0) {
      console.log(`  ✔ ${totalDeleted} document(s) deleted. Collection is empty.`);
      break;
    }

    console.log(`  → found ${docs.length} doc(s), ${DRY_RUN ? '[DRY RUN] skipping delete' : 'deleting…'}`);

    if (!DRY_RUN) {
      for (const doc of docs) {
        await withRetry(
          () => apw('DELETE', `/databases/${DATABASE_ID}/collections/${id}/documents/${doc.$id}`),
          `delete doc ${doc.$id}`,
        );
        totalDeleted++;
        await sleep(DELAY_MS);
      }
    } else {
      totalDeleted += docs.length;
      // In dry-run we only asked for one page — stop after first page
      const total = result?.total ?? docs.length;
      console.log(`  [DRY RUN] ~${total} document(s) would be deleted.`);
      break;
    }
  }
};

// ─── Storage bucket cleaner ───────────────────────────────────────────────────

const clearBucket = async (bucketId) => {
  console.log(`\n🗄️   Bucket: ${bucketId}`);
  let totalDeleted = 0;

  while (true) {
    let result;
    try {
      result = await apw('GET', `/storage/buckets/${bucketId}/files?limit=${BATCH_LIMIT}`);
    } catch (err) {
      console.error(`  ✗ Could not list files: ${err?.message || err}`);
      break;
    }

    const files = result?.files ?? [];
    if (files.length === 0) {
      console.log(`  ✔ ${totalDeleted} file(s) deleted. Bucket is empty.`);
      break;
    }

    console.log(`  → found ${files.length} file(s), ${DRY_RUN ? '[DRY RUN] skipping delete' : 'deleting…'}`);

    if (!DRY_RUN) {
      for (const file of files) {
        await withRetry(
          () => apw('DELETE', `/storage/buckets/${bucketId}/files/${file.$id}`),
          `delete file ${file.$id}`,
        );
        totalDeleted++;
        await sleep(DELAY_MS);
      }
    } else {
      const total = result?.total ?? files.length;
      console.log(`  [DRY RUN] ~${total} file(s) would be deleted.`);
      break;
    }
  }
};

// ─── Auth user cleaner ────────────────────────────────────────────────────────

const clearAuthUsers = async () => {
  console.log('\n👤  Auth Users');
  let totalDeleted = 0;
  let cursor       = null;

  while (true) {
    let url = `/users?limit=${BATCH_LIMIT}&orderType=ASC`;
    if (cursor) url += `&cursor=${encodeURIComponent(cursor)}`;

    let result;
    try {
      result = await apw('GET', url);
    } catch (err) {
      console.error(`  ✗ Could not list users: ${err?.message || err}`);
      break;
    }

    const users = result?.users ?? [];
    if (users.length === 0) {
      console.log(`  ✔ ${totalDeleted} auth user(s) deleted.`);
      break;
    }

    console.log(`  → found ${users.length} user(s), ${DRY_RUN ? '[DRY RUN] skipping delete' : 'deleting…'}`);

    if (!DRY_RUN) {
      for (const user of users) {
        await withRetry(
          () => apw('DELETE', `/users/${user.$id}`),
          `delete user ${user.$id} (${user.email || user.name || '?'})`,
        );
        totalDeleted++;
        await sleep(DELAY_MS);
      }
      // After deletion the next page starts from scratch — no cursor needed
      cursor = null;
    } else {
      const total = result?.total ?? users.length;
      console.log(`  [DRY RUN] ~${total} auth user(s) would be deleted.`);
      break;
    }
  }
};

// ─── Main ─────────────────────────────────────────────────────────────────────

const main = async () => {
  console.log('═══════════════════════════════════════════════════');
  if (DRY_RUN) {
    console.log('  PURGE SCRIPT — DRY RUN (no data will be deleted)');
  } else {
    console.log('  !! PURGE SCRIPT — LIVE MODE — DATA WILL BE DELETED !!');
  }
  console.log(`  Project : ${projectId}`);
  console.log(`  Database: ${DATABASE_ID}`);
  console.log(`  Buckets : ${BUCKETS.length > 0 ? BUCKETS.join(', ') : '(none configured)'}`);
  console.log('═══════════════════════════════════════════════════\n');

  if (!DRY_RUN) {
    // Give the operator 5 seconds to cancel with Ctrl-C
    console.log('⏳  Starting in 5 seconds — press Ctrl-C to abort…\n');
    await sleep(5000);
  }

  // 1. Clear all collections
  console.log('──── STEP 1: Collections ────────────────────────────');
  for (const col of COLLECTIONS) {
    await clearCollection(col);
  }

  // 2. Clear all storage buckets
  if (BUCKETS.length > 0) {
    console.log('\n──── STEP 2: Storage Buckets ────────────────────────');
    for (const bucketId of BUCKETS) {
      await clearBucket(bucketId);
    }
  }

  // 3. Clear all auth users
  console.log('\n──── STEP 3: Auth Users ─────────────────────────────');
  await clearAuthUsers();

  console.log('\n═══════════════════════════════════════════════════');
  if (DRY_RUN) {
    console.log('  DRY RUN complete — nothing was deleted.');
    console.log('  Re-run without --dry-run to perform the actual purge.');
  } else {
    console.log('  Purge complete. All collections, files, and auth users cleared.');
  }
  console.log('═══════════════════════════════════════════════════\n');
};

main().catch((err) => {
  console.error('\n❌  Fatal error:', err?.message || err);
  process.exit(1);
});
