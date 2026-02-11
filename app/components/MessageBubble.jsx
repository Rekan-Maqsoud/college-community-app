import React, { useState, useRef, memo, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Modal, 
  Image, 
  Dimensions,
  Animated,
  PanResponder,
  Pressable,
  ActivityIndicator,
  LayoutAnimation,
  UIManager,
  Platform as RNPlatform,
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import ReanimatedModule, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withDelay,
} from 'react-native-reanimated';
import LeafletMap from './LeafletMap';
import { useAppSettings } from '../context/AppSettingsContext';
import ProfilePicture from './ProfilePicture';
import ZoomableImageModal from './ZoomableImageModal';
import { 
  fontSize, 
  spacing, 
  moderateScale,
  wp,
} from '../utils/responsive';
import { borderRadius } from '../theme/designTokens';

const ReanimatedView = ReanimatedModule?.View || View;

// Enable LayoutAnimation for Android (skip in New Architecture where it's a no-op)
if (
  RNPlatform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental &&
  !global.__turboModuleProxy &&
  !global.nativeFabricUIManager &&
  !global.RN$Bridgeless
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const SWIPE_THRESHOLD = 60;

// Message status indicator component
// Status flow: sending -> sent (1 check) -> delivered (2 checks) -> read (pfp in private, blue checks in group)
const MessageStatusIndicator = ({ 
  status, 
  readBy, 
  deliveredTo,
  chatType, 
  otherUserPhoto, 
  otherUserName,
  participantCount,
  theme,
  isDarkMode,
  isLastSeenMessage 
}) => {
  // Animation value for the read receipt avatar
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    if (isLastSeenMessage) {
      // Animate in when this becomes the last seen message
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Reset animation when this is no longer the last seen
      scaleAnim.setValue(0);
      opacityAnim.setValue(0);
    }
  }, [isLastSeenMessage]);

  // For optimistic/sending messages - show loading spinner
  if (status === 'sending') {
    return (
      <View style={statusStyles.container}>
        <ActivityIndicator size={moderateScale(10)} color="rgba(255,255,255,0.6)" />
      </View>
    );
  }
  
  // For failed messages - show error icon
  if (status === 'failed') {
    return (
      <View style={statusStyles.container}>
        <Ionicons name="alert-circle" size={moderateScale(14)} color="#EF4444" />
      </View>
    );
  }
  
  // Check if message has been read
  const hasBeenRead = readBy && readBy.length > 0;
  // Check if message has been delivered (push notification received)
  const hasBeenDelivered = deliveredTo && deliveredTo.length > 0;
  
  // For private chats
  if (chatType === 'private') {
    // Message has been read - show recipient's profile picture on last read message
    if (hasBeenRead) {
      if (isLastSeenMessage) {
        return (
          <Animated.View style={[
            statusStyles.container,
            {
              transform: [{ scale: scaleAnim }],
              opacity: opacityAnim,
            }
          ]}>
            {otherUserPhoto ? (
              <Image 
                source={{ uri: otherUserPhoto }} 
                style={statusStyles.readAvatar}
              />
            ) : (
              <View style={[statusStyles.readAvatarPlaceholder, { backgroundColor: theme.primary }]}>
                <Text style={statusStyles.readAvatarText}>
                  {(otherUserName || '?')[0].toUpperCase()}
                </Text>
              </View>
            )}
          </Animated.View>
        );
      }
      // For other read messages (not the last), show double checkmark in blue
      return (
        <View style={statusStyles.container}>
          <Ionicons name="checkmark-done" size={moderateScale(12)} color="#60A5FA" />
        </View>
      );
    }
    
    // Message delivered (push notification received) - show 2 checks
    if (hasBeenDelivered || status === 'delivered') {
      return (
        <View style={statusStyles.container}>
          <Ionicons name="checkmark-done" size={moderateScale(12)} color="rgba(255,255,255,0.6)" />
        </View>
      );
    }
    
    // Message sent to server - show 1 check
    return (
      <View style={statusStyles.container}>
        <Ionicons name="checkmark" size={moderateScale(12)} color="rgba(255,255,255,0.6)" />
      </View>
    );
  }
  
  // For group chats
  if (chatType === 'custom_group' || chatType === 'stage_group' || chatType === 'department_group') {
    // Message has been read by some participants
    if (hasBeenRead) {
      const allRead = participantCount && readBy.length >= participantCount - 1; // -1 for sender
      return (
        <View style={statusStyles.container}>
          <Ionicons 
            name="checkmark-done" 
            size={moderateScale(12)} 
            color={allRead ? "#60A5FA" : "rgba(255,255,255,0.8)"} 
          />
        </View>
      );
    }
    
    // Message delivered to some participants
    if (hasBeenDelivered || status === 'delivered') {
      return (
        <View style={statusStyles.container}>
          <Ionicons name="checkmark-done" size={moderateScale(12)} color="rgba(255,255,255,0.6)" />
        </View>
      );
    }
    
    // Message sent to server
    return (
      <View style={statusStyles.container}>
        <Ionicons name="checkmark" size={moderateScale(12)} color="rgba(255,255,255,0.6)" />
      </View>
    );
  }
  
  // Default - single check (sent)
  return (
    <View style={statusStyles.container}>
      <Ionicons name="checkmark" size={moderateScale(12)} color="rgba(255,255,255,0.6)" />
    </View>
  );
};

