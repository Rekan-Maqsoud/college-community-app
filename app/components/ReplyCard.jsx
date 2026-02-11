import React, { useState, memo } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Dimensions,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppSettings } from '../context/AppSettingsContext';
import { useUser } from '../context/UserContext';
import { wp, hp, fontSize, spacing, moderateScale } from '../utils/responsive';
import { borderRadius } from '../theme/designTokens';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const ReplyCard = ({ 
  reply, 
  onEdit,
  onDelete,
  onAccept,
  onUpvote,
  onDownvote,
  isOwner = false,
  isPostOwner = false,
  showAcceptButton = false,
}) => {
  const { t, theme, isDarkMode } = useAppSettings();
  const { user } = useUser();
  const [showMenu, setShowMenu] = useState(false);
  const [imageGalleryVisible, setImageGalleryVisible] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const now = new Date();
    const time = new Date(timestamp);
    const diff = Math.floor((now - time) / 1000);

    if (diff < 60) return t('time.justNow');
    if (diff < 3600) return t('time.minutesAgo').replace('{count}', Math.floor(diff / 60));
    if (diff < 86400) return t('time.hoursAgo').replace('{count}', Math.floor(diff / 3600));
    return t('time.daysAgo').replace('{count}', Math.floor(diff / 86400));
  };

  const handleImagePress = (index) => {
    setSelectedImageIndex(index);
    setImageGalleryVisible(true);
  };

  const renderLinks = () => {
    if (!reply.links || reply.links.length === 0) return null;

    return (
      <View style={[styles.linksContainer, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
        {reply.links.map((link, index) => (
          <TouchableOpacity
            key={index}
            style={[styles.linkItem, { backgroundColor: isDarkMode ? 'rgba(66,135,245,0.1)' : 'rgba(66,135,245,0.1)' }]}
            activeOpacity={0.7}>
            <Ionicons name="link-outline" size={moderateScale(16)} color="#4287f5" />
            <Text 
              style={[styles.linkText, { fontSize: fontSize(12), color: '#4287f5' }]}
              numberOfLines={1}>
              {link}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderImages = () => {
    if (!reply.images || reply.images.length === 0) return null;

    return (
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.imagesScroll}>
        {reply.images.map((imageUrl, index) => (
          <TouchableOpacity
            key={index}
            onPress={() => handleImagePress(index)}
            activeOpacity={0.9}>
            <Image
              source={{ uri: imageUrl }}
              style={styles.replyImage}
              resizeMode="cover"
            />
          </TouchableOpacity>
        ))}
      </ScrollView>
    );
  };

  return (
    <>
      <View 
        style={[
          styles.replyCard,
          reply.isAccepted && styles.acceptedCard
        ]}>
        
        {reply.isAccepted && (
          <View style={[styles.acceptedBadge, { backgroundColor: '#10B981' }]}>
            <Ionicons name="checkmark-circle" size={moderateScale(14)} color="#FFFFFF" />
            <Text style={[styles.acceptedText, { fontSize: fontSize(11) }]}>
              {t('post.bestAnswer')}
            </Text>
          </View>
        )}

        <View style={styles.replyHeader}>
          <View style={styles.userInfo}>
            {reply.userData?.profilePicture ? (
              <Image
                source={{ uri: reply.userData.profilePicture }}
                style={styles.avatarImage}
              />
            ) : (
              <View style={[styles.avatar, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.15)' }]}>
                <Text style={[styles.avatarText, { fontSize: fontSize(14), color: theme.text }]}>
                  {reply.userData?.fullName?.charAt(0).toUpperCase() || 'U'}
                </Text>
              </View>
            )}
            <View style={styles.userDetails}>
              <Text style={[styles.userName, { fontSize: fontSize(13), color: theme.text }]}>
                {reply.userData?.fullName || 'User'}
              </Text>
              <Text style={[styles.timestamp, { fontSize: fontSize(11), color: theme.textSecondary }]}>
                {formatTime(reply.$createdAt)}
                {reply.isEdited && ` • ${t('post.edited')}`}
              </Text>
            </View>
          </View>

          {(isOwner || isPostOwner) && (
            <TouchableOpacity
              onPress={() => setShowMenu(true)}
              style={styles.menuButton}
              activeOpacity={0.7}>
              <Ionicons name="ellipsis-horizontal" size={moderateScale(20)} color={theme.text} />
            </TouchableOpacity>
          )}
        </View>

        <Text style={[styles.replyText, { fontSize: fontSize(14), color: theme.text }]}>
          {reply.text}
        </Text>

        {renderLinks()}
        {renderImages()}

        <View style={styles.voteContainer}>
          <TouchableOpacity
            style={[
              styles.voteButton, 
              { backgroundColor: (reply.upvotedBy || []).includes(user?.$id)
                ? '#4CAF50'
                : isDarkMode ? 'rgba(76,175,80,0.1)' : 'rgba(76,175,80,0.12)' 
              }
            ]}
            onPress={() => onUpvote && onUpvote(reply)}
            activeOpacity={0.7}>
            <Ionicons 
              name={(reply.upvotedBy || []).includes(user?.$id) ? "arrow-up" : "arrow-up-outline"} 
              size={moderateScale(14)} 
              color={(reply.upvotedBy || []).includes(user?.$id) ? "#FFFFFF" : "#4CAF50"} 
            />
            <Text style={[
              styles.voteCount, 
              { 
                fontSize: fontSize(11), 
                color: (reply.upvotedBy || []).includes(user?.$id) ? "#FFFFFF" : "#4CAF50" 
              }
            ]}>
              {reply.upCount || 0}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.voteButton, 
              { backgroundColor: (reply.downvotedBy || []).includes(user?.$id)
                ? '#F44336'
                : isDarkMode ? 'rgba(244,67,54,0.1)' : 'rgba(244,67,54,0.12)' 
              }
            ]}
            onPress={() => onDownvote && onDownvote(reply)}
            activeOpacity={0.7}>
            <Ionicons 
              name={(reply.downvotedBy || []).includes(user?.$id) ? "arrow-down" : "arrow-down-outline"} 
              size={moderateScale(14)} 
              color={(reply.downvotedBy || []).includes(user?.$id) ? "#FFFFFF" : "#F44336"} 
            />
            <Text style={[
              styles.voteCount, 
              { 
                fontSize: fontSize(11), 
                color: (reply.downvotedBy || []).includes(user?.$id) ? "#FFFFFF" : "#F44336" 
              }
            ]}>
              {reply.downCount || 0}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <Modal
        visible={showMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMenu(false)}>
        <TouchableOpacity
          style={styles.menuOverlay}
          activeOpacity={1}
          onPress={() => setShowMenu(false)}>
          <View style={[styles.menuContent, { backgroundColor: theme.card }]}>
            {isOwner && (
              <>
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => {
                    setShowMenu(false);
                    onEdit && onEdit(reply);
                  }}>
                  <Ionicons name="create-outline" size={moderateScale(20)} color={theme.text} />
                  <Text style={[styles.menuItemText, { fontSize: fontSize(14), color: theme.text }]}>
                    {t('post.editReply')}
                  </Text>
                </TouchableOpacity>
                <View style={[styles.menuDivider, { backgroundColor: theme.border }]} />
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => {
                    setShowMenu(false);
                    onDelete && onDelete(reply);
                  }}>
                  <Ionicons name="trash-outline" size={moderateScale(20)} color="#EF4444" />
                  <Text style={[styles.menuItemText, { fontSize: fontSize(14), color: '#EF4444' }]}>
                    {t('post.deleteReply')}
                  </Text>
                </TouchableOpacity>
              </>
            )}
            
            {isPostOwner && !isOwner && showAcceptButton && (
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setShowMenu(false);
                  onAccept && onAccept(reply);
                }}>
                <Ionicons 
                  name={reply.isAccepted ? "close-circle-outline" : "checkmark-circle-outline"} 
                  size={moderateScale(20)} 
                  color="#10B981" 
                />
                <Text style={[styles.menuItemText, { fontSize: fontSize(14), color: '#10B981' }]}>
                  {reply.isAccepted ? t('post.unmarkAsAccepted') : t('post.markAsAccepted')}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal
        visible={imageGalleryVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setImageGalleryVisible(false)}>
        <View style={styles.galleryOverlay}>
          <TouchableOpacity
            style={styles.galleryCloseButton}
            onPress={() => setImageGalleryVisible(false)}>
            <Ionicons name="close" size={moderateScale(30)} color="#FFFFFF" />
          </TouchableOpacity>
          
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            contentOffset={{ x: selectedImageIndex * SCREEN_WIDTH, y: 0 }}>
            {reply.images?.map((imageUrl, index) => (
              <Image
                key={index}
                source={{ uri: imageUrl }}
                style={styles.galleryImage}
                resizeMode="contain"
              />
            ))}
          </ScrollView>

          <View style={styles.galleryCounter}>
            <Text style={[styles.galleryCounterText, { fontSize: fontSize(14) }]}>
              {selectedImageIndex + 1} / {reply.images?.length || 0}
            </Text>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  replyCard: {
    marginBottom: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
  },
  acceptedCard: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderBottomColor: '#10B981',
  },
  acceptedBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: borderRadius.sm,
    gap: spacing.xs / 2,
  },
  acceptedText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  replyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: moderateScale(32),
    height: moderateScale(32),
    borderRadius: moderateScale(16),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.xs,
  },
  avatarImage: {
    width: moderateScale(32),
    height: moderateScale(32),
    borderRadius: moderateScale(16),
    marginRight: spacing.xs,
  },
  avatarText: {
    fontWeight: '600',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontWeight: '600',
    marginBottom: spacing.xs / 2,
  },
  timestamp: {
    opacity: 0.7,
  },
  menuButton: {
    padding: spacing.xs,
  },
  replyText: {
    lineHeight: fontSize(14) * 1.4,
    marginBottom: spacing.xs,
  },
  voteContainer: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  voteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 3,
    borderRadius: borderRadius.xs + 2,
    gap: 2,
  },
  voteCount: {
    fontWeight: '600',
  },
  linksContainer: {
    borderRadius: borderRadius.sm,
    padding: spacing.xs,
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
    gap: spacing.xs / 2,
  },
  linkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.xs,
    borderRadius: borderRadius.xs,
    gap: spacing.xs / 2,
  },
  linkText: {
    flex: 1,
  },
  imagesScroll: {
    marginTop: spacing.xs,
  },
  replyImage: {
    width: moderateScale(100),
    height: moderateScale(100),
    borderRadius: borderRadius.sm,
    marginRight: spacing.xs,
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuContent: {
    width: wp(80),
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    gap: spacing.md,
  },
  menuDivider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: spacing.lg,
    opacity: 0.3,
  },
  menuItemText: {
    fontWeight: '500',
  },
  galleryOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
  },
  galleryCloseButton: {
    position: 'absolute',
    top: hp(6),
    right: wp(5),
    zIndex: 10,
    padding: spacing.sm,
  },
  galleryImage: {
    width: SCREEN_WIDTH,
    height: '100%',
  },
  galleryCounter: {
    position: 'absolute',
    bottom: hp(5),
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
  },
  galleryCounterText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});

export default memo(ReplyCard);
