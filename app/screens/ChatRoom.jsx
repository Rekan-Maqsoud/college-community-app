import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  StatusBar,
  Platform,
  TouchableOpacity,
  Modal,
  Pressable,
  KeyboardAvoidingView,
  ImageBackground,
  TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAppSettings } from '../context/AppSettingsContext';
import { useUser } from '../context/UserContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AnimatedBackground from '../components/AnimatedBackground';
import MessageBubble from '../components/MessageBubble';
import MessageInput from '../components/MessageInput';
import { MessageListSkeleton } from '../components/SkeletonLoader';
import CustomAlert from '../components/CustomAlert';
import UnifiedEmptyState from '../components/UnifiedEmptyState';
import useCustomAlert from '../hooks/useCustomAlert';
import { 
  wp, 
  fontSize, 
  spacing, 
  moderateScale,
} from '../utils/responsive';
import { borderRadius } from '../theme/designTokens';
import { MuteModal, PinnedMessagesModal, ChatOptionsModal } from './chatRoom/ChatRoomModals';
import { chatRoomStyles as styles } from './chatRoom/styles';
import { useChatRoom } from './chatRoom/useChatRoom';
import useLayout from '../hooks/useLayout';
import PostViewModal from '../components/PostViewModal';
import { isUserOnline, getLastSeenText } from '../utils/onlineStatus';
import { getUserById } from '../../database/users';