const statusStyles = StyleSheet.create({
  container: {
    marginLeft: spacing.xs,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: moderateScale(14),
  },
  readAvatar: {
    width: moderateScale(14),
    height: moderateScale(14),
    borderRadius: moderateScale(7),
  },
  readAvatarPlaceholder: {
    width: moderateScale(14),
    height: moderateScale(14),
    borderRadius: moderateScale(7),
    justifyContent: 'center',
    alignItems: 'center',
  },
  readAvatarText: {
    color: '#FFFFFF',
    fontSize: moderateScale(8),
    fontWeight: '600',
  },
});

const MessageBubble = ({ 
  message, 
  isCurrentUser, 
  senderName,
  senderPhoto,
  showAvatar = true,
  isRepresentative = false,
  onCopy,
  onDelete,
  onReply,
  onForward,
  onPin,
  onUnpin,
  onBookmark,
  onUnbookmark,
  isBookmarked = false,
  onAvatarPress,
  onRetry,
  chatType,
  otherUserPhoto,
  otherUserName,
  participantCount,
  isLastSeenMessage = false,
  groupMembers = [],
  onNavigateToProfile,
  searchQuery = '',
  isCurrentSearchResult = false,
  isHighlighted = false,
  onPostPress,
  showAlert,
  selectionMode = false,
  isSelected = false,
  onToggleSelect,
  currentUserId,
  reactionDefaults = [],
  onToggleReaction,
  onEditReactions,
}) => {
  const { theme, isDarkMode, t, chatSettings } = useAppSettings();
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [actionsVisible, setActionsVisible] = useState(false);
  const [mentionPreview, setMentionPreview] = useState(null);
  const [reactionPickerVisible, setReactionPickerVisible] = useState(false);
  
  const translateX = useRef(new Animated.Value(0)).current;
  const swipeDirection = isCurrentUser ? -1 : 1;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 10 && Math.abs(gestureState.dy) < 20;
      },
      onPanResponderMove: (_, gestureState) => {
        const dx = gestureState.dx * swipeDirection;
        if (dx > 0 && dx < SWIPE_THRESHOLD + 20) {
          translateX.setValue(gestureState.dx);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        const dx = gestureState.dx * swipeDirection;
        if (dx > SWIPE_THRESHOLD && onReply) {
          onReply();
        }
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
          tension: 100,
          friction: 10,
        }).start();
      },
    })
  ).current;

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const hasImages = message.images && message.images.length > 0;
  const hasLegacyImage = message.imageUrl && message.imageUrl.trim().length > 0;
  const imageUrl = hasImages ? message.images[0] : (hasLegacyImage ? message.imageUrl : null);
  const hasImage = !!imageUrl;
  const hasText = message.content && message.content.trim().length > 0;
  const hasReply = message.replyToId && message.replyToContent;
  const isPinned = message.isPinned;
  const mentionsAll = message.mentionsAll;
  const isPostShare = message.type === 'post_share';
  const isLocation = message.type === 'location';

  // Pinned message highlight glow animation (react-native-reanimated)
  const highlightOpacity = useSharedValue(0);

  useEffect(() => {
    if (isHighlighted) {
      highlightOpacity.value = withSequence(
        withTiming(1, { duration: 300 }),
        withDelay(500, withTiming(0, { duration: 600 }))
      );
    } else {
      highlightOpacity.value = 0;
    }
  }, [isHighlighted]);

  const highlightAnimatedStyle = useAnimatedStyle(() => ({
    backgroundColor: isDarkMode
      ? `rgba(180, 190, 255, ${highlightOpacity.value * 0.10})`
      : `rgba(100, 130, 255, ${highlightOpacity.value * 0.08})`,
  }));

  // Parse post share metadata
  const postShareData = React.useMemo(() => {
    if (!isPostShare) return null;
    try {
      if (typeof message.content === 'string') {
        return JSON.parse(message.content);
      }
      return message.content;
    } catch (e) {
      return null;
    }
  }, [isPostShare, message.content]);

  // Parse location data
  const locationData = React.useMemo(() => {
    if (!isLocation) return null;
    try {
      const parts = (message.content || '').split(',');
      if (parts.length >= 2) {
        return { lat: parseFloat(parts[0]), long: parseFloat(parts[1]) };
      }
      return null;
    } catch (e) {
      return null;
    }
  }, [isLocation, message.content]);

  const handleLongPress = () => {
    if (selectionMode && onToggleSelect) {
      onToggleSelect(message.$id);
      return;
    }
    setActionsVisible(true);
  };

  const handlePress = () => {
    if (selectionMode && onToggleSelect) {
      onToggleSelect(message.$id);
    }
  };

  const handleAction = (action) => {
    setActionsVisible(false);
    if (action) {
      setTimeout(action, 100);
    }
  };

  const parseMessageReactions = (value) => {
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

  const reactionsMap = parseMessageReactions(message.reactions);
  const reactionEntries = Object.entries(reactionsMap)
    .filter(([, users]) => Array.isArray(users) && users.length > 0);
  const hasCurrentUserReaction = currentUserId
    ? Object.values(reactionsMap).some(users => Array.isArray(users) && users.includes(currentUserId))
    : false;
  const quickReactions = reactionDefaults.length > 0
    ? reactionDefaults
    : ['👍', '❤️', '😂', '😡', '😕'];

  const handleReactionSelect = (emoji, closePicker = false) => {
    if (!emoji || !onToggleReaction) return;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    onToggleReaction(message, emoji);
    if (closePicker) {
      setReactionPickerVisible(false);
    }
  };

  const showCornerReactionAdd = !isCurrentUser && !!onToggleReaction && !selectionMode && !hasCurrentUserReaction;

  // Render message content with @everyone highlighting, link detection, and search highlighting
  const renderMessageContent = () => {
    if (!hasText) return null;
    
    const content = message.content;
    
    // Helper to highlight search matches in text
    const highlightSearchMatches = (text, keyPrefix = '') => {
      if (!searchQuery || searchQuery.trim().length === 0) {
        return text;
      }
      
      const query = searchQuery.toLowerCase();
      const lowerText = text.toLowerCase();
      const parts = [];
      let lastIndex = 0;
      let matchIndex = lowerText.indexOf(query, lastIndex);
      
      while (matchIndex !== -1) {
        // Add text before match
        if (matchIndex > lastIndex) {
          parts.push(text.substring(lastIndex, matchIndex));
        }
        // Add highlighted match
        parts.push(
          <Text 
            key={`${keyPrefix}-match-${matchIndex}`} 
            style={[
              styles.searchHighlight, 
              { 
                backgroundColor: isCurrentSearchResult ? '#FFEB3B' : '#FFF176',
                color: '#000000',
              }
            ]}
          >
            {text.substring(matchIndex, matchIndex + query.length)}
          </Text>
        );
        lastIndex = matchIndex + query.length;
        matchIndex = lowerText.indexOf(query, lastIndex);
      }
      
      // Add remaining text
      if (lastIndex < text.length) {
        parts.push(text.substring(lastIndex));
      }
      
      return parts.length > 0 ? parts : text;
    };
    
    // URL regex pattern
    const urlPattern = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;
    // Pattern for @everyone/@all and @username (username can contain letters, numbers, spaces)
    const everyoneMentionPattern = /(@everyone|@all)/gi;
    const userMentionPattern = /@([a-zA-Z0-9\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\u0980-\u09FF\s]+?)(?=\s|$|[.,!?;:])/g;
    
    // Combined pattern for links, @everyone, and @username mentions
    const combinedPattern = new RegExp(`(${urlPattern.source}|${everyoneMentionPattern.source}|@[a-zA-Z0-9\\u0600-\\u06FF\\u0750-\\u077F\\u08A0-\\u08FF\\u0980-\\u09FF\\s]+?)(?=\\s|$|[.,!?;:])`, 'gi');
    
    const parts = content.split(combinedPattern).filter(Boolean);
    
    const handleLinkPress = (url) => {
      let finalUrl = url;
      if (url.startsWith('www.')) {
        finalUrl = 'https://' + url;
      }
      Linking.openURL(finalUrl);
    };

    // Handle user mention press - find user and show preview
    const handleMentionPress = (mentionText) => {
      // Remove @ symbol
      const username = mentionText.substring(1).trim();
      
      // Try to find the user in mentions array or group members
      let mentionedUser = null;
      
      // Check message.mentions array if available
      if (message.mentions && Array.isArray(message.mentions)) {
        // This would need user lookup, for now we'll use groupMembers
      }
      
      // Look up in groupMembers if provided
      if (groupMembers && groupMembers.length > 0) {
        mentionedUser = groupMembers.find(member => {
          const memberName = member?.name || member?.fullName || '';
          return memberName.toLowerCase() === username.toLowerCase();
        });
      }
      
      // If we found a user, show preview
      if (mentionedUser) {
        setMentionPreview({
          id: mentionedUser.$id || mentionedUser.id,
          name: mentionedUser.name || mentionedUser.fullName,
          profilePicture: mentionedUser.profilePicture,
        });
      }
    };
    
    // Reset URL pattern last index
    urlPattern.lastIndex = 0;
    everyoneMentionPattern.lastIndex = 0;
    
    const hasSpecialContent = urlPattern.test(content) || everyoneMentionPattern.test(content) || /@\w+/.test(content);
    
    // Reset again after test
    urlPattern.lastIndex = 0;
    everyoneMentionPattern.lastIndex = 0;
    
    if (hasSpecialContent) {
      return (
        <Text style={[
          styles.messageText,
          { 
            fontSize: fontSize(14),
            color: isCurrentUser ? '#FFFFFF' : theme.text 
          },
          hasImage && styles.messageTextWithImage,
        ]}>
          {parts.map((part, index) => {
            if (part.toLowerCase() === '@everyone' || part.toLowerCase() === '@all') {
              return (
                <Text key={index} style={[styles.mentionHighlight, { color: isCurrentUser ? '#93C5FD' : theme.primary }]}>
                  {highlightSearchMatches(part, `mention-${index}`)}
                </Text>
              );
            }
            // Check for user mentions (@username)
            if (part.startsWith('@') && part.length > 1 && part.toLowerCase() !== '@everyone' && part.toLowerCase() !== '@all') {
              return (
                <Text 
                  key={index} 
                  style={[styles.userMentionText, { color: isCurrentUser ? '#93C5FD' : theme.primary }]}
                  onPress={() => handleMentionPress(part)}
                >
                  {highlightSearchMatches(part, `user-${index}`)}
                </Text>
              );
            }
            // Reset before test
            urlPattern.lastIndex = 0;
            if (urlPattern.test(part)) {
              urlPattern.lastIndex = 0;
              return (
                <Text 
                  key={index} 
                  style={[styles.linkText, { color: isCurrentUser ? '#93C5FD' : theme.primary }]}
                  onPress={() => handleLinkPress(part)}
                >
                  {highlightSearchMatches(part, `link-${index}`)}
                </Text>
              );
            }
            return <Text key={index}>{highlightSearchMatches(part, `text-${index}`)}</Text>;
          })}
        </Text>
      );
    }

    return (
      <Text style={[
        styles.messageText,
        { 
          fontSize: fontSize(14),
          color: isCurrentUser ? '#FFFFFF' : theme.text 
        },
        hasImage && styles.messageTextWithImage,
      ]}>
        {highlightSearchMatches(content, 'content')}
      </Text>
    );
  };

  const actionButtons = [
    { icon: 'copy-outline', label: t('chats.copy'), action: onCopy, show: hasText },
    { icon: 'arrow-undo-outline', label: t('chats.reply'), action: onReply, show: true },
    { icon: 'arrow-redo-outline', label: t('chats.forward'), action: onForward, show: true },
    { icon: isPinned ? 'pin' : 'pin-outline', label: isPinned ? t('chats.unpin') : t('chats.pin'), action: isPinned ? onUnpin : onPin, show: onPin || onUnpin },
    { icon: isBookmarked ? 'bookmark' : 'bookmark-outline', label: isBookmarked ? t('chats.unbookmark') : t('chats.bookmark'), action: isBookmarked ? onUnbookmark : onBookmark, show: onBookmark || onUnbookmark },
    { icon: 'trash-outline', label: t('common.delete'), action: onDelete, show: isCurrentUser && onDelete, danger: true },
  ].filter(btn => btn.show);

  // Render bubble content (used by both gradient and solid bubbles)
  const renderBubbleContent = () => (
    <>
      {/* Pinned indicator */}
      {isPinned && (
        <View style={styles.pinnedIndicator}>
          <Ionicons name="pin" size={moderateScale(12)} color={isCurrentUser ? 'rgba(255,255,255,0.7)' : theme.primary} />
          <Text style={[styles.pinnedText, { color: isCurrentUser ? 'rgba(255,255,255,0.7)' : theme.primary, fontSize: fontSize(9) }]}>
            {t('chats.pinnedMessages').split(' ')[0]}
          </Text>
        </View>
      )}
      
      {hasReply && (
        <View style={[
          styles.replyContainer,
          { 
            borderLeftColor: isCurrentUser ? 'rgba(255,255,255,0.5)' : theme.primary,
          }
        ]}>
          <Text style={[
            styles.replyToSender, 
            { 
              fontSize: fontSize(10), 
              color: isCurrentUser ? 'rgba(255,255,255,0.9)' : theme.primary 
            }
          ]}>
            {message.replyToSender || t('common.user')}
          </Text>
          <Text 
            style={[
              styles.replyToContent, 
              { 
                fontSize: fontSize(11), 
                color: isCurrentUser ? 'rgba(255,255,255,0.7)' : theme.textSecondary 
              }
            ]}
            numberOfLines={1}>
            {message.replyToContent}
          </Text>
        </View>
      )}

      {/* Shared Post Card */}
      {isPostShare && postShareData && (
        <TouchableOpacity
          activeOpacity={0.8}
          disabled={selectionMode}
          onPress={() => onPostPress && onPostPress(postShareData.postId)}
          style={[styles.postShareCard, { 
            backgroundColor: isCurrentUser ? 'rgba(255,255,255,0.12)' : (isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'),
            borderWidth: 1,
            borderColor: isCurrentUser ? 'rgba(255,255,255,0.15)' : (isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'),
          }]}>
          {postShareData.thumbnailUrl ? (
            <Image
              source={{ uri: postShareData.thumbnailUrl }}
              style={styles.postShareThumbnail}
              resizeMode="cover"
            />
          ) : null}
          <View style={styles.postShareInfo}>
            <View style={styles.postShareHeaderRow}>
              <Ionicons name="newspaper-outline" size={moderateScale(14)} color={isCurrentUser ? 'rgba(255,255,255,0.7)' : theme.primary} />
              <Text style={[styles.postShareLabel, { color: isCurrentUser ? 'rgba(255,255,255,0.7)' : theme.primary, fontSize: fontSize(10), fontWeight: '600' }]}>
                {t('post.sharedPost') || 'Shared Post'}
              </Text>
            </View>
            <Text
              style={[
                styles.postShareTitle,
                { color: isCurrentUser ? '#FFFFFF' : theme.text, fontSize: fontSize(14) },
              ]}
              numberOfLines={2}>
              {postShareData.title || t('post.sharedPost')}
            </Text>
            {postShareData.summaryText ? (
              <Text
                style={[
                  styles.postShareSummary,
                  { color: isCurrentUser ? 'rgba(255,255,255,0.7)' : theme.textSecondary, fontSize: fontSize(12) },
                ]}
                numberOfLines={2}>
                {postShareData.summaryText}
              </Text>
            ) : null}
          </View>
          <View style={styles.postShareFooter}>
            <Text style={[styles.postShareLabel, { color: isCurrentUser ? 'rgba(255,255,255,0.5)' : theme.textSecondary, fontSize: fontSize(10) }]}>
              {t('chats.tapToView')}
            </Text>
            <Ionicons name="chevron-forward" size={moderateScale(12)} color={isCurrentUser ? 'rgba(255,255,255,0.5)' : theme.textSecondary} />
          </View>
        </TouchableOpacity>
      )}

      {/* Location Bubble with Map Preview */}
      {isLocation && locationData && (
        <Pressable
          disabled={selectionMode}
          onPress={() => {
            const { lat, long } = locationData;
            const url = RNPlatform.select({
              ios: `http://maps.apple.com/?ll=${lat},${long}&q=${lat},${long}`,
              android: `geo:${lat},${long}?q=${lat},${long}`,
            });
            Linking.openURL(url).catch(() => {
              // Fallback to web if native map app is not available
              Linking.openURL(`https://www.google.com/maps?q=${lat},${long}`);
            });
          }}
          style={styles.locationCard}>
          <View style={styles.locationMapPreviewContainer}>
            <LeafletMap
              containerStyle={styles.locationMapPreview}
              interactive={false}
              zoom={16}
              markers={[{
                latitude: locationData.lat,
                longitude: locationData.long,
                title: t('chats.location'),
              }]}
              initialRegion={{
                latitude: locationData.lat,
                longitude: locationData.long,
              }}
            />
          </View>
          <View style={styles.locationInfo}>
            <Ionicons name="navigate-outline" size={moderateScale(14)} color={isCurrentUser ? 'rgba(255,255,255,0.8)' : theme.primary} />
            <Text style={[styles.locationText, { color: isCurrentUser ? '#FFFFFF' : theme.text, fontSize: fontSize(12) }]}>
              {`${locationData.lat.toFixed(4)}, ${locationData.long.toFixed(4)}`}
            </Text>
          </View>
          <Text style={[styles.locationHint, { color: isCurrentUser ? 'rgba(255,255,255,0.5)' : theme.textSecondary, fontSize: fontSize(10) }]}>
            {t('chats.tapToOpenMap')}
          </Text>
        </Pressable>
      )}

      {!isPostShare && !isLocation && hasImage && (
        <TouchableOpacity 
          onPress={() => setImageModalVisible(true)}
          disabled={selectionMode}
          activeOpacity={0.9}>
          <Image 
            source={{ uri: imageUrl }}
            style={[
              styles.messageImage,
              !hasText && styles.messageImageOnly,
            ]}
            resizeMode="cover"
          />
        </TouchableOpacity>
      )}

      {!isPostShare && !isLocation && renderMessageContent()}
      
      <View style={styles.timeStatusRow}>
        <Text style={[
          styles.timeText,
          { 
            fontSize: fontSize(9),
            color: isCurrentUser 
              ? 'rgba(255,255,255,0.6)' 
              : theme.textSecondary
          }
        ]}>
          {formatTime(message.createdAt || message.$createdAt)}
        </Text>
        
        {/* Status indicator for current user's messages */}
        {isCurrentUser && (
          <MessageStatusIndicator
            status={message._status || message.status}
            readBy={message.readBy}
            deliveredTo={message.deliveredTo}
            chatType={chatType}
            otherUserPhoto={otherUserPhoto}
            otherUserName={otherUserName}
            participantCount={participantCount}
            theme={theme}
            isDarkMode={isDarkMode}
            isLastSeenMessage={isLastSeenMessage}
          />
        )}
      </View>
      
      {/* Retry button for failed messages */}
      {message._status === 'failed' && onRetry && (
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={() => onRetry(message)}
        >
          <Ionicons name="refresh" size={moderateScale(12)} color="#EF4444" />
          <Text style={styles.retryText}>{t('common.retry') || 'Retry'}</Text>
        </TouchableOpacity>
      )}
    </>
  );

  return (
    <ReanimatedView style={[
      styles.container,
      isCurrentUser ? styles.currentUserContainer : styles.otherUserContainer,
      isCurrentSearchResult && styles.currentSearchResultContainer,
      highlightAnimatedStyle,
    ]}>
      {/* Selection Mode Checkbox */}
      {selectionMode && (
        <TouchableOpacity
          style={styles.selectionCheckbox}
          onPress={() => onToggleSelect && onToggleSelect(message.$id)}
          activeOpacity={0.7}>
          <Ionicons
            name={isSelected ? 'checkbox' : 'square-outline'}
            size={moderateScale(22)}
            color={isSelected ? theme.primary : theme.textSecondary}
          />
        </TouchableOpacity>
      )}

      {/* Show sender name for other users */}
      {!isCurrentUser && senderName && (
        <View style={[styles.senderNameRow, styles.senderNameWithAvatar]}>
          <Text style={[
            styles.senderName, 
            { fontSize: fontSize(11), color: theme.primary }
          ]}>
            {senderName}
          </Text>
          {isRepresentative && (
            <View style={[styles.repBadge, { backgroundColor: theme.warning }]}>
              <Ionicons name="star" size={8} color="#FFFFFF" />
              <Text style={styles.repBadgeText}>{t('chats.rep') || 'Rep'}</Text>
            </View>
          )}
        </View>
      )}
      
      <View style={styles.messageRow}>
        {/* Show avatar for other users - always reserve space for consistent alignment */}
        {!isCurrentUser && (
          <View style={styles.avatarContainer}>
            {showAvatar ? (
              <TouchableOpacity 
                onPress={() => onAvatarPress && onAvatarPress(message.senderId)}
                activeOpacity={0.7}
              >
                <ProfilePicture 
                  uri={senderPhoto || message.senderPhoto}
                  name={senderName || message.senderName}
                  size={moderateScale(28)}
                />
              </TouchableOpacity>
            ) : (
              <View style={styles.avatarPlaceholder} />
            )}
          </View>
        )}
        
        <Animated.View 
          style={[
            { transform: [{ translateX }] },
            styles.bubbleWrapper,
          ]}
          {...panResponder.panHandlers}>
          {/* Render bubble with gradient or solid color based on chatSettings */}
          {isCurrentUser && chatSettings?.bubbleColor?.startsWith('gradient::') ? (
            <Pressable
              onLongPress={handleLongPress}
              onPress={handlePress}
              delayLongPress={300}>
              <LinearGradient
                colors={chatSettings.bubbleColor.replace('gradient::', '').split(',')}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[
                  styles.bubble,
                  styles.currentUserBubble,
                  getBubbleStyleRadius(chatSettings?.bubbleStyle),
                  hasImage && !hasText && styles.imageBubble,
                  isPinned && styles.pinnedBubble,
                ]}>
                {renderBubbleContent()}
              </LinearGradient>
            </Pressable>
          ) : (
            <Pressable
              onLongPress={handleLongPress}
              onPress={handlePress}
              delayLongPress={300}
              style={[
                styles.bubble,
                isCurrentUser ? styles.currentUserBubble : styles.otherUserBubble,
                getBubbleStyleRadius(chatSettings?.bubbleStyle),
                {
                  backgroundColor: isCurrentUser 
                    ? (chatSettings?.bubbleColor || '#667eea')
                    : (isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)')
                },
                hasImage && !hasText && styles.imageBubble,
                isPinned && styles.pinnedBubble,
              ]}>
              {renderBubbleContent()}
            </Pressable>
          )}

          {showCornerReactionAdd && (
            <TouchableOpacity
              style={styles.reactionAddCorner}
              onPress={() => setReactionPickerVisible(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={moderateScale(14)} color={theme.textSecondary} />
            </TouchableOpacity>
          )}
        </Animated.View>
      </View>

      {reactionEntries.length > 0 && (
        <View style={[
          styles.reactionsRow,
          isCurrentUser ? styles.reactionsRowRight : styles.reactionsRowLeft,
        ]}>
          {reactionEntries.map(([emoji, users]) => {
            const count = users.length;
            const reacted = currentUserId ? users.includes(currentUserId) : false;
            return (
              <TouchableOpacity
                key={`${emoji}-${count}`}
                style={[
                  styles.reactionChip,
                  reacted && { backgroundColor: isDarkMode ? 'rgba(102,126,234,0.25)' : 'rgba(102,126,234,0.18)' },
                ]}
                onPress={() => handleReactionSelect(emoji)}
                activeOpacity={0.8}
              >
                <Text style={styles.reactionEmojiChipText}>{emoji}</Text>
                <Text style={[styles.reactionCount, { color: isCurrentUser ? 'rgba(255,255,255,0.85)' : theme.textSecondary }]}>
                  {count}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Swipe indicator */}
      <View style={[
        styles.swipeIndicator,
        isCurrentUser ? styles.swipeIndicatorLeft : styles.swipeIndicatorRight,
      ]}>
        <Ionicons 
          name="arrow-undo" 
          size={moderateScale(16)} 
          color={theme.textSecondary} 
        />
      </View>

      {/* Image Modal - Zoomable */}
      <ZoomableImageModal
        visible={imageModalVisible}
        images={hasImages ? message.images : (imageUrl ? [imageUrl] : [])}
        initialIndex={0}
        onClose={() => setImageModalVisible(false)}
        showDownload={true}
        showShare={true}
      />

      {/* Actions Modal */}
      <Modal
        visible={actionsVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setActionsVisible(false)}>
        <Pressable 
          style={styles.actionsOverlay}
          onPress={() => setActionsVisible(false)}>
          <View style={[
            styles.actionsContainer,
            { backgroundColor: isDarkMode ? '#2a2a40' : '#FFFFFF' }
          ]}>
            {onToggleReaction && (
              <View style={styles.reactionQuickRow}>
                {quickReactions.map((emoji) => (
                  <TouchableOpacity
                    key={emoji}
                    style={styles.reactionQuickButton}
                    onPress={() => {
                      setActionsVisible(false);
                      handleReactionSelect(emoji);
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.reactionEmojiText}>{emoji}</Text>
                  </TouchableOpacity>
                ))}
                {onEditReactions && (
                  <TouchableOpacity
                    style={styles.reactionQuickIcon}
                    onPress={() => {
                      setActionsVisible(false);
                      setTimeout(onEditReactions, 100);
                    }}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="settings-outline" size={moderateScale(16)} color={theme.textSecondary} />
                  </TouchableOpacity>
                )}
              </View>
            )}
            {actionButtons.map((btn, index) => (
              <TouchableOpacity
                key={btn.icon}
                style={[
                  styles.actionButton,
                  index < actionButtons.length - 1 && styles.actionButtonBorder,
                  { borderBottomColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }
                ]}
                onPress={() => handleAction(btn.action)}>
                <Ionicons 
                  name={btn.icon} 
                  size={moderateScale(20)} 
                  color={btn.danger ? '#EF4444' : theme.text} 
                />
                <Text style={[
                  styles.actionLabel,
                  { 
                    fontSize: fontSize(14), 
                    color: btn.danger ? '#EF4444' : theme.text 
                  }
                ]}>
                  {btn.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>

      <Modal
        visible={reactionPickerVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setReactionPickerVisible(false)}>
        <Pressable
          style={styles.reactionPickerOverlay}
          onPress={() => setReactionPickerVisible(false)}
        >
          <Pressable
            style={[
              styles.reactionPickerContent,
              { backgroundColor: isDarkMode ? '#2a2a40' : '#FFFFFF' }
            ]}
            onPress={() => {}}
          >
            <Text style={[styles.reactionPickerTitle, { color: theme.text, fontSize: fontSize(14) }]}>
              {t('chats.addReaction')}
            </Text>

            <View style={styles.reactionPickerRow}>
              {quickReactions.map((emoji) => (
                <TouchableOpacity
                  key={`picker-${emoji}`}
                  style={styles.reactionQuickButton}
                  onPress={() => handleReactionSelect(emoji, true)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.reactionEmojiText}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>

          </Pressable>
        </Pressable>
      </Modal>

      {/* Mention Preview Modal - Compact popup showing user profile */}
      <Modal
        visible={!!mentionPreview}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setMentionPreview(null)}>
        <Pressable 
          style={styles.mentionPreviewOverlay}
          onPress={() => setMentionPreview(null)}>
          <View style={[
            styles.mentionPreviewContainer,
            { backgroundColor: isDarkMode ? '#2a2a40' : '#FFFFFF' }
          ]}>
            {mentionPreview && (
              <>
                <View style={styles.mentionPreviewHeader}>
                  {mentionPreview.profilePicture ? (
                    <Image 
                      source={{ uri: mentionPreview.profilePicture }} 
                      style={styles.mentionPreviewAvatar}
                    />
                  ) : (
                    <View style={[styles.mentionPreviewAvatarPlaceholder, { backgroundColor: theme.primary }]}>
                      <Text style={styles.mentionPreviewAvatarText}>
                        {(mentionPreview.name || '?')[0].toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <Text style={[styles.mentionPreviewName, { color: theme.text, fontSize: fontSize(16) }]}>
                    {mentionPreview.name}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.mentionPreviewButton, { backgroundColor: theme.primary }]}
                  onPress={() => {
                    setMentionPreview(null);
                    if (onNavigateToProfile && mentionPreview.id) {
                      onNavigateToProfile(mentionPreview.id);
                    } else if (onAvatarPress && mentionPreview.id) {
                      onAvatarPress(mentionPreview.id);
                    }
                  }}
                  activeOpacity={0.7}>
                  <Ionicons name="person-outline" size={moderateScale(16)} color="#FFFFFF" />
                  <Text style={[styles.mentionPreviewButtonText, { fontSize: fontSize(14) }]}>
                    {t('chats.visitProfile')}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </Pressable>
      </Modal>
    </ReanimatedView>
  );
};

// Helper function to get bubble radius based on style
const getBubbleStyleRadius = (bubbleStyle) => {
  switch (bubbleStyle) {
    case 'minimal':
      return { borderRadius: borderRadius.sm };
    case 'sharp':
      return { borderRadius: borderRadius.xs };
    case 'bubble':
      return { borderRadius: borderRadius.xxl || 24 };
    case 'classic':
      return { borderRadius: borderRadius.md };
    default: // modern
      return { borderRadius: borderRadius.lg };
  }
};

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing.xs / 2,
    paddingHorizontal: spacing.sm,
    position: 'relative',
  },
  currentUserContainer: {
    alignItems: 'flex-end',
  },
  otherUserContainer: {
    alignItems: 'flex-start',
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  avatarContainer: {
    width: moderateScale(32),
    marginRight: spacing.xs,
    marginBottom: spacing.xs / 2,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  avatarPlaceholder: {
    width: moderateScale(28),
    height: moderateScale(1),
  },
  bubbleWrapper: {
    maxWidth: '80%',
    position: 'relative',
  },
  senderName: {
    fontWeight: '600',
    marginBottom: 2,
  },
  senderNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
    gap: 4,
  },
  senderNameWithAvatar: {
    marginLeft: moderateScale(36),
  },
  repBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    gap: 2,
  },
  repBadgeText: {
    fontSize: fontSize(9),
    fontWeight: '700',
    color: '#FFFFFF',
  },
  bubble: {
    maxWidth: moderateScale(280),
    minWidth: moderateScale(60),
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  imageBubble: {
    padding: spacing.xs / 2,
  },
  currentUserBubble: {
    borderBottomRightRadius: spacing.xs,
  },
  otherUserBubble: {
    borderBottomLeftRadius: spacing.xs,
  },
  pinnedBubble: {
    borderWidth: 1,
    borderColor: 'rgba(102, 126, 234, 0.5)',
  },
  pinnedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs / 2,
    gap: 2,
  },
  pinnedText: {
    fontWeight: '500',
  },
  mentionHighlight: {
    backgroundColor: 'rgba(102, 126, 234, 0.3)',
    borderRadius: 2,
    fontWeight: '600',
  },
  linkText: {
    textDecorationLine: 'underline',
    fontWeight: '500',
  },
  replyContainer: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    marginBottom: spacing.sm,
    borderLeftWidth: 3,
    borderRadius: borderRadius.sm,
    backgroundColor: 'transparent',
  },
  replyToSender: {
    fontWeight: '600',
    marginBottom: 2,
  },
  replyToContent: {
    fontWeight: '400',
  },
  messageImage: {
    width: moderateScale(180),
    height: moderateScale(180),
    borderRadius: borderRadius.md,
    marginBottom: spacing.xs / 2,
  },
  messageImageOnly: {
    marginBottom: 0,
  },
  messageText: {
    lineHeight: fontSize(14) * 1.5,
  },
  messageTextWithImage: {
    marginTop: spacing.xs,
  },
  timeText: {
    alignSelf: 'flex-end',
    marginTop: spacing.xs / 2,
  },
  swipeIndicator: {
    position: 'absolute',
    top: '50%',
    marginTop: -moderateScale(8),
    opacity: 0.3,
  },
  swipeIndicatorLeft: {
    left: spacing.xs,
  },
  swipeIndicatorRight: {
    right: spacing.xs,
  },
  timeStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: spacing.xs,
  },
  reactionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  reactionsRowLeft: {
    alignSelf: 'flex-start',
    marginLeft: moderateScale(36),
  },
  reactionsRowRight: {
    alignSelf: 'flex-end',
    marginRight: spacing.sm,
  },
  reactionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(0,0,0,0.08)',
  },
  reactionEmojiText: {
    fontSize: moderateScale(18),
  },
  reactionEmojiChipText: {
    fontSize: moderateScale(14),
  },
  reactionCount: {
    fontSize: fontSize(12),
    fontWeight: '600',
  },
  reactionAddCorner: {
    position: 'absolute',
    top: -moderateScale(6),
    right: -moderateScale(6),
    width: moderateScale(26),
    height: moderateScale(26),
    borderRadius: moderateScale(13),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.08)',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
    paddingVertical: spacing.xs,
  },
  retryText: {
    color: '#EF4444',
    fontSize: fontSize(10),
    fontWeight: '500',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: moderateScale(50),
    right: moderateScale(20),
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: moderateScale(18),
    padding: spacing.sm,
  },
  fullImage: {
    width: '95%',
    height: '80%',
  },
  actionsOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionsContainer: {
    width: '70%',
    maxWidth: wp(75),
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  reactionQuickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.08)',
  },
  reactionQuickButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  reactionQuickIcon: {
    width: moderateScale(26),
    height: moderateScale(26),
    borderRadius: moderateScale(13),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  actionButtonBorder: {
    borderBottomWidth: 1,
  },
  actionLabel: {
    fontWeight: '500',
  },
  reactionPickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  reactionPickerContent: {
    width: '100%',
    maxWidth: wp(70),
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  reactionPickerTitle: {
    fontWeight: '600',
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  reactionPickerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  // User mention styles
  userMentionText: {
    fontWeight: '600',
    textDecorationLine: 'none',
  },
  // Mention preview modal styles
  mentionPreviewOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mentionPreviewContainer: {
    width: moderateScale(220),
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  mentionPreviewHeader: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  mentionPreviewAvatar: {
    width: moderateScale(64),
    height: moderateScale(64),
    borderRadius: moderateScale(32),
    marginBottom: spacing.sm,
  },
  mentionPreviewAvatarPlaceholder: {
    width: moderateScale(64),
    height: moderateScale(64),
    borderRadius: moderateScale(32),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  mentionPreviewAvatarText: {
    color: '#FFFFFF',
    fontSize: moderateScale(24),
    fontWeight: '600',
  },
  mentionPreviewName: {
    fontWeight: '600',
    textAlign: 'center',
  },
  mentionPreviewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    gap: spacing.xs,
    width: '100%',
  },
  mentionPreviewButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  // Search highlight styles
  searchHighlight: {
    borderRadius: 2,
    paddingHorizontal: 2,
  },
  currentSearchResult: {
    borderWidth: 2,
    borderColor: '#FFEB3B',
  },
  currentSearchResultContainer: {
    backgroundColor: 'rgba(255, 235, 59, 0.15)',
    borderRadius: borderRadius.md,
    marginHorizontal: -spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  // Selection mode styles
  selectionCheckbox: {
    position: 'absolute',
    left: spacing.xs,
    top: spacing.sm,
    zIndex: 5,
    padding: spacing.xs,
  },
  // Post share card styles
  postShareCard: {
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    width: moderateScale(220),
  },
  postShareThumbnail: {
    width: '100%',
    height: moderateScale(120),
    borderRadius: borderRadius.md,
    marginBottom: spacing.xs,
  },
  postShareInfo: {
    paddingHorizontal: spacing.xs,
  },
  postShareHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs / 2,
    marginBottom: spacing.xs / 2,
  },
  postShareTitle: {
    fontWeight: '700',
    marginBottom: spacing.xs / 2,
  },
  postShareSummary: {
    fontWeight: '400',
    lineHeight: fontSize(12) * 1.4,
  },
  postShareFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs / 2,
    paddingHorizontal: spacing.xs,
    marginTop: spacing.xs,
  },
  postShareLabel: {
    fontWeight: '500',
  },
  // Location card styles
  locationCard: {
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    width: moderateScale(220),
  },
  locationMapPreviewContainer: {
    width: '100%',
    height: moderateScale(140),
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    backgroundColor: 'rgba(0,0,0,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationMapPreview: {
    width: '100%',
    height: moderateScale(140),
    minHeight: moderateScale(140),
  },
  locationMapOverlay: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationGradient: {
    width: '100%',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderRadius: borderRadius.md,
  },
  locationButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: fontSize(14),
    marginTop: spacing.xs,
  },
  locationCoords: {
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '400',
    fontSize: fontSize(10),
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs / 2,
    marginTop: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  locationText: {
    fontWeight: '500',
  },
  locationHint: {
    fontWeight: '400',
    paddingHorizontal: spacing.xs,
    marginTop: spacing.xs / 2,
  },
});

export default memo(MessageBubble);
