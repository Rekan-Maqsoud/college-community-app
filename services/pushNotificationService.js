import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import safeStorage from '../app/utils/safeStorage';

const PUSH_TOKEN_KEY = 'expoPushToken';
const PERMISSION_STATUS_KEY = 'notificationPermissionStatus';

const getExpoProjectId = () => {
  return (
    Constants.easConfig?.projectId ||
    Constants.expoConfig?.extra?.eas?.projectId ||
    Constants.expoConfig?.extra?.projectId ||
    Constants.manifest?.extra?.eas?.projectId ||
    Constants.manifest?.extra?.projectId ||
    Constants.manifest2?.extra?.eas?.projectId ||
    Constants.manifest2?.extra?.projectId ||
    null
  );
};

/**
 * Check if the user has enabled notifications globally and for specific category
 * @param {string} notificationType - The type of notification (chat_message, post_like, post_reply, follow, etc.)
 * @returns {Promise<boolean>} Whether notifications should be shown
 */
const shouldShowNotification = async (notificationType) => {
  try {
    // Check if notifications are globally enabled
    const notificationsEnabled = await safeStorage.getItem('notificationsEnabled');
    if (notificationsEnabled === 'false') {
      return false;
    }

    // Check quiet hours
    const quietHoursStr = await safeStorage.getItem('quietHours');
    if (quietHoursStr) {
      const quietHours = JSON.parse(quietHoursStr);
      if (quietHours.enabled) {
        const now = new Date();
        const currentMinutes = now.getHours() * 60 + now.getMinutes();
        const [startHour, startMin] = (quietHours.startTime || '22:00').split(':').map(Number);
        const [endHour, endMin] = (quietHours.endTime || '07:00').split(':').map(Number);
        const startMinutes = startHour * 60 + startMin;
        const endMinutes = endHour * 60 + endMin;

        // Handle overnight quiet hours (e.g., 22:00 - 07:00)
        let isInQuietHours = false;
        if (startMinutes > endMinutes) {
          isInQuietHours = currentMinutes >= startMinutes || currentMinutes < endMinutes;
        } else {
          isInQuietHours = currentMinutes >= startMinutes && currentMinutes < endMinutes;
        }

        if (isInQuietHours) {
          return false;
        }
      }
    }

    // Check category-specific settings
    const notificationSettingsStr = await safeStorage.getItem('notificationSettings');
    if (notificationSettingsStr) {
      let settings = {};
      try {
        settings = JSON.parse(notificationSettingsStr);
      } catch (e) {
        settings = {};
      }
      if (!settings) settings = {};
      
      // Map notification types to setting keys
      switch (notificationType) {
        case 'chat_message':
          // This could be a direct or group chat - handled separately
          return true;
        case 'direct_chat':
          return settings.directChats !== false;
        case 'group_chat':
          return settings.groupChats !== false;
        case 'post_like':
          return settings.postLikes !== false;
        case 'post_reply':
          return settings.postReplies !== false;
        case 'mention':
          return settings.mentions !== false;
        case 'follow':
        case 'friend_post':
          return settings.friendPosts !== false;
        default:
          return true;
      }
    }

    return true;
  } catch (error) {
    return true; // Default to showing notification if there's an error
  }
};

// Configure how notifications should be displayed when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const data = notification?.request?.content?.data || {};
    const notificationType = data.type || 'default';
    
    // Check if we should show this notification based on user settings
    const shouldShow = await shouldShowNotification(notificationType);
    
    if (!shouldShow) {
      return {
        shouldShowAlert: false,
        shouldPlaySound: false,
        shouldSetBadge: false,
        shouldShowBanner: false,
        shouldShowBanner: false,
        shouldShowList: false,
      };
    }
    
    return {
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldShowBanner: true,
      shouldShowList: true,
    };
  },
});

/**
 * Request notification permissions from the user
 * @returns {Promise<boolean>} Whether permissions were granted
 */
export const requestNotificationPermissions = async () => {
  try {
    if (!Device.isDevice) {
      return false;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
        },
      });
      finalStatus = status;
    }

    // Store the permission status
    await safeStorage.setItem(PERMISSION_STATUS_KEY, finalStatus);

    return finalStatus === 'granted';
  } catch (error) {
    return false;
  }
};

/**
 * Check if notifications are currently permitted
 * @returns {Promise<boolean>} Whether notifications are permitted
 */
export const checkNotificationPermissions = async () => {
  try {
    if (!Device.isDevice) {
      return false;
    }

    const { status } = await Notifications.getPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    return false;
  }
};

/**
 * Register for push notifications and get the Expo push token
 * @returns {Promise<string|null>} The Expo push token or null if failed
 */