const ChatRoom = ({ route, navigation }) => {
  const { chat } = route.params;
  const { t, theme, isDarkMode, chatSettings, showActivityStatus, triggerHaptic } = useAppSettings();
  const { user, refreshUser } = useUser();
  const { alertConfig, showAlert, hideAlert } = useCustomAlert();
  const insets = useSafeAreaInsets();
  const { chatStyle } = useLayout();

  const {
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
    chat: chatData,
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
    handleVisitProfile,
    handleBlockUser,
    handleClearChat,
    handleDeleteConversation,
    toggleSelectionMode,
    toggleMessageSelection,
    handleBatchCopy,
    handleBatchDeleteForMe,
    handleManualRefresh,
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

  // Post view modal state (for shared posts)
  const [postModalVisible, setPostModalVisible] = useState(false);
  const [postModalPostId, setPostModalPostId] = useState(null);

  // Online status tracking for private chats
  const [otherUserLastSeen, setOtherUserLastSeen] = useState(
    chat.type === 'private' ? chat.otherUser?.lastSeen || null : null
  );
  const otherUserOnline = showActivityStatus && isUserOnline(otherUserLastSeen);

  useEffect(() => {
    if (chat.type !== 'private' || !showActivityStatus) return;
    const otherUserId = chat.otherUser?.$id;
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
  }, [chat.type, chat.otherUser?.$id, showActivityStatus]);

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
  }, [memoizedMessages, setShowPinnedModal]);

  // Compute search results when query changes
  useEffect(() => {
    if (searchQuery.trim().length > 0) {
      const query = searchQuery.toLowerCase();
      const results = memoizedMessages
        .map((msg, index) => ({ ...msg, originalIndex: index }))
        .filter(msg => msg.content && msg.content.toLowerCase().includes(query));
      setSearchResults(results);
      setCurrentSearchIndex(0); // Start from newest (index 0 in inverted list)
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
  }, [currentSearchIndex, searchResults]);

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

  useEffect(() => {
    // Get header background color to match chat background
    const getHeaderBgColor = () => {
      const bgSetting = chatSettings?.backgroundImage;
      if (bgSetting?.startsWith('gradient_')) {
        const gradientMap = {
          'gradient_purple': '#667eea',
          'gradient_blue': '#1a1a2e',
          'gradient_green': '#134e5e',
          'gradient_sunset': '#ff7e5f',
          'gradient_ocean': '#2193b0',
          'gradient_midnight': '#232526',
          'gradient_aurora': '#00c6fb',
          'gradient_rose': '#f4c4f3',
        };
        return gradientMap[bgSetting] || (isDarkMode ? '#1a1a2e' : '#f0f4ff');
      }
      return isDarkMode ? '#1a1a2e' : '#f0f4ff';
    };

    navigation.setOptions({
      headerTintColor: theme.text,
      headerTitle: () => (
        <TouchableOpacity onPress={handleChatHeaderPress} activeOpacity={0.7}>
          <Text
            numberOfLines={1}
            ellipsizeMode="tail"
            style={{ 
            color: theme.text, 
            fontSize: fontSize(16), 
            fontWeight: '600',
            textAlign: 'center',
            maxWidth: wp(52),
          }}>
            {formattedChatTitle}
          </Text>
          {chat.type === 'private' && showActivityStatus ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
              {otherUserOnline && (
                <View style={{
                  width: moderateScale(7),
                  height: moderateScale(7),
                  borderRadius: moderateScale(4),
                  backgroundColor: '#34C759',
                }} />
              )}
              <Text style={{ 
                color: otherUserOnline ? '#34C759' : theme.textSecondary, 
                fontSize: fontSize(11), 
                textAlign: 'center',
              }}>
                {otherUserOnline
                  ? t('chats.online')
                  : (getLastSeenText(otherUserLastSeen, t) || t('chats.tapForOptions'))}
              </Text>
            </View>
          ) : (
            <Text style={{ 
              color: theme.textSecondary, 
              fontSize: fontSize(11), 
              textAlign: 'center',
            }}>
              {t('chats.tapForOptions')}
            </Text>
          )}
        </TouchableOpacity>
      ),
      headerStyle: {
        backgroundColor: getHeaderBgColor(),
        height: moderateScale(74),
      },
      headerRight: () => (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <TouchableOpacity
            style={{ marginRight: spacing.sm }}
            onPress={handleManualRefresh}
            accessibilityRole="button"
            accessibilityLabel={t('common.refresh')}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="refresh-outline" size={moderateScale(22)} color={theme.text} />
          </TouchableOpacity>
          <TouchableOpacity
            style={{ marginRight: spacing.sm }}
            onPress={openSearch}
            accessibilityRole="button"
            accessibilityLabel={t('chats.searchInChat')}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="search-outline" size={moderateScale(22)} color={theme.text} />
          </TouchableOpacity>
          {chat.type === 'custom_group' && (
            <TouchableOpacity
              style={{ marginRight: spacing.md }}
              onPress={() => navigation.navigate('GroupSettings', { chat })}
              accessibilityRole="button"
              accessibilityLabel={t('chats.groupSettings')}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="settings-outline" size={moderateScale(22)} color={theme.text} />
            </TouchableOpacity>
          )}
        </View>
      ),
    });
  }, [chat, isDarkMode, theme, muteStatus, chatSettings, openSearch, formattedChatTitle, handleChatHeaderPress, navigation, t, otherUserOnline, otherUserLastSeen, showActivityStatus, handleManualRefresh]);

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

    // Messages are in inverted order (newest first / index 0 = newest)
    // Find the newest message sent by current user that was read by other user
    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      if (msg.senderId === user.$id && msg.readBy?.includes(otherUserId)) {
        return msg.$id;
      }
    }
    return null;
  }, [messages, chat.type, chat.otherUser, user.$id]);

  const renderMessage = ({ item, index }) => {
    const isCurrentUser = item.senderId === user.$id;
    const senderData = userCache[item.senderId];
    const senderName = senderData?.name || item.senderName || 'Unknown';
    const senderPhoto = senderData?.profilePicture || item.senderPhoto;
    
    // With inverted FlatList: index 0 = newest (visually at bottom)
    // Visual "above" = index + 1, visual "below" = index - 1
    const showSenderName = !isCurrentUser && (
      index === memoizedMessages.length - 1 || 
      memoizedMessages[index + 1]?.senderId !== item.senderId
    );
    
    const showAvatar = !isCurrentUser && (
      index === 0 ||
      memoizedMessages[index - 1]?.senderId !== item.senderId
    );

    const isBookmarked = bookmarkedMsgIds.includes(item.$id);
    
    // Check if sender is a representative in this chat
    const isRepresentative = chat.representatives?.includes(item.senderId) || false;

    const handleAvatarPress = (senderId) => {
      if (senderId) {
        navigation.navigate('UserProfile', { userId: senderId });
      }
    };

    const handleNavigateToProfile = (userId) => {
      if (userId) {
        navigation.navigate('UserProfile', { userId });
      }
    };

    // Get other user info for private chats (for read receipts)
    const otherUserPhoto = chat.type === 'private' ? chat.otherUser?.profilePicture : null;
    const otherUserName = chat.type === 'private' ? (chat.otherUser?.name || chat.otherUser?.fullName) : null;
    const participantCount = chat.participants?.length || 0;
    
    // Check if this is the last message seen by the other user (for animated read receipt)
    const isLastSeenMessage = isCurrentUser && item.$id === lastSeenMessageId;
    
    // Check if this message is the current search result
    const isCurrentSearchResult = item.$id === currentSearchMessageId;
    
    // Check if this message is highlighted (from pinned message scroll)
    const isHighlighted = item.$id === highlightedMessageId;

    return (
      <MessageBubble
        message={item}
        isCurrentUser={isCurrentUser}
        senderName={showSenderName ? senderName : null}
        senderPhoto={senderPhoto}
        showAvatar={showAvatar}
        isRepresentative={isRepresentative}
        onCopy={() => handleCopyMessage(item)}
        onDelete={isCurrentUser ? () => {
          triggerHaptic('warning');
          handleDeleteMessage(item);
        } : null}
        onReply={() => handleReplyMessage(item)}
        onForward={() => handleForwardMessage(item)}
        onPin={canPin ? () => handlePinMessage(item) : null}
        onUnpin={canPin && item.isPinned ? () => handleUnpinMessage(item) : null}
        onBookmark={() => {
          triggerHaptic('light');
          handleBookmarkMessage(item);
        }}
        onUnbookmark={isBookmarked ? () => handleUnbookmarkMessage(item) : null}
        isBookmarked={isBookmarked}
        onAvatarPress={handleAvatarPress}
        onRetry={item._status === 'failed' ? handleRetryMessage : null}
        chatType={chat.type}
        otherUserPhoto={otherUserPhoto}
        otherUserName={otherUserName}
        participantCount={participantCount}
        isLastSeenMessage={isLastSeenMessage}
        groupMembers={groupMembers}
        onNavigateToProfile={handleNavigateToProfile}
        searchQuery={searchActive ? searchQuery : ''}
        isCurrentSearchResult={isCurrentSearchResult}
        isHighlighted={isHighlighted}
        onPostPress={(postId) => {
          setPostModalPostId(postId);
          setPostModalVisible(true);
        }}
        showAlert={showAlert}
        selectionMode={selectionMode}
        isSelected={selectedMessageIds.includes(item.$id)}
        onToggleSelect={toggleMessageSelection}
        currentUserId={user?.$id}
        reactionDefaults={reactionDefaults}
        onToggleReaction={handleToggleReaction}
        onPollVote={handleVotePollMessage}
        onEditReactions={handleOpenReactionSettings}
      />
    );
  };

  const renderEmpty = () => null;

  const renderEmptyOverlay = () => {
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
  };

  const getBackgroundColors = () => {
    const bgSetting = chatSettings?.backgroundImage;
    
    if (bgSetting?.startsWith('gradient_')) {
      const gradientMap = {
        'gradient_purple': ['#667eea', '#764ba2'],
        'gradient_blue': ['#1a1a2e', '#16213e'],
        'gradient_green': ['#134e5e', '#71b280'],
        'gradient_sunset': ['#ff7e5f', '#feb47b'],
        'gradient_ocean': ['#2193b0', '#6dd5ed'],
        'gradient_midnight': ['#232526', '#414345'],
        'gradient_aurora': ['#00c6fb', '#005bea'],
        'gradient_rose': ['#f4c4f3', '#fc67fa'],
      };
      return gradientMap[bgSetting] || (isDarkMode 
        ? ['#1a1a2e', '#16213e', '#0f3460'] 
        : ['#f0f4ff', '#d8e7ff', '#c0deff']);
    }
    
    return isDarkMode 
      ? ['#1a1a2e', '#16213e', '#0f3460'] 
      : ['#f0f4ff', '#d8e7ff', '#c0deff'];
  };

  const isCustomImageBackground = chatSettings?.backgroundImage && 
    !chatSettings.backgroundImage.startsWith('gradient_') &&
    !chatSettings.backgroundImage.startsWith('pattern_') &&
    chatSettings.backgroundImage !== null;

  const handleScrollToIndexFailed = useCallback((info) => {
    // Handle failed scroll - wait and retry
    setTimeout(() => {
      if (flatListRef.current && info.index < memoizedMessages.length) {
        flatListRef.current.scrollToIndex({
          index: info.index,
          animated: true,
          viewPosition: 0.5,
        });
      }
    }, 100);
  }, [memoizedMessages.length]);

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: isDarkMode ? '#1a1a2e' : '#f0f4ff' }]}>
        <StatusBar 
          barStyle={isDarkMode ? 'light-content' : 'dark-content'} 
          backgroundColor="transparent"
          translucent
        />
        <View style={styles.loadingContainer}>
          <MessageListSkeleton count={8} />
        </View>
      </View>
    );
  }

  const renderSearchBar = () => {
    if (!searchActive) return null;
    
    const searchBarBg = isDarkMode ? 'rgba(0,0,0,0.85)' : 'rgba(255,255,255,0.95)';
    
    return (
      <View style={[styles.searchBar, { backgroundColor: searchBarBg }]}>
        <View style={[styles.searchInputContainer, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
          <Ionicons name="search" size={moderateScale(18)} color={theme.textSecondary} />
          <TextInput
            ref={searchInputRef}
            style={[styles.searchInput, { color: theme.text, fontSize: fontSize(14) }]}
            placeholder={t('chats.searchInChat')}
            placeholderTextColor={theme.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={moderateScale(18)} color={theme.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
        
        <View style={styles.searchNav}>
          {searchResults.length > 0 ? (
            <Text style={[styles.searchCount, { color: theme.text, fontSize: fontSize(12) }]}>
              {currentSearchIndex + 1}/{searchResults.length}
            </Text>
          ) : searchQuery.length > 0 ? (
            <Text style={[styles.searchCount, { color: theme.textSecondary, fontSize: fontSize(12) }]}>
              {t('chats.noResultsFound')}
            </Text>
          ) : null}
          
          <TouchableOpacity 
            onPress={handleSearchPrev} 
            disabled={searchResults.length === 0}
            style={[styles.searchNavBtn, searchResults.length === 0 && styles.searchNavBtnDisabled]}
            accessibilityRole="button"
            accessibilityLabel={t('common.previous')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="chevron-up" size={moderateScale(20)} color={searchResults.length > 0 ? theme.text : theme.textSecondary} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            onPress={handleSearchNext} 
            disabled={searchResults.length === 0}
            style={[styles.searchNavBtn, searchResults.length === 0 && styles.searchNavBtnDisabled]}
            accessibilityRole="button"
            accessibilityLabel={t('common.next')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="chevron-down" size={moderateScale(20)} color={searchResults.length > 0 ? theme.text : theme.textSecondary} />
          </TouchableOpacity>
          
          <TouchableOpacity onPress={closeSearch} style={styles.searchCloseBtn} accessibilityRole="button" accessibilityLabel={t('common.close')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={[styles.searchCloseText, { color: theme.primary, fontSize: fontSize(14) }]}>
              {t('common.close')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderChatContent = () => (
    <KeyboardAvoidingView 
      style={styles.keyboardAvoidingView}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? moderateScale(90) + insets.top : moderateScale(60)}>
      
      {renderSearchBar()}
      
      {chat.requiresRepresentative && !canSend && (
        <View style={[
          styles.warningBanner,
          { backgroundColor: isDarkMode ? 'rgba(251, 191, 36, 0.2)' : 'rgba(251, 191, 36, 0.15)' }
        ]}>
          <Ionicons name="information-circle" size={moderateScale(18)} color="#F59E0B" />
          <Text style={[styles.warningText, { fontSize: fontSize(12), color: '#F59E0B' }]}>
            {t('chats.representativeOnlyChat')}
          </Text>
        </View>
      )}

      <FlatList
        ref={flatListRef}
        data={memoizedMessages}
        renderItem={renderMessage}
        keyExtractor={(item, index) => item.$id || `message-${index}`}
        contentContainerStyle={[styles.messagesList, chatStyle]}
        ListEmptyComponent={renderEmpty}
        onScrollToIndexFailed={handleScrollToIndexFailed}
        removeClippedSubviews={Platform.OS === 'android'}
        maxToRenderPerBatch={12}
        windowSize={12}
        initialNumToRender={16}
        inverted={true}
      />

      {renderEmptyOverlay()}

      {/* Selection Mode Toolbar */}
      {selectionMode && (
        <View style={[
          styles.selectionToolbar,
          { backgroundColor: isDarkMode ? 'rgba(0,0,0,0.85)' : 'rgba(255,255,255,0.95)' }
        ]}>
          <TouchableOpacity
            style={styles.selectionToolbarBtn}
            onPress={toggleSelectionMode}>
            <Ionicons name="close" size={moderateScale(22)} color={theme.text} />
            <Text style={[styles.selectionToolbarText, { color: theme.text, fontSize: fontSize(13) }]}>
              {selectedMessageIds.length} {t('chats.selected')}
            </Text>
          </TouchableOpacity>
          <View style={styles.selectionToolbarActions}>
            <TouchableOpacity
              style={styles.selectionToolbarBtn}
              onPress={handleBatchCopy}
              disabled={selectedMessageIds.length === 0}>
              <Ionicons name="copy-outline" size={moderateScale(20)} color={selectedMessageIds.length > 0 ? theme.primary : theme.textSecondary} />
              <Text style={[styles.selectionToolbarText, { color: selectedMessageIds.length > 0 ? theme.primary : theme.textSecondary, fontSize: fontSize(12) }]}>
                {t('chats.copy')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.selectionToolbarBtn}
              onPress={handleBatchDeleteForMe}
              disabled={selectedMessageIds.length === 0}>
              <Ionicons name="eye-off-outline" size={moderateScale(20)} color={selectedMessageIds.length > 0 ? '#EF4444' : theme.textSecondary} />
              <Text style={[styles.selectionToolbarText, { color: selectedMessageIds.length > 0 ? '#EF4444' : theme.textSecondary, fontSize: fontSize(12) }]}>
                {t('chats.deleteForMe')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Blocked user banner */}
      {isFullyBlockedChat && (
        <View style={[
          styles.warningBanner,
          { backgroundColor: isDarkMode ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.1)' }
        ]}>
          <Ionicons name="ban-outline" size={moderateScale(18)} color="#EF4444" />
          <Text style={[styles.warningText, { fontSize: fontSize(12), color: '#EF4444' }]}>
            {iBlockedThem
              ? t('chats.blockedUserBanner')
              : t('chats.blockedByUserBanner')}
          </Text>
        </View>
      )}

      {!isFullyBlockedChat && isChatOnlyBlocked && (
        <View style={[
          styles.warningBanner,
          { backgroundColor: isDarkMode ? 'rgba(245, 158, 11, 0.15)' : 'rgba(245, 158, 11, 0.1)' }
        ]}>
          <Ionicons name="chatbubble-ellipses-outline" size={moderateScale(18)} color="#F59E0B" />
          <Text style={[styles.warningText, { fontSize: fontSize(12), color: '#F59E0B' }]}>
            {iChatBlockedThem
              ? t('chats.messagesOnlyBlockedBanner')
              : t('chats.messagesOnlyBlockedByUserBanner')}
          </Text>
        </View>
      )}

      {!selectionMode && !isBlockedChat && (
      <MessageInput 
        onSend={async (...args) => {
          triggerHaptic('light');
          return handleSendMessage(...args);
        }}
        disabled={sending || !canSend}
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
  );

  return (
    <View style={styles.container}>
      <StatusBar 
        barStyle={isDarkMode ? 'light-content' : 'dark-content'} 
        backgroundColor="transparent"
        translucent
      />
      
      {isCustomImageBackground ? (
        <ImageBackground 
          source={{ uri: chatSettings.backgroundImage }} 
          style={styles.gradient}
          resizeMode="cover">
          <View style={styles.backgroundOverlay}>
            <AnimatedBackground particleCount={15} />
            {renderChatContent()}
          </View>
        </ImageBackground>
      ) : (
        <LinearGradient
          colors={getBackgroundColors()}
          style={styles.gradient}>
          <AnimatedBackground particleCount={15} />
          {renderChatContent()}
        </LinearGradient>
      )}

      <MuteModal
        visible={showMuteModal}
        onClose={() => setShowMuteModal(false)}
        muteStatus={muteStatus}
        onMute={handleMuteChat}
        onUnmute={handleUnmuteChat}
        theme={theme}
        isDarkMode={isDarkMode}
        t={t}
      />

      <PinnedMessagesModal
        visible={showPinnedModal}
        onClose={() => setShowPinnedModal(false)}
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
        onClose={() => setShowChatOptionsModal(false)}
        chat={chat}
        chatDisplayName={getChatDisplayName()}
        muteStatus={muteStatus}
        onVisitProfile={handleVisitProfile}
        onOpenMuteModal={() => {
          setShowChatOptionsModal(false);
          setShowMuteModal(true);
        }}
        onViewPinnedMessages={() => {
          setShowChatOptionsModal(false);
          handleViewPinnedMessages();
        }}
        onOpenGroupSettings={() => {
          setShowChatOptionsModal(false);
          navigation.navigate('GroupSettings', { chat });
        }}
        onBlockUser={handleBlockUser}
        onClearChat={() => {
          triggerHaptic('warning');
          handleClearChat();
        }}
        onDeleteConversation={() => {
          triggerHaptic('warning');
          handleDeleteConversation();
        }}
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
        onClose={() => {
          setPostModalVisible(false);
          setPostModalPostId(null);
        }}
        postId={postModalPostId}
        navigation={navigation}
      />
    </View>
  );
};

export default ChatRoom;
