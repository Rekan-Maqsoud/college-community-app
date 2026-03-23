import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StatusBar,
  Platform,
  ActivityIndicator,
  TouchableOpacity,
  KeyboardAvoidingView,
  ImageBackground,
  TextInput,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAppSettings } from '../context/AppSettingsContext';
import { useUser } from '../context/UserContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useIsFocused } from '@react-navigation/native';
import AnimatedBackground from '../components/AnimatedBackground';
import MessageBubble from '../components/MessageBubble';
import MessageInput from '../components/MessageInput';
import CustomAlert from '../components/CustomAlert';
import UnifiedEmptyState from '../components/UnifiedEmptyState';
import { useCustomAlert } from '../hooks/useCustomAlert';
import { 
  fontSize, 
  moderateScale,
} from '../utils/responsive';
import { MuteModal, PinnedMessagesModal, ChatOptionsModal } from './chatRoom/ChatRoomModals';
import { chatRoomStyles as styles } from './chatRoom/styles';
import { useChatRoom } from './chatRoom/useChatRoom';
import { useUserProfile } from '../hooks/useRealtimeSubscription';
import useLayout from '../hooks/useLayout';
import PostViewModal from '../components/PostViewModal';
import { isUserOnline, getLastSeenText } from '../utils/onlineStatus';
import { getUserById } from '../../database/users';
import { dismissPresentedNotificationsByTarget } from '../../services/pushNotificationService';

const HEADER_ACTION_HIT_SLOP = { top: 10, bottom: 10, left: 10, right: 10 };
const SEARCH_ACTION_HIT_SLOP = { top: 8, bottom: 8, left: 8, right: 8 };
const ONLINE_INDICATOR_COLOR = '#34C759';
const REPRESENTATIVE_ONLY_COLOR = '#F59E0B';
const BLOCKED_COLOR = '#EF4444';
const CHAT_ONLY_BLOCKED_COLOR = '#F59E0B';

const HEADER_BACKGROUND_BY_GRADIENT = {
  gradient_purple: '#667eea',
  gradient_blue: '#1a1a2e',
  gradient_green: '#134e5e',
  gradient_sunset: '#ff7e5f',
  gradient_ocean: '#2193b0',
  gradient_midnight: '#232526',
  gradient_aurora: '#00c6fb',
  gradient_rose: '#f4c4f3',
};

const CHAT_BACKGROUND_BY_GRADIENT = {
  gradient_purple: ['#667eea', '#764ba2'],
  gradient_blue: ['#1a1a2e', '#16213e'],
  gradient_green: ['#134e5e', '#71b280'],
  gradient_sunset: ['#ff7e5f', '#feb47b'],
  gradient_ocean: ['#2193b0', '#6dd5ed'],
  gradient_midnight: ['#232526', '#414345'],
  gradient_aurora: ['#00c6fb', '#005bea'],
  gradient_rose: ['#f4c4f3', '#fc67fa'],
};

const LIGHT_CHAT_BACKGROUND = ['#f0f4ff', '#d8e7ff', '#c0deff'];
const DARK_CHAT_BACKGROUND = ['#1a1a2e', '#16213e', '#0f3460'];
const LIGHT_HEADER_BACKGROUND = '#f0f4ff';
const DARK_HEADER_BACKGROUND = '#1a1a2e';

const ChatMessageItem = React.memo(({
  message,
  index,
  currentUserId,
  senderData,
  previousSenderId,
  nextSenderId,
  isRepresentative,
  isBookmarked,
  canPin,
  chatType,
  otherUserPhoto,
  otherUserName,
  participantCount,
  isLastSeenMessage,
  groupMembers,
  searchQuery,
  isCurrentSearchResult,
  isHighlighted,
  showAlert,
  selectionMode,
  isSelected,
  reactionDefaults,
  onCopyMessage,
  onDeleteMessage,
  onReplyMessage,
  onForwardMessage,
  onPinMessage,
  onUnpinMessage,
  onBookmarkMessage,
  onUnbookmarkMessage,
  onAvatarPress,
  onRetryMessage,
  onPostPress,
  onToggleSelect,
  onToggleReaction,
  onPollVote,
  onEditReactions,
  triggerHaptic,
}) => {
  const isCurrentUser = message.senderId === currentUserId;
  const senderName = senderData?.name || message.senderName || 'Unknown';
  const senderPhoto = senderData?.profilePicture || message.senderPhoto;
  const showSenderName = !isCurrentUser && (index === 0 || previousSenderId !== message.senderId);
  const showAvatar = !isCurrentUser && (nextSenderId !== message.senderId);

  const handleCopy = useCallback(() => {
    onCopyMessage(message);
  }, [message, onCopyMessage]);

  const handleDelete = useCallback(() => {
    triggerHaptic('warning');
    onDeleteMessage(message);
  }, [message, onDeleteMessage, triggerHaptic]);

  const handleReply = useCallback(() => {
    onReplyMessage(message);
  }, [message, onReplyMessage]);

  const handleForward = useCallback(() => {
    onForwardMessage(message);
  }, [message, onForwardMessage]);

  const handlePin = useCallback(() => {
    onPinMessage(message);
  }, [message, onPinMessage]);

  const handleUnpin = useCallback(() => {
    onUnpinMessage(message);
  }, [message, onUnpinMessage]);

  const handleBookmark = useCallback(() => {
    triggerHaptic('light');
    onBookmarkMessage(message);
  }, [message, onBookmarkMessage, triggerHaptic]);

  const handleUnbookmark = useCallback(() => {
    onUnbookmarkMessage(message);
  }, [message, onUnbookmarkMessage]);

  return (
    <MessageBubble
      message={message}
      isCurrentUser={isCurrentUser}
      senderName={showSenderName ? senderName : null}
      senderPhoto={senderPhoto}
      showAvatar={showAvatar}
      isRepresentative={isRepresentative}
      onCopy={handleCopy}
      onDelete={isCurrentUser ? handleDelete : null}
      onReply={handleReply}
      onForward={handleForward}
      onPin={canPin ? handlePin : null}
      onUnpin={canPin && message.isPinned ? handleUnpin : null}
      onBookmark={handleBookmark}
      onUnbookmark={isBookmarked ? handleUnbookmark : null}
      isBookmarked={isBookmarked}
      onAvatarPress={onAvatarPress}
      onRetry={message._status === 'failed' ? onRetryMessage : null}
      chatType={chatType}
      otherUserPhoto={otherUserPhoto}
      otherUserName={otherUserName}
      participantCount={participantCount}
      isLastSeenMessage={isLastSeenMessage}
      groupMembers={groupMembers}
      onNavigateToProfile={onAvatarPress}
      searchQuery={searchQuery}
      isCurrentSearchResult={isCurrentSearchResult}
      isHighlighted={isHighlighted}
      onPostPress={onPostPress}
      showAlert={showAlert}
      selectionMode={selectionMode}
      isSelected={isSelected}
      onToggleSelect={onToggleSelect}
      currentUserId={currentUserId}
      reactionDefaults={reactionDefaults}
      onToggleReaction={onToggleReaction}
      onPollVote={onPollVote}
      onEditReactions={onEditReactions}
    />
  );
});

