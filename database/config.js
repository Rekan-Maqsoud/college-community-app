import { Client, Account, Databases, Storage } from 'appwrite';
import realtimeDebugLogger from '../app/utils/realtimeDebugLogger';

// Polyfill window.localStorage for the Appwrite web SDK.
// The SDK's realtime handler accesses window.localStorage.getItem('cookieFallback')
// without a guard, which crashes in React Native where localStorage doesn't exist.
if (typeof window !== 'undefined' && !window.localStorage) {
    const memoryStorage = {};
    window.localStorage = {
        getItem(key) {
            return Object.prototype.hasOwnProperty.call(memoryStorage, key) ? memoryStorage[key] : null;
        },
        setItem(key, value) {
            memoryStorage[key] = String(value);
        },
        removeItem(key) {
            delete memoryStorage[key];
        },
        clear() {
            Object.keys(memoryStorage).forEach(k => delete memoryStorage[k]);
        },
        get length() {
            return Object.keys(memoryStorage).length;
        },
        key(index) {
            return Object.keys(memoryStorage)[index] || null;
        },
    };
}

const client = new Client();

const endpoint = process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT;
const projectId = process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID;

client
    .setEndpoint(endpoint)
    .setProject(projectId);

// Create a wrapper for realtime subscription with retry/backoff on disconnects
export const safeSubscribe = (channel, callback) => {
    let unsubscribe = null;
    let retryTimer = null;
    let retryCount = 0;
    let isActive = true;

    const clearRetryTimer = () => {
        if (retryTimer) {
            clearTimeout(retryTimer);
            retryTimer = null;
        }
    };

    const cleanupSubscription = () => {
        if (unsubscribe) {
            try {
                unsubscribe();
            } catch (e) {
                // Ignore cleanup errors
            }
            unsubscribe = null;
        }
    };

    const scheduleRetry = () => {
        if (!isActive) {
            return;
        }

        cleanupSubscription();

        const cappedRetry = Math.min(retryCount, 5);
        const delay = Math.min(30000, 1000 * Math.pow(2, cappedRetry));
        retryCount += 1;

        realtimeDebugLogger.warn('realtime_retry_scheduled', {
            channel,
            retryCount,
            delay,
        });

        clearRetryTimer();
        retryTimer = setTimeout(() => {
            subscribe();
        }, delay);
    };

    const subscribe = () => {
        if (!isActive) {
            return;
        }

        try {
            realtimeDebugLogger.trace('realtime_subscribe_start', { channel });
            unsubscribe = client.subscribe(channel, (response) => {
                if (!isActive) {
                    return;
                }

                if (response?.code && response?.message) {
                    realtimeDebugLogger.warn('realtime_response_error', {
                        channel,
                        code: response.code,
                        message: response.message,
                    });
                    scheduleRetry();
                    return;
                }

                retryCount = 0;
                callback(response);
            });
        } catch (error) {
            realtimeDebugLogger.error('realtime_subscribe_error', {
                channel,
                message: error?.message,
            });
            scheduleRetry();
        }
    };

    subscribe();

    return () => {
        isActive = false;
        clearRetryTimer();
        cleanupSubscription();
    };
};

export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);

export const config = {
    endpoint: process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT,
    projectId: process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID,
    databaseId: process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID,
    bucketId: process.env.EXPO_PUBLIC_APPWRITE_BUCKET_ID,
    storageId: process.env.EXPO_PUBLIC_APPWRITE_STORAGE_ID,
    postsCollectionId: process.env.EXPO_PUBLIC_APPWRITE_POSTS_COLLECTION_ID,
    repliesCollectionId: process.env.EXPO_PUBLIC_APPWRITE_REPLIES_COLLECTION_ID,
    usersCollectionId: process.env.EXPO_PUBLIC_APPWRITE_USERS_COLLECTION_ID,
    chatsCollectionId: process.env.EXPO_PUBLIC_APPWRITE_CHATS_COLLECTION_ID,
    messagesCollectionId: process.env.EXPO_PUBLIC_APPWRITE_MESSAGES_COLLECTION_ID,
    userChatSettingsCollectionId: process.env.EXPO_PUBLIC_APPWRITE_USER_CHAT_SETTINGS_COLLECTION_ID,
    followsCollectionId: process.env.EXPO_PUBLIC_APPWRITE_FOLLOWS_COLLECTION_ID,
    notificationsCollectionId: process.env.EXPO_PUBLIC_APPWRITE_NOTIFICATIONS_COLLECTION_ID,
    pushTokensCollectionId: process.env.EXPO_PUBLIC_APPWRITE_PUSH_TOKENS_COLLECTION_ID,
    lectureChannelsCollectionId: process.env.EXPO_PUBLIC_APPWRITE_LECTURE_CHANNELS_COLLECTION_ID,
    lectureMembershipsCollectionId: process.env.EXPO_PUBLIC_APPWRITE_LECTURE_MEMBERSHIPS_COLLECTION_ID,
    lectureAssetsCollectionId: process.env.EXPO_PUBLIC_APPWRITE_LECTURE_ASSETS_COLLECTION_ID,
    lectureCommentsCollectionId: process.env.EXPO_PUBLIC_APPWRITE_LECTURE_COMMENTS_COLLECTION_ID,
    lectureStorageId: process.env.EXPO_PUBLIC_APPWRITE_LECTURE_STORAGE_ID,
    lectureGuardEndpoint: process.env.EXPO_PUBLIC_LECTURE_GUARD_ENDPOINT,
    voiceMessagesStorageId: process.env.EXPO_PUBLIC_APPWRITE_VOICE_MESSAGES_STORAGE_ID,
    postReportsCollectionId: process.env.EXPO_PUBLIC_APPWRITE_POST_REPORTS_COLLECTION_ID,
    reportReviewEndpoint: process.env.EXPO_PUBLIC_REPORT_REVIEW_ENDPOINT,
};

export default client;
