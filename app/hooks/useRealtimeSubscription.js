import { useEffect, useRef, useCallback } from 'react';
import { AppState } from 'react-native';
import { config, safeSubscribe } from '../../database/config';
import { isCreateEvent, isDeleteEvent } from '../utils/realtimeHelpers';

/**
 * Custom hook for real-time subscription to Appwrite collections
 * With graceful fallback when realtime is not available
 * 
 * @param {string} collectionId - The collection to subscribe to
 * @param {Function} onUpdate - Callback when data is created/updated
 * @param {Function} onDelete - Callback when data is deleted
 * @param {Object} options - Additional options
 * @param {string} options.documentId - Subscribe to specific document
 * @param {boolean} options.enabled - Whether subscription is active
 */
export const useRealtimeSubscription = (
  collectionId,
  onUpdate,
  onDelete,
  { documentId = null, enabled = true } = {}
) => {
  const unsubscribeRef = useRef(null);
  const onUpdateRef = useRef(onUpdate);
  const onDeleteRef = useRef(onDelete);
  const isConnectedRef = useRef(false);

  // Keep refs updated to avoid stale closures
  useEffect(() => {
    onUpdateRef.current = onUpdate;
    onDeleteRef.current = onDelete;
  }, [onUpdate, onDelete]);

  useEffect(() => {
    if (!enabled || !collectionId || !config.databaseId) {
      return;
    }

    // Validate collection ID format
    if (collectionId.includes('your_') || collectionId === 'undefined' || collectionId === 'null') {
      return;
    }

    const channel = documentId
      ? `databases.${config.databaseId}.collections.${collectionId}.documents.${documentId}`
      : `databases.${config.databaseId}.collections.${collectionId}.documents`;

    unsubscribeRef.current = safeSubscribe(channel, (response) => {
      const { events, payload } = response || {};
      if (!events || !payload) {
        return;
      }

      isConnectedRef.current = true;

      if (isCreateEvent(events)) {
        onUpdateRef.current?.(payload, events);
      }

      if (isDeleteEvent(events) && onDeleteRef.current) {
        onDeleteRef.current?.(payload, events);
      }
    });

    return () => {
      if (unsubscribeRef.current) {
        try {
          unsubscribeRef.current();
        } catch (e) {
          // Ignore cleanup errors
        }
        unsubscribeRef.current = null;
      }
      isConnectedRef.current = false;
    };
  }, [collectionId, documentId, enabled]);

  // Handle app resume from background - safely reconnect subscription
  useEffect(() => {
    if (!enabled || !collectionId) return;

    const appStateRef = { current: AppState.currentState };

    const buildChannel = () => (documentId
      ? `databases.${config.databaseId}.collections.${collectionId}.documents.${documentId}`
      : `databases.${config.databaseId}.collections.${collectionId}.documents`
    );

    const subscribe = () => {
      const channel = buildChannel();
      unsubscribeRef.current = safeSubscribe(channel, (response) => {
        const { events, payload } = response || {};
        if (!events || !payload) return;

        isConnectedRef.current = true;

        if (isCreateEvent(events)) {
          onUpdateRef.current?.(payload, events);
        }
        if (isDeleteEvent(events) && onDeleteRef.current) {
          onDeleteRef.current?.(payload, events);
        }
      });
    };

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState?.match(/inactive|background/)) {
        if (unsubscribeRef.current) {
          try {
            unsubscribeRef.current();
          } catch (e) {
            // Ignore cleanup errors on stale subscription
          }
          unsubscribeRef.current = null;
        }
        isConnectedRef.current = false;
      }

      if (appStateRef.current?.match(/inactive|background/) && nextAppState === 'active') {
        if (!unsubscribeRef.current) {
          subscribe();
        }
      }
      appStateRef.current = nextAppState;
    });

    return () => subscription.remove();
  }, [collectionId, documentId, enabled]);

  return { isConnected: isConnectedRef.current };
};

