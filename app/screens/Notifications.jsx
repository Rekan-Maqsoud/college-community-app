import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Platform,
} from 'react-native';
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
import { wp, hp, fontSize, spacing, moderateScale } from '../utils/responsive';
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
import { useNotifications } from '../hooks/useRealtimeSubscription';
import PostViewModal from '../components/PostViewModal';
import { dismissPresentedNotificationsByTarget } from '../../services/pushNotificationService';

const NOTIFICATION_TYPES = {
  POST_LIKE: 'post_like',
  POST_REPLY: 'post_reply',
  MENTION: 'mention',
  FRIEND_POST: 'friend_post',
  FOLLOW: 'follow',
  DEPARTMENT_POST: 'department_post',
  POST_HIDDEN_REPORT: 'post_hidden_report',
  LECTURE_UPLOAD: 'lecture_upload',
  LECTURE_MENTION: 'lecture_mention',
};

// Group notifications by post and type
// Only group LIKES on the same post within 24 hours
// Replies are shown separately for better visibility
const groupNotifications = (notifications) => {
  const groups = {};
  const standalone = [];
  const GROUPING_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours
  
  // Filter out invalid notifications first
  const validNotifications = notifications.filter(n => n && n.$id && n.type);
  
  validNotifications.forEach(notification => {
    // Only group LIKES on the same post (not replies - show each reply separately)
    if (notification.postId && notification.type === NOTIFICATION_TYPES.POST_LIKE) {
      const key = `${notification.postId}_${notification.type}`;
      
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
          type: notification.type,
          postId: notification.postId,
          postPreview: notification.postPreview,
          notifications: [],
          latestTimestamp: notification.$createdAt,
          hasUnread: false,
        };
      }
      groups[key].notifications.push(notification);
      if (!notification.isRead) {
        groups[key].hasUnread = true;
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
  
  // Convert groups to array, but only if they have more than 1 notification
  // Single-item groups become standalone for cleaner UI
  const groupedItems = [];
  Object.values(groups).forEach(group => {
    if (group.notifications.length > 1) {
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
    case NOTIFICATION_TYPES.LECTURE_UPLOAD:
      return { name: 'book', color: '#0EA5E9' };
    case NOTIFICATION_TYPES.LECTURE_MENTION:
      return { name: 'at', color: '#8B5CF6' };
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

const NotificationItem = ({ notification, onPress, onLongPress, onDelete, onTurnOff, theme, isDarkMode, t, index }) => {
  if (!notification || !notification.$id || !notification.type) {
    return null;
  }

  const [menuVisible, setMenuVisible] = useState(false);
  
  const icon = getNotificationIcon(notification.type);
  const isUnread = !notification.isRead;
  
  const senderName = notification.senderName || t('common.user') || 'User';
  const createdAt = notification.$createdAt;
  const rawPreview = notification.postPreview || '';
  // Strip encoded replyId prefix "[rid:xxx]" if present
  const postPreview = rawPreview.replace(/^\[rid:[^\]]+\]/, '');
  
  const getNotificationMessage = () => {
    switch (notification.type) {
      case NOTIFICATION_TYPES.POST_LIKE:
        return t('notifications.likedPost') || 'liked your post';
      case NOTIFICATION_TYPES.POST_REPLY:
        return t('notifications.repliedPost') || 'replied to your post';
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
      case NOTIFICATION_TYPES.LECTURE_UPLOAD:
        return t('notifications.lectureUpload') || 'new lecture upload';
      case NOTIFICATION_TYPES.LECTURE_MENTION:
        return t('notifications.lectureMention') || 'mentioned you in lecture discussion';
      default:
        return '';
    }
  };
  
  const message = getNotificationMessage();
  
  if (!senderName && !message) {
    return null;
  }

  return (
    <ReanimatedAnimated.View entering={FadeInRight.delay(index * 50).duration(350).springify()}>
      <TouchableOpacity
        style={[
          styles.notificationCard,
          { 
            backgroundColor: isUnread
              ? (isDarkMode ? 'rgba(0, 122, 255, 0.08)' : 'rgba(0, 122, 255, 0.04)')
              : (isDarkMode ? 'rgba(255, 255, 255, 0.04)' : 'rgba(255, 255, 255, 0.85)'),
            borderColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
          },
        ]}
        onPress={() => onPress(notification)}
        onLongPress={() => onLongPress && onLongPress(notification)}
        delayLongPress={500}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`${senderName} ${message}`}
      >
        <View style={styles.notificationContent}>
          <View style={styles.avatarContainer}>
            <ProfilePicture
              uri={notification.senderProfilePicture}
              name={notification.senderName}
              size={moderateScale(44)}
            />
            <View
              style={[
                styles.iconBadge,
                { backgroundColor: icon.color },
              ]}
            >
              <Ionicons name={icon.name} size={moderateScale(11)} color="#fff" />
            </View>
          </View>

          <View style={styles.textContainer}>
            <Text
              style={[
                styles.notificationText,
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
                style={[styles.previewText, { color: theme.textSecondary }]}
                numberOfLines={1}
              >
                &ldquo;{postPreview}&rdquo;
              </Text>
            ) : null}
            <View style={styles.timeRow}>
              <Ionicons name="time-outline" size={moderateScale(10)} color={theme.textSecondary} />
              <Text style={[styles.timeText, { color: theme.textSecondary }]}>
                {createdAt ? formatNotificationTime(createdAt, t) : ''}
              </Text>
            </View>
          </View>

          <View style={styles.rightSection}>
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
              style={styles.notifMenuItem}
              onPress={() => {
                setMenuVisible(false);
                onDelete && onDelete(notification);
              }}
            >
              <Ionicons name="trash-outline" size={moderateScale(15)} color="#EF4444" />
              <Text style={[styles.notifMenuText, { color: '#EF4444' }]}>
                {t('notifications.removeNotification') || 'Remove this notification'}
              </Text>
            </TouchableOpacity>
            <View style={[styles.notifMenuDivider, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }]} />
            <TouchableOpacity
              style={styles.notifMenuItem}
              onPress={() => {
                setMenuVisible(false);
                onTurnOff && onTurnOff(notification);
              }}
            >
              <Ionicons name="notifications-off-outline" size={moderateScale(15)} color={theme.textSecondary} />
              <Text style={[styles.notifMenuText, { color: theme.text }]}>
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
const GroupedNotificationItem = ({ group, onPress, theme, isDarkMode, t, index }) => {
  const icon = getNotificationIcon(group.type);
  const count = group.notifications.length;
  // Get unique users (avoid showing same user twice)
  const uniqueUsers = [];
  const seenIds = new Set();
  for (const notif of group.notifications) {
    if (!seenIds.has(notif.senderId)) {
      seenIds.add(notif.senderId);
      uniqueUsers.push(notif);
    }
    if (uniqueUsers.length >= 3) break;
  }
  
  const getGroupMessage = () => {
    const uniqueCount = seenIds.size;
    const firstName = group.notifications[0]?.senderName?.split(' ')[0] || '';
    
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
            backgroundColor: group.hasUnread
              ? (isDarkMode ? 'rgba(0, 122, 255, 0.08)' : 'rgba(0, 122, 255, 0.04)')
              : (isDarkMode ? 'rgba(255, 255, 255, 0.04)' : 'rgba(255, 255, 255, 0.85)'),
            borderColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
          },
        ]}
      >
      <TouchableOpacity
        style={styles.notificationItem}
        onPress={() => onPress(group)}
        activeOpacity={0.7}
      >
        <View style={styles.notificationContent}>
          <View style={styles.groupedAvatarContainer}>
            {uniqueUsers.slice(0, 3).map((notif, avatarIdx) => (
              <View 
                key={notif.$id} 
                style={[
                  styles.stackedAvatar,
                  { left: avatarIdx * 12, zIndex: 3 - avatarIdx }
                ]}
              >
                <ProfilePicture
                  uri={notif.senderProfilePicture}
                  name={notif.senderName}
                  size={moderateScale(28)}
                />
              </View>
            ))}
            <View
              style={[
                styles.groupIconBadge,
                { backgroundColor: icon.color },
              ]}
            >
              <Ionicons name={icon.name} size={moderateScale(8)} color="#fff" />
            </View>
          </View>

          <View style={styles.textContainer}>
            <View style={styles.topRow}>
              <Text
                style={[
                  styles.notificationText,
                  { color: theme.text },
                ]}
                numberOfLines={1}
              >
                <Text style={[styles.senderName, { color: theme.text }]}>{message.name}</Text>
                {' '}
                <Text style={{ color: theme.textSecondary }}>{message.action}</Text>
              </Text>
              <View style={styles.timeRow}>
                <Ionicons name="time-outline" size={moderateScale(10)} color={theme.textSecondary} />
                <Text style={[styles.timeText, { color: theme.textSecondary }]}>
                  {formatNotificationTime(group.latestTimestamp, t)}
                </Text>
              </View>
            </View>
            {group.postPreview && (
              <Text
                style={[styles.previewText, { color: theme.textSecondary }]}
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
  const { t, theme, isDarkMode, triggerHaptic } = useAppSettings();
  const { user } = useUser();
  const { alertConfig, showAlert, hideAlert } = useCustomAlert();
  const insets = useSafeAreaInsets();
  const { contentStyle } = useLayout();
  
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [postModalVisible, setPostModalVisible] = useState(false);
  const [postModalPostId, setPostModalPostId] = useState(null);

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
    } catch (error) {
      // Handle error - set empty array on error
      if (reset) {
        setNotifications([]);
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [user?.$id, page, sanitizeNotification, mergeNotification]);

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
  useNotifications(user?.$id, handleNewNotification, handleNewNotification, !!user?.$id);

  useEffect(() => {
    if (user?.$id) {
      setIsLoading(true);
      loadNotifications(true);
    }
  }, [user?.$id]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadNotifications(true, { forceNetwork: true });
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

      if (notificationData.type === NOTIFICATION_TYPES.LECTURE_UPLOAD || notificationData.type === NOTIFICATION_TYPES.LECTURE_MENTION) {
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
      if (notificationData.type === NOTIFICATION_TYPES.FOLLOW) {
        dismissPresentedNotificationsByTarget({ senderId: notificationData.senderId, types: [NOTIFICATION_TYPES.FOLLOW] }).catch(() => {});
        markNotificationsAsReadByContext(user?.$id, {
          senderId: notificationData.senderId,
          types: [NOTIFICATION_TYPES.FOLLOW],
        }).catch(() => {});
      }
      navigation.navigate('UserProfile', { userId: notificationData.senderId });
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
    <UnifiedEmptyState
      iconName="notifications-outline"
      title={t('notifications.noNotifications')}
      description={t('notifications.noNotificationsDesc')}
      actionLabel={t('common.retry')}
      actionIconName="refresh-outline"
      onAction={handleRefresh}
    />
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
        <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
            accessibilityLabel={t('common.goBack')}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={moderateScale(24)} color={theme.text} />
          </TouchableOpacity>
          
          <Text style={[styles.headerTitle, { color: theme.text }]}>
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
          <View style={styles.summaryRow}>
            <View style={[styles.summaryChip, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.85)', borderColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}>
              <Ionicons name="mail-unread-outline" size={moderateScale(14)} color={theme.primary} />
              <Text style={[styles.summaryValue, { color: theme.text }]}>{unreadCount}</Text>
            </View>
            <View style={[styles.summaryChip, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.85)', borderColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}>
              <Ionicons name="notifications-outline" size={moderateScale(14)} color={theme.textSecondary} />
              <Text style={[styles.summaryValue, { color: theme.text }]}>{notifications.length}</Text>
            </View>
          </View>
        )}

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <NotificationSkeleton count={7} />
          </View>
        ) : (
          <FlatList
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
  backButton: {
    width: moderateScale(40),
    height: moderateScale(40),
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: fontSize(17),
    fontWeight: '700',
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
  summaryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.sm,
  },
  summaryValue: {
    fontSize: fontSize(12),
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
  notificationItem: {
  },
  notificationContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: spacing.sm,
  },
  groupedAvatarContainer: {
    position: 'relative',
    width: moderateScale(52),
    height: moderateScale(32),
    marginRight: spacing.sm,
  },
  stackedAvatar: {
    position: 'absolute',
    top: 0,
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
  notificationText: {
    fontSize: fontSize(13),
    lineHeight: fontSize(18),
    flex: 1,
  },
  senderName: {
    fontWeight: '600',
  },
  previewText: {
    fontSize: fontSize(12),
    marginTop: 2,
    opacity: 0.7,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
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
  notifMenuDivider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: spacing.md,
    opacity: 0.3,
  },
  notifMenuText: {
    fontSize: fontSize(13),
    fontWeight: '500',
  },
});

export default Notifications;
