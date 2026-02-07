import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ProfilePicture from './ProfilePicture';
import { useAppSettings } from '../context/AppSettingsContext';
import { 
  fontSize, 
  spacing, 
  moderateScale,
} from '../utils/responsive';
import { borderRadius } from '../theme/designTokens';

const CHAT_TYPES = {
  STAGE_GROUP: 'stage_group',
  DEPARTMENT_GROUP: 'department_group',
  PRIVATE: 'private',
  CUSTOM_GROUP: 'custom_group',
};

const ChatListItem = ({ chat, onPress, currentUserId, unreadCount = 0 }) => {
  const { theme, isDarkMode, t } = useAppSettings();

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
    // Smart previews for special message types
    if (lastMsg === '\uD83D\uDCF7 Image' || lastMsg.startsWith('\uD83D\uDCF7')) {
      return t('chats.sentImage');
    }
    if (lastMsg === '\uD83D\uDCCD Location' || lastMsg.startsWith('\uD83D\uDCCD')) {
      return t('chats.sharedLocation');
    }
    if (lastMsg === '\uD83D\uDCDD Shared Post' || lastMsg.startsWith('\uD83D\uDCDD')) {
      return t('chats.sharedAPost');
    }
    // If it looks like raw JSON for a shared post, show friendly text
    if (lastMsg.startsWith('{') && lastMsg.includes('postId')) {
      return t('chats.sharedAPost');
    }
    return lastMsg;
  };

  const isPrivateChat = chat.type === CHAT_TYPES.PRIVATE;
  const chatName = getChatName();
  const chatSubtitle = getChatSubtitle();
  const iconColor = getChatIconColor();

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
    <TouchableOpacity 
      onPress={onPress} 
      activeOpacity={0.7}
      style={[
        styles.container,
        { 
          backgroundColor: cardBackground,
          borderColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
        }
      ]}>
      
      {isPrivateChat && chat.otherUser ? (
        <ProfilePicture 
          uri={chat.otherUser.profilePicture}
          name={chatName}
          size={moderateScale(42)}
        />
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
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: spacing.sm,
    marginBottom: spacing.xs,
    alignItems: 'center',
    borderRadius: borderRadius.md,
    borderWidth: 1,
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
