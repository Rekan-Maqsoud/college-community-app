import { Client, Account, Databases, Storage } from 'appwrite';

const client = new Client();

const endpoint = process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT;
const projectId = process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID;

client
    .setEndpoint(endpoint)
    .setProject(projectId);

// Create a wrapper for realtime subscription with error handling
export const safeSubscribe = (channel, callback) => {
    try {
        const unsubscribe = client.subscribe(channel, (response) => {
            // Silently ignore error responses from WebSocket
            if (response.code && response.message) {
                return;
            }
            callback(response);
        });
        
        return unsubscribe;
    } catch (error) {
        // Return no-op unsubscribe function on error
        return () => {};
    }
};

export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);

export const config = {
    endpoint: process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT,
    projectId: process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID,
    databaseId: process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID,
    bucketId: process.env.EXPO_PUBLIC_APPWRITE_BUCKET_ID,
    postsCollectionId: process.env.EXPO_PUBLIC_APPWRITE_POSTS_COLLECTION_ID,
    repliesCollectionId: process.env.EXPO_PUBLIC_APPWRITE_REPLIES_COLLECTION_ID,
    usersCollectionId: process.env.EXPO_PUBLIC_APPWRITE_USERS_COLLECTION_ID,
    chatsCollectionId: process.env.EXPO_PUBLIC_APPWRITE_CHATS_COLLECTION_ID,
    messagesCollectionId: process.env.EXPO_PUBLIC_APPWRITE_MESSAGES_COLLECTION_ID,
    userChatSettingsCollectionId: process.env.EXPO_PUBLIC_APPWRITE_USER_CHAT_SETTINGS_COLLECTION_ID,
    followsCollectionId: process.env.EXPO_PUBLIC_APPWRITE_FOLLOWS_COLLECTION_ID,
    notificationsCollectionId: process.env.EXPO_PUBLIC_APPWRITE_NOTIFICATIONS_COLLECTION_ID,
    pushTokensCollectionId: process.env.EXPO_PUBLIC_APPWRITE_PUSH_TOKENS_COLLECTION_ID,
};

export default client;
