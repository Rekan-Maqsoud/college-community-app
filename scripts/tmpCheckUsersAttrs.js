const fs = require('fs');
const path = require('path');
const { Client } = require('appwrite');

const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
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
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      process.env[key] = value;
    });
}

const endpoint = String(process.env.APPWRITE_ENDPOINT || process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT || '').replace(/\/+$/, '');
const projectId = process.env.APPWRITE_PROJECT_ID || process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID;
const databaseId = process.env.APPWRITE_DATABASE_ID || process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID;
const apiKey = process.env.APPWRITE_API_KEY;

const client = new Client().setEndpoint(endpoint).setProject(projectId);

const request = (method, route, body = {}) => {
  return client.call(method, `${endpoint}${route}`, { 'X-Appwrite-Key': apiKey, 'content-type': 'application/json' }, body);
};

(async () => {
  const collectionId = '68fc7b42001bf7efbba3';
  const attrs = (await request('GET', `/databases/${databaseId}/collections/${collectionId}/attributes?limit=200&offset=0`)).attributes || [];
  const keys = attrs.filter((item) => String(item.key).toLowerCase().includes('user')).map((item) => ({
    key: item.key,
    type: item.type,
    size: item.size,
    status: item.status,
    required: item.required,
  }));
  console.log(JSON.stringify(keys, null, 2));
})();
