/**
 * scripts/addGuestAttributes.js
 *
 * One-time migration script to add guest-related attributes to Appwrite collections.
 * Run with: node scripts/addGuestAttributes.js
 *
 * Uses the server-side API key from .env (APPWRITE_API_KEY).
 * Safe to run multiple times — errors from already-existing attributes are ignored.
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// Load .env manually (no dotenv dependency needed)
// ---------------------------------------------------------------------------
const envPath = path.join(__dirname, '..', '.env');
const envVars = {};
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf-8')
    .split(/\r?\n/)
    .forEach((line) => {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        envVars[match[1].trim()] = match[2].trim().replace(/^"|"$/g, '');
      }
    });
}

const ENDPOINT    = envVars.EXPO_PUBLIC_APPWRITE_ENDPOINT || 'https://api.collegecommunity.app/v1';
const PROJECT_ID  = envVars.EXPO_PUBLIC_APPWRITE_PROJECT_ID || '69a46b6f0020cf0d5e4b';
const DATABASE_ID = envVars.EXPO_PUBLIC_APPWRITE_DATABASE_ID || '68fc78fd0030f049a781';
const API_KEY     = envVars.APPWRITE_API_KEY;

if (!API_KEY) {
  console.error('❌  APPWRITE_API_KEY not found in .env — aborting.');
  process.exit(1);
}

const POSTS_COLLECTION_ID = envVars.EXPO_PUBLIC_APPWRITE_POSTS_COLLECTION_ID || '68ff7914000948dbd572';

// ---------------------------------------------------------------------------
// HTTP helper
// ---------------------------------------------------------------------------
const appwriteRequest = (method, path, body = null) => {
  return new Promise((resolve, reject) => {
    const url = new URL(`${ENDPOINT}${path}`);
    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-Appwrite-Project': PROJECT_ID,
        'X-Appwrite-Key': API_KEY,
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
};

// ---------------------------------------------------------------------------
// Attribute creators
// ---------------------------------------------------------------------------

const createStringArrayAttribute = async (collectionId, key, size = 256, required = false, array = true) => {
  console.log(`  → Creating string attribute: ${key} (array=${array})`);
  const res = await appwriteRequest(
    'POST',
    `/databases/${DATABASE_ID}/collections/${collectionId}/attributes/string`,
    { key, size, required, array },
  );
  if (res.status === 201) {
    console.log(`  ✅  ${key} created`);
  } else if (res.body?.code === 409 || (res.body?.message || '').includes('already exists')) {
    console.log(`  ⚠️   ${key} already exists — skipping`);
  } else {
    console.error(`  ❌  ${key} failed:`, res.body?.message || res.body);
  }
};

const createBooleanAttribute = async (collectionId, key, required = false, defaultValue = false) => {
  console.log(`  → Creating boolean attribute: ${key}`);
  const res = await appwriteRequest(
    'POST',
    `/databases/${DATABASE_ID}/collections/${collectionId}/attributes/boolean`,
    { key, required, default: defaultValue },
  );
  if (res.status === 201) {
    console.log(`  ✅  ${key} created`);
  } else if (res.body?.code === 409 || (res.body?.message || '').includes('already exists')) {
    console.log(`  ⚠️   ${key} already exists — skipping`);
  } else {
    console.error(`  ❌  ${key} failed:`, res.body?.message || res.body);
  }
};

// ---------------------------------------------------------------------------
// Main migration
// ---------------------------------------------------------------------------
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const migrate = async () => {
  console.log('\n🚀  Starting Guest Role schema migration...\n');
  console.log(`   Endpoint:    ${ENDPOINT}`);
  console.log(`   Project:     ${PROJECT_ID}`);
  console.log(`   Database:    ${DATABASE_ID}`);
  console.log(`   Posts coll:  ${POSTS_COLLECTION_ID}\n`);

  // Posts collection — add targetDepartments (string array, up to 3 items)
  // and isGuestPost (boolean) flag
  console.log('📋  Posts collection:');
  await createStringArrayAttribute(POSTS_COLLECTION_ID, 'targetDepartments', 256, false, true);
  await sleep(500); // Appwrite needs a brief pause between attribute creations
  await createBooleanAttribute(POSTS_COLLECTION_ID, 'isGuestPost', false, false);

  console.log('\n✅  Migration complete.\n');
  console.log('Note: Appwrite may take 30–60 seconds to index new attributes.');
  console.log('      You can verify in the Appwrite console under Collections → Posts → Attributes.\n');
};

migrate().catch((err) => {
  console.error('\n❌  Migration failed:', err.message || err);
  process.exit(1);
});
