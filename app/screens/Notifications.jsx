import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  AppState,
  View,
  Text,
  StyleSheet, 
  TouchableOpacity,
  RefreshControl,
  Platform,
} from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ReanimatedAnimated, { FadeInRight } from 'react-native-reanimated';
import { useAppSettings } from '../context/AppSettingsContext';
import { useUser } from '../context/UserContext';
import ProfilePicture from '../components/ProfilePicture';
import CustomAlert from '../components/CustomAlert';
import UnifiedEmptyState from '../components/UnifiedEmptyState';
import { NotificationSkeleton } from '../components/SkeletonLoader';
import { useCustomAlert } from '../hooks/useCustomAlert';
import { fontSize, spacing, moderateScale } from '../utils/responsive';
import { borderRadius } from '../theme/designTokens';
import useLayout from '../hooks/useLayout';
import safeStorage from '../utils/safeStorage';
import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  deleteAllNotifications,
  markNotificationsAsReadByContext,
} from '../../database/notifications';
import { FlashList } from '@shopify/flash-list';
import { useNotifications } from '../hooks/useRealtimeSubscription';
import PostViewModal from '../components/PostViewModal';
import { dismissPresentedNotificationsByTarget } from '../../services/pushNotificationService';
import * as ExpoNotifications from 'expo-notifications';
import { REFRESH_TOPICS, subscribeToRefreshTopic } from '../utils/dataRefreshBus';
import { getGroupedNotificationAvatarState } from '../utils/notificationUiHelpers';

const NOTIFICATION_TYPES = {
  POST_LIKE: 'post_like',
  POST_REPLY: 'post_reply',
  REPLY_LIKE: 'reply_like',
  REPLY_REPLY: 'reply_reply',
  MENTION: 'mention',
  FRIEND_POST: 'friend_post',
  FOLLOW: 'follow',
  DEPARTMENT_POST: 'department_post',
  POST_HIDDEN_REPORT: 'post_hidden_report',
  POST_LIKE_BATCH: 'post_like_batch',
  POST_REPLY_BATCH: 'post_reply_batch',
  REPLY_LIKE_BATCH: 'reply_like_batch',
  REPLY_REPLY_BATCH: 'reply_reply_batch',
  LECTURE_UPLOAD: 'lecture_upload',
  LECTURE_MENTION: 'lecture_mention',
  LECTURE_JOIN_REQUEST: 'lecture_join_request',
};

const GROUPABLE_NOTIFICATION_TYPES = new Set([
  NOTIFICATION_TYPES.POST_LIKE,
  NOTIFICATION_TYPES.POST_REPLY,
  NOTIFICATION_TYPES.REPLY_LIKE,
  NOTIFICATION_TYPES.REPLY_REPLY,
  NOTIFICATION_TYPES.POST_LIKE_BATCH,
  NOTIFICATION_TYPES.POST_REPLY_BATCH,
  NOTIFICATION_TYPES.REPLY_LIKE_BATCH,
  NOTIFICATION_TYPES.REPLY_REPLY_BATCH,
]);

const NORMALIZED_GROUP_TYPE = {
  [NOTIFICATION_TYPES.POST_LIKE]: NOTIFICATION_TYPES.POST_LIKE,
  [NOTIFICATION_TYPES.POST_LIKE_BATCH]: NOTIFICATION_TYPES.POST_LIKE,
  [NOTIFICATION_TYPES.POST_REPLY]: NOTIFICATION_TYPES.POST_REPLY,
  [NOTIFICATION_TYPES.POST_REPLY_BATCH]: NOTIFICATION_TYPES.POST_REPLY,
  [NOTIFICATION_TYPES.REPLY_LIKE]: NOTIFICATION_TYPES.REPLY_LIKE,
  [NOTIFICATION_TYPES.REPLY_LIKE_BATCH]: NOTIFICATION_TYPES.REPLY_LIKE,
  [NOTIFICATION_TYPES.REPLY_REPLY]: NOTIFICATION_TYPES.REPLY_REPLY,
  [NOTIFICATION_TYPES.REPLY_REPLY_BATCH]: NOTIFICATION_TYPES.REPLY_REPLY,
};

const getNormalizedGroupType = (type) => NORMALIZED_GROUP_TYPE[type] || type;

const getNotificationCountWeight = (notification) => {
  if (!notification) return 0;
  if (!String(notification.type || '').includes('_batch')) return 1;

  const preview = String(notification.postPreview || '');
  const match = preview.match(/^\[batch:(\d+)\]/);
  const parsed = match ? parseInt(match[1], 10) : 0;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
};

const cleanNotificationPreview = (raw = '') => {
  return String(raw || '')
    .replace(/^\[rid:[^\]]+\]/, '')
    .replace(/^\[batch:\d+\]/, '')
    .trim();
};

