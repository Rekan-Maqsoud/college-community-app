import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  StatusBar,
  Platform,
  ActivityIndicator,
  TouchableOpacity,
  KeyboardAvoidingView,
  ImageBackground,
  TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAppSettings } from '../context/AppSettingsContext';
import { useUser } from '../context/UserContext';
import AnimatedBackground from '../components/AnimatedBackground';
import MessageBubble from '../components/MessageBubble';
import MessageInput from '../components/MessageInput';
import CustomAlert from '../components/CustomAlert';
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

const ChatRoom = ({ route, navigation }) => {
  const { chat } = route.params;
  const { t, theme, isDarkMode, chatSettings } = useAppSettings();
  const { user } = useUser();
  const { alertConfig, showAlert, hideAlert } = useCustomAlert();

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
    setShowMuteModal,
    setShowPinnedModal,
    setShowChatOptionsModal,
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
  } = useChatRoom({ chat, user, t, navigation, showAlert });

  // Search in chat state
  const [searchActive, setSearchActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [currentSearchIndex, setCurrentSearchIndex] = useState(0);
  const searchInputRef = useRef(null);

  // Compute search results when query changes
  useEffect(() => {
    if (searchQuery.trim().length > 0) {
      const query = searchQuery.toLowerCase();
      const results = messages
        .map((msg, index) => ({ ...msg, originalIndex: index }))
        .filter(msg => msg.content && msg.content.toLowerCase().includes(query));
      setSearchResults(results);
      setCurrentSearchIndex(results.length > 0 ? results.length - 1 : 0); // Start from newest (bottom)
    } else {
      setSearchResults([]);
      setCurrentSearchIndex(0);
    }
  }, [searchQuery, messages]);

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
      headerTitle: () => (
        <TouchableOpacity onPress={handleChatHeaderPress} activeOpacity={0.7}>
          <Text style={{ 
            color: theme.text, 
            fontSize: fontSize(17), 
            fontWeight: '600',
            textAlign: 'center',
          }}>
            {getChatDisplayName()}
          </Text>
          <Text style={{ 
            color: theme.textSecondary, 
            fontSize: fontSize(11), 
            textAlign: 'center',
          }}>
            {t('chats.tapForOptions')}
          </Text>
        </TouchableOpacity>
      ),
      headerStyle: {
        backgroundColor: getHeaderBgColor(),
      },
      headerTintColor: theme.text,
      headerRight: () => (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <TouchableOpacity
            style={{ marginRight: spacing.sm }}
            onPress={openSearch}>
            <Ionicons name="search-outline" size={moderateScale(22)} color={theme.text} />
          </TouchableOpacity>
          {chat.type === 'custom_group' && (
            <TouchableOpacity
              style={{ marginRight: spacing.md }}
              onPress={() => navigation.navigate('GroupSettings', { chat })}>
              <Ionicons name="settings-outline" size={moderateScale(22)} color={theme.text} />
            </TouchableOpacity>
          )}
        </View>
      ),
    });
  }, [chat, isDarkMode, theme, muteStatus, chatSettings, openSearch, getChatDisplayName, handleChatHeaderPress, navigation, t]);

  const memoizedMessages = useMemo(() => messages, [messages]);

  // For private chats, find the last message sent by current user that was read by the other user
  const lastSeenMessageId = useMemo(() => {
    if (chat.type !== 'private') return null;
    
    const otherUserId = chat.otherUser?.$id;
    if (!otherUserId) return null;

    // Messages are in chronological order (oldest first, newest last)
    // Find the most recent (newest) message sent by current user that was read by other user
    // Loop backwards to find the newest read message
    for (let i = messages.length - 1; i >= 0; i--) {
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
    
    const showSenderName = !isCurrentUser && (
      index === 0 || 
      messages[index - 1].senderId !== item.senderId
    );
    
    const showAvatar = !isCurrentUser && (
      index === messages.length - 1 ||
      messages[index + 1]?.senderId !== item.senderId
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

    return (
      <MessageBubble
        message={item}
        isCurrentUser={isCurrentUser}
        senderName={showSenderName ? senderName : null}
        senderPhoto={senderPhoto}
        showAvatar={showAvatar}
        isRepresentative={isRepresentative}
        onCopy={() => handleCopyMessage(item)}
        onDelete={isCurrentUser ? () => handleDeleteMessage(item) : null}
        onReply={() => handleReplyMessage(item)}
        onForward={() => handleForwardMessage(item)}
        onPin={canPin ? () => handlePinMessage(item) : null}
        onUnpin={canPin && item.isPinned ? () => handleUnpinMessage(item) : null}
        onBookmark={() => handleBookmarkMessage(item)}
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
        onPostPress={(postId) => navigation.push('PostDetails', { postId })}
        showAlert={showAlert}
        selectionMode={selectionMode}
        isSelected={selectedMessageIds.includes(item.$id)}
        onToggleSelect={toggleMessageSelection}
      />
    );
  };

  const renderEmpty = () => {
    const cardBackground = isDarkMode 
      ? 'rgba(255, 255, 255, 0.05)' 
      : 'rgba(255, 255, 255, 0.6)';
    
    return (
      <View style={styles.emptyContainer}>
        <View 
          style={[
            styles.emptyCard,
            { 
              backgroundColor: cardBackground,
              borderRadius: borderRadius.xl,
              borderWidth: isDarkMode ? 0 : 1,
              borderColor: 'rgba(0, 0, 0, 0.04)',
            }
          ]}>
          <Ionicons 
            name="chatbubbles-outline" 
            size={moderateScale(60)} 
            color={theme.textSecondary} 
          />
          <Text style={[
            styles.emptyText, 
            { fontSize: fontSize(16), color: theme.textSecondary, marginTop: spacing.md }
          ]}>
            {t('chats.noMessages')}
          </Text>
          <Text style={[
            styles.emptySubtext, 
            { fontSize: fontSize(13), color: theme.textSecondary, marginTop: spacing.xs }
          ]}>
            {t('chats.beFirstToMessage')}
          </Text>
        </View>
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
          <ActivityIndicator size="large" color={theme.primary} />
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
            style={[styles.searchNavBtn, searchResults.length === 0 && styles.searchNavBtnDisabled]}>
            <Ionicons name="chevron-up" size={moderateScale(20)} color={searchResults.length > 0 ? theme.text : theme.textSecondary} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            onPress={handleSearchNext} 
            disabled={searchResults.length === 0}
            style={[styles.searchNavBtn, searchResults.length === 0 && styles.searchNavBtnDisabled]}>
            <Ionicons name="chevron-down" size={moderateScale(20)} color={searchResults.length > 0 ? theme.text : theme.textSecondary} />
          </TouchableOpacity>
          
          <TouchableOpacity onPress={closeSearch} style={styles.searchCloseBtn}>
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
      keyboardVerticalOffset={Platform.OS === 'ios' ? 95 : 85}>
      
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
        contentContainerStyle={styles.messagesList}
        ListEmptyComponent={renderEmpty}
        onContentSizeChange={() => {
          if (!searchActive) {
            // Use a small delay to ensure content is fully laid out before scrolling
            setTimeout(() => {
              flatListRef.current?.scrollToEnd({ animated: true });
            }, 100);
          }
        }}
        onLayout={() => {
          if (!searchActive) {
            flatListRef.current?.scrollToEnd({ animated: false });
          }
        }}
        onScrollToIndexFailed={handleScrollToIndexFailed}
        removeClippedSubviews={Platform.OS === 'android'}
        maxToRenderPerBatch={15}
        windowSize={10}
        initialNumToRender={20}
        inverted={false}
        maintainVisibleContentPosition={searchActive ? { minIndexForVisible: 0 } : undefined}
      />

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

      {!selectionMode && (
      <MessageInput 
        onSend={handleSendMessage}
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
        onClearChat={handleClearChat}
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
    </View>
  );
};

export default ChatRoom;