ChatMessageItem.displayName = 'ChatMessageItem';

const ChatRoom = ({ route, navigation }) => {
  const { chat } = route.params;
  const { t, theme, isDarkMode, chatSettings, showActivityStatus, triggerHaptic } = useAppSettings();
  const { user, refreshUser } = useUser();
  const { alertConfig, showAlert, hideAlert } = useCustomAlert();
  const isFocused = useIsFocused();
  const insets = useSafeAreaInsets();
  const { chatStyle } = useLayout();

  const {
    messages,
    loading,
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
    groupMembers,
    userFriends,
    selectionMode,
    selectedMessageIds,
    clearedAt,
    hiddenMessageIds,
    setShowMuteModal,
    setShowPinnedModal,
    setShowChatOptionsModal,
    reactionDefaults,
    chatViewportState,
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
    handleReloadReactionDefaults,
    handleVisitProfile,
    handleBlockUser,
    handleClearChat,
    handleDeleteConversation,
    toggleSelectionMode,
    toggleMessageSelection,
    handleBatchCopy,
    handleBatchDeleteForMe,
    handleManualRefresh,
    saveChatViewport,
    isBlockedByOtherUser,
    isChatBlockedByOtherUser,
  } = useChatRoom({ chat, user, t, navigation, showAlert, refreshUser });

  // Blocking check for private chats - did I block them?
  const iBlockedThem = useMemo(() => {
    if (chat?.type !== 'private') return false;
    const otherUserId = chat?.otherUser?.$id || chat?.otherUser?.id;
    if (!otherUserId || !user) return false;
    const blockedUsers = user.blockedUsers || [];
    return Array.isArray(blockedUsers) && blockedUsers.includes(otherUserId);
  }, [chat, user]);

  const iChatBlockedThem = useMemo(() => {
    if (chat?.type !== 'private') return false;
    const otherUserId = chat?.otherUser?.$id || chat?.otherUser?.id;
    if (!otherUserId || !user) return false;
    const chatBlockedUsers = user.chatBlockedUsers || [];
    return Array.isArray(chatBlockedUsers) && chatBlockedUsers.includes(otherUserId);
  }, [chat, user]);

  const isFullyBlockedChat = iBlockedThem || isBlockedByOtherUser;
  const isChatOnlyBlocked = iChatBlockedThem || isChatBlockedByOtherUser;
  const isBlockedChat = isFullyBlockedChat || isChatOnlyBlocked;
  const excludedMentionUserIds = useMemo(() => {
    const blockedUsers = Array.isArray(user?.blockedUsers) ? user.blockedUsers : [];
    const chatBlockedUsers = Array.isArray(user?.chatBlockedUsers) ? user.chatBlockedUsers : [];
    return Array.from(new Set([...blockedUsers, ...chatBlockedUsers]));
  }, [user?.blockedUsers, user?.chatBlockedUsers]);

  // Search in chat state
  const [searchActive, setSearchActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [currentSearchIndex, setCurrentSearchIndex] = useState(0);
  const searchInputRef = useRef(null);

  // Highlighted message state (used by pinned message scroll-to)
  const [highlightedMessageId, setHighlightedMessageId] = useState(null);
  const highlightTimerRef = useRef(null);
  const scrollOffsetRef = useRef(0);
  const visibleAnchorRef = useRef({ messageId: '', index: -1 });
  const lastVisibleIndexRef = useRef(-1);
  const hasAppliedInitialViewportRef = useRef(false);
  const initialScrollSettledRef = useRef(false);
  const lastPersistedViewportKeyRef = useRef('');
  const previousLastMessageIdRef = useRef('');
  const previousMessagesLengthRef = useRef(0);
  const [isNearBottom, setIsNearBottom] = useState(true);
  const [pendingNewMessageCount, setPendingNewMessageCount] = useState(0);

  // Post view modal state (for shared posts)
  const [postModalVisible, setPostModalVisible] = useState(false);
  const [postModalPostId, setPostModalPostId] = useState(null);

  // Online status tracking for private chats
  const [otherUserLastSeen, setOtherUserLastSeen] = useState(
    chat.type === 'private' ? chat.otherUser?.lastSeen || null : null
  );
  const otherUserId = chat.type === 'private' ? chat.otherUser?.$id : null;
  const otherUserOnline = showActivityStatus && isUserOnline(otherUserLastSeen);

  const handleOtherUserProfileUpdate = useCallback((profile) => {
    setOtherUserLastSeen(profile?.lastSeen || null);
  }, []);

  useUserProfile(
    otherUserId,
    handleOtherUserProfileUpdate,
    Boolean(showActivityStatus && otherUserId)
  );

  useEffect(() => {
    if (!chat?.$id) return;
    dismissPresentedNotificationsByTarget({ chatId: chat.$id }).catch(() => {});
  }, [chat?.$id]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (!chat?.$id) return;
      dismissPresentedNotificationsByTarget({ chatId: chat.$id }).catch(() => {});
    });

    return unsubscribe;
  }, [navigation, chat?.$id]);

  useEffect(() => {
    if (chat.type !== 'private' || !showActivityStatus) return;
    if (!otherUserId) return;

    let active = true;
    const fetchLastSeen = async () => {
      try {
        const freshUser = await getUserById(otherUserId, true);
        if (active && freshUser?.lastSeen) {
          setOtherUserLastSeen(freshUser.lastSeen);
        }
      } catch (_) {}
    };
    fetchLastSeen();
    return () => { active = false; };
  }, [chat.type, otherUserId, showActivityStatus]);

  const formattedChatTitle = useMemo(() => {
    const raw = getChatDisplayName() || '';
    const parts = raw.split(',').map(part => part.trim()).filter(Boolean);
    const limitedNames = parts.length > 2 ? `${parts[0]}, ${parts[1]}` : raw;
    const maxLength = 24;
    if (limitedNames.length > maxLength) {
      return `${limitedNames.slice(0, maxLength - 3)}...`;
    }
    return limitedNames;
  }, [getChatDisplayName]);

  const handleOpenReactionSettings = useCallback(() => {
    navigation.navigate('ChatSettings', {
      chatId: chat.$id,
      focusSection: 'reactions',
    });
  }, [chat.$id, navigation]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      handleReloadReactionDefaults();
    });

    return unsubscribe;
  }, [handleReloadReactionDefaults, navigation]);

  const handlePinnedMessagePress = useCallback((messageId) => {
    setShowPinnedModal(false);
    const index = memoizedMessages.findIndex(m => m.$id === messageId);
    if (index !== -1 && flatListRef.current) {
      setTimeout(() => {
        flatListRef.current.scrollToIndex({
          index,
          animated: true,
          viewPosition: 0.5,
        });
        setHighlightedMessageId(messageId);
        if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
        highlightTimerRef.current = setTimeout(() => {
          setHighlightedMessageId(null);
        }, 1500);
      }, 350);
    }
  }, [flatListRef, memoizedMessages, setShowPinnedModal]);

  // Compute search results when query changes
  useEffect(() => {
    if (searchQuery.trim().length > 0) {
      const query = searchQuery.toLowerCase();
      const results = memoizedMessages
        .map((msg, index) => ({ ...msg, originalIndex: index }))
        .filter(msg => msg.content && msg.content.toLowerCase().includes(query));
      setSearchResults(results);
      setCurrentSearchIndex(results.length > 0 ? results.length - 1 : 0);
    } else {
      setSearchResults([]);
      setCurrentSearchIndex(0);
    }
  }, [searchQuery, memoizedMessages]);

  // Scroll to current search result
  useEffect(() => {
    if (searchResults.length > 0 && flatListRef.current) {
      const currentResult = searchResults[currentSearchIndex];
      if (currentResult) {
        flatListRef.current.scrollToIndex({
          index: currentResult.originalIndex,
          animated: true,
          viewPosition: 0.5,
        });
      }
    }
  }, [currentSearchIndex, flatListRef, searchResults]);

  const handleSearchPrev = useCallback(() => {
    if (searchResults.length > 0) {
      setCurrentSearchIndex(prev => (prev > 0 ? prev - 1 : searchResults.length - 1));
    }
  }, [searchResults.length]);

  const handleSearchNext = useCallback(() => {
    if (searchResults.length > 0) {
      setCurrentSearchIndex(prev => (prev < searchResults.length - 1 ? prev + 1 : 0));
    }
  }, [searchResults.length]);

  const closeSearch = useCallback(() => {
    setSearchActive(false);
    setSearchQuery('');
    setSearchResults([]);
    setCurrentSearchIndex(0);
  }, []);

  const openSearch = useCallback(() => {
    setSearchActive(true);
    setTimeout(() => searchInputRef.current?.focus(), 100);
  }, []);

  // Get current search result messageId for highlighting
  const currentSearchMessageId = searchResults.length > 0 
    ? searchResults[currentSearchIndex]?.$id 
    : null;

  const headerBackgroundColor = useMemo(() => {
    const bgSetting = chatSettings?.backgroundImage;
    if (bgSetting?.startsWith('gradient_')) {
      return HEADER_BACKGROUND_BY_GRADIENT[bgSetting] || (isDarkMode ? DARK_HEADER_BACKGROUND : LIGHT_HEADER_BACKGROUND);
    }

    return isDarkMode ? DARK_HEADER_BACKGROUND : LIGHT_HEADER_BACKGROUND;
  }, [chatSettings?.backgroundImage, isDarkMode]);

  const backgroundColors = useMemo(() => {
    const bgSetting = chatSettings?.backgroundImage;
    if (bgSetting?.startsWith('gradient_')) {
      return CHAT_BACKGROUND_BY_GRADIENT[bgSetting] || (isDarkMode ? DARK_CHAT_BACKGROUND : LIGHT_CHAT_BACKGROUND);
    }

    return isDarkMode ? DARK_CHAT_BACKGROUND : LIGHT_CHAT_BACKGROUND;
  }, [chatSettings?.backgroundImage, isDarkMode]);

  const headerTitleTextStyle = useMemo(() => ([
    styles.headerTitle,
    {
      color: theme.text,
      fontSize: fontSize(16),
    },
  ]), [theme.text]);

  const headerSubtitleTextStyle = useMemo(() => ([
    styles.headerSubtitle,
    {
      color: theme.textSecondary,
      fontSize: fontSize(11),
    },
  ]), [theme.textSecondary]);

  const headerOnlineTextStyle = useMemo(() => ([
    styles.headerSubtitle,
    {
      color: otherUserOnline ? ONLINE_INDICATOR_COLOR : theme.textSecondary,
      fontSize: fontSize(11),
    },
  ]), [otherUserOnline, theme.textSecondary]);

  const searchBarStyle = useMemo(() => ([
    styles.searchBar,
    { backgroundColor: isDarkMode ? 'rgba(0,0,0,0.85)' : 'rgba(255,255,255,0.95)' },
  ]), [isDarkMode]);

  const searchInputContainerStyle = useMemo(() => ([
    styles.searchInputContainer,
    { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' },
  ]), [isDarkMode]);

  const searchInputStyle = useMemo(() => ([
    styles.searchInput,
    {
      color: theme.text,
      fontSize: fontSize(14),
    },
  ]), [theme.text]);

  const searchCountTextStyle = useMemo(() => ([
    styles.searchCount,
    {
      color: theme.text,
      fontSize: fontSize(12),
    },
  ]), [theme.text]);

  const searchEmptyTextStyle = useMemo(() => ([
    styles.searchCount,
    {
      color: theme.textSecondary,
      fontSize: fontSize(12),
    },
  ]), [theme.textSecondary]);

  const searchCloseTextStyle = useMemo(() => ([
    styles.searchCloseText,
    {
      color: theme.primary,
      fontSize: fontSize(14),
    },
  ]), [theme.primary]);

  const representativeWarningBannerStyle = useMemo(() => ([
    styles.warningBanner,
    { backgroundColor: isDarkMode ? 'rgba(251, 191, 36, 0.2)' : 'rgba(251, 191, 36, 0.15)' },
  ]), [isDarkMode]);

  const fullBlockedBannerStyle = useMemo(() => ([
    styles.warningBanner,
    { backgroundColor: isDarkMode ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.1)' },
  ]), [isDarkMode]);

  const chatOnlyBlockedBannerStyle = useMemo(() => ([
    styles.warningBanner,
    { backgroundColor: isDarkMode ? 'rgba(245, 158, 11, 0.15)' : 'rgba(245, 158, 11, 0.1)' },
  ]), [isDarkMode]);

  const selectionToolbarStyle = useMemo(() => ([
    styles.selectionToolbar,
    { backgroundColor: isDarkMode ? 'rgba(0,0,0,0.85)' : 'rgba(255,255,255,0.95)' },
  ]), [isDarkMode]);

  const selectedMessagesTextStyle = useMemo(() => ([
    styles.selectionToolbarText,
    {
      color: theme.text,
      fontSize: fontSize(13),
    },
  ]), [theme.text]);

  const copySelectionTextStyle = useMemo(() => ([
    styles.selectionToolbarText,
    {
      color: selectedMessageIds.length > 0 ? theme.primary : theme.textSecondary,
      fontSize: fontSize(12),
    },
  ]), [selectedMessageIds.length, theme.primary, theme.textSecondary]);

  const deleteSelectionTextStyle = useMemo(() => ([
    styles.selectionToolbarText,
    {
      color: selectedMessageIds.length > 0 ? BLOCKED_COLOR : theme.textSecondary,
      fontSize: fontSize(12),
    },
  ]), [selectedMessageIds.length, theme.textSecondary]);

  const maintainVisibleContentPosition = useMemo(() => {
    if (chatViewportState?.messageId || firstUnreadMessageIndex >= 0) {
      return undefined;
    }

    return {
      startRenderingFromBottom: true,
      autoscrollToBottomThreshold: 0.2,
    };
  }, [chatViewportState?.messageId, firstUnreadMessageIndex]);

  const handleOpenGroupSettings = useCallback(() => {
    navigation.navigate('GroupSettings', { chat });
  }, [chat, navigation]);

  const handleNavigateToProfile = useCallback((userId) => {
    const targetUserId = typeof userId === 'string' ? userId.trim() : '';
    if (!targetUserId) return;
    navigation.navigate('UserProfile', { userId: targetUserId });
  }, [navigation]);

  const handleSearchClear = useCallback(() => {
    setSearchQuery('');
  }, []);

  const handlePostPress = useCallback((postId) => {
    setPostModalPostId(postId);
    setPostModalVisible(true);
  }, []);

  const handleSendWithHaptic = useCallback(async (...args) => {
    triggerHaptic('light');
    return handleSendMessage(...args);
  }, [handleSendMessage, triggerHaptic]);

  const handleCloseMuteModal = useCallback(() => {
    setShowMuteModal(false);
  }, [setShowMuteModal]);

  const handleClosePinnedModal = useCallback(() => {
    setShowPinnedModal(false);
  }, [setShowPinnedModal]);

  const handleCloseChatOptionsModal = useCallback(() => {
    setShowChatOptionsModal(false);
  }, [setShowChatOptionsModal]);

  const handleOpenMuteModalFromOptions = useCallback(() => {
    setShowChatOptionsModal(false);
    setShowMuteModal(true);
  }, [setShowChatOptionsModal, setShowMuteModal]);

  const handleViewPinnedMessagesFromOptions = useCallback(() => {
    setShowChatOptionsModal(false);
    handleViewPinnedMessages();
  }, [handleViewPinnedMessages, setShowChatOptionsModal]);

  const handleOpenGroupSettingsFromOptions = useCallback(() => {
    setShowChatOptionsModal(false);
    handleOpenGroupSettings();
  }, [handleOpenGroupSettings, setShowChatOptionsModal]);

  const handleClearChatWithHaptic = useCallback(() => {
    triggerHaptic('warning');
    handleClearChat();
  }, [handleClearChat, triggerHaptic]);

  const handleDeleteConversationWithHaptic = useCallback(() => {
    triggerHaptic('warning');
    handleDeleteConversation();
  }, [handleDeleteConversation, triggerHaptic]);

  const handleClosePostModal = useCallback(() => {
    setPostModalVisible(false);
    setPostModalPostId(null);
  }, []);

  useEffect(() => {
    navigation.setOptions({
      headerTintColor: theme.text,
      headerTitle: () => (
        <TouchableOpacity onPress={handleChatHeaderPress} activeOpacity={0.7} style={styles.headerTitleTouchable}>
          <Text
            numberOfLines={1}
            ellipsizeMode="tail"
            style={headerTitleTextStyle}>
            {formattedChatTitle}
          </Text>
          {chat.type === 'private' && showActivityStatus ? (
            <View style={styles.headerSubtitleRow}>
              {otherUserOnline && (
                <View style={[styles.headerOnlineIndicator, { backgroundColor: ONLINE_INDICATOR_COLOR }]} />
              )}
              <Text style={headerOnlineTextStyle}>
                {otherUserOnline
                  ? t('chats.online')
                  : (getLastSeenText(otherUserLastSeen, t) || t('chats.tapForOptions'))}
              </Text>
            </View>
          ) : (
            <Text style={headerSubtitleTextStyle}>
              {t('chats.tapForOptions')}
            </Text>
          )}
        </TouchableOpacity>
      ),
      headerStyle: {
        backgroundColor: headerBackgroundColor,
        height: moderateScale(74),
      },
      cardStyle: {
        backgroundColor: headerBackgroundColor,
      },
      headerRight: () => (
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerActionButton}
            onPress={handleManualRefresh}
            accessibilityRole="button"
            accessibilityLabel={t('common.refresh')}
            hitSlop={HEADER_ACTION_HIT_SLOP}>
            <Ionicons name="refresh-outline" size={moderateScale(22)} color={theme.text} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerActionButton}
            onPress={openSearch}
            accessibilityRole="button"
            accessibilityLabel={t('chats.searchInChat')}
            hitSlop={HEADER_ACTION_HIT_SLOP}>
            <Ionicons name="search-outline" size={moderateScale(22)} color={theme.text} />
          </TouchableOpacity>
          {chat.type === 'custom_group' && (
            <TouchableOpacity
              style={styles.headerActionButtonLast}
              onPress={handleOpenGroupSettings}
              accessibilityRole="button"
              accessibilityLabel={t('chats.groupSettings')}
              hitSlop={HEADER_ACTION_HIT_SLOP}>
              <Ionicons name="settings-outline" size={moderateScale(22)} color={theme.text} />
            </TouchableOpacity>
          )}
        </View>
      ),
    });
  }, [chat.type, formattedChatTitle, handleChatHeaderPress, handleManualRefresh, handleOpenGroupSettings, headerBackgroundColor, headerOnlineTextStyle, headerSubtitleTextStyle, headerTitleTextStyle, navigation, openSearch, otherUserLastSeen, otherUserOnline, showActivityStatus, t, theme.text]);

  const memoizedMessages = useMemo(() => {
    let filtered = messages;
    if (clearedAt) {
      const clearedDate = new Date(clearedAt);
      filtered = filtered.filter(m => {
        const msgDate = new Date(m.$createdAt || m.createdAt);
        return msgDate > clearedDate;
      });
    }
    if (hiddenMessageIds && hiddenMessageIds.length > 0) {
      filtered = filtered.filter(m => !hiddenMessageIds.includes(m.$id));
    }
    return filtered;
  }, [messages, clearedAt, hiddenMessageIds]);

  // For private chats, find the last message sent by current user that was read by the other user
  const lastSeenMessageId = useMemo(() => {
    if (chat.type !== 'private') return null;
    
    const otherUserId = chat.otherUser?.$id;
    if (!otherUserId) return null;

    // Messages are chronological (oldest first), so scan from the end.
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      if (msg.senderId === user.$id && msg.readBy?.includes(otherUserId)) {
        return msg.$id;
      }
    }
    return null;
  }, [messages, chat.type, chat.otherUser, user.$id]);

  const firstUnreadMessageIndex = useMemo(() => {
    if (!user?.$id) {
      return -1;
    }

    return memoizedMessages.findIndex((message) => {
      if (!message?.$id || message.senderId === user.$id) {
        return false;
      }

      const readBy = Array.isArray(message.readBy) ? message.readBy : [];
      return !readBy.includes(user.$id);
    });
  }, [memoizedMessages, user?.$id]);

  const unreadIncomingCount = useMemo(() => {
    if (!user?.$id) {
      return 0;
    }

    return memoizedMessages.reduce((count, message) => {
      if (!message?.$id || message.senderId === user.$id) {
        return count;
      }

      const readBy = Array.isArray(message.readBy) ? message.readBy : [];
      return readBy.includes(user.$id) ? count : count + 1;
    }, 0);
  }, [memoizedMessages, user?.$id]);

  const initialScrollIndex = useMemo(() => {
    if (loading || memoizedMessages.length === 0) {
      return undefined;
    }

    const savedViewportMessageId = String(chatViewportState?.messageId || '').trim();
    if (savedViewportMessageId) {
      return undefined;
    }

    if (firstUnreadMessageIndex >= 0) {
      return Math.max(firstUnreadMessageIndex - 1, 0);
    }

    return Math.max(memoizedMessages.length - 1, 0);
  }, [chatViewportState?.messageId, firstUnreadMessageIndex, loading, memoizedMessages]);

  const persistViewport = useCallback(() => {
    const messageId = String(visibleAnchorRef.current?.messageId || '').trim();
    if (!messageId || memoizedMessages.length === 0) {
      return;
    }

    const scrollOffset = Math.max(0, Number(scrollOffsetRef.current || 0));
    const viewportKey = `${messageId}:${scrollOffset}`;
    if (viewportKey === lastPersistedViewportKeyRef.current) {
      return;
    }

    lastPersistedViewportKeyRef.current = viewportKey;
    saveChatViewport({
      messageId,
      scrollOffset,
      savedAt: new Date().toISOString(),
    });
  }, [memoizedMessages.length, saveChatViewport]);

  const handleListScroll = useCallback((event) => {
    scrollOffsetRef.current = Number(event?.nativeEvent?.contentOffset?.y || 0);
  }, []);

  const handleViewableItemsChanged = useRef(({ viewableItems }) => {
    const orderedViewableItems = (Array.isArray(viewableItems) ? viewableItems : [])
      .filter(item => item?.isViewable && item?.item?.$id)
      .sort((first, second) => Number(first?.index ?? 0) - Number(second?.index ?? 0));

    const firstVisible = orderedViewableItems[0];
    if (!firstVisible?.item?.$id) {
      return;
    }

    const lastVisible = orderedViewableItems[orderedViewableItems.length - 1];
    const lastVisibleIndex = Number(lastVisible?.index ?? -1);
    lastVisibleIndexRef.current = lastVisibleIndex;

    const nearBottomThreshold = 2;
    const totalItems = memoizedMessages.length;
    const nextIsNearBottom = totalItems <= 0
      ? true
      : lastVisibleIndex >= Math.max(0, totalItems - 1 - nearBottomThreshold);

    setIsNearBottom((prev) => (prev === nextIsNearBottom ? prev : nextIsNearBottom));
    if (nextIsNearBottom) {
      setPendingNewMessageCount((prev) => (prev === 0 ? prev : 0));
    }

    visibleAnchorRef.current = {
      messageId: firstVisible.item.$id,
      index: Number(firstVisible.index ?? -1),
    };
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 60,
    minimumViewTime: 80,
  }).current;

  const renderMessage = useCallback(({ item, index }) => {
    const senderData = userCache[item.senderId];
    const isBookmarked = bookmarkedMsgIds.includes(item.$id);
    const isRepresentative = chat.representatives?.includes(item.senderId) || false;
    const otherUserPhoto = chat.type === 'private' ? chat.otherUser?.profilePicture : null;
    const otherUserName = chat.type === 'private' ? (chat.otherUser?.name || chat.otherUser?.fullName) : null;
    const participantCount = chat.participants?.length || 0;
    const isCurrentSearchResult = item.$id === currentSearchMessageId;
    const isHighlighted = item.$id === highlightedMessageId;
    const previousSenderId = memoizedMessages[index - 1]?.senderId;
    const nextSenderId = memoizedMessages[index + 1]?.senderId;
    const isLastSeenMessage = item.senderId === user.$id && item.$id === lastSeenMessageId;

    return (
      <>
        {index === firstUnreadMessageIndex && unreadIncomingCount > 0 && (
          <View style={[styles.unreadSeparator, { borderColor: theme.border }]}>
            <Text style={[styles.unreadSeparatorText, { color: theme.primary }]}> 
              {t('chats.newMessagesCount', { count: unreadIncomingCount })}
            </Text>
          </View>
        )}
        <ChatMessageItem
          message={item}
          index={index}
          currentUserId={user.$id}
          senderData={senderData}
          previousSenderId={previousSenderId}
          nextSenderId={nextSenderId}
          isRepresentative={isRepresentative}
          isBookmarked={isBookmarked}
          canPin={canPin}
          chatType={chat.type}
          otherUserPhoto={otherUserPhoto}
          otherUserName={otherUserName}
          participantCount={participantCount}
          isLastSeenMessage={isLastSeenMessage}
          groupMembers={groupMembers}
          searchQuery={searchActive ? searchQuery : ''}
          isCurrentSearchResult={isCurrentSearchResult}
          isHighlighted={isHighlighted}
          showAlert={showAlert}
          selectionMode={selectionMode}
          isSelected={selectedMessageIds.includes(item.$id)}
          reactionDefaults={reactionDefaults}
          onCopyMessage={handleCopyMessage}
          onDeleteMessage={handleDeleteMessage}
          onReplyMessage={handleReplyMessage}
          onForwardMessage={handleForwardMessage}
          onPinMessage={handlePinMessage}
          onUnpinMessage={handleUnpinMessage}
          onBookmarkMessage={handleBookmarkMessage}
          onUnbookmarkMessage={handleUnbookmarkMessage}
          onAvatarPress={handleNavigateToProfile}
          onRetryMessage={handleRetryMessage}
          onPostPress={handlePostPress}
          onToggleSelect={toggleMessageSelection}
          onToggleReaction={handleToggleReaction}
          onPollVote={handleVotePollMessage}
          onEditReactions={handleOpenReactionSettings}
          triggerHaptic={triggerHaptic}
        />
      </>
    );
  }, [bookmarkedMsgIds, canPin, chat.otherUser?.fullName, chat.otherUser?.name, chat.otherUser?.profilePicture, chat.participants?.length, chat.representatives, chat.type, currentSearchMessageId, firstUnreadMessageIndex, groupMembers, handleBookmarkMessage, handleCopyMessage, handleDeleteMessage, handleForwardMessage, handleNavigateToProfile, handleOpenReactionSettings, handlePinMessage, handlePostPress, handleReplyMessage, handleRetryMessage, handleToggleReaction, handleUnbookmarkMessage, handleUnpinMessage, handleVotePollMessage, highlightedMessageId, lastSeenMessageId, memoizedMessages, reactionDefaults, searchActive, searchQuery, selectedMessageIds, selectionMode, showAlert, t, theme.border, theme.primary, toggleMessageSelection, triggerHaptic, unreadIncomingCount, user.$id, userCache]);

  const renderEmpty = useCallback(() => null, []);

  const keyExtractor = useCallback((item, index) => item.$id || `message-${index}`, []);

  const renderEmptyOverlay = useCallback(() => {
    if (memoizedMessages.length > 0 || loading) return null;

    return (
      <View style={styles.emptyOverlay}>
        <UnifiedEmptyState
          iconName="chatbubbles-outline"
          title={t('chats.noMessages')}
          description={t('chats.beFirstToMessage')}
          compact
        />
      </View>
    );
  }, [loading, memoizedMessages.length, t]);

  const renderLoadingOverlay = useCallback(() => {
    if (!loading || memoizedMessages.length > 0) {
      return null;
    }

    return (
      <View style={styles.emptyOverlay} pointerEvents="none">
        <View
          style={[
            styles.emptyCard,
            {
              backgroundColor: theme.card,
              borderColor: theme.border,
              borderWidth: 1,
              gap: moderateScale(12),
            },
          ]}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.emptyText, { fontSize: fontSize(16), color: theme.text }]}>
            {t('common.loading')}
          </Text>
        </View>
      </View>
    );
  }, [loading, memoizedMessages.length, t, theme.border, theme.card, theme.primary, theme.text]);

  const isCustomImageBackground = chatSettings?.backgroundImage && 
    !chatSettings.backgroundImage.startsWith('gradient_') &&
    !chatSettings.backgroundImage.startsWith('pattern_') &&
    chatSettings.backgroundImage !== null;

  const customBackgroundSource = useMemo(() => {
    if (!isCustomImageBackground) {
      return null;
    }

    return { uri: chatSettings.backgroundImage };
  }, [chatSettings.backgroundImage, isCustomImageBackground]);

  const handleScrollToIndexFailed = useCallback((info) => {
    if (!flatListRef.current || info.index >= memoizedMessages.length) {
      return;
    }

    flatListRef.current.scrollToOffset({
      offset: Math.max(0, Number(info.averageItemLength || 0) * info.index),
      animated: false,
    });

    requestAnimationFrame(() => {
      flatListRef.current?.scrollToIndex({
        index: info.index,
        animated: false,
        viewPosition: 0,
      });
    });
  }, [flatListRef, memoizedMessages.length]);

  useEffect(() => {
    hasAppliedInitialViewportRef.current = false;
    initialScrollSettledRef.current = false;
    lastPersistedViewportKeyRef.current = '';
    visibleAnchorRef.current = { messageId: '', index: -1 };
    lastVisibleIndexRef.current = -1;
    scrollOffsetRef.current = 0;
    previousLastMessageIdRef.current = '';
    previousMessagesLengthRef.current = 0;
    setIsNearBottom(true);
    setPendingNewMessageCount(0);
  }, [chat.$id]);

  useEffect(() => {
    if (loading || memoizedMessages.length === 0 || hasAppliedInitialViewportRef.current) {
      return;
    }

    hasAppliedInitialViewportRef.current = true;

    const savedViewportMessageId = String(chatViewportState?.messageId || '').trim();
    const savedScrollOffset = Math.max(0, Number(chatViewportState?.scrollOffset || 0));

    if (savedViewportMessageId && flatListRef.current) {
      const savedIndex = memoizedMessages.findIndex((message) => message?.$id === savedViewportMessageId);

      requestAnimationFrame(() => {
        if (savedIndex >= 0) {
          flatListRef.current?.scrollToIndex({
            index: savedIndex,
            animated: false,
            viewPosition: 0,
          });
          return;
        }

        if (savedScrollOffset > 0) {
          flatListRef.current?.scrollToOffset({
            offset: savedScrollOffset,
            animated: false,
          });
        }

        initialScrollSettledRef.current = true;
      });
      return;
    }

    requestAnimationFrame(() => {
      if (firstUnreadMessageIndex < 0) {
        flatListRef.current?.scrollToEnd({ animated: false });
      }
      initialScrollSettledRef.current = true;
    });
  }, [chatViewportState?.messageId, chatViewportState?.scrollOffset, firstUnreadMessageIndex, flatListRef, loading, memoizedMessages]);

  const scrollToLatest = useCallback((animated = true) => {
    if (!flatListRef.current || memoizedMessages.length === 0) {
      return;
    }

    flatListRef.current.scrollToEnd({ animated });
    setPendingNewMessageCount(0);
    setIsNearBottom(true);
  }, [flatListRef, memoizedMessages.length]);

  useEffect(() => {
    if (loading || memoizedMessages.length === 0 || !initialScrollSettledRef.current) {
      return;
    }

    const latestMessage = memoizedMessages[memoizedMessages.length - 1];
    const latestMessageId = String(latestMessage?.$id || '');
    const previousLatestMessageId = String(previousLastMessageIdRef.current || '');

    if (!latestMessageId) {
      return;
    }

    if (!previousLatestMessageId) {
      previousLastMessageIdRef.current = latestMessageId;
      previousMessagesLengthRef.current = memoizedMessages.length;
      return;
    }

    if (latestMessageId === previousLatestMessageId) {
      previousMessagesLengthRef.current = memoizedMessages.length;
      return;
    }

    const latestFromCurrentUser = latestMessage.senderId === user.$id;
    const appended = memoizedMessages.length >= previousMessagesLengthRef.current;

    if (appended && (isNearBottom || latestFromCurrentUser)) {
      requestAnimationFrame(() => {
        scrollToLatest(latestFromCurrentUser);
      });
    } else if (appended && !latestFromCurrentUser) {
      setPendingNewMessageCount((prev) => prev + 1);
    }

    previousLastMessageIdRef.current = latestMessageId;
    previousMessagesLengthRef.current = memoizedMessages.length;
  }, [isNearBottom, loading, memoizedMessages, scrollToLatest, user.$id]);

  useEffect(() => {
    const unsubscribeBlur = navigation.addListener('blur', () => {
      persistViewport();
    });

    return unsubscribeBlur;
  }, [navigation, persistViewport]);

  useEffect(() => {
    return () => {
      persistViewport();
    };
  }, [persistViewport]);

  const renderSearchBar = useCallback(() => {
    if (!searchActive) return null;

    return (
      <View style={searchBarStyle}>
        <View style={searchInputContainerStyle}>
          <Ionicons name="search" size={moderateScale(18)} color={theme.textSecondary} />
          <TextInput
            ref={searchInputRef}
            style={searchInputStyle}
            placeholder={t('chats.searchInChat')}
            placeholderTextColor={theme.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={handleSearchClear} hitSlop={SEARCH_ACTION_HIT_SLOP}>
              <Ionicons name="close-circle" size={moderateScale(18)} color={theme.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
        
        <View style={styles.searchNav}>
          {searchResults.length > 0 ? (
            <Text style={searchCountTextStyle}>
              {currentSearchIndex + 1}/{searchResults.length}
            </Text>
          ) : searchQuery.length > 0 ? (
            <Text style={searchEmptyTextStyle}>
              {t('chats.noResultsFound')}
            </Text>
          ) : null}
          
          <TouchableOpacity 
            onPress={handleSearchPrev} 
            disabled={searchResults.length === 0}
            style={[styles.searchNavBtn, searchResults.length === 0 && styles.searchNavBtnDisabled]}
            accessibilityRole="button"
            accessibilityLabel={t('common.previous')}
            hitSlop={SEARCH_ACTION_HIT_SLOP}>
            <Ionicons name="chevron-up" size={moderateScale(20)} color={searchResults.length > 0 ? theme.text : theme.textSecondary} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            onPress={handleSearchNext} 
            disabled={searchResults.length === 0}
            style={[styles.searchNavBtn, searchResults.length === 0 && styles.searchNavBtnDisabled]}
            accessibilityRole="button"
            accessibilityLabel={t('common.next')}
            hitSlop={SEARCH_ACTION_HIT_SLOP}>
            <Ionicons name="chevron-down" size={moderateScale(20)} color={searchResults.length > 0 ? theme.text : theme.textSecondary} />
          </TouchableOpacity>
          
          <TouchableOpacity onPress={closeSearch} style={styles.searchCloseBtn} accessibilityRole="button" accessibilityLabel={t('common.close')} hitSlop={SEARCH_ACTION_HIT_SLOP}>
            <Text style={searchCloseTextStyle}>
              {t('common.close')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }, [closeSearch, currentSearchIndex, handleSearchClear, handleSearchNext, handleSearchPrev, searchActive, searchBarStyle, searchCloseTextStyle, searchCountTextStyle, searchEmptyTextStyle, searchInputContainerStyle, searchInputStyle, searchQuery, searchResults.length, t, theme.text, theme.textSecondary]);

  const renderChatContent = useCallback(() => (
    <KeyboardAvoidingView 
      style={styles.keyboardAvoidingView}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? moderateScale(90) + insets.top : moderateScale(60)}>
      
      {renderSearchBar()}
      
      {chat.requiresRepresentative && !canSend && (
        <View style={representativeWarningBannerStyle}>
          <Ionicons name="information-circle" size={moderateScale(18)} color={REPRESENTATIVE_ONLY_COLOR} />
          <Text style={[styles.warningText, { fontSize: fontSize(12), color: REPRESENTATIVE_ONLY_COLOR }]}>
            {t('chats.representativeOnlyChat')}
          </Text>
        </View>
      )}

      <FlashList
        ref={flatListRef}
        data={memoizedMessages}
        estimatedItemSize={70}
        renderItem={renderMessage}
        keyExtractor={keyExtractor}
        initialScrollIndex={initialScrollIndex}
        contentContainerStyle={[styles.messagesList, chatStyle]}
        ListEmptyComponent={renderEmpty}
        onScroll={handleListScroll}
        onScrollToIndexFailed={handleScrollToIndexFailed}
        onViewableItemsChanged={handleViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        scrollEventThrottle={16}
        maintainVisibleContentPosition={maintainVisibleContentPosition}
      />

      {!selectionMode && memoizedMessages.length > 0 && (!isNearBottom || pendingNewMessageCount > 0) && (
        <TouchableOpacity
          style={[styles.jumpToLatestButton, { backgroundColor: theme.primary }]}
          onPress={() => scrollToLatest(true)}
          accessibilityRole="button"
          accessibilityLabel={t('chats.jumpToLatest')}
          activeOpacity={0.9}>
          <Ionicons name="arrow-down" size={moderateScale(16)} color="#fff" />
          {pendingNewMessageCount > 0 && (
            <View style={[styles.jumpToLatestBadge, { backgroundColor: theme.card }]}> 
              <Text style={[styles.jumpToLatestBadgeText, { color: theme.primary }]}> 
                {pendingNewMessageCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      )}

      {renderLoadingOverlay()}
      {renderEmptyOverlay()}

      {/* Selection Mode Toolbar */}
      {selectionMode && (
        <View style={selectionToolbarStyle}>
          <TouchableOpacity
            style={styles.selectionToolbarBtn}
            onPress={toggleSelectionMode}>
            <Ionicons name="close" size={moderateScale(22)} color={theme.text} />
            <Text style={selectedMessagesTextStyle}>
              {selectedMessageIds.length} {t('chats.selected')}
            </Text>
          </TouchableOpacity>
          <View style={styles.selectionToolbarActions}>
            <TouchableOpacity
              style={styles.selectionToolbarBtn}
              onPress={handleBatchCopy}
              disabled={selectedMessageIds.length === 0}>
              <Ionicons name="copy-outline" size={moderateScale(20)} color={selectedMessageIds.length > 0 ? theme.primary : theme.textSecondary} />
              <Text style={copySelectionTextStyle}>
                {t('chats.copy')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.selectionToolbarBtn}
              onPress={handleBatchDeleteForMe}
              disabled={selectedMessageIds.length === 0}>
              <Ionicons name="eye-off-outline" size={moderateScale(20)} color={selectedMessageIds.length > 0 ? BLOCKED_COLOR : theme.textSecondary} />
              <Text style={deleteSelectionTextStyle}>
                {t('chats.deleteForMe')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Blocked user banner */}
      {isFullyBlockedChat && (
        <View style={fullBlockedBannerStyle}>
          <Ionicons name="ban-outline" size={moderateScale(18)} color={BLOCKED_COLOR} />
          <Text style={[styles.warningText, { fontSize: fontSize(12), color: BLOCKED_COLOR }]}>
            {iBlockedThem
              ? t('chats.blockedUserBanner')
              : t('chats.blockedByUserBanner')}
          </Text>
        </View>
      )}

      {!isFullyBlockedChat && isChatOnlyBlocked && (
        <View style={chatOnlyBlockedBannerStyle}>
          <Ionicons name="chatbubble-ellipses-outline" size={moderateScale(18)} color={CHAT_ONLY_BLOCKED_COLOR} />
          <Text style={[styles.warningText, { fontSize: fontSize(12), color: CHAT_ONLY_BLOCKED_COLOR }]}>
            {iChatBlockedThem
              ? t('chats.messagesOnlyBlockedBanner')
              : t('chats.messagesOnlyBlockedByUserBanner')}
          </Text>
        </View>
      )}

      {!selectionMode && !isBlockedChat && isFocused && (
      <MessageInput 
        key={`chat-input-${chat?.$id || 'unknown'}`}
        onSend={handleSendWithHaptic}
        disabled={!canSend}
        placeholder={
          canSend 
            ? t('chats.typeMessage')
            : t('chats.cannotSendMessage')
        }
        replyingTo={replyingTo}
        onCancelReply={cancelReply}
        showMentionButton={chat.type !== 'private'}
        canMentionEveryone={canMentionEveryone}
        groupMembers={groupMembers}
        friends={userFriends}
        excludedMentionUserIds={excludedMentionUserIds}
        showAlert={showAlert}
      />
      )}
    </KeyboardAvoidingView>
  ), [canMentionEveryone, canSend, cancelReply, chat.requiresRepresentative, chat.type, chatOnlyBlockedBannerStyle, chatStyle, copySelectionTextStyle, deleteSelectionTextStyle, excludedMentionUserIds, flatListRef, fullBlockedBannerStyle, groupMembers, handleBatchCopy, handleBatchDeleteForMe, handleListScroll, handleScrollToIndexFailed, handleSendWithHaptic, handleViewableItemsChanged, iBlockedThem, iChatBlockedThem, initialScrollIndex, insets.top, isBlockedChat, isChatOnlyBlocked, isFocused, isFullyBlockedChat, isNearBottom, keyExtractor, maintainVisibleContentPosition, memoizedMessages, pendingNewMessageCount, renderEmpty, renderEmptyOverlay, renderLoadingOverlay, renderMessage, renderSearchBar, representativeWarningBannerStyle, replyingTo, scrollToLatest, selectedMessageIds.length, selectedMessagesTextStyle, selectionMode, selectionToolbarStyle, showAlert, t, theme.card, theme.primary, theme.text, theme.textSecondary, toggleSelectionMode, userFriends, viewabilityConfig]);

  return (
    <View style={[styles.container, { backgroundColor: backgroundColors[0] || headerBackgroundColor }]}>
      <StatusBar 
        barStyle={isDarkMode ? 'light-content' : 'dark-content'} 
        backgroundColor="transparent"
        translucent
      />
      
      {isCustomImageBackground ? (
        <ImageBackground 
          source={customBackgroundSource} 
          style={styles.gradient}
          resizeMode="cover">
          <View style={styles.backgroundOverlay}>
            <AnimatedBackground particleCount={15} />
            {renderChatContent()}
          </View>
        </ImageBackground>
      ) : (
        <LinearGradient
          colors={backgroundColors}
          style={styles.gradient}>
          <AnimatedBackground particleCount={15} />
          {renderChatContent()}
        </LinearGradient>
      )}

      <MuteModal
        visible={showMuteModal}
        onClose={handleCloseMuteModal}
        muteStatus={muteStatus}
        onMute={handleMuteChat}
        onUnmute={handleUnmuteChat}
        theme={theme}
        isDarkMode={isDarkMode}
        t={t}
      />

      <PinnedMessagesModal
        visible={showPinnedModal}
        onClose={handleClosePinnedModal}
        pinnedMessages={pinnedMessages}
        canPin={canPin}
        onUnpinMessage={handleUnpinMessage}
        onPinnedMessagePress={handlePinnedMessagePress}
        theme={theme}
        isDarkMode={isDarkMode}
        t={t}
      />

      <ChatOptionsModal
        visible={showChatOptionsModal}
        onClose={handleCloseChatOptionsModal}
        chat={chat}
        chatDisplayName={getChatDisplayName()}
        muteStatus={muteStatus}
        onVisitProfile={handleVisitProfile}
        onOpenMuteModal={handleOpenMuteModalFromOptions}
        onViewPinnedMessages={handleViewPinnedMessagesFromOptions}
        onOpenGroupSettings={handleOpenGroupSettingsFromOptions}
        onBlockUser={handleBlockUser}
        onClearChat={handleClearChatWithHaptic}
        onDeleteConversation={handleDeleteConversationWithHaptic}
        showAlert={showAlert}
        theme={theme}
        isDarkMode={isDarkMode}
        t={t}
      />

      <CustomAlert
        visible={alertConfig.visible}
        type={alertConfig.type}
        title={alertConfig.title}
        message={alertConfig.message}
        buttons={alertConfig.buttons}
        onDismiss={hideAlert}
      />

      <PostViewModal
        visible={postModalVisible}
        onClose={handleClosePostModal}
        postId={postModalPostId}
        navigation={navigation}
      />
    </View>
  );
};

export default ChatRoom;