const groupNotifications = (notifications) => {
  const groups = {};
  const standalone = [];
  const GROUPING_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours
  
  // Filter out invalid notifications first
  const validNotifications = notifications.filter(n => n && n.$id && n.type);
  
  validNotifications.forEach(notification => {
    const normalizedType = getNormalizedGroupType(notification.type);

    if (notification.postId && GROUPABLE_NOTIFICATION_TYPES.has(notification.type)) {
      const key = `${notification.postId}_${normalizedType}`;
      
      // Check if existing group is within 24 hour window
      if (groups[key]) {
        const timeDiff = Math.abs(
          new Date(notification.$createdAt) - new Date(groups[key].latestTimestamp)
        );
        // If outside window, treat as standalone
        if (timeDiff > GROUPING_WINDOW_MS) {
          standalone.push({ isGroup: false, notification });
          return;
        }
      }
      
      if (!groups[key]) {
        groups[key] = {
          type: normalizedType,
          postId: notification.postId,
          postPreview: cleanNotificationPreview(notification.postPreview),
          notifications: [],
          latestTimestamp: notification.$createdAt,
          hasUnread: false,
          totalCount: 0,
        };
      }
      groups[key].notifications.push(notification);
      groups[key].totalCount += getNotificationCountWeight(notification);
      if (!notification.isRead) {
        groups[key].hasUnread = true;
      }
      const cleanedPreview = cleanNotificationPreview(notification.postPreview);
      if (cleanedPreview) {
        groups[key].postPreview = cleanedPreview;
      }
      // Keep the latest timestamp
      if (new Date(notification.$createdAt) > new Date(groups[key].latestTimestamp)) {
        groups[key].latestTimestamp = notification.$createdAt;
      }
    } else {
      // Keep as standalone (replies, follows, mentions, friend posts)
      standalone.push({ isGroup: false, notification });
    }
  });
  
  const groupedItems = [];
  Object.values(groups).forEach(group => {
    if (group.totalCount > 1 || group.notifications.length > 1) {
      groupedItems.push({
        isGroup: true,
        ...group,
        id: `group_${group.postId}_${group.type}`,
      });
    } else if (group.notifications.length === 1) {
      standalone.push({ isGroup: false, notification: group.notifications[0] });
    }
  });
  
  // Merge and sort by timestamp
  const allItems = [...groupedItems, ...standalone].sort((a, b) => {
    const timeA = a.isGroup ? new Date(a.latestTimestamp) : new Date(a.notification.$createdAt);
    const timeB = b.isGroup ? new Date(b.latestTimestamp) : new Date(b.notification.$createdAt);
    return timeB - timeA;
  });
  
  return allItems;
};

const getNotificationIcon = (type) => {
  switch (type) {
    case NOTIFICATION_TYPES.POST_LIKE:
      return { name: 'heart', color: '#FF3B30' };
    case NOTIFICATION_TYPES.POST_REPLY:
      return { name: 'chatbubble-ellipses', color: '#007AFF' };
    case NOTIFICATION_TYPES.REPLY_LIKE:
      return { name: 'heart-circle', color: '#FF3B30' };
    case NOTIFICATION_TYPES.REPLY_REPLY:
      return { name: 'return-up-back', color: '#0EA5E9' };
    case NOTIFICATION_TYPES.MENTION:
      return { name: 'at', color: '#5856D6' };
    case NOTIFICATION_TYPES.FRIEND_POST:
      return { name: 'document-text', color: '#34C759' };
    case NOTIFICATION_TYPES.FOLLOW:
      return { name: 'person-add', color: '#FF9500' };
    case NOTIFICATION_TYPES.DEPARTMENT_POST:
      return { name: 'school', color: '#8B5CF6' };
    case NOTIFICATION_TYPES.POST_HIDDEN_REPORT:
      return { name: 'warning', color: '#EF4444' };
    case NOTIFICATION_TYPES.POST_LIKE_BATCH:
      return { name: 'heart', color: '#FF3B30' };
    case NOTIFICATION_TYPES.POST_REPLY_BATCH:
      return { name: 'chatbubble-ellipses', color: '#007AFF' };
    case NOTIFICATION_TYPES.REPLY_LIKE_BATCH:
      return { name: 'heart-circle', color: '#FF3B30' };
    case NOTIFICATION_TYPES.REPLY_REPLY_BATCH:
      return { name: 'return-up-back', color: '#0EA5E9' };
    case NOTIFICATION_TYPES.LECTURE_UPLOAD:
      return { name: 'book', color: '#0EA5E9' };
    case NOTIFICATION_TYPES.LECTURE_MENTION:
      return { name: 'at', color: '#8B5CF6' };
    case NOTIFICATION_TYPES.LECTURE_JOIN_REQUEST:
      return { name: 'person-add', color: '#EF4444' };
    default:
      return { name: 'notifications', color: '#8E8E93' };
  }
};

// Format time with better granularity
const formatNotificationTime = (dateString, t) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  const diffWeeks = Math.floor(diffDays / 7);

  if (diffMins < 1) return t('time.justNow') || 'now';
  if (diffMins < 60) return `${diffMins}${t('time.minutesShort') || 'm'}`;
  if (diffHours < 24) return `${diffHours}${t('time.hoursShort') || 'h'}`;
  if (diffDays < 7) return `${diffDays}${t('time.daysShort') || 'd'}`;
  if (diffWeeks < 4) return `${diffWeeks}${t('time.weeksShort') || 'w'}`;
  return date.toLocaleDateString();
};

