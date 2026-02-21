import React, { memo, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, PanResponder } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ProfilePicture from './ProfilePicture';
import RepBadge from './RepBadge';
import { useAppSettings } from '../context/AppSettingsContext';
import { 
  fontSize, 
  spacing, 
  moderateScale,
} from '../utils/responsive';
import { borderRadius } from '../theme/designTokens';
import { isUserOnline } from '../utils/onlineStatus';

const CHAT_TYPES = {
  STAGE_GROUP: 'stage_group',
  DEPARTMENT_GROUP: 'department_group',
  PRIVATE: 'private',
  CUSTOM_GROUP: 'custom_group',
};

const ARCHIVE_SWIPE_TRIGGER = 76;
const ARCHIVE_SWIPE_MAX = 110;
const ARCHIVE_DISMISS_OFFSET = -420;

const ChatListItem = ({
  chat,
  onPress,
  onLongPress,
  onArchive,
  swipeActionLabel,
  currentUserId,
  unreadCount = 0,
  clearedAt = null,
  isPartnerRep = false,
}) => {
  const { theme, isDarkMode, t, showActivityStatus } = useAppSettings();
  const translateX = useRef(new Animated.Value(0)).current;
  const archiveActionOpacity = translateX.interpolate({
    inputRange: [-ARCHIVE_SWIPE_TRIGGER, -12, 0],
    outputRange: [1, 0, 0],
    extrapolate: 'clamp',
  });
  const archiveActionScale = translateX.interpolate({
    inputRange: [-ARCHIVE_SWIPE_TRIGGER, -12, 0],
    outputRange: [1, 0.92, 0.92],
    extrapolate: 'clamp',
  });

  const resetSwipePosition = useCallback(() => {
    Animated.spring(translateX, {
      toValue: 0,
      useNativeDriver: true,
      tension: 90,
      friction: 11,
    }).start();
  }, [translateX]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        if (!onArchive) return false;
        const absDx = Math.abs(gestureState.dx);
        const absDy = Math.abs(gestureState.dy);
        return gestureState.dx < -10 && absDx > absDy;
      },
      onPanResponderMove: (_, gestureState) => {
        if (!onArchive) return;
        const nextX = Math.max(-ARCHIVE_SWIPE_MAX, Math.min(0, gestureState.dx));
        translateX.setValue(nextX);
      },
      onPanResponderRelease: (_, gestureState) => {
        if (!onArchive) {
          resetSwipePosition();
          return;
        }

        if (gestureState.dx <= -ARCHIVE_SWIPE_TRIGGER) {
          Animated.timing(translateX, {
            toValue: ARCHIVE_DISMISS_OFFSET,
            duration: 170,
            useNativeDriver: true,
          }).start(({ finished }) => {
            if (finished) {
              onArchive();
            }
            translateX.setValue(0);
          });
          return;
        }

        resetSwipePosition();
      },
      onPanResponderTerminate: resetSwipePosition,
    })
  ).current;

  const getChatIcon = () => {
    switch (chat.type) {
      case CHAT_TYPES.STAGE_GROUP:
        return 'people';
      case CHAT_TYPES.DEPARTMENT_GROUP:
        return 'business';
      case CHAT_TYPES.PRIVATE:
        return 'person';
      case CHAT_TYPES.CUSTOM_GROUP:
        return 'people-circle';
      default:
        return 'chatbubble';
    }
  };

  const getChatIconColor = () => {
    switch (chat.type) {
      case CHAT_TYPES.STAGE_GROUP:
        return '#3B82F6';
      case CHAT_TYPES.DEPARTMENT_GROUP:
        return '#8B5CF6';
      case CHAT_TYPES.PRIVATE:
        return '#10B981';
      case CHAT_TYPES.CUSTOM_GROUP:
        return '#F59E0B';
      default:
        return theme.primary;
    }
  };

  const getChatName = () => {
    if (chat.type === CHAT_TYPES.PRIVATE && chat.otherUser) {
      return chat.otherUser.name || chat.otherUser.fullName || chat.name;
    }
    return chat.name;
  };

  const getChatSubtitle = () => {
    if (chat.type === CHAT_TYPES.STAGE_GROUP) {
      return t('chats.stageGroup');
    }
    if (chat.type === CHAT_TYPES.DEPARTMENT_GROUP) {
      return t('chats.departmentGroup');
    }
    if (chat.type === CHAT_TYPES.CUSTOM_GROUP && chat.participants) {
      return `${chat.participants.length} ${t('chats.members')}`;
    }
    return null;
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return t('time.justNow');
    if (diffMins < 60) return t('time.minutesAgo').replace('{count}', diffMins);
    if (diffHours < 24) return t('time.hoursAgo').replace('{count}', diffHours);
    if (diffDays < 7) return t('time.daysAgo').replace('{count}', diffDays);
    
    return date.toLocaleDateString();
  };

  const getLastMessagePreview = () => {
    const lastMsg = chat.lastMessage;
    if (!lastMsg) {
      return chatSubtitle ? chatSubtitle : t('chats.noMessages');
    }

    // Check if chat was cleared after the last message
    if (clearedAt && chat.lastMessageAt) {
      const clearedDate = new Date(clearedAt);
      const lastMsgDate = new Date(chat.lastMessageAt);
      if (lastMsgDate <= clearedDate) {
        return chatSubtitle ? chatSubtitle : t('chats.noMessages');
      }
    }

    let preview = lastMsg;

    // Smart previews for special message types
    if (lastMsg === '\uD83D\uDCF7 Image' || lastMsg.startsWith('\uD83D\uDCF7')) {
      preview = t('chats.sentImage');
    } else if (lastMsg === '\uD83D\uDCCD Location' || lastMsg.startsWith('\uD83D\uDCCD')) {
      preview = t('chats.sharedLocation');
    } else if (lastMsg === '\uD83D\uDCDD Shared Post' || lastMsg.startsWith('\uD83D\uDCDD')) {
      preview = t('chats.sharedAPost');
    } else if (lastMsg.startsWith('{') && lastMsg.includes('postId')) {
      preview = t('chats.sharedAPost');
    }

    // Prepend "You: " if the current user sent the last message
    if (chat.lastMessageSenderId && chat.lastMessageSenderId === currentUserId) {
      return `${t('chats.you')}: ${preview}`;
    }

    return preview;
  };

  const isPrivateChat = chat.type === CHAT_TYPES.PRIVATE;
  const chatName = getChatName();
  const chatSubtitle = getChatSubtitle();
  const iconColor = getChatIconColor();

  // Online status for private chats (only when activity status setting is enabled)
  const otherUserOnline = showActivityStatus && isPrivateChat && chat.otherUser?.lastSeen
    ? isUserOnline(chat.otherUser.lastSeen)
    : false;

  const cardBackground = isDarkMode 
    ? 'rgba(255, 255, 255, 0.05)' 
    : 'rgba(255, 255, 255, 0.9)';

  // Determine if we should show a profile picture
  const shouldShowProfilePicture = 
    (isPrivateChat && chat.otherUser) || 
    (chat.type === CHAT_TYPES.CUSTOM_GROUP && chat.groupPhoto);
  
  const profilePictureUri = isPrivateChat 
    ? chat.otherUser?.profilePicture 
    : chat.groupPhoto;

  return (
    <View style={styles.swipeContainer}>
      {!!onArchive && (
        <Animated.View
          style={[
            styles.archiveAction,
            {
              backgroundColor: isDarkMode ? 'rgba(245,158,11,0.2)' : 'rgba(245,158,11,0.14)',
              borderColor: isDarkMode ? 'rgba(245,158,11,0.4)' : 'rgba(245,158,11,0.28)',
              opacity: archiveActionOpacity,
              transform: [{ scale: archiveActionScale }],
            },
          ]}
        >
          <Ionicons name="archive-outline" size={moderateScale(14)} color="#F59E0B" />
          <Text style={[styles.archiveText, { color: '#F59E0B', fontSize: fontSize(10) }]}>
            {swipeActionLabel || t('chats.archive')}
          </Text>
        </Animated.View>
      )}

      <Animated.View
        style={[
          styles.container,
          {
            backgroundColor: cardBackground,
            borderColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
            transform: [{ translateX }],
          },
        ]}
        {...(onArchive ? panResponder.panHandlers : {})}
      >
        <TouchableOpacity
          onPress={onPress}
          onLongPress={onLongPress}
          delayLongPress={180}
          activeOpacity={0.7}
          style={styles.touchContent}
        >
      
      {isPrivateChat && chat.otherUser ? (
        <View style={styles.avatarWrapper}>
          <ProfilePicture 
            uri={chat.otherUser.profilePicture}
            name={chatName}
            size={moderateScale(42)}
          />
          {otherUserOnline && (
            <View style={[
              styles.onlineDot,
              { borderColor: isDarkMode ? '#1C1C1E' : '#FFFFFF' },
            ]} />
          )}
        </View>
      ) : chat.type === CHAT_TYPES.CUSTOM_GROUP ? (
        <ProfilePicture 
          uri={chat.groupPhoto}
          name={chatName}
          size={moderateScale(42)}
        />
      ) : (
        <View style={[
          styles.iconContainer, 
          { backgroundColor: `${iconColor}15` }
        ]}>
          <Ionicons 
            name={getChatIcon()} 
            size={moderateScale(18)} 
            color={iconColor} 
          />
        </View>
      )}

      <View style={styles.contentContainer}>
        <View style={styles.headerRow}>
          <Text 
            style={[styles.chatName, { fontSize: fontSize(15), color: theme.text }]}
            numberOfLines={1}>
            {chatName}
          </Text>
          {isPartnerRep && isPrivateChat && (
            <RepBadge size="small" colors={theme} label={t('repVoting.repLabel')} />
          )}
          <View style={styles.headerRight}>
            {chat.lastMessageAt && (
              <Text style={[styles.time, { fontSize: fontSize(11), color: theme.textSecondary }]}>
                {formatTime(chat.lastMessageAt)}
              </Text>
            )}
            {unreadCount > 0 && (
              <View style={[styles.unreadBadge, { backgroundColor: theme.primary || '#667eea' }]}>
                <Text style={styles.unreadBadgeText}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Text>
              </View>
            )}
          </View>
        </View>

        <Text 
          style={[styles.lastMessage, { fontSize: fontSize(13), color: theme.textSecondary }]}
          numberOfLines={1}>
          {getLastMessagePreview()}
        </Text>

        {chat.requiresRepresentative && (
          <View style={styles.infoRow}>
            <Ionicons 
              name="shield-checkmark" 
              size={moderateScale(12)} 
              color={theme.textSecondary} 
            />
            <Text style={[styles.infoText, { fontSize: fontSize(10), color: theme.textSecondary }]}>
              {t('chats.representativeOnly')}
            </Text>
          </View>
        )}
      </View>

          <Ionicons 
            name="chevron-forward" 
            size={moderateScale(18)} 
            color={theme.textSecondary}
            style={styles.chevron}
          />
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  swipeContainer: {
    marginBottom: spacing.xs,
    position: 'relative',
  },
  archiveAction: {
    position: 'absolute',
    right: spacing.xs,
    top: '50%',
    marginTop: -moderateScale(16),
    height: moderateScale(32),
    width: moderateScale(78),
    borderRadius: moderateScale(16),
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 3,
    paddingHorizontal: spacing.xs,
    zIndex: 0,
  },
  archiveText: {
    fontWeight: '600',
  },
  container: {
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  touchContent: {
    flexDirection: 'row',
    padding: spacing.sm,
    alignItems: 'center',
    zIndex: 1,
  },
  avatarWrapper: {
    position: 'relative',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 1,
    right: 1,
    width: moderateScale(12),
    height: moderateScale(12),
    borderRadius: moderateScale(6),
    backgroundColor: '#34C759',
    borderWidth: 2,
    zIndex: 1,
  },
  iconContainer: {
    width: moderateScale(42),
    height: moderateScale(42),
    borderRadius: moderateScale(21),
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainer: {
    flex: 1,
    marginLeft: spacing.sm,
    justifyContent: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  chatName: {
    fontWeight: '600',
    flex: 1,
    marginRight: spacing.sm,
  },
  time: {
    fontWeight: '400',
  },
  unreadBadge: {
    minWidth: moderateScale(18),
    height: moderateScale(18),
    borderRadius: moderateScale(9),
    paddingHorizontal: moderateScale(5),
    justifyContent: 'center',
    alignItems: 'center',
  },
  unreadBadgeText: {
    color: '#FFFFFF',
    fontSize: fontSize(10),
    fontWeight: '700',
  },
  lastMessage: {
    marginTop: 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
    gap: spacing.xs,
  },
  infoText: {
    fontStyle: 'italic',
  },
  chevron: {
    marginLeft: spacing.sm,
  },
});

export default memo(ChatListItem);
