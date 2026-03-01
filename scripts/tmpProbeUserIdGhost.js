const fs = require('fs');
const path = require('path');
const { Client } = require('appwrite');

const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  const raw = fs.readFileSync(envPath, 'utf8');
  raw.split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith('#')).forEach((line) => {
    const idx = line.indexOf('=');
    if (idx <= 0) return;
    const key = line.slice(0, idx).trim();
    if (!key || process.env[key]) return;
    let value = line.slice(idx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    process.env[key] = value;
  });
}

const endpoint = String(process.env.APPWRITE_ENDPOINT || process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT || '').replace(/\/+$/, '');
const projectId = process.env.APPWRITE_PROJECT_ID || process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID;
const databaseId = process.env.APPWRITE_DATABASE_ID || process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID;
const apiKey = process.env.APPWRITE_API_KEY;
const usersCollectionId = process.env.EXPO_PUBLIC_APPWRITE_USERS_COLLECTION_ID || '68fc7b42001bf7efbba3';

const client = new Client().setEndpoint(endpoint).setProject(projectId);
const request = (method, route, body = {}) => client.call(method, `${endpoint}${route}`, { 'X-Appwrite-Key': apiKey, 'content-type': 'application/json' }, body);

(async () => {
  try {
    const attrs = (await request('GET', `/databases/${databaseId}/collections/${usersCollectionId}/attributes?limit=200&offset=0`)).attributes || [];
    console.log('attrs with user:', attrs.filter((a) => String(a.key).toLowerCase().includes('user')).map((a) => ({ key: a.key, type: a.type, status: a.status, size: a.size })));

    try {
      const patched = await request('PATCH', `/databases/${databaseId}/collections/${usersCollectionId}/attributes/string/userId`, {
        required: false,
        default: null,
        array: false,
        size: 255,
      });
      console.log('patch userId attr success', patched?.key || patched);
    } catch (error) {
      console.log('patch userId attr failed:', error.message);
    }

    const docsPage = await request('GET', `/databases/${databaseId}/collections/${usersCollectionId}/documents?limit=1&offset=0`);
    const first = (docsPage.documents || [])[0];
    if (!first) {
      console.log('no user docs');
      return;
    }

    try {
      const updated = await request('PATCH', `/databases/${databaseId}/collections/${usersCollectionId}/documents/${first.$id}`, {
        data: {
          userId: first.$id,
        },
      });
      console.log('doc patch success, userId value:', updated.userId);
    } catch (error) {
      console.log('doc patch failed:', error.message);
    }
  } catch (error) {
    console.log('probe failed:', error.message);
  }
})();
