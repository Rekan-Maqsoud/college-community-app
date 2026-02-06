import { useState, useEffect, useRef, useCallback } from 'react';
import { Alert, AppState } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { 
  getMessages, 
  sendMessage, 
  canUserSendMessage, 
  deleteMessage, 
  pinMessage, 
  unpinMessage, 
  getPinnedMessages,
  canUserPinMessage,
  canUserMentionEveryone,
  markChatAsRead,
  markAllMessagesAsRead,
  clearChatMessages,
  decryptMessageForChat,
} from '../../../database/chats';
import { getUserById, blockUser, getFriends } from '../../../database/users';
import { 
  muteChat, 
  unmuteChat, 
  getMuteStatus, 
  bookmarkMessage, 
  unbookmarkMessage, 
  getBookmarkedMessages,
  MUTE_TYPES,
} from '../../../database/userChatSettings';
import { useChatMessages } from '../../hooks/useRealtimeSubscription';
import { messagesCacheManager } from '../../utils/cacheManager';

const SMART_POLL_INTERVAL = 10000;

export const useChatRoom = ({ chat, user, t, navigation }) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [canSend, setCanSend] = useState(false);
  const [userCache, setUserCache] = useState({});
  const [replyingTo, setReplyingTo] = useState(null);
  const [muteStatus, setMuteStatus] = useState({ isMuted: false });
  const [showMuteModal, setShowMuteModal] = useState(false);
  const [pinnedMessages, setPinnedMessages] = useState([]);
  const [showPinnedModal, setShowPinnedModal] = useState(false);
  const [bookmarkedMsgIds, setBookmarkedMsgIds] = useState([]);
  const [canPin, setCanPin] = useState(false);
  const [canMentionEveryone, setCanMentionEveryone] = useState(false);
  const [showChatOptionsModal, setShowChatOptionsModal] = useState(false);
  const [groupMembers, setGroupMembers] = useState([]);
  const [userFriends, setUserFriends] = useState([]);
  
  const flatListRef = useRef(null);
  const pollingInterval = useRef(null);
  const appState = useRef(AppState.currentState);
  const lastMessageId = useRef(null);
  const userCacheRef = useRef({});
  const isRealtimeActive = useRef(false);

  const fetchUsersByIds = useCallback(async (userIds) => {
    if (!Array.isArray(userIds) || userIds.length === 0) return {};

    const uniqueIds = [...new Set(userIds.filter(Boolean))];
    if (uniqueIds.length === 0) return {};

    const results = await Promise.allSettled(uniqueIds.map(id => getUserById(id)));
    const usersMap = {};

    results.forEach((result, index) => {
      const id = uniqueIds[index];
      if (result.status === 'fulfilled' && result.value) {
        usersMap[id] = result.value;
      } else {
        usersMap[id] = { name: t('common.unknownUser') };
      }
    });

    return usersMap;
  }, [t]);

  const getChatDisplayName = useCallback(() => {
    if (chat.type === 'private' && chat.otherUser) {
      return chat.otherUser.name || chat.otherUser.fullName || chat.name;
    }
    return chat.name;
  }, [chat]);

  const handleRealtimeNewMessage = useCallback(async (payload) => {
    isRealtimeActive.current = true;
    
    if (payload.chatId === chat.$id) {
      const decryptedPayload = await decryptMessageForChat(chat.$id, payload, user?.$id, chat);
      // Add message to cache
      await messagesCacheManager.addMessageToCache(chat.$id, decryptedPayload, 100);
      
      setMessages(prev => {
        // Check if this message already exists (exact ID match)
        const existingIndex = prev.findIndex(m => m.$id === decryptedPayload.$id);
        if (existingIndex >= 0) {
          // Update existing message with server data (e.g., status updates)
          const updated = [...prev];
          updated[existingIndex] = { ...updated[existingIndex], ...decryptedPayload, _isOptimistic: false };
          return updated;
        }
        
        // Check for optimistic message that should be replaced
        // Match by content, senderId, and approximate timestamp
        const optimisticIndex = prev.findIndex(m => 
          m._isOptimistic && 
          m.senderId === decryptedPayload.senderId &&
          m.content === decryptedPayload.content
        );
        
        if (optimisticIndex >= 0) {
          // Replace optimistic message with real one
          const updated = [...prev];
          updated[optimisticIndex] = { ...decryptedPayload, _status: 'sent', _isOptimistic: false };
          return updated;
        }
        
        // New message from another user or different content
        return [...prev, decryptedPayload];
      });
      
      if (decryptedPayload.senderId && !userCacheRef.current[decryptedPayload.senderId]) {
        try {
          const userData = await getUserById(decryptedPayload.senderId);
          userCacheRef.current[decryptedPayload.senderId] = userData;
          setUserCache({ ...userCacheRef.current });
        } catch (e) {
          userCacheRef.current[decryptedPayload.senderId] = { name: decryptedPayload.senderName || 'Unknown' };
        }
      }
      
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [chat.$id, user?.$id]);

  const handleRealtimeMessageDeleted = useCallback(async (payload) => {
    isRealtimeActive.current = true;
    // Invalidate messages cache since data changed
    await messagesCacheManager.invalidateChatMessages(chat.$id);
    setMessages(prev => prev.filter(m => m.$id !== payload.$id));
  }, [chat.$id, fetchUsersByIds]);

  // Handle message updates (read status, delivery status, etc.)
  const handleRealtimeMessageUpdated = useCallback((payload) => {
    if (payload.chatId === chat.$id) {
      setMessages(prev => prev.map(m => 
        m.$id === payload.$id ? { ...m, ...payload } : m
      ));
    }
  }, [chat.$id]);

  useChatMessages(
    chat.$id,
    (payload, events) => {
      // Check if it's an update or create event
      if (events?.some(e => e.includes('.update'))) {
        handleRealtimeMessageUpdated(payload);
      } else {
        handleRealtimeNewMessage(payload);
      }
    },
    handleRealtimeMessageDeleted,
    !!chat.$id && !!user?.$id
  );

  const pollMessages = useCallback(async () => {
    try {
      const fetchedMessages = await getMessages(chat.$id, user?.$id, 100, 0, false);
      const reversedMessages = fetchedMessages.reverse();
      
      const newLastId = reversedMessages.length > 0 ? reversedMessages[reversedMessages.length - 1].$id : null;
      
      setMessages(prev => {
        // Keep ALL optimistic messages (both sending and recently sent)
        // This prevents messages from disappearing during the race condition
        const optimisticMessages = prev.filter(m => m._isOptimistic);
        
        // Create a map of server messages by ID for quick lookup
        const serverMessageMap = new Map(reversedMessages.map(m => [m.$id, m]));
        
        // Merge: use server messages but update with any local status
        const mergedMessages = reversedMessages.map(serverMsg => {
          const localMsg = prev.find(m => m.$id === serverMsg.$id);
          if (localMsg && localMsg._status === 'sent') {
            // Keep local status updates that haven't synced yet
            return { ...serverMsg, _status: localMsg._status, _isOptimistic: false };
          }
          return serverMsg;
        });
        
        // Filter out optimistic messages that now exist on server (by content match)
        const remainingOptimistic = optimisticMessages.filter(opt => 
          !reversedMessages.some(m => 
            m.senderId === opt.senderId && 
            m.content === opt.content &&
            // Also check if created within the last 30 seconds (to avoid false matches)
            Math.abs(new Date(m.$createdAt) - new Date(opt.$createdAt)) < 30000
          )
        );
        
        // Only update if there are actual changes
        const newMessages = [...mergedMessages, ...remainingOptimistic];
        const prevIds = prev.map(m => m.$id).join(',');
        const newIds = newMessages.map(m => m.$id).join(',');
        
        if (prevIds === newIds && prev.length === newMessages.length) {
          // Check for content updates (like readBy, status)
          const hasUpdates = newMessages.some((newMsg, idx) => {
            const oldMsg = prev[idx];
            return oldMsg && (
              (newMsg.readBy?.length || 0) !== (oldMsg.readBy?.length || 0) ||
              newMsg.status !== oldMsg.status
            );
          });
          if (!hasUpdates) return prev;
        }
        
        lastMessageId.current = newLastId;
        return newMessages;
      });
      
      const uniqueSenderIds = [...new Set(reversedMessages.map(m => m.senderId))];
      const newUsers = uniqueSenderIds.filter(id => !userCacheRef.current[id]);
      
      if (newUsers.length > 0) {
        const fetchedUsers = await fetchUsersByIds(newUsers);
        const newUserCache = { ...userCacheRef.current, ...fetchedUsers };
        userCacheRef.current = newUserCache;
        setUserCache(newUserCache);
      }
    } catch (error) {
      // Silent fail for polling
    }
  }, [chat.$id]);

  const loadChatSettings = async () => {
    try {
      const [status, pinPermission, mentionPermission, bookmarks] = await Promise.all([
        getMuteStatus(user.$id, chat.$id),
        canUserPinMessage(chat.$id, user.$id),
        canUserMentionEveryone(chat.$id, user.$id),
        getBookmarkedMessages(user.$id, chat.$id),
      ]);
      setMuteStatus(status);
      setCanPin(pinPermission);
      setCanMentionEveryone(mentionPermission);
      setBookmarkedMsgIds(bookmarks);
    } catch (error) {
      // Silently fail
    }
  };

  const checkPermissions = async () => {
    try {
      const hasPermission = await canUserSendMessage(chat.$id, user.$id);
      setCanSend(hasPermission);
    } catch (error) {
      setCanSend(false);
    }
  };

  const loadMessages = async () => {
    try {
      setLoading(true);
      const fetchedMessages = await getMessages(chat.$id, user?.$id, 100, 0, false);
      const reversedMessages = fetchedMessages.reverse();
      lastMessageId.current = reversedMessages.length > 0 ? reversedMessages[reversedMessages.length - 1].$id : null;
      setMessages(reversedMessages);
      
      if (user?.$id) {
        markChatAsRead(chat.$id, user.$id);
      }
      
      const uniqueSenderIds = [...new Set(reversedMessages.map(m => m.senderId))];
      const missingSenderIds = uniqueSenderIds.filter(id => !userCacheRef.current[id]);
      if (missingSenderIds.length > 0) {
        const fetchedUsers = await fetchUsersByIds(missingSenderIds);
        const newUserCache = { ...userCacheRef.current, ...fetchedUsers };
        userCacheRef.current = newUserCache;
        setUserCache(newUserCache);
      }
      
      // Mark messages as read when loading
      if (user?.$id) {
        markAllMessagesAsRead(chat.$id, user.$id);
      }
    } catch (error) {
      Alert.alert(t('common.error'), error.message || t('chats.errorLoadingMessages'));
    } finally {
      setLoading(false);
    }
  };

  const loadMembersAndFriends = async () => {
    try {
      // Load friends
      if (user?.$id) {
        const friends = await getFriends(user.$id);
        setUserFriends(friends || []);
      }
      
      // Load group members for group chats
      if (chat.type !== 'private' && chat.participants?.length > 0) {
        const memberPromises = chat.participants
          .filter(id => id !== user?.$id)
          .map(async (id) => {
            try {
              return await getUserById(id);
            } catch (e) {
              return null;
            }
          });
        const members = await Promise.all(memberPromises);
        setGroupMembers(members.filter(Boolean));
      }
    } catch (error) {
      // Silent fail
    }
  };

  useEffect(() => {
    loadMessages();
    checkPermissions();
    loadMembersAndFriends();
    
    pollingInterval.current = setInterval(pollMessages, SMART_POLL_INTERVAL);
    
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        pollMessages();
        // Mark messages as read when returning to app
        if (user?.$id) {
          markAllMessagesAsRead(chat.$id, user.$id);
        }
        if (!pollingInterval.current) {
          pollingInterval.current = setInterval(pollMessages, SMART_POLL_INTERVAL);
        }
      } else if (nextAppState.match(/inactive|background/)) {
        if (pollingInterval.current) {
          clearInterval(pollingInterval.current);
          pollingInterval.current = null;
        }
      }
      appState.current = nextAppState;
    });
    
    return () => {
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
      }
      subscription.remove();
    };
  }, [chat.$id, pollMessages]);

  useEffect(() => {
    loadChatSettings();
  }, [chat.$id, user.$id]);

  const handleViewPinnedMessages = async () => {
    try {
      const pinned = await getPinnedMessages(chat.$id, user?.$id);
      setPinnedMessages(pinned);
      setShowPinnedModal(true);
    } catch (error) {
      Alert.alert(t('common.error'), t('chats.pinError'));
    }
  };

  const handleMuteChat = async (duration, muteType = MUTE_TYPES.ALL) => {
    try {
      await muteChat(user.$id, chat.$id, muteType, duration);
      setMuteStatus({ isMuted: true, muteType, expiresAt: duration ? new Date(Date.now() + duration).toISOString() : null });
      setShowMuteModal(false);
      Alert.alert(t('common.success'), t('chats.chatMuted'));
    } catch (error) {
      Alert.alert(t('common.error'), t('chats.muteError'));
    }
  };

  const handleUnmuteChat = async () => {
    try {
      await unmuteChat(user.$id, chat.$id);
      setMuteStatus({ isMuted: false, muteType: MUTE_TYPES.NONE, expiresAt: null });
      setShowMuteModal(false);
      Alert.alert(t('common.success'), t('chats.chatUnmuted'));
    } catch (error) {
      Alert.alert(t('common.error'), t('chats.unmuteError'));
    }
  };

  const handlePinMessage = async (message) => {
    try {
      await pinMessage(chat.$id, message.$id, user.$id);
      setMessages(prev => prev.map(m => 
        m.$id === message.$id ? { ...m, isPinned: true, pinnedBy: user.$id } : m
      ));
      Alert.alert(t('common.success'), t('chats.messagePinned'));
    } catch (error) {
      Alert.alert(t('common.error'), t('chats.pinError'));
    }
  };

  const handleUnpinMessage = async (message) => {
    try {
      await unpinMessage(chat.$id, message.$id);
      setMessages(prev => prev.map(m => 
        m.$id === message.$id ? { ...m, isPinned: false, pinnedBy: null } : m
      ));
      Alert.alert(t('common.success'), t('chats.messageUnpinned'));
    } catch (error) {
      Alert.alert(t('common.error'), t('chats.unpinError'));
    }
  };

  const handleBookmarkMessage = async (message) => {
    try {
      await bookmarkMessage(user.$id, chat.$id, message.$id);
      setBookmarkedMsgIds(prev => [...prev, message.$id]);
      Alert.alert(t('common.success'), t('chats.messageBookmarked'));
    } catch (error) {
      Alert.alert(t('common.error'), t('chats.bookmarkError'));
    }
  };

  const handleUnbookmarkMessage = async (message) => {
    try {
      await unbookmarkMessage(user.$id, chat.$id, message.$id);
      setBookmarkedMsgIds(prev => prev.filter(id => id !== message.$id));
      Alert.alert(t('common.success'), t('chats.messageUnbookmarked'));
    } catch (error) {
      Alert.alert(t('common.error'), t('chats.unbookmarkError'));
    }
  };

  const handleCopyMessage = async (message) => {
    if (message.content) {
      await Clipboard.setStringAsync(message.content);
      Alert.alert(t('common.success'), t('chats.messageCopied'));
    }
  };

  const handleDeleteMessage = async (message) => {
    Alert.alert(
      t('chats.deleteMessage'),
      t('chats.deleteMessageConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteMessage(message.$id);
              setMessages(prev => prev.filter(m => m.$id !== message.$id));
            } catch (error) {
              Alert.alert(t('common.error'), t('chats.deleteMessageError'));
            }
          },
        },
      ]
    );
  };

  const handleReplyMessage = (message) => {
    const senderName = userCache[message.senderId]?.name || message.senderName || 'Unknown';
    setReplyingTo({ ...message, senderName });
  };

  const handleForwardMessage = (message) => {
    navigation.navigate('ForwardMessage', { message });
  };

  const cancelReply = () => {
    setReplyingTo(null);
  };

  const handleSendMessage = async (content, imageUrl = null) => {
    if (!canSend) {
      Alert.alert(t('chats.noPermission'), t('chats.representativeOnlyMessage'));
      return;
    }

    // Create optimistic message with pending status
    const tempId = `temp_${Date.now()}`;
    const optimisticMessage = {
      $id: tempId,
      chatId: chat.$id,
      content: content || '',
      senderId: user.$id,
      senderName: user.fullName,
      senderPhoto: user.profilePicture || null,
      $createdAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      // Message status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed'
      _status: 'sending',
      _isOptimistic: true,
    };
    
    if (imageUrl && typeof imageUrl === 'string') {
      optimisticMessage.images = [imageUrl];
      optimisticMessage.imageUrl = imageUrl;
    }
    
    if (replyingTo) {
      optimisticMessage.replyToId = replyingTo.$id;
      optimisticMessage.replyToContent = replyingTo.content?.substring(0, 50) || '';
      optimisticMessage.replyToSender = replyingTo.senderName || '';
    }

    // Add optimistic message immediately
    setMessages(prev => [...prev, optimisticMessage]);
    setReplyingTo(null);
    
    // Scroll to bottom
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);

    try {
      setSending(true);
      const messageData = {
        content: content || '',
        senderId: user.$id,
        senderName: user.fullName,
        senderPhoto: user.profilePicture || null,
        notificationPreview: t('chats.newMessage'),
      };
      
      if (imageUrl && typeof imageUrl === 'string') {
        messageData.images = [imageUrl];
      }
      
      if (optimisticMessage.replyToId) {
        messageData.replyToId = optimisticMessage.replyToId;
        messageData.replyToContent = optimisticMessage.replyToContent;
        messageData.replyToSender = optimisticMessage.replyToSender;
      }
      
      const sentMessage = await sendMessage(chat.$id, messageData);
      
      // Replace optimistic message with real message
      setMessages(prev => prev.map(msg => 
        msg.$id === tempId 
          ? { ...sentMessage, _status: 'sent', _isOptimistic: false }
          : msg
      ));
      
    } catch (error) {
      // Mark message as failed
      setMessages(prev => prev.map(msg => 
        msg.$id === tempId 
          ? { ...msg, _status: 'failed' }
          : msg
      ));
      Alert.alert(t('common.error'), error.message || t('chats.errorSendingMessage'));
    } finally {
      setSending(false);
    }
  };

  // Retry sending a failed message
  const handleRetryMessage = async (failedMessage) => {
    // Remove the failed message
    setMessages(prev => prev.filter(msg => msg.$id !== failedMessage.$id));
    
    // Resend
    await handleSendMessage(
      failedMessage.content, 
      failedMessage.images?.[0] || failedMessage.imageUrl
    );
  };

  const handleVisitProfile = () => {
    setShowChatOptionsModal(false);
    if (chat.type === 'private' && chat.otherUser) {
      navigation.navigate('UserProfile', { userId: chat.otherUser.$id || chat.otherUser.id });
    }
  };

  const handleBlockUser = () => {
    setShowChatOptionsModal(false);
    const otherUserId = chat.otherUser?.$id || chat.otherUser?.id;
    const otherUserName = chat.otherUser?.name || chat.otherUser?.fullName || getChatDisplayName();
    
    if (!otherUserId) {
      Alert.alert(t('common.error'), t('chats.blockError') || 'Cannot block this user');
      return;
    }
    
    Alert.alert(
      t('chats.blockUser'),
      (t('chats.blockConfirm') || 'Are you sure you want to block {name}?').replace('{name}', otherUserName),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.block') || 'Block',
          style: 'destructive',
          onPress: async () => {
            try {
              await blockUser(user.$id, otherUserId);
              Alert.alert(t('common.success'), t('chats.userBlocked') || 'User has been blocked');
              navigation.goBack();
            } catch (error) {
              Alert.alert(t('common.error'), t('chats.blockError') || 'Failed to block user');
            }
          }
        }
      ]
    );
  };

  const handleClearChat = async () => {
    try {
      const result = await clearChatMessages(chat.$id);
      setMessages([]);
      Alert.alert(
        t('common.success'), 
        (t('chats.chatCleared') || 'Chat cleared successfully. {count} messages deleted.').replace('{count}', result.deletedCount)
      );
    } catch (error) {
      Alert.alert(t('common.error'), t('chats.clearChatError') || 'Failed to clear chat');
    }
  };

  const handleChatHeaderPress = () => {
    // Open chat options modal for all chat types
    setShowChatOptionsModal(true);
  };

  return {
    // State
    messages,
    loading,
    sending,
    canSend,
    userCache,
    replyingTo,
    muteStatus,
    showMuteModal,
    pinnedMessages,
    showPinnedModal,
    bookmarkedMsgIds,
    canPin,
    canMentionEveryone,
    showChatOptionsModal,
    flatListRef,
    chat,
    groupMembers,
    userFriends,
    
    // Setters
    setShowMuteModal,
    setShowPinnedModal,
    setShowChatOptionsModal,
    
    // Handlers
    getChatDisplayName,
    handleChatHeaderPress,
    handleViewPinnedMessages,
    handleMuteChat,
    handleUnmuteChat,
    handlePinMessage,
    handleUnpinMessage,
    handleBookmarkMessage,
    handleUnbookmarkMessage,
    handleCopyMessage,
    handleDeleteMessage,
    handleReplyMessage,
    handleForwardMessage,
    cancelReply,
    handleSendMessage,
    handleRetryMessage,
    handleVisitProfile,
    handleBlockUser,
    handleClearChat,
  };
};
