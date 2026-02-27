import { Client, Account, Databases, Storage } from 'appwrite';
import realtimeDebugLogger from '../app/utils/realtimeDebugLogger';

// Patch WebSocket.send to guard against INVALID_STATE_ERR.
// The Appwrite SDK's internal heartbeat (setInterval) calls socket.send()
// without checking readyState first. If the socket is CLOSING (2) or
// CLOSED (3), React Native throws INVALID_STATE_ERR. This patch silently
// ignores sends on non-OPEN sockets so the heartbeat can't crash the app.
if (typeof globalThis !== 'undefined' && globalThis.WebSocket) {
    const _origSend = globalThis.WebSocket.prototype.send;
    globalThis.WebSocket.prototype.send = function safeSend(...args) {
        if (this.readyState !== 1 /* OPEN */) {
            return;
        }
        return _origSend.apply(this, args);
    };
}

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

const patchRealtimeMessageShape = () => {
    const realtime = client?.realtime;
    if (!realtime || typeof realtime.onMessage !== 'function' || realtime.__ccMessagePatchApplied) {
        return;
    }

    const originalOnMessage = realtime.onMessage.bind(realtime);
    realtime.onMessage = (event) => {
        try {
            const rawData = typeof event?.data === 'string' ? event.data : '';
            if (!rawData) {
                return originalOnMessage(event);
            }

            const message = JSON.parse(rawData);
            if (message?.type !== 'event' || !message?.data || Array.isArray(message.data.channels)) {
                return originalOnMessage(event);
            }

            const normalizedChannels = typeof message.data.channels === 'string'
                ? [message.data.channels]
                : [];
            const patchedMessage = {
                ...message,
                data: {
                    ...message.data,
                    channels: normalizedChannels,
                },
            };

            return originalOnMessage({ data: JSON.stringify(patchedMessage) });
        } catch (error) {
            return originalOnMessage(event);
        }
    };

    realtime.__ccMessagePatchApplied = true;
};

patchRealtimeMessageShape();

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
    appwritePushProviderIdAndroid: process.env.EXPO_PUBLIC_APPWRITE_PUSH_PROVIDER_ID_ANDROID,
    appwritePushProviderIdIos: process.env.EXPO_PUBLIC_APPWRITE_PUSH_PROVIDER_ID_IOS,
    lectureChannelsCollectionId: process.env.EXPO_PUBLIC_APPWRITE_LECTURE_CHANNELS_COLLECTION_ID,
    lectureMembershipsCollectionId: process.env.EXPO_PUBLIC_APPWRITE_LECTURE_MEMBERSHIPS_COLLECTION_ID,
    lectureAssetsCollectionId: process.env.EXPO_PUBLIC_APPWRITE_LECTURE_ASSETS_COLLECTION_ID,
    lectureCommentsCollectionId: process.env.EXPO_PUBLIC_APPWRITE_LECTURE_COMMENTS_COLLECTION_ID,
    lectureStorageId: process.env.EXPO_PUBLIC_APPWRITE_LECTURE_STORAGE_ID,
    youtubeApiKey: process.env.EXPO_PUBLIC_YOUTUBE_API_KEY,
    lectureGuardEndpoint: process.env.EXPO_PUBLIC_LECTURE_GUARD_ENDPOINT,
    voiceMessagesStorageId: process.env.EXPO_PUBLIC_APPWRITE_VOICE_MESSAGES_STORAGE_ID,
    postReportsCollectionId: process.env.EXPO_PUBLIC_APPWRITE_POST_REPORTS_COLLECTION_ID,
    suggestionsCollectionId: process.env.EXPO_PUBLIC_APPWRITE_SUGGESTIONS_COLLECTION_ID,
    reportReviewEndpoint: process.env.EXPO_PUBLIC_REPORT_REVIEW_ENDPOINT,
    repElectionsCollectionId: process.env.EXPO_PUBLIC_APPWRITE_REP_ELECTIONS_COLLECTION_ID,
    repVotesCollectionId: process.env.EXPO_PUBLIC_APPWRITE_REP_VOTES_COLLECTION_ID,
};

export default client;
