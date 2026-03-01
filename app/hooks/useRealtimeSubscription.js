import { useEffect, useRef, useCallback, useState } from 'react';
import { AppState } from 'react-native';
import client, { config } from '../../database/config';
import { isDeleteEvent } from '../utils/realtimeHelpers';
import realtimeDebugLogger from '../utils/realtimeDebugLogger';

/**
 * Custom hook for real-time subscription to Appwrite collections
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
  const [isConnected, setIsConnected] = useState(false);
  const onUpdateRef = useRef(onUpdate);
  const onDeleteRef = useRef(onDelete);

  // Keep refs updated to avoid stale closures
  useEffect(() => {
    onUpdateRef.current = onUpdate;
    onDeleteRef.current = onDelete;
  }, [onUpdate, onDelete]);

  useEffect(() => {
    if (!enabled || !collectionId || !config.databaseId) {
      realtimeDebugLogger.trace('realtime_subscription_skipped', {
        enabled,
        collectionId,
        databaseId: config.databaseId,
      });
      return;
    }

    // Validate collection ID format
    if (collectionId.includes('your_') || collectionId === 'undefined' || collectionId === 'null') {
      realtimeDebugLogger.warn('realtime_invalid_collection', { collectionId });
      return;
    }

    const channel = documentId
      ? `databases.${config.databaseId}.collections.${collectionId}.documents.${documentId}`
      : `databases.${config.databaseId}.collections.${collectionId}.documents`;

    const handleRealtimeEvent = (response) => {
      const { events, payload } = response || {};
      if (!events || !payload) {
        realtimeDebugLogger.warn('realtime_missing_payload', {
          channel,
          hasEvents: !!events,
          hasPayload: !!payload,
        });
        return;
      }

      setIsConnected(true);

      if (!isDeleteEvent(events)) {
        onUpdateRef.current?.(payload, events);
      }

      if (isDeleteEvent(events) && onDeleteRef.current) {
        onDeleteRef.current?.(payload, events);
      }
    };

    const cleanupSubscription = () => {
      if (unsubscribeRef.current) {
        try {
          unsubscribeRef.current();
        } catch (e) {
          // Ignore cleanup errors
        }
        unsubscribeRef.current = null;
      }
      setIsConnected(false);
    };

    const subscribe = () => {
      cleanupSubscription();
      unsubscribeRef.current = client.subscribe(channel, handleRealtimeEvent);
    };

    subscribe();

    const appStateRef = { current: AppState.currentState };

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState?.match(/inactive|background/)) {
        cleanupSubscription();
        realtimeDebugLogger.trace('realtime_app_background', { collectionId, documentId });
      }

      if (appStateRef.current?.match(/inactive|background/) && nextAppState === 'active') {
        if (!unsubscribeRef.current) {
          subscribe();
        }
      }
      appStateRef.current = nextAppState;
    });

    return () => {
      subscription.remove();
      cleanupSubscription();
    };
  }, [collectionId, documentId, enabled]);

  return { isConnected };
};

/**
 * Hook for subscribing to chat messages in real-time
 * Automatically updates when new messages arrive or are updated
 * Passes events array to callback for distinguishing create vs update
 */
export const useChatMessages = (chatId, onMessageCreated, onMessageUpdated, onMessageDeleted, enabled = true) => {
  const onMessageCreatedRef = useRef(onMessageCreated);
  const onMessageUpdatedRef = useRef(onMessageUpdated);
  const onMessageDeletedRef = useRef(onMessageDeleted);

  useEffect(() => {
    onMessageCreatedRef.current = onMessageCreated;
    onMessageUpdatedRef.current = onMessageUpdated;
    onMessageDeletedRef.current = onMessageDeleted;
  }, [onMessageCreated, onMessageUpdated, onMessageDeleted]);

  const handleUpdate = useCallback((payload, events = []) => {
    if (payload?.chatId !== chatId) {
      return;
    }

    const isCreate = events?.some(event => event.includes('.create'));
    const isUpdate = events?.some(event => event.includes('.update'));

    if (isCreate) {
      onMessageCreatedRef.current?.(payload, events);
      return;
    }

    if (isUpdate) {
      onMessageUpdatedRef.current?.(payload, events);
      return;
    }

    onMessageCreatedRef.current?.(payload, events);
  }, [chatId]);

  const handleDelete = useCallback((payload, events) => {
    if (payload?.chatId === chatId) {
      onMessageDeletedRef.current?.(payload, events);
    }
  }, [chatId]);

  useRealtimeSubscription(
    config.messagesCollectionId,
    handleUpdate,
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

export const useLectureChannelsRealtime = (onChannelChange, enabled = true) => {
  const handleUpdate = useCallback((payload, events) => {
    onChannelChange?.(payload, events);
  }, [onChannelChange]);

  const handleDelete = useCallback((payload, events) => {
    onChannelChange?.(payload, events);
  }, [onChannelChange]);

  useRealtimeSubscription(
    config.lectureChannelsCollectionId,
    handleUpdate,
    handleDelete,
    { enabled: enabled && !!config.lectureChannelsCollectionId }
  );
};

export const useLectureAssetsRealtime = (channelId, onAssetChange, enabled = true) => {
  const handleUpdate = useCallback((payload, events) => {
    if (payload?.channelId === channelId) {
      onAssetChange?.(payload, events);
    }
  }, [channelId, onAssetChange]);

  const handleDelete = useCallback((payload, events) => {
    if (payload?.channelId === channelId) {
      onAssetChange?.(payload, events);
    }
  }, [channelId, onAssetChange]);

  useRealtimeSubscription(
    config.lectureAssetsCollectionId,
    handleUpdate,
    handleDelete,
    { enabled: enabled && !!channelId && !!config.lectureAssetsCollectionId }
  );
};

export const useLectureMembershipsRealtime = (channelId, onMembershipChange, enabled = true) => {
  const handleUpdate = useCallback((payload, events) => {
    if (payload?.channelId === channelId) {
      onMembershipChange?.(payload, events);
    }
  }, [channelId, onMembershipChange]);

  const handleDelete = useCallback((payload, events) => {
    if (payload?.channelId === channelId) {
      onMembershipChange?.(payload, events);
    }
  }, [channelId, onMembershipChange]);

  useRealtimeSubscription(
    config.lectureMembershipsCollectionId,
    handleUpdate,
    handleDelete,
    { enabled: enabled && !!channelId && !!config.lectureMembershipsCollectionId }
  );
};

export const useLectureCommentsRealtime = (assetId, onCommentChange, enabled = true) => {
  const handleUpdate = useCallback((payload, events) => {
    if (payload?.assetId === assetId) {
      onCommentChange?.(payload, events);
    }
  }, [assetId, onCommentChange]);

  const handleDelete = useCallback((payload, events) => {
    if (payload?.assetId === assetId) {
      onCommentChange?.(payload, events);
    }
  }, [assetId, onCommentChange]);

  useRealtimeSubscription(
    config.lectureCommentsCollectionId,
    handleUpdate,
    handleDelete,
    { enabled: enabled && !!assetId && !!config.lectureCommentsCollectionId }
  );
};

export default useRealtimeSubscription;
