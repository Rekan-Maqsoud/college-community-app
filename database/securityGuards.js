import { account, databases, config } from './config';

const rateLimitStore = new Map();

const buildRateLimitError = (action, retryAfterMs) => {
    const error = new Error('ACTION_RATE_LIMITED');
    error.code = 'RATE_LIMITED';
    error.action = action;
    error.retryAfterMs = retryAfterMs;
    return error;
};

const getRateLimitKey = (action, userId) => `${action}:${userId}`;

export const getAuthenticatedUserId = async () => {
    const currentUser = await account.get();
    const currentUserId = currentUser?.$id;
    if (!currentUserId) {
        throw new Error('Authentication required');
    }
    return currentUserId;
};

export const assertActorIdentity = async (expectedUserId) => {
    if (!expectedUserId || typeof expectedUserId !== 'string') {
        throw new Error('Invalid actor user ID');
    }

    const currentUserId = await getAuthenticatedUserId();
    if (currentUserId !== expectedUserId) {
        throw new Error('User identity mismatch');
    }

    return currentUserId;
};

export const enforceRateLimit = ({ action, userId, maxActions, windowMs }) => {
    if (!action || !userId || !maxActions || !windowMs) {
        return;
    }

    const now = Date.now();
    const key = getRateLimitKey(action, userId);
    const windowStart = now - windowMs;
    const existing = rateLimitStore.get(key) || [];
    const recent = existing.filter((timestamp) => timestamp > windowStart);

    if (recent.length >= maxActions) {
        const retryAfterMs = Math.max(1000, windowMs - (now - recent[0]));
        throw buildRateLimitError(action, retryAfterMs);
    }

    recent.push(now);
    rateLimitStore.set(key, recent);
};

const getArray = (value) => (Array.isArray(value) ? value : []);

export const hasBlockedRelationship = async (userIdA, userIdB, options = {}) => {
    try {
        if (!userIdA || !userIdB || userIdA === userIdB) {
            return false;
        }

        const { includeChatBlocks = false } = options;

        const [userA, userB] = await Promise.all([
            databases.getDocument(config.databaseId, config.usersCollectionId, userIdA),
            databases.getDocument(config.databaseId, config.usersCollectionId, userIdB),
        ]);

        const aBlocked = getArray(userA?.blockedUsers);
        const bBlocked = getArray(userB?.blockedUsers);

        if (aBlocked.includes(userIdB) || bBlocked.includes(userIdA)) {
            return true;
        }

        if (!includeChatBlocks) {
            return false;
        }

        const aChatBlocked = getArray(userA?.chatBlockedUsers);
        const bChatBlocked = getArray(userB?.chatBlockedUsers);
        return aChatBlocked.includes(userIdB) || bChatBlocked.includes(userIdA);
    } catch (error) {
        return false;
    }
};
