import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
  Modal,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppSettings } from '../context/AppSettingsContext';
import { useUser } from '../context/UserContext';
import ProfilePicture from './ProfilePicture';
import { getAllUserChats } from '../../database/chatHelpers';
import { sendMessage } from '../../database/chats';
import {
  fontSize,
  spacing,
  moderateScale,
  hp,
} from '../utils/responsive';
import { borderRadius } from '../theme/designTokens';

const SharePostToChat = ({ visible, onClose, post, showAlert }) => {
  const { t, theme, isDarkMode } = useAppSettings();
  const { user } = useUser();
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (visible) {
      loadChats();
    }
  }, [visible]);

  const loadChats = async () => {
    try {
      setLoading(true);
      const result = await getAllUserChats(user.$id, user.department, user.stage);
      const allChats = [
        ...(result.defaultGroups || []),
        ...(result.customGroups || []),
        ...(result.privateChats || []),
      ];
      setChats(allChats);
    } catch (error) {
      setChats([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSendToChat = async (chat) => {
    if (sending) return;
    setSending(chat.$id);

    try {
      const metadata = {
        postId: post.$id,
        title: post.topic || '',
        thumbnailUrl: (post.images && post.images.length > 0) ? post.images[0] : '',
        summaryText: post.text ? post.text.substring(0, 150) : '',
      };

      const messageData = {
        content: JSON.stringify(metadata),
        senderId: user.$id,
        senderName: user.fullName || user.name,
        type: 'post_share',
        metadata,
      };

      await sendMessage(chat.$id, messageData);
      onClose();
    } catch (error) {
      if (showAlert) {
        showAlert({
          type: 'error',
          title: t('common.error'),
          message: t('chats.postShareError'),
        });
      }
      setSending(null);
    }
  };

  const getChatName = (chat) => {
    if (chat.type === 'private' && chat.otherUser) {
      return chat.otherUser.name || chat.otherUser.fullName || chat.name;
    }
    return chat.name;
  };

  const filteredChats = chats.filter((chat) => {
    if (!searchQuery) return true;
    const name = getChatName(chat).toLowerCase();
    return name.includes(searchQuery.toLowerCase());
  });

  const renderChatItem = ({ item }) => {
    const chatName = getChatName(item);
    const isPrivate = item.type === 'private';

    return (
      <TouchableOpacity
        style={[
          styles.chatItem,
          {
            backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.9)',
            borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
          },
        ]}
        onPress={() => handleSendToChat(item)}
        disabled={sending === item.$id}>
        <ProfilePicture
          uri={isPrivate ? item.otherUser?.profilePicture : item.groupPhoto}
          name={chatName}
          size={moderateScale(44)}
        />
        <View style={styles.chatInfo}>
          <Text
            style={[styles.chatName, { color: theme.text, fontSize: fontSize(15) }]}
            numberOfLines={1}>
            {chatName}
          </Text>
          <Text style={[styles.chatType, { color: theme.textSecondary, fontSize: fontSize(12) }]}>
            {isPrivate ? t('chats.privateChat') : t('chats.groupChat')}
          </Text>
        </View>
        {sending === item.$id ? (
          <ActivityIndicator size="small" color={theme.primary} />
        ) : (
          <Ionicons name="send" size={moderateScale(20)} color={theme.primary} />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View
          style={[
            styles.container,
            { backgroundColor: isDarkMode ? '#1a1a2e' : '#FFFFFF' },
          ]}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.headerTitle, { color: theme.text, fontSize: fontSize(18) }]}>
              {t('chats.sendToChat')}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={moderateScale(24)} color={theme.text} />
            </TouchableOpacity>
          </View>

          {/* Post Preview */}
          <View
            style={[
              styles.postPreview,
              {
                backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
              },
            ]}>
            <Ionicons name="newspaper-outline" size={moderateScale(18)} color={theme.primary} />
            <Text
              style={[styles.postPreviewText, { color: theme.text, fontSize: fontSize(14) }]}
              numberOfLines={2}>
              {post?.topic || post?.text || ''}
            </Text>
          </View>

          {/* Search */}
          <View style={styles.searchContainer}>
            <View
              style={[
                styles.searchInput,
                {
                  backgroundColor: isDarkMode
                    ? 'rgba(255,255,255,0.1)'
                    : 'rgba(0,0,0,0.05)',
                },
              ]}>
              <Ionicons name="search" size={moderateScale(18)} color={theme.textSecondary} />
              <TextInput
                style={[styles.searchTextInput, { color: theme.text, fontSize: fontSize(14) }]}
                placeholder={t('chats.searchChats')}
                placeholderTextColor={theme.textSecondary}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
          </View>

          {/* Chat List */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.primary} />
            </View>
          ) : (
            <FlatList
              data={filteredChats}
              renderItem={renderChatItem}
              keyExtractor={(item) => item.$id}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={[styles.emptyText, { color: theme.textSecondary, fontSize: fontSize(14) }]}>
                    {t('chats.noChatsFound')}
                  </Text>
                </View>
              }
            />
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  container: {
    width: '100%',
    maxWidth: 700,
    maxHeight: hp(75),
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingBottom: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  headerTitle: {
    fontWeight: '700',
  },
  closeButton: {
    width: moderateScale(36),
    height: moderateScale(36),
    borderRadius: moderateScale(18),
    justifyContent: 'center',
    alignItems: 'center',
  },
  postPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    gap: spacing.sm,
  },
  postPreviewText: {
    flex: 1,
    fontWeight: '400',
  },
  searchContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  searchInput: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
  },
  searchTextInput: {
    flex: 1,
    fontWeight: '400',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  chatInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  chatName: {
    fontWeight: '600',
    marginBottom: 2,
  },
  chatType: {
    fontWeight: '400',
  },
  emptyContainer: {
    paddingTop: hp(10),
    alignItems: 'center',
  },
  emptyText: {
    textAlign: 'center',
  },
});

export default SharePostToChat;