export const registerForPushNotifications = async () => {
  try {
    if (!Device.isDevice) {
      return null;
    }

    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) {
      return null;
    }

    const projectId = getExpoProjectId();
    if (!projectId) {
      return null;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    const token = tokenData.data;

    // Store token locally
    await safeStorage.setItem(PUSH_TOKEN_KEY, token);

    // Set up Android notification channel
    if (Platform.OS === 'android') {
      await setupAndroidNotificationChannels();
    }

    return token;
  } catch (error) {
    return null;
  }
};

/**
 * Get the stored push token
 * @returns {Promise<string|null>} The stored push token or null
 */
export const getStoredPushToken = async () => {
  try {
    return await safeStorage.getItem(PUSH_TOKEN_KEY);
  } catch (error) {
    return null;
  }
};

/**
 * Set up Android notification channels for different notification types
 */
const setupAndroidNotificationChannels = async () => {
  if (Platform.OS !== 'android') return;

  // Default channel for general notifications
  await Notifications.setNotificationChannelAsync('default', {
    name: 'Default',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#FF231F7C',
    sound: 'default',
  });

  // Channel for chat messages
  await Notifications.setNotificationChannelAsync('chat', {
    name: 'Chat Messages',
    description: 'Notifications for new chat messages',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#007AFF',
    sound: 'default',
  });

  // Channel for post interactions
  await Notifications.setNotificationChannelAsync('posts', {
    name: 'Post Interactions',
    description: 'Notifications for likes, replies, and mentions',
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 250],
    lightColor: '#34C759',
  });

  // Channel for follows
  await Notifications.setNotificationChannelAsync('social', {
    name: 'Social',
    description: 'Notifications for new followers and friend activity',
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 250],
    lightColor: '#FF9500',
  });
};

/**
 * Schedule a local notification
 * @param {Object} options Notification options
 * @param {string} options.title The notification title
 * @param {string} options.body The notification body
 * @param {Object} options.data Additional data to include
 * @param {string} options.channelId Android channel ID
 * @param {number} options.seconds Seconds to wait before showing (0 for immediate)
 * @returns {Promise<string>} The notification identifier
 */
export const scheduleLocalNotification = async ({
  title,
  body,
  data = {},
  channelId = 'default',
  seconds = 0,
}) => {
  try {
    const content = {
      title,
      body,
      data,
      sound: 'default',
    };

    if (Platform.OS === 'android') {
      content.channelId = channelId;
    }

    const trigger = seconds > 0 ? { seconds } : null;

    const identifier = await Notifications.scheduleNotificationAsync({
      content,
      trigger,
    });

    return identifier;
  } catch (error) {
    return null;
  }
};

/**
 * Cancel a scheduled notification
 * @param {string} identifier The notification identifier to cancel
 */
export const cancelNotification = async (identifier) => {
  try {
    await Notifications.cancelScheduledNotificationAsync(identifier);
  } catch (error) {
    // Silent fail
  }
};

/**
 * Cancel all scheduled notifications
 */
export const cancelAllNotifications = async () => {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (error) {
    // Silent fail
  }
};

/**
 * Get the current badge count
 * @returns {Promise<number>} The current badge count
 */
export const getBadgeCount = async () => {
  try {
    return await Notifications.getBadgeCountAsync();
  } catch (error) {
    return 0;
  }
};

/**
 * Set the badge count
 * @param {number} count The badge count to set
 */
export const setBadgeCount = async (count) => {
  try {
    await Notifications.setBadgeCountAsync(count);
  } catch (error) {
    // Silent fail
  }
};

/**
 * Clear all delivered notifications
 */
export const clearAllNotifications = async () => {
  try {
    await Notifications.dismissAllNotificationsAsync();
    await setBadgeCount(0);
  } catch (error) {
    // Silent fail
  }
};

/**
 * Add a listener for received notifications (when app is in foreground)
 * @param {Function} callback Function to call when notification is received
 * @returns {Object} Subscription that can be removed
 */
export const addNotificationReceivedListener = (callback) => {
  return Notifications.addNotificationReceivedListener(callback);
};

/**
 * Add a listener for notification responses (when user taps notification)
 * @param {Function} callback Function to call when notification is tapped
 * @returns {Object} Subscription that can be removed
 */
export const addNotificationResponseListener = (callback) => {
  return Notifications.addNotificationResponseReceivedListener(callback);
};

/**
 * Get the last notification response (if app was opened via notification)
 * @returns {Promise<Object|null>} The last notification response or null
 */
export const getLastNotificationResponse = async () => {
  try {
    return await Notifications.getLastNotificationResponseAsync();
  } catch (error) {
    return null;
  }
};

/**
 * Check if the app was opened from a notification
 * @returns {Promise<Object|null>} The notification data if app was opened from notification
 */