const NotificationItem = ({ notification, onPress, onLongPress, onDelete, onTurnOff, theme, isDarkMode, isRTL, t, index }) => {
  const [menuVisible, setMenuVisible] = useState(false);

  if (!notification || !notification.$id || !notification.type) {
    return null;
  }
  
  const icon = getNotificationIcon(notification.type);
  const isUnread = !notification.isRead;
  
  const senderName = notification.senderName || t('common.user') || 'User';
  const createdAt = notification.$createdAt;
  const rawPreview = notification.postPreview || '';
  // Strip encoded replyId prefix "[rid:xxx]" if present
  const postPreview = rawPreview
    .replace(/^\[rid:[^\]]+\]/, '')
    .replace(/^\[batch:\d+\]/, '');
  
  const getNotificationMessage = () => {
    switch (notification.type) {
      case NOTIFICATION_TYPES.POST_LIKE:
        return t('notifications.likedPost') || 'liked your post';
      case NOTIFICATION_TYPES.POST_REPLY:
        return t('notifications.repliedPost') || 'replied to your post';
      case NOTIFICATION_TYPES.REPLY_LIKE:
        return t('notifications.likedReply') || 'liked your reply';
      case NOTIFICATION_TYPES.REPLY_REPLY:
        return t('notifications.repliedReply') || 'replied to your reply';
      case NOTIFICATION_TYPES.MENTION:
        return t('notifications.mentionedYou') || 'mentioned you';
      case NOTIFICATION_TYPES.FRIEND_POST:
        return t('notifications.newPost') || 'shared a new post';
      case NOTIFICATION_TYPES.FOLLOW:
        return t('notifications.startedFollowing') || 'started following you';
      case NOTIFICATION_TYPES.DEPARTMENT_POST:
        return t('notifications.departmentPost') || 'posted in your department';
      case NOTIFICATION_TYPES.POST_HIDDEN_REPORT:
        return t('notifications.postHiddenByReports') || 'your post was hidden for review';
      case NOTIFICATION_TYPES.POST_LIKE_BATCH:
        return t('notifications.likesSummary') || 'new likes on your post';
      case NOTIFICATION_TYPES.POST_REPLY_BATCH:
        return t('notifications.repliesSummary') || 'new replies on your post';
      case NOTIFICATION_TYPES.REPLY_LIKE_BATCH:
        return t('notifications.replyLikesSummary') || 'new likes on your reply';
      case NOTIFICATION_TYPES.REPLY_REPLY_BATCH:
        return t('notifications.replyThreadsSummary') || 'new replies to your reply';
      case NOTIFICATION_TYPES.LECTURE_UPLOAD:
        return t('notifications.lectureUpload') || 'new lecture upload';
      case NOTIFICATION_TYPES.LECTURE_MENTION:
        return t('notifications.lectureMention') || 'mentioned you in lecture discussion';
      case NOTIFICATION_TYPES.LECTURE_JOIN_REQUEST:
        return t('notifications.lectureJoinRequest') || 'requested to join your lecture channel';
      default:
        return '';
    }
  };
  
  const message = getNotificationMessage();
  const cardBackground = isUnread
    ? (isDarkMode ? 'rgba(10, 132, 255, 0.12)' : 'rgba(0, 122, 255, 0.08)')
    : (isDarkMode ? 'rgba(255, 255, 255, 0.045)' : 'rgba(255, 255, 255, 0.9)');
  const cardBorder = isUnread
    ? `${icon.color}55`
    : (isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.06)');
  const iconBadgeBorder = isDarkMode ? 'rgba(16,18,27,0.88)' : 'rgba(255,255,255,0.95)';
  const timestamp = createdAt ? formatNotificationTime(createdAt, t) : '';
  
  if (!senderName && !message) {
    return null;
  }

  return (
    <ReanimatedAnimated.View entering={FadeInRight.delay(index * 50).duration(350).springify()}>
      <TouchableOpacity
        style={[
          styles.notificationCard,
          { 
            backgroundColor: cardBackground,
            borderColor: cardBorder,
          },
        ]}
        onPress={() => onPress(notification)}
        onLongPress={() => onLongPress && onLongPress(notification)}
        delayLongPress={500}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`${senderName} ${message}`}
      >
        <View style={[styles.notificationContent, isRTL && styles.notificationContentRtl]}>
          <View style={[styles.notificationAccent, isRTL && styles.notificationAccentRtl, { backgroundColor: icon.color }]} />

          <View style={[styles.avatarContainer, isRTL && styles.avatarContainerRtl]}>
            <ProfilePicture
              uri={notification.senderProfilePicture}
              name={notification.senderName}
              size={moderateScale(44)}
            />
            <View
              style={[
                styles.iconBadge,
                isRTL && styles.iconBadgeRtl,
                { backgroundColor: icon.color, borderColor: iconBadgeBorder },
              ]}
            >
              <Ionicons name={icon.name} size={moderateScale(11)} color="#fff" />
            </View>
          </View>

          <View style={styles.textContainer}>
            <Text
              style={[
                styles.notificationText,
                isRTL && styles.notificationTextRtl,
                { color: theme.text },
                isUnread && { fontWeight: '500' },
              ]}
              numberOfLines={2}
            >
              <Text style={[styles.senderName, { color: theme.text }]}>{senderName}</Text>
              {' '}
              <Text style={{ color: theme.textSecondary }}>{message}</Text>
            </Text>
            {postPreview ? (
              <Text
                style={[styles.previewText, isRTL && styles.previewTextRtl, { color: theme.textSecondary }]}
                numberOfLines={1}
              >
                &ldquo;{postPreview}&rdquo;
              </Text>
            ) : null}
            <View style={[styles.timeRow, isRTL && styles.timeRowRtl]}>
              <Ionicons name="sparkles-outline" size={moderateScale(10)} color={icon.color} />
              <Text style={[styles.timeText, { color: theme.textSecondary }]}>
                {timestamp}
              </Text>
            </View>
          </View>

          <View style={[styles.rightSection, isRTL && styles.rightSectionRtl]}>
            {isUnread && (
              <View style={[styles.unreadDot, { backgroundColor: icon.color }]} />
            )}
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => setMenuVisible(!menuVisible)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityRole="button"
              accessibilityLabel={t('common.more')}
            >
              <Ionicons name="ellipsis-vertical" size={moderateScale(16)} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Three-dot menu dropdown */}
        {menuVisible && (
          <View style={[
            styles.notifMenuContainer,
            { backgroundColor: isDarkMode ? '#2a2a40' : '#FFFFFF', borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }
          ]}>
            <TouchableOpacity
              style={[styles.notifMenuItem, isRTL && styles.notifMenuItemRtl]}
              onPress={() => {
                setMenuVisible(false);
                onDelete && onDelete(notification);
              }}
            >
              <Ionicons name="trash-outline" size={moderateScale(15)} color="#EF4444" />
              <Text style={[styles.notifMenuText, isRTL && styles.notifMenuTextRtl, { color: '#EF4444' }]}>
                {t('notifications.removeNotification') || 'Remove this notification'}
              </Text>
            </TouchableOpacity>
            <View style={[styles.notifMenuDivider, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }]} />
            <TouchableOpacity
              style={[styles.notifMenuItem, isRTL && styles.notifMenuItemRtl]}
              onPress={() => {
                setMenuVisible(false);
                onTurnOff && onTurnOff(notification);
              }}
            >
              <Ionicons name="notifications-off-outline" size={moderateScale(15)} color={theme.textSecondary} />
              <Text style={[styles.notifMenuText, isRTL && styles.notifMenuTextRtl, { color: theme.text }]}>
                {t('notifications.turnOffLikeThis') || 'Turn off notifications like this'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    </ReanimatedAnimated.View>
  );
};

