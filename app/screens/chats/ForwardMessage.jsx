import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAppSettings } from '../../context/AppSettingsContext';
import { useUser } from '../../context/UserContext';
import ProfilePicture from '../../components/ProfilePicture';
import CustomAlert from '../../components/CustomAlert';
import { useCustomAlert } from '../../hooks/useCustomAlert';
import { getAllUserChats } from '../../../database/chatHelpers';
import { sendMessage } from '../../../database/chats';
import { 
  fontSize, 
  spacing, 
  moderateScale,
  hp,
} from '../../utils/responsive';
import { borderRadius } from '../../theme/designTokens';

const ForwardMessage = ({ navigation, route }) => {
  const { message } = route.params || {};
  const { t, theme, isDarkMode } = useAppSettings();
  const { user } = useUser();
  const { alertConfig, showAlert, hideAlert } = useCustomAlert();
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [forwarding, setForwarding] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  React.useEffect(() => {
    loadChats();
  }, []);

  const loadChats = async () => {
    try {
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

  const handleForward = async (chat) => {
    if (forwarding) return;

    setForwarding(chat.$id);
    try {
      const messageData = buildForwardMessageData(message, user, t);

      await sendMessage(chat.$id, messageData);
      
      showAlert({
        type: 'success',
        title: t('common.success'),
        message: t('chats.messageForwarded'),
        buttons: [{ text: t('common.ok'), onPress: () => navigation.goBack() }],
      });
    } catch (error) {
      showAlert({ type: 'error', title: t('common.error'), message: t('chats.forwardError') });
      setForwarding(null);
    }
  };

  const originalSenderName = useMemo(() => {
    if (!message) return t('common.user');
    return message.senderName || message.senderFullName || message.sender || t('common.user');
  }, [message, t]);

  const messagePreviewText = useMemo(() => getForwardPreviewText(message, t), [message, t]);
  const messagePreviewType = useMemo(() => getForwardPreviewType(message, t), [message, t]);
  const messagePreviewIcon = useMemo(() => getForwardPreviewIcon(message), [message]);

  const getChatName = (chat) => {
    if (chat.type === 'private' && chat.otherUser) {
      return chat.otherUser.name || chat.otherUser.fullName || chat.name;
    }
    return chat.name;
  };

  const filteredChats = chats.filter(chat => {
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
            backgroundColor: theme.card,
            borderColor: theme.border,
          }
        ]}
        onPress={() => handleForward(item)}
        disabled={forwarding === item.$id}>
        <ProfilePicture 
          uri={isPrivate ? item.otherUser?.profilePicture : item.groupPhoto}
          name={chatName}
          size={moderateScale(44)}
        />
        <View style={styles.chatInfo}>
          <Text style={[styles.chatName, { color: theme.text, fontSize: fontSize(15) }]} numberOfLines={1}>
            {chatName}
          </Text>
          <View style={styles.chatMetaRow}>
            <View style={[styles.chatTypePill, { backgroundColor: `${theme.primary}22` }]}>
              <Text style={[styles.chatType, { color: theme.primary, fontSize: fontSize(11) }]}>
                {isPrivate ? t('chats.privateChat') : t('chats.groupChat')}
              </Text>
            </View>
          </View>
        </View>
        {forwarding === item.$id ? (
          <ActivityIndicator size="small" color={theme.primary} />
        ) : (
          <View style={[styles.forwardAction, { backgroundColor: `${theme.primary}18` }]}>
            <Ionicons name="arrow-forward" size={moderateScale(18)} color={theme.primary} />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}> 
      <StatusBar 
        barStyle={isDarkMode ? 'light-content' : 'dark-content'} 
        backgroundColor={theme.background}
        translucent
      />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={moderateScale(22)} color={theme.text} />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={[styles.headerTitle, { color: theme.text, fontSize: fontSize(20) }]}>
              {t('chats.forwardTo')}
            </Text>
            <Text style={[styles.headerSubtitle, { color: theme.textSecondary, fontSize: fontSize(12) }]}>
              {t('chats.selectChatToForward')}
            </Text>
          </View>
          <View style={styles.placeholder} />
        </View>

        <View style={[
          styles.messagePreview,
          {
            backgroundColor: theme.card,
            borderColor: theme.border,
          },
        ]}>
          <View style={[styles.previewIconWrap, { backgroundColor: `${theme.primary}18` }]}>
            <Ionicons name={messagePreviewIcon} size={moderateScale(18)} color={theme.primary} />
          </View>
          <View style={styles.previewContent}>
            <Text style={[styles.previewMeta, { color: theme.textSecondary, fontSize: fontSize(11) }]} numberOfLines={1}>
              {messagePreviewType} • {t('chats.forwardedFromUser').replace('{name}', originalSenderName)}
            </Text>
            <Text style={[styles.previewText, { color: theme.text, fontSize: fontSize(14) }]} numberOfLines={2}>
              {messagePreviewText}
            </Text>
          </View>
        </View>

        <View style={styles.searchContainer}>
          <View style={[
            styles.searchInput,
            {
              backgroundColor: theme.card,
              borderColor: theme.border,
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
                <Ionicons name="chatbubbles-outline" size={moderateScale(28)} color={theme.textSecondary} />
                <Text style={[styles.emptyText, { color: theme.textSecondary, fontSize: fontSize(14) }]}>
                  {t('chats.noChatsFound')}
                </Text>
              </View>
            }
          />
        )}
      </SafeAreaView>
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
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  backButton: {
    width: moderateScale(40),
    height: moderateScale(40),
    borderRadius: moderateScale(20),
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContent: {
    flex: 1,
    marginHorizontal: spacing.sm,
  },
  headerTitle: {
    fontWeight: '700',
  },
  headerSubtitle: {
    marginTop: spacing.xs / 2,
    fontWeight: '400',
  },
  placeholder: {
    width: moderateScale(40),
  },
  messagePreview: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginHorizontal: spacing.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    gap: spacing.sm,
  },
  previewIconWrap: {
    width: moderateScale(32),
    height: moderateScale(32),
    borderRadius: moderateScale(16),
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewContent: {
    flex: 1,
  },
  previewMeta: {
    marginBottom: 2,
  },
  previewText: {
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
    borderWidth: 1,
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
  chatMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chatTypePill: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: borderRadius.xl,
  },
  chatName: {
    fontWeight: '600',
    marginBottom: spacing.xs / 2,
  },
  chatType: {
    fontWeight: '600',
  },
  forwardAction: {
    width: moderateScale(34),
    height: moderateScale(34),
    borderRadius: moderateScale(17),
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    paddingTop: hp(10),
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  emptyText: {
    textAlign: 'center',
  },
});

const parseJsonPayload = (value) => {
  if (!value) return null;
  if (typeof value === 'object') return value;
  if (typeof value !== 'string') return null;

  try {
    const parsed = JSON.parse(value);
    if (parsed && typeof parsed === 'object') {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
};

const normalizeLocationContent = (rawContent) => {
  if (!rawContent) return '';

  const parsed = parseJsonPayload(rawContent);
  if (parsed) {
    const latitude = Number(parsed.lat ?? parsed.latitude);
    const longitude = Number(parsed.long ?? parsed.lng ?? parsed.longitude);

    if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
      return `${latitude},${longitude}`;
    }
  }

  if (typeof rawContent !== 'string') return '';
  const parts = rawContent.split(',').map(part => part.trim());
  if (parts.length >= 2) {
    const latitude = Number(parts[0]);
    const longitude = Number(parts[1]);
    if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
      return `${latitude},${longitude}`;
    }
  }

  return rawContent;
};

const getForwardPreviewType = (message, t) => {
  const type = message?.type;
  if (type === 'location') return t('chats.location');
  if (type === 'post_share') return t('chats.sharedPost') || t('post.sharedPost');
  if (type === 'gif') return t('chats.gifSticker');
  if (type === 'voice') return t('chats.sentVoiceMessage');
  if (message?.images?.length > 0 || message?.imageUrl) return t('chats.image');
  return t('chats.forwarded');
};

const getForwardPreviewIcon = (message) => {
  const type = message?.type;
  if (type === 'location') return 'navigate-outline';
  if (type === 'post_share') return 'newspaper-outline';
  if (type === 'gif') return 'sparkles-outline';
  if (type === 'voice') return 'mic-outline';
  if (message?.images?.length > 0 || message?.imageUrl) return 'image-outline';
  return 'chatbubble-ellipses-outline';
};

const getForwardPreviewText = (message, t) => {
  if (!message) return '';

  if (message.type === 'location') {
    return t('chats.location');
  }

  if (message.type === 'post_share') {
    const parsed = parseJsonPayload(message.content);
    return parsed?.title || t('chats.sharedPost') || t('post.sharedPost');
  }

  if (message.type === 'gif') {
    return t('chats.gifSticker');
  }

  if (message.type === 'voice') {
    return t('chats.sentVoiceMessage');
  }

  if (message.content && typeof message.content === 'string' && message.content.trim().length > 0) {
    return message.content;
  }

  if (message.images?.length > 0 || message.imageUrl) {
    return t('chats.image');
  }

  return t('chats.forwarded');
};

const buildForwardMessageData = (message, currentUser, t) => {
  const senderName = currentUser?.fullName || currentUser?.name || t('common.user');
  const originalSenderName = message?.senderName || message?.senderFullName || message?.sender || t('common.user');
  const previewText = getForwardPreviewText(message, t);
  const messageType = (message?.type || '').trim();

  const baseData = {
    senderId: currentUser.$id,
    senderName,
    senderPhoto: currentUser.profilePicture || null,
    notificationPreview: previewText,
    replyToId: `forwarded:${message?.$id || Date.now()}`,
    replyToSender: t('chats.forwardedFromUser').replace('{name}', originalSenderName),
    replyToContent: '',
  };

  if (messageType === 'location') {
    return {
      ...baseData,
      type: 'location',
      content: normalizeLocationContent(message?.content),
    };
  }

  if (messageType === 'gif') {
    const parsed = parseJsonPayload(message?.content);
    if (parsed) {
      return {
        ...baseData,
        type: 'gif',
        gif_metadata: parsed,
      };
    }

    return {
      ...baseData,
      type: 'gif',
      content: message?.content || '',
    };
  }

  if (messageType === 'voice' || messageType === 'post_share') {
    const parsed = parseJsonPayload(message?.content);
    if (parsed) {
      return {
        ...baseData,
        type: messageType,
        metadata: parsed,
      };
    }

    return {
      ...baseData,
      type: messageType,
      content: message?.content || '',
    };
  }

  const forwardedData = {
    ...baseData,
    content: typeof message?.content === 'string' ? message.content : '',
  };

  const imageList = Array.isArray(message?.images) && message.images.length > 0
    ? message.images
    : (message?.imageUrl ? [message.imageUrl] : []);

  if (imageList.length > 0) {
    forwardedData.images = imageList;
  }

  if (messageType) {
    forwardedData.type = messageType;
  }

  if (!forwardedData.content && imageList.length === 0 && !forwardedData.type) {
    forwardedData.content = t('chats.forwarded');
  }

  return forwardedData;
};

export default ForwardMessage;