export const checkInitialNotification = async () => {
  try {
    const response = await getLastNotificationResponse();
    if (response) {
      return response?.notification?.request?.content?.data || null;
    }
    return null;
  } catch (error) {
    return null;
  }
};

/**
 * Send push notification for general notifications (likes, replies, follows, etc.)
 * @param {Object} options Notification details
 * @param {string} options.recipientUserId The user ID to send notification to
 * @param {string} options.senderId The sender's user ID
 * @param {string} options.senderName The sender's name
 * @param {string} options.type The notification type (post_like, post_reply, follow, etc.)
 * @param {string} options.title The notification title
 * @param {string} options.body The notification body
 * @param {string} options.postId Optional post ID for navigation
 * @returns {Promise<Object|null>} The push result or null
 */
export const sendGeneralPushNotification = async ({
  recipientUserId,
  senderId,
  senderName,
  type,
  title,
  body,
  postId = null,
  replyId = null,
}) => {
  try {
    // Validate required parameters
    if (!recipientUserId || !senderId) {
      return null;
    }

    // Don't send notification to yourself
    if (recipientUserId === senderId) {
      return null;
    }

    // Import database functions here to avoid circular dependencies
    let databases, config, Query;
    try {
      const dbConfig = require('../database/config');
      databases = dbConfig.databases;
      config = dbConfig.config;
      Query = require('appwrite').Query;
    } catch (importError) {
      return null;
    }

    // Check if push tokens collection is configured
    if (!config.pushTokensCollectionId || !config.databaseId) {
      return null;
    }

    const pushTokens = await databases.listDocuments(
      config.databaseId,
      config.pushTokensCollectionId,
      [
        Query.equal('userId', recipientUserId),
        Query.limit(1)
      ]
    );

    if (!pushTokens?.documents || pushTokens.documents.length === 0) {
      return null;
    }

    const token = pushTokens.documents[0]?.token;
    if (!token) {
      return null;
    }

    // Prepare notification message
    const notifData = {
      type,
      senderId,
      senderName,
      postId,
      userId: senderId,
    };
    if (replyId) {
      notifData.replyId = replyId;
    }

    const message = {
      to: token,
      sound: 'default',
      title,
      body,
      data: notifData,
      channelId: type === 'follow' ? 'social' : 'posts',
    };

    const expoPushUrl = 'https://exp.host/--/api/v2/push/send';

    const response = await fetch(expoPushUrl, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    const result = await response.json();

    // Check for InvalidCredentials - means FCM key not uploaded to Expo
    return result;
  } catch (error) {
    return null;
  }
};

/**
 * Send push notification for a new chat message
 * This function sends push notifications to all participants except the sender
 * @param {Object} options Message and chat details
 * @param {string} options.chatId The chat ID
 * @param {string} options.messageId The message ID
 * @param {string} options.senderId The sender's user ID
 * @param {string} options.senderName The sender's name
 * @param {string} options.content The message content preview
 * @param {string} options.chatName The chat name
 * @param {string} options.chatType The type of chat (private, group, etc.)
 */
export const sendChatPushNotification = async ({
  chatId,
  messageId,
  senderId,
  senderName,
  content,
  chatName,
  chatType,
}) => {
  try {
    // Import database functions here to avoid circular dependencies
    const { databases, config } = require('../database/config');
    const { Query } = require('appwrite');
    
    // Get chat to find participants
    const chat = await databases.getDocument(
      config.databaseId,
      config.chatsCollectionId,
      chatId
    );
    
    const participants = chat.participants || [];
    const recipientIds = participants.filter(id => id !== senderId);

    if (recipientIds.length === 0) {
      return;
    }
    
    // Get push tokens for recipients
    let allTokenDocs = [];
    
    const batchSize = 25;
    for (let i = 0; i < recipientIds.length; i += batchSize) {
      const batch = recipientIds.slice(i, i + batchSize);
      const pushTokens = await databases.listDocuments(
        config.databaseId,
        config.pushTokensCollectionId,
        [
          Query.contains('userId', batch),
          Query.limit(batch.length)
        ]
      );
      if (pushTokens.documents) {
        allTokenDocs.push(...pushTokens.documents);
      }
    }

    if (allTokenDocs.length === 0) {
      return;
    }
    
    // Prepare notification content with rich message preview
    const title = chatType === 'private' ? senderName : `${senderName} in ${chatName}`;
    
    // Generate rich body based on message type/content
    let body;
    if (content && content.startsWith('{') && content.includes('postId')) {
      body = '\uD83D\uDD17 Shared a post';
    } else if (content === '\uD83D\uDCF7 Image' || content?.startsWith('\uD83D\uDCF7')) {
      body = '\uD83D\uDCF7 Sent an image';
    } else if (content === '\uD83D\uDCCD Location' || content?.startsWith('\uD83D\uDCCD')) {
      body = '\uD83D\uDCCD Shared a location';
    } else if (content && content.trim().length > 0) {
      body = content.length > 50 ? content.substring(0, 50) + '...' : content;
    } else {
      body = '\uD83D\uDCF7 Sent an image';
    }
    
    // Send notifications using Expo Push API
    const messages = allTokenDocs.map(tokenDoc => ({
      to: tokenDoc.token,
      sound: 'default',
      title,
      body,
      data: {
        type: 'chat_message',
        chatId,
        messageId,
        senderId,
        senderName,
        chatType,
        url: `/chat/${chatId}`,
      },
      channelId: 'chat',
    }));

    const expoPushUrl = 'https://exp.host/--/api/v2/push/send';
    
    const response = await fetch(expoPushUrl, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });
    
    const result = await response.json();

    // Check for InvalidCredentials - means FCM key not uploaded to Expo
    // Mark message as delivered for recipients who received notification
    if (result.data) {
      const { markMessageAsDelivered } = require('../database/chats');
      const deliveryPromises = result.data.map(async (ticket, index) => {
        if (ticket.status === 'ok' && allTokenDocs[index]) {
          await markMessageAsDelivered(messageId, allTokenDocs[index].userId);
        }
      });
      await Promise.all(deliveryPromises);
    }
    
    return result;
  } catch (error) {
    return null;
  }
};

