import { databases, config, account } from './config';
import { ID, Permission, Role, Query } from 'appwrite';
import { enforceRateLimit, getAuthenticatedUserId } from './securityGuards';

const TITLE_MAX = 120;
const MESSAGE_MAX = 1500;
const MESSAGE_MIN = 10;

const ALLOWED_CATEGORIES = ['feature', 'bug', 'ui', 'performance', 'other'];

const sanitizeText = (value, maxLen) => {
  if (typeof value !== 'string') {
    return '';
  }

  return value.replace(/\s+/g, ' ').trim().slice(0, maxLen);
};

const sanitizeMultiline = (value, maxLen) => {
  if (typeof value !== 'string') {
    return '';
  }

  return value.replace(/\r\n/g, '\n').trim().slice(0, maxLen);
};

export const createSuggestion = async (payload = {}) => {
  if (!config.databaseId || !config.suggestionsCollectionId) {
    throw new Error('Suggestions collection is not configured');
  }

  const userId = await getAuthenticatedUserId();
  enforceRateLimit({
    action: 'suggestion_submit',
    userId,
    maxActions: 4,
    windowMs: 10 * 60 * 1000,
  });

  const title = sanitizeText(payload.title, TITLE_MAX);
  const message = sanitizeMultiline(payload.message, MESSAGE_MAX);
  const category = sanitizeText(payload.category, 32).toLowerCase();

  if (!title) {
    throw new Error('Suggestion title is required');
  }

  if (message.length < MESSAGE_MIN) {
    throw new Error('Suggestion message is too short');
  }

  if (!ALLOWED_CATEGORIES.includes(category)) {
    throw new Error('Suggestion category is invalid');
  }

  const me = await account.get();
  const appVersion = sanitizeText(payload.appVersion, 64);
  const platform = sanitizeText(payload.platform, 32).toLowerCase();

  return await databases.createDocument(
    config.databaseId,
    config.suggestionsCollectionId,
    ID.unique(),
    {
      userId,
      userName: sanitizeText(me?.name || '', 255) || undefined,
      userEmail: sanitizeText(me?.email || '', 320) || undefined,
      category,
      title,
      message,
      status: 'new',
      appVersion: appVersion || undefined,
      platform: platform || undefined,
    },
    [
      Permission.read(Role.user(userId)),
      Permission.update(Role.user(userId)),
      Permission.delete(Role.user(userId)),
    ]
  );
};

export const getMySuggestions = async (limit = 20, offset = 0) => {
  if (!config.databaseId || !config.suggestionsCollectionId) {
    return [];
  }

  const userId = await getAuthenticatedUserId();

  const result = await databases.listDocuments(
    config.databaseId,
    config.suggestionsCollectionId,
    [
      Query.equal('userId', userId),
      Query.orderDesc('$createdAt'),
      Query.limit(Math.min(Math.max(limit, 1), 100)),
      Query.offset(Math.max(offset, 0)),
    ]
  );

  return result?.documents || [];
};

export const SUGGESTION_CATEGORIES = ALLOWED_CATEGORIES;