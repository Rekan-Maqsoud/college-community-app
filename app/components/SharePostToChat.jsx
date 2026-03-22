import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput, 
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
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
import { GlassModalCard } from './GlassComponents';
import { FlashList } from '@shopify/flash-list';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const SharePostToChat = ({ visible, onClose, post, showAlert }) => {
  const { t, theme, isDarkMode } = useAppSettings();
  const { user } = useUser();
  const insets = useSafeAreaInsets();
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const loadChats = useCallback(async () => {
    try {
      setLoading(true);
      const departmentForGroups = user?.department || 'General';
      const stageForGroups = user?.stage || user?.year?.toString() || 'General';
      const result = await getAllUserChats(user.$id, departmentForGroups, stageForGroups);
      const normalized = Array.isArray(result)
        ? { defaultGroups: result, customGroups: [], privateChats: [] }
        : (result || {});

      const allChats = [
        ...(Array.isArray(normalized.defaultGroups) ? normalized.defaultGroups : []),
        ...(Array.isArray(normalized.customGroups) ? normalized.customGroups : []),
        ...(Array.isArray(normalized.privateChats) ? normalized.privateChats : []),
      ];

      const uniqueChats = allChats.filter((chat, index, arr) => {
        const chatId = chat?.$id || chat?.id;
        if (!chatId) {
          return false;
        }
        return arr.findIndex((item) => (item?.$id || item?.id) === chatId) === index;
      });

      console.log('[SharePostToChat] chats:loaded', {
        userId: user?.$id || '',
        total: uniqueChats.length,
      });

      setChats(uniqueChats);
    } catch (error) {
      console.error('[SharePostToChat] chats:loadError', {
        userId: user?.$id || '',
        errorMessage: error?.message || String(error || ''),
      });
      setChats([]);
    } finally {
      setLoading(false);
    }
  }, [user?.$id, user?.department, user?.stage]);

  useEffect(() => {
    if (visible) {
      console.log('[SharePostToChat] modal:visible', {
        visible,
        postId: post?.$id || '',
        userId: user?.$id || '',
        keyboardOffset: Platform.OS === 'ios' ? 12 : insets.bottom + 20,
        insetsBottom: insets.bottom,
      });
      loadChats();
    }
  }, [visible, loadChats, insets.bottom, post?.$id, user?.$id]);

  useEffect(() => {
    if (!visible) {
      return undefined;
    }

    const showSub = Keyboard.addListener('keyboardDidShow', (event) => {
      console.log('[SharePostToChat] keyboard:show', {
        height: event?.endCoordinates?.height || 0,
        duration: event?.duration || 0,
        keyboardOffset: Platform.OS === 'ios' ? 12 : insets.bottom + 20,
      });
    });

    const hideSub = Keyboard.addListener('keyboardDidHide', () => {
      console.log('[SharePostToChat] keyboard:hide', {
        keyboardOffset: Platform.OS === 'ios' ? 12 : insets.bottom + 20,
      });
    });

    return () => {
      showSub?.remove?.();
      hideSub?.remove?.();
    };
  }, [insets.bottom, visible]);

  const postLinks = useMemo(() => {
    const postId = post?.$id ? String(post.$id).trim() : '';
    const app = postId ? `https://collegecommunity.app/post/${postId}` : '';
    return {
      postId,
      app,
      canonical: app,
    };
  }, [post?.$id]);

  const handleSendToChat = async (chat) => {
    if (sending) return;
    const chatId = chat?.$id || chat?.id;
    if (!chatId) {
      console.warn('[SharePostToChat] send:missingChatId', {
        rawChat: chat || null,
      });
      return;
    }

    setSending(chatId);

    try {
      const metadata = {
        postId: postLinks.postId,
        deepLink: postLinks.canonical,
        deeplink: postLinks.canonical,
        title: post.topic || '',
        thumbnailUrl: (post.images && post.images.length > 0) ? post.images[0] : '',
        summaryText: post.text ? post.text.substring(0, 150) : '',
      };

      const messageData = {
        content: JSON.stringify(metadata),
        senderId: user.$id,
        senderName: user.fullName || user.name || t('common.user'),
        type: 'post_share',
        metadata,
      };

      console.log('[SharePostToChat] send:start', {
        chatId,
        postId: metadata.postId,
        deepLink: metadata.deepLink,
        deeplink: metadata.deeplink,
        titleLength: String(metadata.title || '').length,
        summaryLength: String(metadata.summaryText || '').length,
      });

      await sendMessage(chatId, messageData);
      console.log('[SharePostToChat] send:success', {
        chatId,
        postId: metadata.postId,
      });
      onClose();
    } catch (error) {
      console.error('[SharePostToChat] send:error', {
        chatId,
        postId: postLinks.postId,
        errorMessage: error?.message || String(error || ''),
        errorCode: error?.code || error?.status || '',
        errorType: error?.type || '',
      });
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
      return chat.otherUser.name || chat.otherUser.fullName || chat.name || t('chats.unknownUser');
    }
    return chat.name || t('chats.unknownUser');
  };

  const filteredChats = chats.filter((chat) => {
    const normalizedQuery = String(searchQuery || '').trim().toLowerCase();
    if (!normalizedQuery) {
      return true;
    }

    const searchable = [
      getChatName(chat),
      chat?.description || '',
      chat?.department || '',
      chat?.stage || '',
      chat?.type || '',
    ]
      .map((value) => String(value || '').toLowerCase())
      .join(' ');

    return searchable.includes(normalizedQuery);
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
        disabled={sending === (item?.$id || item?.id)}>
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
        {sending === (item?.$id || item?.id) ? (
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
        <KeyboardAvoidingView
          style={styles.keyboardAvoiding}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : insets.bottom + 20}
        >
          <GlassModalCard
            style={[
              styles.container,
            ]}
            borderRadiusValue={borderRadius.xl}
            padding={0}
          >
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
            <View style={{ flex: 1, minHeight: 400, width: '100%' }}>
              <FlashList
                data={filteredChats}
                renderItem={renderChatItem}
                keyExtractor={(item, index) => String(item?.$id || item?.id || `chat-${index}`)}
                contentContainerStyle={styles.listContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                estimatedItemSize={76}
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <Text style={[styles.emptyText, { color: theme.textSecondary, fontSize: fontSize(14) }]}>
                      {t('chats.noChatsFound')}
                    </Text>
                  </View>
                }
              />
            </View>
          )}
          </GlassModalCard>
        </KeyboardAvoidingView>
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
  keyboardAvoiding: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
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
    paddingBottom: hp(18),
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