/**
 * Register the device as an Appwrite Messaging Target using the native FCM token.
 * This is required for Appwrite to send push notifications via its Messaging service.
 * Must be called AFTER the user is authenticated (account session exists).
 * Handles token rotation: if a target already exists, updates its token.
 * @returns {Promise<Object|null>} The created/updated target document or null
 */
export const registerAppwriteTarget = async () => {
  const APPWRITE_TARGET_ID_KEY = 'appwriteTargetId';
  try {
    if (!Device.isDevice) {
      return null;
    }

    // Get native push token (APNs on iOS, FCM on Android)
    const nativeTokenData = await Notifications.getDevicePushTokenAsync();
    const nativePushToken = nativeTokenData?.data;

    if (!nativePushToken || typeof nativePushToken !== 'string') {
      return null;
    }

    const { account, config } = require('../database/config');
    const { ID } = require('appwrite');

    const providerId = Platform.OS === 'ios'
      ? config.appwritePushProviderIdIos
      : config.appwritePushProviderIdAndroid;

    // Provider IDs are optional until Messaging providers are configured.
    if (!providerId) {
      return null;
    }

    // Check if we have a previously stored target ID
    const storedTargetId = await safeStorage.getItem(APPWRITE_TARGET_ID_KEY);

    if (storedTargetId) {
      // Try to update existing target with current token
      try {
        const updated = await account.updatePushTarget(storedTargetId, nativePushToken);
        return updated;
      } catch (updateErr) {
        await safeStorage.removeItem(APPWRITE_TARGET_ID_KEY);
      }
    }

    // Create a new target
    const targetId = ID.unique();
    try {
      const target = await account.createPushTarget(targetId, nativePushToken, providerId);
      await safeStorage.setItem(APPWRITE_TARGET_ID_KEY, target?.$id || targetId);
      return target;
    } catch (createErr) {
      const errorCode = createErr?.code || createErr?.type || '';
      const errorMessage = createErr?.message || '';

      if (
        errorCode === 409 ||
        errorMessage.includes('already') ||
        errorMessage.includes('duplicate') ||
        errorMessage.includes('Target')
      ) {
        // Target exists but we don't have the ID stored — list targets to find it
        try {
          const me = await account.get();
          const targets = me?.targets || [];
          const pushTarget = targets.find(t => t.providerType === 'push');

          if (pushTarget) {
            await safeStorage.setItem(APPWRITE_TARGET_ID_KEY, pushTarget.$id);
            const updated = await account.updatePushTarget(pushTarget.$id, nativePushToken);
            return updated;
          }
        } catch (listErr) {
        }
        return null;
      }
      return null;
    }
  } catch (error) {
    return null;
  }
};

export default {
  requestNotificationPermissions,
  checkNotificationPermissions,
  registerForPushNotifications,
  getStoredPushToken,
  scheduleLocalNotification,
  cancelNotification,
  cancelAllNotifications,
  getBadgeCount,
  setBadgeCount,
  clearAllNotifications,
  addNotificationReceivedListener,
  addNotificationResponseListener,
  getLastNotificationResponse,
  checkInitialNotification,
  sendChatPushNotification,
  sendGeneralPushNotification,
  shouldShowNotification,
  registerAppwriteTarget,
};