// Grouped notification item for multiple likes/replies on same post
const GroupedNotificationItem = ({ group, onPress, theme, isDarkMode, isRTL, t, index }) => {
  const icon = getNotificationIcon(group.type);
  const count = group.totalCount || group.notifications.length;
  const cardBackground = group.hasUnread
    ? (isDarkMode ? 'rgba(10, 132, 255, 0.12)' : 'rgba(0, 122, 255, 0.08)')
    : (isDarkMode ? 'rgba(255, 255, 255, 0.045)' : 'rgba(255, 255, 255, 0.9)');
  const cardBorder = group.hasUnread
    ? `${icon.color}55`
    : (isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.06)');
  const iconBadgeBorder = isDarkMode ? 'rgba(16,18,27,0.88)' : 'rgba(255,255,255,0.95)';
  const { uniqueUsers, visibleUsers, overflowCount } = getGroupedNotificationAvatarState(group.notifications);
  
  const getGroupMessage = () => {
    const uniqueCount = uniqueUsers.length;
    const firstName = group.notifications[0]?.senderName?.split(' ')[0] || '';

    const summaryAction = (() => {
      if (group.type === NOTIFICATION_TYPES.POST_LIKE) {
        return t('notifications.likesSummary') || 'new likes on your post';
      }
      if (group.type === NOTIFICATION_TYPES.POST_REPLY) {
        return t('notifications.repliesSummary') || 'new replies on your post';
      }
      if (group.type === NOTIFICATION_TYPES.REPLY_LIKE) {
        return t('notifications.replyLikesSummary') || 'new likes on your reply';
      }
      if (group.type === NOTIFICATION_TYPES.REPLY_REPLY) {
        return t('notifications.replyThreadsSummary') || 'new replies to your reply';
      }
      return '';
    })();

    if (count > 2 || uniqueCount === 0) {
      return { name: String(count), action: summaryAction };
    }
    
    if (group.type === NOTIFICATION_TYPES.POST_LIKE) {
      if (uniqueCount === 1) {
        return { name: firstName, action: t('notifications.likedPost') || 'liked your post' };
      } else if (uniqueCount === 2) {
        const secondName = uniqueUsers[1]?.senderName?.split(' ')[0] || '';
        return { name: `${firstName}, ${secondName}`, action: t('notifications.likedPost') || 'liked your post' };
      } else {
        return { name: `${firstName} +${uniqueCount - 1}`, action: t('notifications.likedPost') || 'liked your post' };
      }
    } else if (group.type === NOTIFICATION_TYPES.POST_REPLY) {
      if (uniqueCount === 1) {
        return { name: firstName, action: t('notifications.repliedPost') || 'replied to your post' };
      } else if (uniqueCount === 2) {
        const secondName = uniqueUsers[1]?.senderName?.split(' ')[0] || '';
        return { name: `${firstName}, ${secondName}`, action: t('notifications.repliedPost') || 'replied to your post' };
      } else {
        return { name: `${firstName} +${uniqueCount - 1}`, action: t('notifications.repliedPost') || 'replied to your post' };
      }
    } else if (group.type === NOTIFICATION_TYPES.REPLY_LIKE) {
      return { name: String(count), action: t('notifications.replyLikesSummary') || 'new likes on your reply' };
    } else if (group.type === NOTIFICATION_TYPES.REPLY_REPLY) {
      return { name: String(count), action: t('notifications.replyThreadsSummary') || 'new replies to your reply' };
    }
    return { name: '', action: '' };
  };

  const message = getGroupMessage();

  return (
    <ReanimatedAnimated.View entering={FadeInRight.delay(index * 50).duration(350).springify()}>
      <View
        style={[
          styles.notificationCard,
          { 
            backgroundColor: cardBackground,
            borderColor: cardBorder,
          },
        ]}
      >
      <TouchableOpacity
        style={styles.notificationItem}
        onPress={() => onPress(group)}
        activeOpacity={0.7}
      >
        <View style={[styles.notificationContent, isRTL && styles.notificationContentRtl]}>
          <View style={[styles.notificationAccent, isRTL && styles.notificationAccentRtl, { backgroundColor: icon.color }]} />

          <View style={[styles.groupedAvatarContainer, isRTL && styles.groupedAvatarContainerRtl]}>
            {visibleUsers.map((notif, avatarIdx) => (
              <View 
                key={notif.$id} 
                style={[
                  styles.stackedAvatar,
                  isRTL ? { right: avatarIdx * 12, zIndex: 3 - avatarIdx } : { left: avatarIdx * 12, zIndex: 3 - avatarIdx }
                ]}
              >
                <ProfilePicture
                  uri={notif.senderProfilePicture}
                  name={notif.senderName}
                  size={moderateScale(28)}
                />
              </View>
            ))}
            {overflowCount > 0 ? (
              <View
                style={[
                  styles.avatarOverflowBadge,
                  isRTL ? { right: visibleUsers.length * 12 } : { left: visibleUsers.length * 12 },
                  {
                    backgroundColor: isDarkMode ? 'rgba(15,23,42,0.92)' : 'rgba(255,255,255,0.98)',
                    borderColor: cardBorder,
                  },
                ]}
              >
                <Text style={[styles.avatarOverflowText, { color: theme.text }]}>+{overflowCount}</Text>
              </View>
            ) : null}
            <View
              style={[
                styles.groupIconBadge,
                isRTL && styles.groupIconBadgeRtl,
                { backgroundColor: icon.color, borderColor: iconBadgeBorder },
              ]}
            >
              <Ionicons name={icon.name} size={moderateScale(8)} color="#fff" />
            </View>
          </View>

          <View style={styles.textContainer}>
            <View style={[styles.topRow, isRTL && styles.topRowRtl]}>
              <Text
                style={[
                  styles.notificationText,
                  isRTL && styles.notificationTextRtl,
                  { color: theme.text },
                ]}
                numberOfLines={1}
              >
                <Text style={[styles.senderName, { color: theme.text }]}>{message.name}</Text>
                {' '}
                <Text style={{ color: theme.textSecondary }}>{message.action}</Text>
              </Text>
              <View style={[styles.timeRow, isRTL && styles.timeRowRtl]}>
                <Ionicons name="sparkles-outline" size={moderateScale(10)} color={icon.color} />
                <Text style={[styles.timeText, { color: theme.textSecondary }]}>
                  {formatNotificationTime(group.latestTimestamp, t)}
                </Text>
              </View>
            </View>
            {group.postPreview && (
              <Text
                style={[styles.previewText, isRTL && styles.previewTextRtl, { color: theme.textSecondary }]}
                numberOfLines={1}
              >
                {group.postPreview}
              </Text>
            )}
          </View>

          {group.hasUnread && (
            <View style={[styles.unreadDot, { backgroundColor: theme.primary }]} />
          )}
        </View>
      </TouchableOpacity>
      </View>
    </ReanimatedAnimated.View>
  );
};

