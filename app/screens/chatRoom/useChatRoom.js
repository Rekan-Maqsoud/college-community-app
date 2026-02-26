import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
  toggleMessageReaction,
  deleteChat,
  removePrivateChatForUser,
  voteOnMessagePoll,
} from '../../../database/chats';
import { parsePollPayload, applyPollVote } from '../../utils/pollUtils';
import { getUserById, blockUser, blockUserChatOnly, getFriends } from '../../../database/users';
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
  getReactionDefaults,
  updateReactionDefaults,
  DEFAULT_REACTION_SET,
} from '../../../database/userChatSettings';
import { useChatMessages } from '../../hooks/useRealtimeSubscription';
import { messagesCacheManager } from '../../utils/cacheManager';
import { normalizeRealtimeMessage } from '../../utils/realtimeHelpers';

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
  const [isChatBlockedByOtherUser, setIsChatBlockedByOtherUser] = useState(false);
  const [reactionDefaults, setReactionDefaultsState] = useState(DEFAULT_REACTION_SET);
  const [chatSettingsLoaded, setChatSettingsLoaded] = useState(false);
  
  const flatListRef = useRef(null);
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
      // Check if message already exists by server ID
      if (prev.some(m => m.$id === decryptedPayload.$id)) {
        return prev.map(m => m.$id === decryptedPayload.$id ? decryptedPayload : m);
      }

      // Check if this is a realtime echo of an optimistic message we already added
      const optimisticMatch = prev.find(m =>
        m._isOptimistic &&
        m.senderId === decryptedPayload.senderId &&
        Math.abs(new Date(m.$createdAt) - new Date(decryptedPayload.$createdAt)) < 30000
      );
      if (optimisticMatch) {
        // Replace the optimistic message with the real server message
        return prev.map(m =>
          m.$id === optimisticMatch.$id
            ? { ...decryptedPayload, _status: 'sent', _isOptimistic: false }
            : m
        );
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

  const loadChatSettings = async () => {
    try {
      const [status, pinPermission, mentionPermission, bookmarks, chatClearedAt, hidden, defaults] = await Promise.all([
        getMuteStatus(user.$id, chat.$id),
        canUserPinMessage(chat.$id, user.$id),
        canUserMentionEveryone(chat.$id, user.$id),
        getBookmarkedMessages(user.$id, chat.$id),
        getChatClearedAt(user.$id, chat.$id),
        getHiddenMessageIds(user.$id, chat.$id),
        getReactionDefaults(user.$id, chat.$id),
      ]);
      setMuteStatus(status);
      setCanPin(pinPermission);
      setCanMentionEveryone(mentionPermission);
      setBookmarkedMsgIds(bookmarks);
      setClearedAtState(chatClearedAt);
      setHiddenMessageIds(hidden);
      setReactionDefaultsState(defaults || DEFAULT_REACTION_SET);
    } catch (error) {
      // Silently fail
    }
  };

  const parseReactions = (value) => {
    if (!value) return {};
    if (typeof value === 'object' && !Array.isArray(value)) return value;
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return typeof parsed === 'object' && parsed ? parsed : {};
      } catch (error) {
        return {};
      }
    }
    return {};
  };

  const applyReactionUpdate = (message, emoji, userId) => {
    const reactions = parseReactions(message.reactions);
    const current = Array.isArray(reactions[emoji]) ? reactions[emoji] : [];
    const hasReacted = current.includes(userId);

    const nextReactions = Object.entries(reactions).reduce((acc, [key, users]) => {
      const filtered = Array.isArray(users) ? users.filter(id => id !== userId) : [];
      if (filtered.length > 0) {
        acc[key] = filtered;
      }
      return acc;
    }, {});

    if (!hasReacted) {
      nextReactions[emoji] = [...(nextReactions[emoji] || []), userId];
    }

    return {
      ...message,
      reactions: JSON.stringify(nextReactions),
    };
  };

  const handleToggleReaction = useCallback(async (message, emoji) => {
    if (!message?.$id || !emoji || !user?.$id) {
      return;
    }

    setMessages(prev => prev.map(m => (m.$id === message.$id ? applyReactionUpdate(m, emoji, user.$id) : m)));

    try {
      const updated = await toggleMessageReaction(chat.$id, message.$id, user.$id, emoji);
      if (updated?.$id) {
        setMessages(prev => prev.map(m => (m.$id === updated.$id ? { ...m, reactions: updated.reactions } : m)));
      }
    } catch (error) {
      setMessages(prev => prev.map(m => (m.$id === message.$id ? applyReactionUpdate(m, emoji, user.$id) : m)));
    }
  }, [chat.$id, user?.$id]);

  const handleUpdateReactionDefaults = useCallback(async (nextDefaults) => {
    if (!user?.$id || !chat?.$id) {
      return DEFAULT_REACTION_SET;
    }

    try {
      const updated = await updateReactionDefaults(user.$id, chat.$id, nextDefaults);
      setReactionDefaultsState(updated);
      return updated;
    } catch (error) {
      return reactionDefaults;
    }
  }, [chat?.$id, reactionDefaults, user?.$id]);

  const checkPermissions = async () => {
    try {
      const hasPermission = await canUserSendMessage(chat.$id, user.$id);
      setCanSend(hasPermission);
    } catch (error) {
      setCanSend(false);
    }
  };

  const loadMessages = async () => {
    if (!chatSettingsLoaded) {
      return;
    }

    try {
      // Always show skeleton until fresh decrypted messages arrive.
      // We do NOT display cached messages directly because they may contain
      // encrypted content (enc:v1:...) from a prior failed decryption,
      // which would flash on screen before the fresh decrypted fetch completes.
      setLoading(true);

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
      const theirChatBlockedList = otherUserDoc?.chatBlockedUsers || [];
      const blocked = Array.isArray(theirBlockedList) && theirBlockedList.includes(user?.$id);
      const chatBlocked = Array.isArray(theirChatBlockedList) && theirChatBlockedList.includes(user?.$id);
      setIsBlockedByOtherUser(blocked);
      setIsChatBlockedByOtherUser(chatBlocked);
      if (blocked || chatBlocked) setCanSend(false);
    } catch (e) {
      // Silent fail
    }
  };

  useEffect(() => {
    if (!chatSettingsLoaded) {
      return;
    }

    loadMessages();
    checkPermissions();
    checkIfBlockedByOther();
    loadMembersAndFriends();

    return () => {
    };
  }, [chat.$id, chatSettingsLoaded]);

  useEffect(() => {
    let isMounted = true;

    setChatSettingsLoaded(false);
    const hydrateChatSettings = async () => {
      await loadChatSettings();
      if (isMounted) {
        setChatSettingsLoaded(true);
      }
    };

    hydrateChatSettings();

    return () => {
      isMounted = false;
    };
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
      .filter(m => m.content && m.content.trim().length > 0 && m.type !== 'post_share' && m.type !== 'location' && m.type !== 'voice' && m.type !== 'poll' && m.type !== 'file' && m.type !== 'lecture_asset_banner')
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

  const handleSendMessage = async (content, imageUrl = null, messageType = null, messageMetadata = null) => {
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

    // Attach gif metadata to optimistic message for instant preview
    if (messageType === 'gif' && messageMetadata) {
      optimisticMessage.type = 'gif';
      optimisticMessage.content = JSON.stringify(messageMetadata);
    }

    if (messageType === 'voice' && messageMetadata) {
      optimisticMessage.type = 'voice';
      optimisticMessage.content = JSON.stringify(messageMetadata);
    }

    if (messageType === 'poll' && messageMetadata) {
      optimisticMessage.type = 'poll';
      optimisticMessage.content = JSON.stringify(messageMetadata);
    }

    if (messageType === 'file' && messageMetadata) {
      optimisticMessage.type = 'file';
      optimisticMessage.content = JSON.stringify(messageMetadata);
    }
    
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
      if (messageType === 'gif') {
        notifyBody = 'GIF';
      } else if (messageType === 'file') {
        notifyBody = '\uD83D\uDCCE ' + t('chats.sentFile');
      } else if (messageType === 'voice') {
        notifyBody = '\uD83C\uDFA4 ' + t('chats.sentVoiceMessage');
      } else if (messageType === 'image' || (imageUrl && !content)) {
        notifyBody = '\uD83D\uDCF7 ' + (t('chats.sentImage') || 'Sent an image');
      } else if (messageType === 'location') {
        notifyBody = '\uD83D\uDCCD ' + (t('chats.sharedLocation') || 'Shared a location');
      } else if (messageType === 'poll') {
        notifyBody = '\uD83D\uDCCA ' + (t('chats.sharedPoll') || 'Shared a poll');
      } else if (messageType === 'post_share') {
        notifyBody = '\uD83D\uDD17 ' + (t('chats.sharedPost') || 'Shared a post');
      } else if (content && content.trim().length > 0) {
        notifyBody = content.length > 50 ? content.substring(0, 50) + '...' : content;
      }
      messageData.notificationPreview = notifyBody;

      // Attach gif_metadata for GIF/Sticker messages
      if (messageType === 'gif' && messageMetadata) {
        messageData.gif_metadata = messageMetadata;
      }

      if (messageType === 'voice' && messageMetadata) {
        messageData.metadata = messageMetadata;
      }

      if (messageType === 'poll' && messageMetadata) {
        messageData.metadata = messageMetadata;
      }

      if (messageType === 'file' && messageMetadata) {
        messageData.metadata = messageMetadata;
      }

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
      
      // Replace optimistic message with real message, or deduplicate if realtime already added it
      setMessages(prev => {
        const hasRealMessage = prev.some(m => m.$id === sentMessage.$id && !m._isOptimistic);
        if (hasRealMessage) {
          // Realtime already delivered this message; just remove the optimistic one
          return prev.filter(m => m.$id !== tempId);
        }
        // Replace optimistic with real message
        return prev.map(msg =>
          msg.$id === tempId
            ? { ...sentMessage, _status: 'sent', _isOptimistic: false }
            : msg
        );
      });
      
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
    const retryType = failedMessage.type || null;
    let retryMetadata = null;

    if (retryType === 'gif' || retryType === 'voice' || retryType === 'post_share' || retryType === 'poll' || retryType === 'file' || retryType === 'lecture_asset_banner') {
      try {
        retryMetadata = typeof failedMessage.content === 'string'
          ? JSON.parse(failedMessage.content)
          : failedMessage.content;
      } catch {
        retryMetadata = null;
      }
    }

    await handleSendMessage(
      retryType === 'gif' || retryType === 'voice' || retryType === 'post_share' || retryType === 'poll' || retryType === 'file' || retryType === 'lecture_asset_banner'
        ? ''
        : (failedMessage.content || ''),
      failedMessage.images?.[0] || failedMessage.imageUrl,
      retryType,
      retryMetadata
    );
  };

  const handleVotePollMessage = useCallback(async (message, selectedOptionIds = []) => {
    if (!message?.$id || !user?.$id || message.type !== 'poll') {
      return;
    }

    const previousContent = message.content;

    try {
      const parsedPoll = parsePollPayload(message.content);
      if (!parsedPoll) {
        return;
      }

      const nextPoll = applyPollVote(parsedPoll, user.$id, selectedOptionIds);
      const optimisticContent = JSON.stringify(nextPoll);

      setMessages(prev => prev.map(item => (
        item.$id === message.$id
          ? { ...item, content: optimisticContent }
          : item
      )));

      const updatedMessage = await voteOnMessagePoll(chat.$id, message.$id, user.$id, selectedOptionIds);

      setMessages(prev => prev.map(item => (
        item.$id === message.$id
          ? { ...item, content: updatedMessage.content, $updatedAt: updatedMessage.$updatedAt }
          : item
      )));
    } catch (error) {
      setMessages(prev => prev.map(item => (
        item.$id === message.$id
          ? { ...item, content: previousContent }
          : item
      )));
      triggerAlert(t('common.error'), t('chats.pollVoteError'));
    }
  }, [chat.$id, t, user?.$id]);

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
      t('common.blockOptionsTitle'),
      t('common.blockOptionsMessage').replace('{name}', otherUserName),
      'warning',
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.blockMessagesOnly'),
          onPress: async () => {
            try {
              await blockUserChatOnly(user.$id, otherUserId);
              if (chat?.$id) {
                try {
                  await removePrivateChatForUser(chat.$id, user.$id);
                } catch (removeError) {
                  // Silent fail - blocking still applies
                }
              }
              if (refreshUser) {
                try {
                  await refreshUser();
                } catch (error) {
                  // Ignore refresh errors after successful block
                }
              }
              setCanSend(false);
              triggerAlert(t('common.success'), t('chats.messagesOnlyBlocked'), 'success');
              navigation.goBack();
            } catch (error) {
              if (error?.code === 'CHAT_BLOCK_COLUMN_MISSING') {
                triggerAlert(t('common.error'), t('chats.chatBlockNeedsColumn'));
                return;
              }
              triggerAlert(t('common.error'), t('chats.blockError'));
            }
          },
        },
        {
          text: t('common.blockEverything'),
          style: 'destructive',
          onPress: async () => {
            try {
              await blockUser(user.$id, otherUserId);
              // Refresh user context so blockedUsers is updated for filtering
              if (refreshUser) await refreshUser();
              // Navigate back after block to avoid state updates on unmounted component
              navigation.goBack();
            } catch (error) {
              triggerAlert(t('common.error'), t('chats.blockError'));
            }
          },
        },
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

  const handleDeleteConversation = async () => {
    if (chat.type !== 'private') return;

    triggerAlert(
      t('chats.deleteConversation') || 'Delete Conversation',
      t('chats.deleteConversationConfirm') || 'This will permanently delete the conversation for both users.',
      'warning',
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete') || 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteChat(chat.$id);
              navigation.goBack();
            } catch (error) {
              triggerAlert(t('common.error'), t('chats.deleteConversationError') || 'Failed to delete conversation.');
            }
          },
        },
      ]
    );
  };

  const handleChatHeaderPress = useCallback(() => {
    setShowChatOptionsModal(true);
  }, []);

  const handleManualRefresh = useCallback(async () => {
    await loadMessages();
  }, [loadMessages]);

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
    isChatBlockedByOtherUser,
    reactionDefaults,
    
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
    handleVotePollMessage,
    handleToggleReaction,
    handleUpdateReactionDefaults,
    handleVisitProfile,
    handleBlockUser,
    handleClearChat,
    handleDeleteConversation,
    toggleSelectionMode,
    toggleMessageSelection,
    handleBatchCopy,
    handleBatchDeleteForMe,
    handleManualRefresh,
  };
};
