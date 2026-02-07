import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Linking,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCustomAlert } from '../../hooks/useCustomAlert';
import CustomAlert from '../../components/CustomAlert';

const ReplyItem = ({ 
  reply, 
  onEdit, 
  onDelete, 
  onAccept, 
  onUpvote, 
  onDownvote, 
  onImagePress,
  isOwner, 
  isPostOwner, 
  showAcceptButton,
  t,
  theme,
  isDarkMode 
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const { alertConfig, showAlert, hideAlert } = useCustomAlert();

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

  const handleLinkPress = (link) => {
    const isEmail = link.includes('@') && !link.startsWith('http');
    const url = isEmail ? `mailto:${link}` : (link.startsWith('http') ? link : `https://${link}`);
    Linking.openURL(url).catch(() => {
      showAlert({ type: 'error', title: t('common.error'), message: t('post.linkOpenError') });
    });
  };

  return (
    <View style={[
      styles.replyCard, 
      { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : '#FFFFFF' },
      reply.isAccepted && styles.acceptedReplyCard
    ]}>
      {reply.isAccepted && (
        <View style={styles.acceptedBadge}>
          <Ionicons name="checkmark-circle" size={14} color="#FFFFFF" />
          <Text style={styles.acceptedBadgeText}>{t('post.bestAnswer')}</Text>
        </View>
      )}

      <View style={styles.replyHeader}>
        <View style={styles.replyUserInfo}>
          {reply.userData?.profilePicture ? (
            <Image source={{ uri: reply.userData.profilePicture }} style={styles.replyAvatar} />
          ) : (
            <View style={[styles.replyAvatarPlaceholder, { backgroundColor: isDarkMode ? '#374151' : '#E5E7EB' }]}>
              <Text style={[styles.replyAvatarText, { color: theme.text }]}>
                {reply.userData?.fullName?.charAt(0).toUpperCase() || 'U'}
              </Text>
            </View>
          )}
          <View style={styles.replyUserDetails}>
            <Text style={[styles.replyUserName, { color: theme.text }]}>
              {reply.userData?.fullName || t('common.user')}
            </Text>
            <Text style={[styles.replyTime, { color: theme.textSecondary }]}>
              {formatTime(reply.$createdAt)}
              {reply.isEdited && ` • ${t('post.edited')}`}
            </Text>
          </View>
        </View>

        {(isOwner || isPostOwner) && (
          <TouchableOpacity onPress={() => setShowMenu(true)} style={styles.replyMenuButton}>
            <Ionicons name="ellipsis-horizontal" size={20} color={theme.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      <Text style={[styles.replyText, { color: theme.text }]} selectable>
        {reply.text}
      </Text>

      {reply.links && reply.links.length > 0 && (
        <View style={styles.replyLinksContainer}>
          {reply.links.map((link, index) => {
            const isEmail = link.includes('@') && !link.startsWith('http');
            return (
              <TouchableOpacity
                key={index}
                style={[styles.replyLinkItem, { backgroundColor: isDarkMode ? 'rgba(59,130,246,0.15)' : 'rgba(59,130,246,0.1)' }]}
                onPress={() => handleLinkPress(link)}
              >
                <Ionicons name={isEmail ? 'mail-outline' : 'link-outline'} size={16} color="#3B82F6" />
                <Text style={styles.replyLinkText} numberOfLines={1}>{link}</Text>
                <Ionicons name="open-outline" size={14} color="#3B82F6" />
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {reply.images && reply.images.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.replyImagesContainer}>
          {reply.images.map((imageUrl, index) => (
            <TouchableOpacity 
              key={index} 
              onPress={() => onImagePress(reply.images, index)}
              activeOpacity={0.9}
            >
              <Image source={{ uri: imageUrl }} style={styles.replyImageThumb} />
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <View style={styles.replyVoteContainer}>
        <TouchableOpacity
          style={[
            styles.voteButton,
            (reply.upvotedBy || []).includes(reply.currentUserId) && styles.voteButtonActive
          ]}
          onPress={() => onUpvote(reply)}
        >
          <Ionicons 
            name={(reply.upvotedBy || []).includes(reply.currentUserId) ? 'arrow-up' : 'arrow-up-outline'} 
            size={14} 
            color={(reply.upvotedBy || []).includes(reply.currentUserId) ? '#FFFFFF' : '#10B981'} 
          />
          <Text style={[
            styles.voteCount, 
            { color: (reply.upvotedBy || []).includes(reply.currentUserId) ? '#FFFFFF' : '#10B981' }
          ]}>
            {reply.upCount || 0}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.voteButtonDown,
            (reply.downvotedBy || []).includes(reply.currentUserId) && styles.voteButtonDownActive
          ]}
          onPress={() => onDownvote(reply)}
        >
          <Ionicons 
            name={(reply.downvotedBy || []).includes(reply.currentUserId) ? 'arrow-down' : 'arrow-down-outline'} 
            size={14} 
            color={(reply.downvotedBy || []).includes(reply.currentUserId) ? '#FFFFFF' : '#EF4444'} 
          />
          <Text style={[
            styles.voteCount, 
            { color: (reply.downvotedBy || []).includes(reply.currentUserId) ? '#FFFFFF' : '#EF4444' }
          ]}>
            {reply.downCount || 0}
          </Text>
        </TouchableOpacity>
      </View>

      <Modal visible={showMenu} transparent animationType="fade" onRequestClose={() => setShowMenu(false)}>
        <TouchableOpacity style={styles.menuOverlay} activeOpacity={1} onPress={() => setShowMenu(false)}>
          <View style={[styles.menuContent, { backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF' }]}>
            {isOwner && (
              <>
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => { setShowMenu(false); onEdit(reply); }}
                >
                  <Ionicons name="create-outline" size={22} color="#3B82F6" />
                  <Text style={[styles.menuItemText, { color: '#3B82F6' }]}>{t('post.editReply')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => { setShowMenu(false); onDelete(reply); }}
                >
                  <Ionicons name="trash-outline" size={22} color="#EF4444" />
                  <Text style={[styles.menuItemText, { color: '#EF4444' }]}>{t('post.deleteReply')}</Text>
                </TouchableOpacity>
              </>
            )}
            {isPostOwner && !isOwner && showAcceptButton && (
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => { setShowMenu(false); onAccept(reply); }}
              >
                <Ionicons 
                  name={reply.isAccepted ? 'close-circle-outline' : 'checkmark-circle-outline'} 
                  size={22} 
                  color="#10B981" 
                />
                <Text style={[styles.menuItemText, { color: '#10B981' }]}>
                  {reply.isAccepted ? t('post.unmarkAsAccepted') : t('post.markAsAccepted')}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
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
  replyCard: {
    borderRadius: 12,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  acceptedReplyCard: {
    borderWidth: 1,
    borderColor: '#10B981',
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
  },
  acceptedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#10B981',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 10,
    gap: 4,
  },
  acceptedBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  replyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  replyUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  replyAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
  },
  replyAvatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  replyAvatarText: {
    fontSize: 14,
    fontWeight: '600',
  },
  replyUserDetails: {
    flex: 1,
  },
  replyUserName: {
    fontSize: 14,
    fontWeight: '600',
  },
  replyTime: {
    fontSize: 12,
    marginTop: 2,
  },
  replyMenuButton: {
    padding: 4,
  },
  replyText: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 10,
  },
  replyLinksContainer: {
    marginBottom: 10,
    gap: 8,
  },
  replyLinkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 8,
  },
  replyLinkText: {
    flex: 1,
    fontSize: 13,
    color: '#3B82F6',
  },
  replyImagesContainer: {
    marginBottom: 10,
  },
  replyImageThumb: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 8,
  },
  replyVoteContainer: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
  },
  voteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    gap: 3,
  },
  voteButtonActive: {
    backgroundColor: '#10B981',
  },
  voteButtonDown: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    gap: 3,
  },
  voteButtonDownActive: {
    backgroundColor: '#EF4444',
  },
  voteCount: {
    fontSize: 11,
    fontWeight: '600',
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuContent: {
    width: '80%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: '500',
  },
});

export default ReplyItem;