const Notifications = ({ navigation }) => {
  const { t, theme, isDarkMode, isRTL, triggerHaptic } = useAppSettings();
  const { user } = useUser();
  const { alertConfig, showAlert, hideAlert } = useCustomAlert();
  const insets = useSafeAreaInsets();
  const { contentStyle } = useLayout();
  const isFocused = useIsFocused();
  const [appStateStatus, setAppStateStatus] = useState(AppState.currentState);
  const lastRefreshAtRef = React.useRef(0);
  const isRefreshInFlightRef = React.useRef(false);
  
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [postModalVisible, setPostModalVisible] = useState(false);
  const [postModalPostId, setPostModalPostId] = useState(null);
  const isScreenActive = isFocused && appStateStatus === 'active';

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      setAppStateStatus(nextState);
    });

    return () => {
      subscription?.remove();
    };
  }, []);

  const sanitizeNotification = useCallback((notification) => {
    if (!notification || !notification.$id || !notification.type) {
      return null;
    }
    return notification;
  }, []);

  const mergeNotification = useCallback((previous, incoming) => {
    if (!previous) return incoming;
    return {
      ...previous,
      ...incoming,
      type: incoming.type || previous.type,
      postId: incoming.postId || previous.postId,
      senderId: incoming.senderId || previous.senderId,
      senderName: incoming.senderName || previous.senderName,
      senderProfilePicture: incoming.senderProfilePicture || previous.senderProfilePicture,
      postPreview: incoming.postPreview || previous.postPreview,
      $createdAt: incoming.$createdAt || previous.$createdAt,
    };
  }, []);

  const loadNotifications = useCallback(async (reset = false, options = {}) => {
    if (!user?.$id) {
      setIsLoading(false);
      return;
    }

    const { forceNetwork = false } = options;

    const currentPage = reset ? 0 : page;
    if (reset) {
      setLoadError(null);
    }
    
    try {
      const fetchedNotifications = await getNotifications(user.$id, 20, currentPage * 20, {
        useCache: !forceNetwork,
      });
      
      const sanitized = (fetchedNotifications || [])
        .map(sanitizeNotification)
        .filter(Boolean);

      if (reset) {
        setNotifications(sanitized);
        setPage(1);
      } else {
        setNotifications(prev => {
          const merged = [...prev];
          sanitized.forEach((incoming) => {
            const existingIndex = merged.findIndex(n => n.$id === incoming.$id);
            if (existingIndex !== -1) {
              merged[existingIndex] = mergeNotification(merged[existingIndex], incoming);
            } else {
              merged.push(incoming);
            }
          });
          return merged;
        });
        setPage(prev => prev + 1);
      }
      
      setHasMore((fetchedNotifications?.length || 0) === 20);
      setLoadError(null);
    } catch (error) {
      setLoadError(error?.message || t('errors.genericError'));
      if (reset) {
        setNotifications([]);
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [user?.$id, page, sanitizeNotification, mergeNotification, t]);

  // Handle real-time notification updates
  const handleNewNotification = useCallback((newNotification) => {
    // Validate notification has required fields
    if (!newNotification || !newNotification.$id || !newNotification.type) {
      return;
    }
    
    setNotifications(prev => {
      // Check if notification already exists
      const existingIndex = prev.findIndex(n => n.$id === newNotification.$id);
      if (existingIndex !== -1) {
        // Update existing notification, preserving any missing fields from the old one
        const updated = [...prev];
        updated[existingIndex] = mergeNotification(prev[existingIndex], newNotification);
        return updated;
      }
      // Add new notification at the beginning
      return [newNotification, ...prev];
    });
  }, [mergeNotification]);

  // Subscribe to real-time notification updates
  useNotifications(
    user?.$id,
    handleNewNotification,
    handleNewNotification,
    !!user?.$id && isScreenActive
  );

  useEffect(() => {
    if (user?.$id) {
      setIsLoading(true);
      loadNotifications(true, { forceNetwork: true });
    }
  }, [loadNotifications, user?.$id]);

  useEffect(() => {
    if (!isFocused || !user?.$id) {
      return;
    }

    smartRefreshNotifications({ force: true, minIntervalMs: 0 });
  }, [isFocused, smartRefreshNotifications, user?.$id]);

  const smartRefreshNotifications = useCallback(async (
    { minIntervalMs = 10000, force = false } = {}
  ) => {
    if (!user?.$id || !isScreenActive) {
      return;
    }

    if (isRefreshInFlightRef.current) {
      return;
    }

    const now = Date.now();
    if (!force && now - lastRefreshAtRef.current < minIntervalMs) {
      return;
    }

    isRefreshInFlightRef.current = true;
    try {
      await loadNotifications(true, { forceNetwork: true });
      lastRefreshAtRef.current = Date.now();
    } finally {
      isRefreshInFlightRef.current = false;
    }
  }, [isScreenActive, loadNotifications, user?.$id]);

  useEffect(() => {
    if (!isScreenActive) {
      return;
    }

    smartRefreshNotifications({ minIntervalMs: 6000 });
  }, [isScreenActive, smartRefreshNotifications]);

  useEffect(() => {
    const unsubscribe = subscribeToRefreshTopic(REFRESH_TOPICS.NOTIFICATIONS, () => {
      smartRefreshNotifications({ minIntervalMs: 3000 });
    });

    return unsubscribe;
  }, [smartRefreshNotifications]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadNotifications(true, { forceNetwork: true });
    lastRefreshAtRef.current = Date.now();
  };

  const handleLoadMore = () => {
    if (hasMore && !isLoading) {
      loadNotifications(false);
    }
  };

  const handleNotificationPress = async (notification) => {
    if (!notification || !notification.$id) return;
    
    // Store the notification data before any async operations
    const notificationData = { ...notification };
    
    // Mark as read (optimistic update)
    if (!notification.isRead) {
      triggerHaptic('selection');
      // Update UI immediately
      setNotifications(prev =>
        prev.map(n =>
          n.$id === notificationData.$id 
            ? { ...n, isRead: true } 
            : n
        )
      );
      
      // Then persist to database
      try {
        await markNotificationAsRead(notificationData.$id);
      } catch (error) {
        // Revert on error
        setNotifications(prev =>
          prev.map(n =>
            n.$id === notificationData.$id 
              ? { ...n, isRead: false } 
              : n
          )
        );
      }
    }

    // Navigate based on notification type
    if (notificationData.postId) {
      dismissPresentedNotificationsByTarget({ postId: notificationData.postId }).catch(() => {});
      markNotificationsAsReadByContext(user?.$id, { postId: notificationData.postId }).catch(() => {});

      if (
        notificationData.type === NOTIFICATION_TYPES.LECTURE_UPLOAD ||
        notificationData.type === NOTIFICATION_TYPES.LECTURE_MENTION ||
        notificationData.type === NOTIFICATION_TYPES.LECTURE_JOIN_REQUEST
      ) {
        navigation.navigate('LectureChannel', {
          channelId: notificationData.postId,
          source: `notification_${notificationData.type}`,
        });
        return;
      }

      // For reply notifications, go directly to PostDetails with reply focus
      if (notificationData.type === NOTIFICATION_TYPES.POST_REPLY) {
        const navParams = {
          postId: notificationData.postId,
          source: `notification_${notificationData.type}`,
          autoFocusReply: true,
        };
        const preview = notificationData.postPreview || '';
        const ridMatch = preview.match(/^\[rid:([^\]]+)\]/);
        if (ridMatch && ridMatch[1]) {
          navParams.targetReplyId = ridMatch[1];
        }
        navigation.navigate('PostDetails', navParams);
      } else {
        // For like, mention, friend_post, department_post - show post view modal
        setPostModalPostId(notificationData.postId);
        setPostModalVisible(true);
      }
    } else if (notificationData.senderId) {
      const targetUserId = String(notificationData.senderId || '').trim();
      if (!targetUserId) {
        return;
      }
      if (notificationData.type === NOTIFICATION_TYPES.FOLLOW) {
        dismissPresentedNotificationsByTarget({ senderId: targetUserId, types: [NOTIFICATION_TYPES.FOLLOW] }).catch(() => {});
        markNotificationsAsReadByContext(user?.$id, {
          senderId: targetUserId,
          types: [NOTIFICATION_TYPES.FOLLOW],
        }).catch(() => {});
      }
      navigation.navigate('UserProfile', { userId: targetUserId });
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!user?.$id) return;
    
    try {
      triggerHaptic('light');
      await markAllNotificationsAsRead(user.$id);
      setNotifications(prev =>
        prev.map(n => ({ ...n, isRead: true }))
      );
      // Dismiss all push notifications from notification tray
      ExpoNotifications.dismissAllNotificationsAsync().catch(() => {});
    } catch (error) {
      // Handle error silently
    }
  };

  const handleMarkSingleAsRead = async (notification) => {
    if (notification.isRead) return;
    
    try {
      await markNotificationAsRead(notification.$id);
      setNotifications(prev =>
        prev.map(n =>
          n.$id === notification.$id ? { ...n, isRead: true } : n
        )
      );
    } catch (error) {
      // Handle error silently
    }
  };

  const handleDeleteNotification = async (notification) => {
    try {
      triggerHaptic('warning');
      await deleteNotification(notification.$id);
      setNotifications(prev => prev.filter(n => n.$id !== notification.$id));
    } catch (error) {
      // Handle error silently
    }
  };

  const handleTurnOffNotificationType = useCallback(async (notification) => {
    if (!notification?.type) return;

    try {
      // Update local notification settings to turn off this type
      const raw = await safeStorage.getItem('notificationSettings');
      let settings = {};
      try { settings = raw ? JSON.parse(raw) : {}; } catch (e) { settings = {}; }

      // Map notification type to setting key
      const typeToKey = {
        [NOTIFICATION_TYPES.POST_LIKE]: 'postLikes',
        [NOTIFICATION_TYPES.POST_REPLY]: 'postReplies',
        [NOTIFICATION_TYPES.MENTION]: 'mentions',
        [NOTIFICATION_TYPES.FRIEND_POST]: 'friendPosts',
        [NOTIFICATION_TYPES.FOLLOW]: 'newFollowers',
        [NOTIFICATION_TYPES.DEPARTMENT_POST]: 'departmentPosts',
      };

      const settingKey = typeToKey[notification.type];
      if (settingKey) {
        settings[settingKey] = false;
        await safeStorage.setItem('notificationSettings', JSON.stringify(settings));
        showAlert({
          type: 'success',
          title: t('common.success'),
          message: t('notifications.turnedOff') || 'Notifications of this type have been turned off',
        });
      }
    } catch (error) {
      // Silent fail
    }
  }, [t, showAlert]);

  const handleClearAll = () => {
    if (notifications.length === 0) return;
    
    showAlert({
      type: 'warning',
      title: t('notifications.clearAll') || 'Clear All',
      message: t('notifications.clearAllConfirm') || 'Are you sure you want to clear all notifications?',
      buttons: [
        { text: t('common.cancel') || 'Cancel', style: 'cancel' },
        {
          text: t('common.clear') || 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              triggerHaptic('warning');
              await deleteAllNotifications(user.$id);
              setNotifications([]);
            } catch (error) {
              // Handle error silently
            }
          },
        },
      ],
    });
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  // Group notifications by post and type
  const groupedNotifications = useMemo(() => {
    return groupNotifications(notifications);
  }, [notifications]);

  // Handle grouped notification press
  const handleGroupPress = async (group) => {
    if (!group || !group.postId) return;
    
    // Store notification IDs before any async operations
    const notificationIds = group.notifications.map(n => n.$id);
    const unreadIds = group.notifications.filter(n => !n.isRead).map(n => n.$id);
    
    // Mark all notifications in group as read (optimistic update)
    if (unreadIds.length > 0) {
      // Update UI immediately
      setNotifications(prev =>
        prev.map(n =>
          notificationIds.includes(n.$id)
            ? { ...n, isRead: true }
            : n
        )
      );
      
      // Then persist to database
      try {
        await Promise.all(
          unreadIds.map(id => markNotificationAsRead(id))
        );
      } catch (error) {
        // Revert on error
        setNotifications(prev =>
          prev.map(n =>
            unreadIds.includes(n.$id)
              ? { ...n, isRead: false }
              : n
          )
        );
      }
    }

    // Show post view modal for grouped like notifications
    dismissPresentedNotificationsByTarget({ postId: group.postId }).catch(() => {});
    markNotificationsAsReadByContext(user?.$id, { postId: group.postId }).catch(() => {});
    setPostModalPostId(group.postId);
    setPostModalVisible(true);
  };

  const renderEmptyState = () => (
    loadError ? (
      <UnifiedEmptyState
        iconName="alert-circle-outline"
        title={t('error.title')}
        description={loadError}
        actionLabel={t('common.retry')}
        actionIconName="refresh-outline"
        onAction={handleRefresh}
      />
    ) : (
      <UnifiedEmptyState
        iconName="notifications-outline"
        title={t('notifications.noNotifications')}
        description={t('notifications.noNotificationsDesc')}
      />
    )
  );

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={isDarkMode
          ? ['#1a1a2e', '#16213e', '#0f3460']
          : ['#FFFEF7', '#FFF9E6', '#FFF4D6']
        }
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={[styles.header, isRTL && styles.headerRtl, { paddingTop: insets.top + spacing.sm }]}>
          <TouchableOpacity
            style={[styles.backButton, isRTL && styles.backButtonRtl]}
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
            accessibilityLabel={t('common.goBack')}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name={isRTL ? 'arrow-forward' : 'arrow-back'} size={moderateScale(24)} color={theme.text} />
          </TouchableOpacity>
          
          <Text style={[styles.headerTitle, isRTL && styles.headerTitleRtl, { color: theme.text }]}>
            {t('notifications.title') || 'Notifications'}
          </Text>
          
          {unreadCount > 0 ? (
            <TouchableOpacity
              style={styles.markAllButton}
              onPress={handleMarkAllAsRead}
              accessibilityRole="button"
              accessibilityLabel={t('notifications.markAllRead')}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={[styles.markAllText, { color: theme.primary }]}>
                {t('notifications.markAllRead') || 'Mark all read'}
              </Text>
            </TouchableOpacity>
          ) : notifications.length > 0 ? (
            <TouchableOpacity
              style={styles.markAllButton}
              onPress={handleClearAll}
              accessibilityRole="button"
              accessibilityLabel={t('notifications.clearAll')}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={[styles.markAllText, { color: '#FF3B30' }]}>
                {t('notifications.clearAll') || 'Clear all'}
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.placeholder} />
          )}
        </View>

        {(notifications.length > 0 || unreadCount > 0) && (
          <View style={[styles.summaryRow, isRTL && styles.summaryRowRtl]}>
            <View style={[styles.summaryChip, isRTL && styles.summaryChipRtl, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.88)', borderColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.05)' }]}>
              <View style={[styles.summaryIconWrap, { backgroundColor: `${theme.primary}18` }]}>
                <Ionicons name="mail-unread-outline" size={moderateScale(14)} color={theme.primary} />
              </View>
              <View>
                <Text style={[styles.summaryLabel, isRTL && styles.summaryTextRtl, { color: theme.textSecondary }]}>{t('notifications.markAllRead')}</Text>
                <Text style={[styles.summaryValue, isRTL && styles.summaryTextRtl, { color: theme.text }]}>{unreadCount}</Text>
              </View>
            </View>
            <View style={[styles.summaryChip, isRTL && styles.summaryChipRtl, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.88)', borderColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.05)' }]}>
              <View style={[styles.summaryIconWrap, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.05)' }]}>
                <Ionicons name="notifications-outline" size={moderateScale(14)} color={theme.textSecondary} />
              </View>
              <View>
                <Text style={[styles.summaryLabel, isRTL && styles.summaryTextRtl, { color: theme.textSecondary }]}>{t('notifications.title')}</Text>
                <Text style={[styles.summaryValue, isRTL && styles.summaryTextRtl, { color: theme.text }]}>{notifications.length}</Text>
              </View>
            </View>
          </View>
        )}

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <NotificationSkeleton count={7} />
          </View>
        ) : (
          <FlashList
            data={groupedNotifications}
            keyExtractor={(item) => item.isGroup ? item.id : item.notification.$id}
            renderItem={({ item, index }) => {
              if (item.isGroup) {
                return (
                  <GroupedNotificationItem
                    group={item}
                    onPress={handleGroupPress}
                    theme={theme}
                    isDarkMode={isDarkMode}
                    isRTL={isRTL}
                    t={t}
                    index={index}
                  />
                );
              }
              return (
                <NotificationItem
                  notification={item.notification}
                  onPress={handleNotificationPress}
                  onLongPress={handleMarkSingleAsRead}
                  onDelete={handleDeleteNotification}
                  onTurnOff={handleTurnOffNotificationType}
                  theme={theme}
                  isDarkMode={isDarkMode}
                  isRTL={isRTL}
                  t={t}
                  index={index}
                />
              );
            }}
            contentContainerStyle={[
              styles.listContent,
              groupedNotifications.length === 0 && styles.emptyList,
              contentStyle,
            ]}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
                tintColor={theme.primary}
                colors={[theme.primary]}
              />
            }
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.5}
            ListEmptyComponent={renderEmptyState}
            windowSize={11}
            maxToRenderPerBatch={10}
            initialNumToRender={12}
            removeClippedSubviews={Platform.OS === 'android'}
          />
        )}
      </LinearGradient>
      <PostViewModal
        visible={postModalVisible}
        onClose={() => {
          setPostModalVisible(false);
          setPostModalPostId(null);
        }}
        postId={postModalPostId}
        navigation={navigation}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  headerRtl: {
    flexDirection: 'row-reverse',
  },
  backButton: {
    width: moderateScale(40),
    height: moderateScale(40),
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  backButtonRtl: {
    alignItems: 'flex-end',
  },
  headerTitle: {
    fontSize: fontSize(17),
    fontWeight: '700',
  },
  headerTitleRtl: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  markAllButton: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  markAllText: {
    fontSize: fontSize(12),
    fontWeight: '600',
  },
  placeholder: {
    width: moderateScale(70),
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'stretch',
    paddingHorizontal: spacing.sm,
  },
  listContent: {
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.xl,
    gap: spacing.xs,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  summaryRowRtl: {
    flexDirection: 'row-reverse',
  },
  summaryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    flex: 1,
  },
  summaryChipRtl: {
    flexDirection: 'row-reverse',
  },
  summaryTextRtl: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  summaryIconWrap: {
    width: moderateScale(28),
    height: moderateScale(28),
    borderRadius: moderateScale(14),
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryLabel: {
    fontSize: fontSize(10),
    fontWeight: '600',
  },
  summaryValue: {
    fontSize: fontSize(14),
    fontWeight: '700',
  },
  emptyList: {
    flex: 1,
  },
  notificationCard: {
    marginVertical: spacing.xs / 2,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    paddingVertical: spacing.sm + 3,
    paddingHorizontal: spacing.sm,
  },
  notificationAccent: {
    width: 4,
    alignSelf: 'stretch',
    borderRadius: 999,
    marginRight: spacing.sm,
  },
  notificationAccentRtl: {
    marginRight: 0,
    marginLeft: spacing.sm,
  },
  notificationItem: {
  },
  notificationContent: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  notificationContentRtl: {
    flexDirection: 'row-reverse',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: spacing.sm,
    overflow: 'visible',
  },
  avatarContainerRtl: {
    marginRight: 0,
    marginLeft: spacing.sm,
  },
  groupedAvatarContainer: {
    position: 'relative',
    width: moderateScale(52),
    height: moderateScale(32),
    marginRight: spacing.sm,
    overflow: 'visible',
  },
  groupedAvatarContainerRtl: {
    marginRight: 0,
    marginLeft: spacing.sm,
  },
  stackedAvatar: {
    position: 'absolute',
    top: 0,
  },
  avatarOverflowBadge: {
    position: 'absolute',
    top: moderateScale(2),
    width: moderateScale(28),
    height: moderateScale(28),
    borderRadius: moderateScale(14),
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    zIndex: 1,
  },
  avatarOverflowText: {
    fontSize: fontSize(10),
    fontWeight: '700',
  },
  groupIconBadge: {
    position: 'absolute',
    bottom: -2,
    left: moderateScale(30),
    width: moderateScale(16),
    height: moderateScale(16),
    borderRadius: moderateScale(8),
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.3)',
    zIndex: 10,
    elevation: 3,
  },
  groupIconBadgeRtl: {
    left: 'auto',
    right: moderateScale(30),
  },
  iconBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: moderateScale(18),
    height: moderateScale(18),
    borderRadius: moderateScale(9),
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.3)',
    zIndex: 10,
    elevation: 3,
  },
  iconBadgeRtl: {
    right: 'auto',
    left: -2,
  },
  textContainer: {
    flex: 1,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  topRowRtl: {
    flexDirection: 'row-reverse',
  },
  notificationText: {
    fontSize: fontSize(13),
    lineHeight: fontSize(18),
    flex: 1,
  },
  notificationTextRtl: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  senderName: {
    fontWeight: '600',
  },
  previewText: {
    fontSize: fontSize(12),
    marginTop: spacing.xs,
    opacity: 0.92,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(127,127,127,0.08)',
  },
  previewTextRtl: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs / 2,
    marginTop: spacing.sm,
    alignSelf: 'flex-start',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.pill || 999,
    backgroundColor: 'rgba(127,127,127,0.08)',
  },
  timeRowRtl: {
    flexDirection: 'row-reverse',
    alignSelf: 'flex-end',
  },
  timeText: {
    fontSize: fontSize(10),
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginLeft: spacing.xs,
  },
  rightSectionRtl: {
    marginLeft: 0,
    marginRight: spacing.xs,
  },
  unreadDot: {
    width: moderateScale(8),
    height: moderateScale(8),
    borderRadius: moderateScale(4),
  },
  deleteButton: {
    padding: spacing.xs,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyIconContainer: {
    width: moderateScale(70),
    height: moderateScale(70),
    borderRadius: moderateScale(35),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontSize: fontSize(16),
    fontWeight: '600',
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: fontSize(13),
    marginTop: spacing.sm,
    textAlign: 'center',
    lineHeight: fontSize(18),
  },
  emptyHintContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
    gap: spacing.xs,
  },
  emptyHint: {
    fontSize: fontSize(11),
    flex: 1,
  },
  notifMenuContainer: {
    marginTop: spacing.xs,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    paddingVertical: spacing.xs,
    overflow: 'hidden',
  },
  notifMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  notifMenuItemRtl: {
    flexDirection: 'row-reverse',
  },
  notifMenuDivider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: spacing.md,
    opacity: 0.3,
  },
  notifMenuText: {
    fontSize: fontSize(13),
    fontWeight: '500',
  },
  notifMenuTextRtl: {
    flex: 1,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
});

export default Notifications;
