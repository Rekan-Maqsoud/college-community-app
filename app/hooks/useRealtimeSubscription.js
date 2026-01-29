import { useEffect, useRef, useCallback } from 'react';
import client, { config, account, safeSubscribe } from '../../database/config';

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
  const retryCountRef = useRef(0);
  const maxRetries = 3;
  const hasSubscribedRef = useRef(false);
  const retryTimeoutRef = useRef(null);

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

    const scheduleRetry = () => {
      if (retryCountRef.current >= maxRetries) {
        return;
      }

      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }

      retryTimeoutRef.current = setTimeout(() => {
        subscribe();
      }, 2000);
    };

    const subscribe = async () => {
      // Prevent duplicate subscriptions
      if (hasSubscribedRef.current) {
        return;
      }

      // Don't retry too many times
      if (retryCountRef.current >= maxRetries) {
        return;
      }

      // Check if user is authenticated before subscribing
      try {
        await account.getSession('current');
      } catch (authError) {
        retryCountRef.current++;
        scheduleRetry();
        return;
      }

      try {
        hasSubscribedRef.current = true;
        
        unsubscribeRef.current = safeSubscribe(channel, (response) => {
          isConnectedRef.current = true;
          retryCountRef.current = 0;
          const { events, payload } = response;
          
          // Check for create/update events
          if (
            events.some(e => 
              e.includes('.create') || 
              e.includes('.update')
            )
          ) {
            onUpdateRef.current?.(payload, events);
          }
          
          // Check for delete events
          if (events.some(e => e.includes('.delete'))) {
            onDeleteRef.current?.(payload, events);
          }
        });
      } catch (error) {
        // Realtime not available - fail silently
        isConnectedRef.current = false;
        hasSubscribedRef.current = false;
        retryCountRef.current++;
        scheduleRetry();
      }
    };

    subscribe();

    return () => {
      hasSubscribedRef.current = false;
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
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

  return { isConnected: isConnectedRef.current };
};

/**
 * Hook for subscribing to chat messages in real-time
 * Automatically updates when new messages arrive or are updated
 * Passes events array to callback for distinguishing create vs update
 */
export const useChatMessages = (chatId, onNewMessage, onMessageDeleted, enabled = true) => {
  const handleUpdate = useCallback((payload, events) => {
    if (payload.chatId === chatId) {
      // Pass events to callback so it can distinguish between create and update
      onNewMessage?.(payload, events);
    }
  }, [chatId, onNewMessage]);

  const handleDelete = useCallback((payload, events) => {
    if (payload.chatId === chatId) {
      onMessageDeleted?.(payload, events);
    }
  }, [chatId, onMessageDeleted]);

  useRealtimeSubscription(
    config.messagesCollectionId,
    handleUpdate,
    handleDelete,
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
