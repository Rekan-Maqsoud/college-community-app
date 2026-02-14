import { Client, Account } from 'node-appwrite';

const json = (res, status, payload) => {
  return res.json(payload, status);
};

const parseBody = (req) => {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.bodyText === 'string' && req.bodyText.trim()) {
    try {
      return JSON.parse(req.bodyText);
    } catch {
      return null;
    }
  }
  if (typeof req.bodyRaw === 'string' && req.bodyRaw.trim()) {
    try {
      return JSON.parse(req.bodyRaw);
    } catch {
      return null;
    }
  }
  if (typeof req.body === 'string' && req.body.trim()) {
    try {
      return JSON.parse(req.body);
    } catch {
      return null;
    }
  }
  return {};
};

const getHeader = (headers, name) => {
  if (!headers) return '';
  const lower = name.toLowerCase();
  const key = Object.keys(headers).find((k) => k.toLowerCase() === lower);
  return key ? String(headers[key] || '') : '';
};

export default async ({ req, res, log, error }) => {
  try {
    if (req.method !== 'POST') {
      return json(res, 405, { success: false, error: 'Method not allowed' });
    }

    const appwriteEndpoint = process.env.APPWRITE_ENDPOINT;
    const appwriteProjectId = process.env.APPWRITE_PROJECT_ID;
    const discordWebhookUrl = process.env.DISCORD_REVIEW_WEBHOOK_URL;

    if (!appwriteEndpoint || !appwriteProjectId || !discordWebhookUrl) {
      return json(res, 500, { success: false, error: 'Function env is not configured' });
    }

    const authHeader = getHeader(req.headers, 'authorization');
    if (!authHeader.startsWith('Bearer ')) {
      return json(res, 401, { success: false, error: 'Missing bearer token' });
    }

    const jwt = authHeader.slice('Bearer '.length).trim();
    if (!jwt) {
      return json(res, 401, { success: false, error: 'Invalid bearer token' });
    }

    const client = new Client()
      .setEndpoint(appwriteEndpoint)
      .setProject(appwriteProjectId)
      .setJWT(jwt);

    const account = new Account(client);
    const currentUser = await account.get();
    const currentUserId = currentUser?.$id;

    if (!currentUserId) {
      return json(res, 401, { success: false, error: 'Unauthorized' });
    }

    const body = parseBody(req);
    if (!body || typeof body !== 'object') {
      return json(res, 400, { success: false, error: 'Invalid JSON body' });
    }

    const type = String(body.type || '');
    const requesterUserId = String(body.requesterUserId || '');
    const post = body.post || {};

    if (type !== 'post_review_request') {
      return json(res, 400, { success: false, error: 'Invalid event type' });
    }

    if (!requesterUserId || requesterUserId !== currentUserId) {
      return json(res, 403, { success: false, error: 'User mismatch' });
    }

    const postId = String(post.id || '');
    const ownerId = String(post.ownerId || '');

    if (!postId || !ownerId) {
      return json(res, 400, { success: false, error: 'Missing post data' });
    }

    if (ownerId !== currentUserId) {
      return json(res, 403, { success: false, error: 'Only post owner can request review' });
    }

    const discordPayload = {
      username: 'College Community Moderation',
      embeds: [
        {
          title: 'Post Review Request',
          color: 15158332,
          fields: [
            { name: 'Post ID', value: postId, inline: false },
            { name: 'Owner ID', value: ownerId, inline: true },
            { name: 'Requester ID', value: requesterUserId, inline: true },
            { name: 'Reports', value: String(post.reports || 0), inline: true },
            { name: 'Views', value: String(post.views || 0), inline: true },
            { name: 'Likes', value: String(post.likes || 0), inline: true },
            { name: 'Replies', value: String(post.replies || 0), inline: true },
            { name: 'Topic', value: String(post.topic || 'No topic').slice(0, 250), inline: false },
          ],
          timestamp: new Date().toISOString(),
        },
      ],
    };

    const response = await fetch(discordWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(discordPayload),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      error(`Discord webhook failed: ${response.status} ${text}`);
      return json(res, 502, { success: false, error: 'Failed to deliver review request' });
    }

    log(`Review request delivered for post ${postId} by user ${currentUserId}`);
    return json(res, 200, { success: true });
  } catch (e) {
    error(e?.message || 'Unknown function error');
    return json(res, 500, { success: false, error: 'Internal server error' });
  }
};