/**
 * Hook for subscribing to chat messages in real-time
 * Automatically updates when new messages arrive or are updated
 * Passes events array to callback for distinguishing create vs update
 */
export const useChatMessages = (chatId, onNewMessage, onMessageDeleted, enabled = true) => {
  const onNewMessageRef = useRef(onNewMessage);
  const onMessageDeletedRef = useRef(onMessageDeleted);

  useEffect(() => {
    onNewMessageRef.current = onNewMessage;
    onMessageDeletedRef.current = onMessageDeleted;
  }, [onNewMessage, onMessageDeleted]);

  const handleCreate = useCallback((payload, events) => {
    if (payload?.chatId === chatId) {
      onNewMessageRef.current?.(payload, events);
    }
  }, [chatId]);

  const handleDelete = useCallback((payload, events) => {
    if (payload?.chatId === chatId) {
      onMessageDeletedRef.current?.(payload, events);
    }
  }, [chatId]);

  useRealtimeSubscription(
    config.messagesCollectionId,
    handleCreate,
    onMessageDeleted ? handleDelete : null,
    { enabled: enabled && !!chatId }
  );
};

/**
 * Hook for subscribing to user profile changes in real-time
 * Useful for follower count updates
 */
export const useUserProfile = (userId, onProfileUpdate, enabled = true) => {
  const handleUpdate = useCallback((payload) => {
    if (payload.$id === userId) {
      onProfileUpdate?.(payload);
    }
  }, [userId, onProfileUpdate]);

  useRealtimeSubscription(
    config.usersCollectionId,
    handleUpdate,
    null,
    { documentId: userId, enabled: enabled && !!userId }
  );
};

/**
 * Hook for subscribing to chat list updates
 * Triggers when unread counts or last messages change
 */
export const useChatList = (userId, onChatUpdate, enabled = true) => {
  const handleUpdate = useCallback((payload) => {
    // Check if user is part of this chat
    if (payload.participants?.includes(userId)) {
      onChatUpdate?.(payload);
    }
  }, [userId, onChatUpdate]);

  useRealtimeSubscription(
    config.chatsCollectionId,
    handleUpdate,
    null,
    { enabled: enabled && !!userId }
  );
};

/**
 * Hook for subscribing to post updates in real-time
 * Triggers when new posts are created, edited, or deleted
 * Filters by department to only receive relevant updates
 */
export const usePosts = (department, onPostUpdate, onPostDelete, enabled = true) => {
  const handleUpdate = useCallback((payload) => {
    // Only notify if post is in user's department or is public
    if (!department || payload.department === department) {
      onPostUpdate?.(payload);
    }
  }, [department, onPostUpdate]);

  const handleDelete = useCallback((payload) => {
    onPostDelete?.(payload);
  }, [onPostDelete]);

  useRealtimeSubscription(
    config.postsCollectionId,
    handleUpdate,
    handleDelete,
    { enabled: enabled && !!department }
  );
};

/**
 * Hook for subscribing to notification updates in real-time
 * Triggers when new notifications are created for the user
 */
export const useNotifications = (userId, onNewNotification, onNotificationUpdate, enabled = true) => {
  const handleUpdate = useCallback((payload, events) => {
    // Only notify if notification is for this user
    if (payload.userId === userId) {
      // Check if this is a create event (new notification) or update event
      const isCreate = events?.some(e => e.includes('.create'));
      if (isCreate) {
        onNewNotification?.(payload);
      } else {
        onNotificationUpdate?.(payload);
      }
    }
  }, [userId, onNewNotification, onNotificationUpdate]);

  const handleDelete = useCallback((payload) => {
    if (payload.userId === userId) {
      // Optionally handle notification deletion
    }
  }, [userId]);

  useRealtimeSubscription(
    config.notificationsCollectionId,
    handleUpdate,
    handleDelete,
    { enabled: enabled && !!userId }
  );
};

export default useRealtimeSubscription;
