import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { AppState } from 'react-native';
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
  setChatClearedAt,
  getChatClearedAt,
  hideMessagesForUser,
  getHiddenMessageIds,
} from '../../../database/userChatSettings';
import { useChatMessages } from '../../hooks/useRealtimeSubscription';
import { messagesCacheManager } from '../../utils/cacheManager';
import { normalizeRealtimeMessage } from '../../utils/realtimeHelpers';

const SMART_POLL_INTERVAL = 10000;

export const useChatRoom = ({ chat: frozenChat, user, t, navigation, showAlert, refreshUser }) => {
  // Deep-clone chat once to avoid mutating the frozen route.params object
  // Safety check: guard against undefined/null frozenChat to prevent JSON.parse crash
  const chat = useMemo(() => {
    if (!frozenChat) return {};
    try {
      return JSON.parse(JSON.stringify(frozenChat));
    } catch (e) {
      return { ...frozenChat };
    }
  }, [frozenChat]);
  const triggerAlert = (title, message, type = 'info', buttons = []) => {
    if (showAlert) {
      showAlert({ type, title, message, buttons });
    }
  };
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
  const [clearedAt, setClearedAtState] = useState(null);
  const [hiddenMessageIds, setHiddenMessageIds] = useState([]);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedMessageIds, setSelectedMessageIds] = useState([]);
  const [isBlockedByOtherUser, setIsBlockedByOtherUser] = useState(false);
  
  const flatListRef = useRef(null);
  const pollingInterval = useRef(null);
  const appState = useRef(AppState.currentState);
  const lastMessageId = useRef(null);
  const userCacheRef = useRef({});
  const isRealtimeActive = useRef(false);
  const deletedMessageIds = useRef(new Set());

  const getChatDisplayName = useCallback(() => {
    if (chat.type === 'private' && chat.otherUser) {
      return chat.otherUser.name || chat.otherUser.fullName || chat.name;
    }
    return chat.name;
  }, [chat]);

  const getNormalizedRealtimeMessage = useCallback((payload) => {
    return normalizeRealtimeMessage(payload, chat.$id);
  }, [chat.$id]);

  const handleRealtimeNewMessage = useCallback(async (payload) => {
    isRealtimeActive.current = true;

    const normalizedPayload = getNormalizedRealtimeMessage(payload);
    if (!normalizedPayload) {
      return;
    }

    let decryptedPayload = normalizedPayload;
    try {
      decryptedPayload = await decryptMessageForChat(chat.$id, normalizedPayload, user?.$id);
    } catch (error) {
      decryptedPayload = normalizedPayload;
    }

    await messagesCacheManager.addMessageToCache(chat.$id, decryptedPayload, 100);

    // Insert at beginning for inverted FlatList (newest first)
    setMessages(prev => {
      // Check if message already exists
      if (prev.some(m => m.$id === decryptedPayload.$id)) {
        return prev.map(m => m.$id === decryptedPayload.$id ? decryptedPayload : m);
      }
      return [decryptedPayload, ...prev];
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
  }, [chat.$id, getNormalizedRealtimeMessage, user?.$id]);

  const handleRealtimeMessageDeleted = useCallback(async (payload) => {
    isRealtimeActive.current = true;
    // Track deleted ID to prevent ghost re-appearance from polling
    deletedMessageIds.current.add(payload.$id);
    // Invalidate messages cache since data changed
    await messagesCacheManager.invalidateChatMessages(chat.$id);
    setMessages(prev => prev.filter(m => m.$id !== payload.$id));
  }, [chat.$id]);

  useChatMessages(
    chat.$id,
    handleRealtimeNewMessage,
    handleRealtimeMessageDeleted,
    !!chat.$id && !!user?.$id
  );

  const pollMessages = useCallback(async () => {
    try {
      const fetchedMessages = await getMessages(chat.$id, user?.$id, 100, 0, false);
      let chronological = fetchedMessages.reverse(); // oldest first

      // Filter out messages deleted via realtime to prevent ghost re-appearance
      if (deletedMessageIds.current.size > 0) {
        chronological = chronological.filter(m => !deletedMessageIds.current.has(m.$id));
      }

      // Filter by clearedAt if set (non-destructive clear)
      if (clearedAt) {
        const clearedDate = new Date(clearedAt);
        chronological = chronological.filter(m => {
          const msgDate = new Date(m.$createdAt || m.createdAt);
          return msgDate > clearedDate;
        });
      }

      // Filter by hidden message IDs
      if (hiddenMessageIds.length > 0) {
        chronological = chronological.filter(m => !hiddenMessageIds.includes(m.$id));
      }
      
      const newLastId = chronological.length > 0 ? chronological[chronological.length - 1].$id : null;

      // Reverse for inverted FlatList (newest first)
      const inverted = chronological.slice().reverse();
      
      setMessages(prev => {
        // Keep ALL optimistic messages (both sending and recently sent)
        const optimisticMessages = prev.filter(m => m._isOptimistic);
        
        // Merge: use server messages but update with any local status
        const mergedMessages = inverted.map(serverMsg => {
          const localMsg = prev.find(m => m.$id === serverMsg.$id);
          if (localMsg && localMsg._status === 'sent') {
            return { ...serverMsg, _status: localMsg._status, _isOptimistic: false };
          }
          return serverMsg;
        });
        
        // Filter out optimistic messages that now exist on server (by content match)
        const remainingOptimistic = optimisticMessages.filter(opt => 
          !inverted.some(m => 
            m.senderId === opt.senderId && 
            m.content === opt.content &&
            Math.abs(new Date(m.$createdAt) - new Date(opt.$createdAt)) < 30000
          )
        );
        
        // Only update if there are actual changes
        const newMessages = [...remainingOptimistic, ...mergedMessages];
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
      
      const uniqueSenderIds = [...new Set(inverted.map(m => m.senderId))];
      const newUsers = uniqueSenderIds.filter(id => !userCacheRef.current[id]);
      
      if (newUsers.length > 0) {
        const newUserCache = { ...userCacheRef.current };
        for (const senderId of newUsers) {
          try {
            const userData = await getUserById(senderId);
            newUserCache[senderId] = userData;
          } catch (error) {
            newUserCache[senderId] = { name: 'Unknown User' };
          }
        }
        userCacheRef.current = newUserCache;
        setUserCache(newUserCache);
      }
    } catch (error) {
      // Silent fail for polling
    }
  }, [chat.$id, clearedAt, hiddenMessageIds]);

  const loadChatSettings = async () => {
    try {
      const [status, pinPermission, mentionPermission, bookmarks, chatClearedAt, hidden] = await Promise.all([
        getMuteStatus(user.$id, chat.$id),
        canUserPinMessage(chat.$id, user.$id),
        canUserMentionEveryone(chat.$id, user.$id),
        getBookmarkedMessages(user.$id, chat.$id),
        getChatClearedAt(user.$id, chat.$id),
        getHiddenMessageIds(user.$id, chat.$id),
      ]);
      setMuteStatus(status);
      setCanPin(pinPermission);
      setCanMentionEveryone(mentionPermission);
      setBookmarkedMsgIds(bookmarks);
      setClearedAtState(chatClearedAt);
      setHiddenMessageIds(hidden);
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
      // Stale-While-Revalidate: show cached messages immediately
      const cached = await messagesCacheManager.getCachedMessages(chat.$id, 100);
      let hasCachedData = false;
      if (cached?.value && cached.value.length > 0) {
        let cachedMessages = cached.value;
        if (deletedMessageIds.current.size > 0) {
          cachedMessages = cachedMessages.filter(m => !deletedMessageIds.current.has(m.$id));
        }
        if (clearedAt) {
          const clearedDate = new Date(clearedAt);
          cachedMessages = cachedMessages.filter(m => {
            const msgDate = new Date(m.$createdAt || m.createdAt);
            return msgDate > clearedDate;
          });
        }
        if (hiddenMessageIds.length > 0) {
          cachedMessages = cachedMessages.filter(m => !hiddenMessageIds.includes(m.$id));
        }
        // Reverse for inverted FlatList (newest first)
        setMessages(cachedMessages.slice().reverse());
        hasCachedData = true;
        setLoading(false);
      } else {
        setLoading(true);
      }

      // Fetch fresh data from server
      const fetchedMessages = await getMessages(chat.$id, user?.$id, 100, 0, false);
      let freshMessages = fetchedMessages.reverse(); // chronological (oldest first)

      // Cache the freshly fetched messages (in chronological order)
      await messagesCacheManager.cacheMessages(chat.$id, freshMessages, 100);

      // Filter out messages deleted via realtime to prevent ghost re-appearance
      if (deletedMessageIds.current.size > 0) {
        freshMessages = freshMessages.filter(m => !deletedMessageIds.current.has(m.$id));
      }

      // Filter by clearedAt if set (non-destructive clear)
      if (clearedAt) {
        const clearedDate = new Date(clearedAt);
        freshMessages = freshMessages.filter(m => {
          const msgDate = new Date(m.$createdAt || m.createdAt);
          return msgDate > clearedDate;
        });
      }

      // Filter by hidden message IDs
      if (hiddenMessageIds.length > 0) {
        freshMessages = freshMessages.filter(m => !hiddenMessageIds.includes(m.$id));
      }

      lastMessageId.current = freshMessages.length > 0 ? freshMessages[freshMessages.length - 1].$id : null;

      // Reverse for inverted FlatList (newest first)
      const invertedFresh = freshMessages.slice().reverse();

      // Merge silently: only update if there are meaningful changes
      setMessages(prev => {
        const prevIds = prev.map(m => m.$id).join(',');
        const newIds = invertedFresh.map(m => m.$id).join(',');
        if (prevIds === newIds && prev.length === invertedFresh.length) {
          // Check for content updates (like readBy, status)
          const hasUpdates = invertedFresh.some((newMsg, idx) => {
            const oldMsg = prev[idx];
            return oldMsg && (
              (newMsg.readBy?.length || 0) !== (oldMsg.readBy?.length || 0) ||
              newMsg.status !== oldMsg.status ||
              newMsg.isPinned !== oldMsg.isPinned
            );
          });
          if (!hasUpdates) return prev;
        }
        // Keep any optimistic messages that haven't appeared on server yet
        const optimistic = prev.filter(m => m._isOptimistic);
        const remaining = optimistic.filter(opt =>
          !invertedFresh.some(m =>
            m.senderId === opt.senderId &&
            m.content === opt.content &&
            Math.abs(new Date(m.$createdAt) - new Date(opt.$createdAt)) < 30000
          )
        );
        return [...remaining, ...invertedFresh];
      });
      
      if (user?.$id) {
        markChatAsRead(chat.$id, user.$id);
      }
      
      const uniqueSenderIds = [...new Set(invertedFresh.map(m => m.senderId))];
      const newUserCache = { ...userCacheRef.current };
      
      for (const senderId of uniqueSenderIds) {
        if (!newUserCache[senderId]) {
          try {
            const userData = await getUserById(senderId);
            newUserCache[senderId] = userData;
          } catch (error) {
            newUserCache[senderId] = { name: 'Unknown User' };
          }
        }
      }
      
      userCacheRef.current = newUserCache;
      setUserCache(newUserCache);
      
      // Mark messages as read when loading
      if (user?.$id) {
        markAllMessagesAsRead(chat.$id, user.$id);
      }
    } catch (error) {
      // Only show error on initial load when there are no messages yet
      // Subsequent load failures are silently ignored since realtime will auto-recover
      if (messages.length === 0) {
        triggerAlert(t('common.error'), error.message || t('chats.errorLoadingMessages'));
      }
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

  const checkIfBlockedByOther = async () => {
    if (chat.type !== 'private') return;
    const otherUserId = chat.otherUser?.$id || chat.otherUser?.id ||
      chat.participants?.find(id => id !== user?.$id);
    if (!otherUserId) return;
    try {
      const otherUserDoc = await getUserById(otherUserId, true);
      const theirBlockedList = otherUserDoc?.blockedUsers || [];
      const blocked = Array.isArray(theirBlockedList) && theirBlockedList.includes(user?.$id);
      setIsBlockedByOtherUser(blocked);
      if (blocked) setCanSend(false);
    } catch (e) {
      // Silent fail
    }
  };

  useEffect(() => {
    loadMessages();
    checkPermissions();
    checkIfBlockedByOther();
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
      triggerAlert(t('common.error'), t('chats.pinError'));
    }
  };

  const handleMuteChat = async (duration, muteType = MUTE_TYPES.ALL) => {
    try {
      await muteChat(user.$id, chat.$id, muteType, duration);
      setMuteStatus({ isMuted: true, muteType, expiresAt: duration ? new Date(Date.now() + duration).toISOString() : null });
      setShowMuteModal(false);
      triggerAlert(t('common.success'), t('chats.chatMuted'), 'success');
    } catch (error) {
      triggerAlert(t('common.error'), t('chats.muteError'));
    }
  };

  const handleUnmuteChat = async () => {
    try {
      await unmuteChat(user.$id, chat.$id);
      setMuteStatus({ isMuted: false, muteType: MUTE_TYPES.NONE, expiresAt: null });
      setShowMuteModal(false);
      triggerAlert(t('common.success'), t('chats.chatUnmuted'), 'success');
    } catch (error) {
      triggerAlert(t('common.error'), t('chats.unmuteError'));
    }
  };

  const handlePinMessage = async (message) => {
    try {
      await pinMessage(chat.$id, message.$id, user.$id);
      setMessages(prev => prev.map(m => 
        m.$id === message.$id ? { ...m, isPinned: true, pinnedBy: user.$id } : m
      ));
      triggerAlert(t('common.success'), t('chats.messagePinned'), 'success');
    } catch (error) {
      triggerAlert(t('common.error'), t('chats.pinError'));
    }
  };

  const handleUnpinMessage = async (message) => {
    try {
      await unpinMessage(chat.$id, message.$id);
      setMessages(prev => prev.map(m => 
        m.$id === message.$id ? { ...m, isPinned: false, pinnedBy: null } : m
      ));
      triggerAlert(t('common.success'), t('chats.messageUnpinned'), 'success');
    } catch (error) {
      triggerAlert(t('common.error'), t('chats.unpinError'));
    }
  };

  const handleBookmarkMessage = async (message) => {
    try {
      await bookmarkMessage(user.$id, chat.$id, message.$id);
      setBookmarkedMsgIds(prev => [...prev, message.$id]);
      triggerAlert(t('common.success'), t('chats.messageBookmarked'), 'success');
    } catch (error) {
      triggerAlert(t('common.error'), t('chats.bookmarkError'));
    }
  };

  const handleUnbookmarkMessage = async (message) => {
    try {
      await unbookmarkMessage(user.$id, chat.$id, message.$id);
      setBookmarkedMsgIds(prev => prev.filter(id => id !== message.$id));
      triggerAlert(t('common.success'), t('chats.messageUnbookmarked'), 'success');
    } catch (error) {
      triggerAlert(t('common.error'), t('chats.unbookmarkError'));
    }
  };

  const handleCopyMessage = async (message) => {
    if (message.content) {
      await Clipboard.setStringAsync(message.content);
      triggerAlert(t('common.success'), t('chats.messageCopied'), 'success');
    }
  };

  const handleDeleteMessage = async (message) => {
    triggerAlert(
      t('chats.deleteMessage'),
      t('chats.deleteMessageConfirm'),
      'warning',
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
              triggerAlert(t('common.error'), t('chats.deleteMessageError'));
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

  // Batch selection mode handlers
  const toggleSelectionMode = useCallback(() => {
    setSelectionMode(prev => !prev);
    setSelectedMessageIds([]);
  }, []);

  const toggleMessageSelection = useCallback((messageId) => {
    setSelectedMessageIds(prev => {
      if (prev.includes(messageId)) {
        return prev.filter(id => id !== messageId);
      }
      return [...prev, messageId];
    });
  }, []);

  const handleBatchCopy = useCallback(async () => {
    const selected = messages.filter(m => selectedMessageIds.includes(m.$id));
    const textParts = selected
      .filter(m => m.content && m.content.trim().length > 0 && m.type !== 'post_share' && m.type !== 'location')
      .map(m => m.content);
    if (textParts.length > 0) {
      await Clipboard.setStringAsync(textParts.join('\n'));
      triggerAlert(t('common.success'), t('chats.messagesCopied'), 'success');
    }
    setSelectionMode(false);
    setSelectedMessageIds([]);
  }, [messages, selectedMessageIds, t]);

  const handleBatchDeleteForMe = useCallback(async () => {
    if (selectedMessageIds.length === 0) return;
    triggerAlert(
      t('chats.deleteForMe'),
      t('chats.deleteForMeConfirm'),
      'warning',
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              const merged = await hideMessagesForUser(user.$id, chat.$id, selectedMessageIds);
              setHiddenMessageIds(merged);
              setMessages(prev => prev.filter(m => !selectedMessageIds.includes(m.$id)));
              setSelectionMode(false);
              setSelectedMessageIds([]);
              triggerAlert(t('common.success'), t('chats.messagesHidden'), 'success');
            } catch (error) {
              triggerAlert(t('common.error'), t('chats.hideError'));
            }
          },
        },
      ]
    );
  }, [selectedMessageIds, user.$id, chat.$id, t]);

  const handleSendMessage = async (content, imageUrl = null, messageType = null) => {
    if (!canSend) {
      triggerAlert(t('chats.noPermission'), t('chats.representativeOnlyMessage'), 'warning');
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

    // Add optimistic message immediately (at beginning for inverted FlatList)
    setMessages(prev => [optimisticMessage, ...prev]);
    setReplyingTo(null);

    try {
      setSending(true);
      const messageData = {
        content: content || '',
        senderId: user.$id,
        senderName: user.fullName,
        senderPhoto: user.profilePicture || null,
      };

      // Build rich notification preview based on message type
      let notifyBody = t('chats.newMessage');
      if (messageType === 'image' || (imageUrl && !content)) {
        notifyBody = '\uD83D\uDCF7 ' + (t('chats.sentImage') || 'Sent an image');
      } else if (messageType === 'location') {
        notifyBody = '\uD83D\uDCCD ' + (t('chats.sharedLocation') || 'Shared a location');
      } else if (messageType === 'post_share') {
        notifyBody = '\uD83D\uDD17 ' + (t('chats.sharedPost') || 'Shared a post');
      } else if (content && content.trim().length > 0) {
        notifyBody = content.length > 50 ? content.substring(0, 50) + '...' : content;
      }
      messageData.notificationPreview = notifyBody;

      // Add message type for special messages (location, post_share)
      if (messageType) {
        messageData.type = messageType;
      }
      
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
      triggerAlert(t('common.error'), error.message || t('chats.errorSendingMessage'));
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
      triggerAlert(t('common.error'), t('chats.blockError'));
      return;
    }
    
    triggerAlert(
      t('chats.blockUser'),
      (t('chats.blockConfirm')).replace('{name}', otherUserName),
      'warning',
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.block') || 'Block',
          style: 'destructive',
          onPress: async () => {
            try {
              await blockUser(user.$id, otherUserId);
              // Refresh user context so blockedUsers is updated for filtering
              if (refreshUser) await refreshUser();
              console.log('[BLOCK] User blocked from chat, refreshed context');
              // Navigate back after block to avoid state updates on unmounted component
              navigation.goBack();
            } catch (error) {
              triggerAlert(t('common.error'), t('chats.blockError'));
            }
          }
        }
      ]
    );
  };

  const handleClearChat = async () => {
    triggerAlert(
      t('chats.clearChat'),
      t('chats.clearChatLocalConfirm'),
      'warning',
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('chats.clearChat'),
          style: 'destructive',
          onPress: async () => {
            try {
              // Store clearedAt timestamp AND hide all current message IDs
              const allCurrentIds = messages.map(m => m.$id).filter(Boolean);
              const timestamp = await setChatClearedAt(user.$id, chat.$id);
              setClearedAtState(timestamp);

              if (allCurrentIds.length > 0) {
                const merged = await hideMessagesForUser(user.$id, chat.$id, allCurrentIds);
                setHiddenMessageIds(merged);
              }

              // Invalidate local cache so stale messages don't reappear
              await messagesCacheManager.invalidateChatMessages(chat.$id);
              setMessages([]);
              triggerAlert(t('common.success'), t('chats.chatClearedLocal'), 'success');
            } catch (error) {
              triggerAlert(t('common.error'), t('chats.clearChatError'));
            }
          },
        },
      ]
    );
  };

  const handleChatHeaderPress = useCallback(() => {
    setShowChatOptionsModal(true);
  }, []);

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
    selectionMode,
    selectedMessageIds,
    clearedAt,
    hiddenMessageIds,
    isBlockedByOtherUser,
    
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
    toggleSelectionMode,
    toggleMessageSelection,
    handleBatchCopy,
    handleBatchDeleteForMe,
  };
};
