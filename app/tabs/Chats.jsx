import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet,
  StatusBar,
  Platform,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  SectionList,
  Modal,
  Alert,
  AppState,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppSettings } from '../context/AppSettingsContext';
import { useUser } from '../context/UserContext';
import AnimatedBackground from '../components/AnimatedBackground';
import ChatListItem from '../components/ChatListItem';
import RepDetectionPopup from '../components/RepDetectionPopup';
import useRepDetection from '../hooks/useRepDetection';
import UnifiedEmptyState from '../components/UnifiedEmptyState';
import { ChatListSkeleton } from '../components/SkeletonLoader';
import { 
  initializeUserGroups,
  getAllUserChats,
  leaveGroup,
} from '../../database/chatHelpers';
import { getUserById } from '../../database/users';
import {
  getUnreadCount,
  decryptChatPreview,
  isChatRemovedByUser,
  removePrivateChatForUser,
  deleteChat,
} from '../../database/chats';
import { blockUser, blockUserChatOnly } from '../../database/users';
import {
  getChatClearedAt,
  getUserChatSettings,
  muteChat,
  unmuteChat,
  setChatArchived,
  setChatClearedAt,
  MUTE_DURATIONS,
  MUTE_TYPES,
} from '../../database/userChatSettings';
import { chatsCacheManager } from '../utils/cacheManager';
import { 
  wp, 
  hp, 
  fontSize, 
  spacing, 
  moderateScale,
} from '../utils/responsive';
import { borderRadius } from '../theme/designTokens';
import { useChatList } from '../hooks/useRealtimeSubscription';
import { useFirebaseValue } from '../hooks/useFirebaseRealtime';
import useLayout from '../hooks/useLayout';

const Chats = ({ navigation }) => {
  const { t, theme, isDarkMode } = useAppSettings();
  const { user, refreshUser } = useUser();
  const insets = useSafeAreaInsets();
  const { contentStyle } = useLayout();
  const { needsRep, hasActiveElection, currentElection, isUserRepresentative, dismiss: dismissRepPopup } = useRepDetection(user);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [defaultGroups, setDefaultGroups] = useState([]);
  const [customGroups, setCustomGroups] = useState([]);
  const [privateChats, setPrivateChats] = useState([]);
  const [activeFilter, setActiveFilter] = useState('all');
  const [unreadCounts, setUnreadCounts] = useState({});
  const [clearedAtMap, setClearedAtMap] = useState({});
  const [muteStatusMap, setMuteStatusMap] = useState({});
  const [archivedChatMap, setArchivedChatMap] = useState({});
  const [showArchivedChats, setShowArchivedChats] = useState(false);
  const [selectedChat, setSelectedChat] = useState(null);
  const [chatMenuVisible, setChatMenuVisible] = useState(false);
  const [muteModalVisible, setMuteModalVisible] = useState(false);
  const [chatMetaAppliedAt, setChatMetaAppliedAt] = useState({});

  const defaultGroupsRef = useRef([]);
  const customGroupsRef = useRef([]);
  const privateChatsRef = useRef([]);

  useEffect(() => {
    defaultGroupsRef.current = defaultGroups;
  }, [defaultGroups]);

  useEffect(() => {
    customGroupsRef.current = customGroups;
  }, [customGroups]);

  useEffect(() => {
    privateChatsRef.current = privateChats;
  }, [privateChats]);

  const { value: chatMetaMap } = useFirebaseValue(user?.$id ? 'chatMeta' : null, null);

  const sortChatsByActivity = useCallback((chats = []) => {
    return [...chats].sort((a, b) => {
      const dateA = new Date(a.lastMessageAt || a.$createdAt || 0);
      const dateB = new Date(b.lastMessageAt || b.$createdAt || 0);
      return dateB - dateA;
    });
  }, []);

  const stageToValue = (stage) => {
    if (!stage) return null;
    const stageMap = {
      'firstYear': '1',
      'secondYear': '2',
      'thirdYear': '3',
      'fourthYear': '4',
      'fifthYear': '5',
      'sixthYear': '6',
    };
    return stageMap[stage] || stage;
  };

  // Real-time subscription for chat updates (new messages, unread count changes)
  const handleRealtimeChatUpdate = useCallback(async (payload) => {
    // Invalidate chats cache since data changed
    if (user?.$id) {
      await chatsCacheManager.invalidateChatsCache(user.$id);
    }

    const resolvedPayload = user?.$id
      ? await decryptChatPreview(payload, user.$id)
      : payload;
    
    // Update the chat in the appropriate list using functional state updates
    // to avoid stale closure issues
    const updateChatInList = (setList) => {
      let found = false;
      setList(prev => {
        const index = prev.findIndex(c => c.$id === resolvedPayload.$id);
        if (index < 0) return prev;
        found = true;
        const updated = [...prev];
        updated[index] = { ...updated[index], ...resolvedPayload };
        return updated.sort((a, b) => {
          const dateA = new Date(a.lastMessageAt || a.$createdAt || 0);
          const dateB = new Date(b.lastMessageAt || b.$createdAt || 0);
          return dateB - dateA;
        });
      });
      return found;
    };

    const addChatToList = async () => {
      if (!resolvedPayload?.$id) return false;

      if (resolvedPayload.type === 'private') {
        const blockedUsers = user?.blockedUsers || [];
        const chatBlockedUsers = user?.chatBlockedUsers || [];
        const blockedSet = new Set([...blockedUsers, ...chatBlockedUsers]);

        let chatToAdd = resolvedPayload;
        const otherUserId = resolvedPayload.participants?.find(id => id !== user?.$id);
        if (blockedSet.size > 0 && otherUserId && blockedSet.has(otherUserId)) {
          return true;
        }
        if (otherUserId) {
          try {
            const otherUser = await getUserById(otherUserId);
            chatToAdd = { ...resolvedPayload, otherUser };
          } catch (error) {
            chatToAdd = resolvedPayload;
          }
        }

        setPrivateChats(prev => {
          if (prev.some(c => c.$id === resolvedPayload.$id)) return prev;
          return [...prev, chatToAdd].sort((a, b) => {
            const dateA = new Date(a.lastMessageAt || a.$createdAt || 0);
            const dateB = new Date(b.lastMessageAt || b.$createdAt || 0);
            return dateB - dateA;
          });
        });
        return true;
      }

      if (resolvedPayload.type === 'custom_group') {
        setCustomGroups(prev => {
          if (prev.some(c => c.$id === resolvedPayload.$id)) return prev;
          return [...prev, resolvedPayload].sort((a, b) => {
            const dateA = new Date(a.lastMessageAt || a.$createdAt || 0);
            const dateB = new Date(b.lastMessageAt || b.$createdAt || 0);
            return dateB - dateA;
          });
        });
        return true;
      }

      if (resolvedPayload.type === 'stage_group' || resolvedPayload.type === 'department_group') {
        setDefaultGroups(prev => {
          if (prev.some(c => c.$id === resolvedPayload.$id)) return prev;
          return [...prev, resolvedPayload].sort((a, b) => {
            const dateA = new Date(a.lastMessageAt || a.$createdAt || 0);
            const dateB = new Date(b.lastMessageAt || b.$createdAt || 0);
            return dateB - dateA;
          });
        });
        return true;
      }

      return false;
    };

    // Try updating in each list using functional updates (no stale closure)
    let updated = updateChatInList(setDefaultGroups);
    if (!updated) {
      updated = updateChatInList(setCustomGroups);
    }
    if (!updated) {
      updated = updateChatInList(setPrivateChats);
    }
    if (!updated) {
      await addChatToList();
    }

  }, [user?.$id]);

  useEffect(() => {
    if (!user?.$id || !chatMetaMap || typeof chatMetaMap !== 'object') return;

    const processChatMeta = async () => {
      const currentChats = [
        ...defaultGroupsRef.current,
        ...customGroupsRef.current,
        ...privateChatsRef.current,
      ];

      if (currentChats.length === 0) return;

      const chatMap = new Map(currentChats.map(chat => [chat.$id, chat]));
      const updatedAtPatch = {};
      const payloadById = {};

      for (const [chatId, meta] of Object.entries(chatMetaMap)) {
        if (!chatMap.has(chatId) || !meta || typeof meta !== 'object') continue;

        const updatedAt = Number(meta.updatedAt || 0);
        const prevUpdatedAt = Number(chatMetaAppliedAt[chatId] || 0);
        if (updatedAt > 0 && prevUpdatedAt >= updatedAt) continue;

        const currentChat = chatMap.get(chatId);
        let nextChat = {
          ...currentChat,
          lastMessage: typeof meta.lastMessage === 'string' ? meta.lastMessage : (currentChat.lastMessage || ''),
          lastMessageAt: meta.lastMessageAt || currentChat.lastMessageAt || currentChat.$updatedAt || currentChat.$createdAt,
          lastMessageSenderId: meta.lastSenderId || currentChat.lastMessageSenderId || '',
          messageCount: Number.isFinite(meta.messageCount) ? meta.messageCount : (currentChat.messageCount || 0),
        };

        nextChat = await decryptChatPreview(nextChat, user.$id);

        payloadById[chatId] = nextChat;
        updatedAtPatch[chatId] = updatedAt > 0 ? updatedAt : Date.now();
      }

      const hasUpdates = Object.keys(payloadById).length > 0;
      if (!hasUpdates) return;

      const applyUpdates = (prev) => {
        let changed = false;
        const next = prev.map((chat) => {
          const updatedChat = payloadById[chat.$id];
          if (!updatedChat) return chat;
          changed = true;
          return { ...chat, ...updatedChat };
        });
        if (!changed) return prev;
        return sortChatsByActivity(next);
      };

      setDefaultGroups(applyUpdates);
      setCustomGroups(applyUpdates);
      setPrivateChats(applyUpdates);

      setChatMetaAppliedAt((prev) => ({ ...prev, ...updatedAtPatch }));

      const selfSentIds = Object.entries(payloadById)
        .filter(([, value]) => value.lastMessageSenderId && value.lastMessageSenderId === user.$id)
        .map(([chatId]) => chatId);

      if (selfSentIds.length > 0) {
        setUnreadCounts((prev) => {
          const next = { ...prev };
          selfSentIds.forEach((chatId) => {
            next[chatId] = 0;
          });
          return next;
        });
      }
    };

    processChatMeta();
  }, [chatMetaMap, chatMetaAppliedAt, sortChatsByActivity, user?.$id]);

  // Subscribe to chat list updates
  useChatList(user?.$id, handleRealtimeChatUpdate, !!user?.$id);

  // --- Periodic refresh (every 3 minutes) ---
  const refreshIntervalRef = useRef(null);

  useEffect(() => {
    if (!user?.$id) return;
    refreshIntervalRef.current = setInterval(() => {
      loadChats(false, { forceUnreadNetwork: true });
    }, 3 * 60 * 1000);

    return () => {
      if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
    };
  }, [user?.$id, user?.department]);

  // --- Foreground refresh ---
  const appStateRef = useRef(AppState.currentState);
  const lastForegroundRefresh = useRef(Date.now());

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (
        appStateRef.current?.match(/inactive|background/) &&
        nextState === 'active' &&
        user?.$id &&
        Date.now() - lastForegroundRefresh.current > 30000
      ) {
        lastForegroundRefresh.current = Date.now();
        loadChats(false, { forceUnreadNetwork: true });
      }
      appStateRef.current = nextState;
    });
    return () => subscription.remove();
  }, [user?.$id, user?.department]);

  useEffect(() => {
    if (user?.department) {
      initializeAndLoadChats();
    } else {
      setLoading(false);
      setInitializing(false);
    }
  }, [user]);

  const initializeAndLoadChats = async () => {
    try {
      setInitializing(true);
      const stageValue = stageToValue(user?.stage);
      
      await initializeUserGroups(user.department, stageValue, user.$id);
      
      setInitializing(false);
      await loadChats(true);
    } catch (error) {
      setInitializing(false);
      setLoading(false);
    }
  };

  const loadUnreadCounts = async (allChats, options = {}) => {
    if (!user?.$id || allChats.length === 0) return;

    const { forceNetwork = false } = options;
    
    const counts = {};
    await Promise.all(
      allChats.map(async (chat) => {
        const count = await getUnreadCount(chat.$id, user.$id, {
          useCache: true,
          cacheOnly: !forceNetwork,
        });
        counts[chat.$id] = count;
      })
    );
    setUnreadCounts(counts);
  };

  const loadClearedAtTimestamps = async (allChats) => {
    if (!user?.$id || allChats.length === 0) return;
    
    const timestamps = {};
    await Promise.all(
      allChats.map(async (chat) => {
        const clearedAt = await getChatClearedAt(user.$id, chat.$id);
        if (clearedAt) {
          timestamps[chat.$id] = clearedAt;
        }
      })
    );
    setClearedAtMap(timestamps);
  };

  const loadChats = async (useCache = true, options = {}) => {
    if (!user?.department) {
      setLoading(false);
      return;
    }

    const { forceUnreadNetwork = false } = options;

    try {
      setLoading(true);
      const stageValue = stageToValue(user.stage);
      
      const chats = await getAllUserChats(user.$id, user.department, stageValue, useCache);
      setDefaultGroups(chats.defaultGroups || []);
      setCustomGroups(chats.customGroups || []);

      // Filter out private chats where the partner is blocked or the user has removed the conversation
      const blockedUsers = user?.blockedUsers || [];
      const chatBlockedUsers = user?.chatBlockedUsers || [];
      const blockedSet = new Set([...blockedUsers, ...chatBlockedUsers]);
      const allPrivateChats = chats.privateChats || [];
      const filteredPrivateChats = allPrivateChats.filter(c => {
        // Filter out chats removed by the current user
        if (isChatRemovedByUser(c, user?.$id)) return false;
        // Filter out chats where the partner is blocked
        if (blockedSet.size > 0) {
          const otherUserId = c.otherUser?.$id || c.otherUser?.id || c.participants?.find(id => id !== user?.$id);
          if (blockedSet.has(otherUserId)) return false;
        }
        return true;
      });
      setPrivateChats(filteredPrivateChats);
      
      // Load unread counts for all chats
      const allChats = [
        ...(chats.defaultGroups || []),
        ...(chats.customGroups || []),
        ...filteredPrivateChats,
      ];
      setLoading(false);

      const loadAuxiliaryData = async () => {
        await Promise.all([
          loadUnreadCounts(allChats, { forceNetwork: forceUnreadNetwork }),
          loadClearedAtTimestamps(allChats),
        ]);

        if (user?.$id) {
          const muteMap = {};
          const archivedMap = {};

          await Promise.all(
            allChats.map(async (chat) => {
              try {
                const settings = await getUserChatSettings(user.$id, chat.$id);

                let isMuted = Boolean(settings?.isMuted);
                if (isMuted && settings?.muteExpiresAt) {
                  const expiresAt = new Date(settings.muteExpiresAt);
                  if (expiresAt <= new Date()) {
                    await unmuteChat(user.$id, chat.$id);
                    isMuted = false;
                  }
                }

                muteMap[chat.$id] = isMuted;
                archivedMap[chat.$id] = Boolean(settings?.isArchived);
              } catch {
                muteMap[chat.$id] = false;
                archivedMap[chat.$id] = false;
              }
            })
          );

          setMuteStatusMap(muteMap);
          setArchivedChatMap(archivedMap);
        }
      };

      loadAuxiliaryData();
    } catch (error) {
      setDefaultGroups([]);
      setCustomGroups([]);
      setPrivateChats([]);
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadChats(false, { forceUnreadNetwork: true });
    setRefreshing(false);
  };

  const handleChatPress = (chat) => {
    navigation.navigate('ChatRoom', { chat });
  };

  const openChatMenu = (chat) => {
    setSelectedChat(chat);
    setChatMenuVisible(true);
  };

  const closeChatMenu = () => {
    setChatMenuVisible(false);
  };

  const openMuteOptions = () => {
    setChatMenuVisible(false);
    setMuteModalVisible(true);
  };

  const closeMuteOptions = () => {
    setMuteModalVisible(false);
  };

  const getSelectedChatMenuTitle = () => {
    if (!selectedChat) return t('chats.chatOptions');

    if (selectedChat.type !== 'private') {
      return selectedChat.name || t('chats.chatOptions');
    }

    const otherUserName = selectedChat.otherUser?.name || selectedChat.otherUser?.fullName;
    if (otherUserName) return otherUserName;

    const currentName = (user?.name || user?.fullName || '').trim().toLowerCase();
    const parts = (selectedChat.name || '')
      .split('&')
      .map(part => part.trim())
      .filter(Boolean);

    if (parts.length > 0) {
      const match = parts.find(namePart => namePart.toLowerCase() !== currentName);
      return match || parts[0];
    }

    return selectedChat.name || t('chats.chatOptions');
  };

  const handleArchiveChat = async (chat, archive = true) => {
    if (!chat?.$id || !user?.$id) return;
    try {
      await setChatArchived(user.$id, chat.$id, archive);
      setArchivedChatMap((prev) => ({ ...prev, [chat.$id]: archive }));
    } catch {
      Alert.alert(t('common.error'), t('chats.archiveError'));
    }
  };

  const handleVisitSelectedProfile = () => {
    const targetUserId = selectedChat?.otherUser?.$id || selectedChat?.otherUser?.id;
    if (!targetUserId) return;
    setChatMenuVisible(false);
    navigation.navigate('UserProfile', { userId: targetUserId });
  };

  const handleClearSelectedChat = () => {
    if (!selectedChat?.$id || !user?.$id) return;

    Alert.alert(
      t('chats.clearChat'),
      t('chats.clearChatLocalConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('chats.clearChat'),
          style: 'destructive',
          onPress: async () => {
            try {
              const clearedAt = await setChatClearedAt(user.$id, selectedChat.$id);
              setClearedAtMap((prev) => ({ ...prev, [selectedChat.$id]: clearedAt }));
              setChatMenuVisible(false);
            } catch {
              Alert.alert(t('common.error'), t('chats.clearChatError'));
            }
          },
        },
      ]
    );
  };

  const handleDeleteSelectedConversation = () => {
    if (!selectedChat?.$id || selectedChat?.type !== 'private' || !user?.$id) return;

    Alert.alert(
      t('chats.deleteConversation'),
      t('chats.deleteConversationConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteChat(selectedChat.$id, user.$id);
              setChatMenuVisible(false);
              await loadChats(false);
            } catch {
              Alert.alert(t('common.error'), t('chats.deleteConversationError'));
            }
          },
        },
      ]
    );
  };

  const handleBlockSelectedUser = () => {
    if (selectedChat?.type !== 'private' || !user?.$id) return;

    const otherUserId = selectedChat.otherUser?.$id || selectedChat.otherUser?.id;
    const otherUserName = selectedChat.otherUser?.name || selectedChat.otherUser?.fullName || getSelectedChatMenuTitle();

    if (!otherUserId) {
      Alert.alert(t('common.error'), t('chats.blockError'));
      return;
    }

    Alert.alert(
      t('common.blockOptionsTitle'),
      t('common.blockOptionsMessage').replace('{name}', otherUserName),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.blockMessagesOnly'),
          onPress: async () => {
            try {
              await blockUserChatOnly(user.$id, otherUserId);
              await removePrivateChatForUser(selectedChat.$id, user.$id);
              await refreshUser?.();
              setChatMenuVisible(false);
              await loadChats(false);
            } catch (error) {
              if (error?.code === 'CHAT_BLOCK_COLUMN_MISSING') {
                Alert.alert(t('common.error'), t('chats.chatBlockNeedsColumn'));
                return;
              }
              Alert.alert(t('common.error'), t('chats.blockError'));
            }
          },
        },
        {
          text: t('common.blockEverything'),
          style: 'destructive',
          onPress: async () => {
            try {
              await blockUser(user.$id, otherUserId);
              await refreshUser?.();
              setChatMenuVisible(false);
              await loadChats(false);
            } catch {
              Alert.alert(t('common.error'), t('chats.blockError'));
            }
          },
        },
      ]
    );
  };

  const handleChatMute = async (duration) => {
    if (!selectedChat?.$id || !user?.$id) return;

    try {
      await muteChat(user.$id, selectedChat.$id, MUTE_TYPES.ALL, duration);
      setMuteStatusMap((prev) => ({ ...prev, [selectedChat.$id]: true }));
      setMuteModalVisible(false);
    } catch {
      Alert.alert(t('common.error'), t('chats.muteError'));
    }
  };

  const handleChatUnmute = async () => {
    if (!selectedChat?.$id || !user?.$id) return;

    try {
      await unmuteChat(user.$id, selectedChat.$id);
      setMuteStatusMap((prev) => ({ ...prev, [selectedChat.$id]: false }));
      setMuteModalVisible(false);
    } catch {
      Alert.alert(t('common.error'), t('chats.unmuteError'));
    }
  };

  const handleLeaveSelectedGroup = () => {
    if (!selectedChat?.$id || !user?.$id) return;

    Alert.alert(
      t('chats.leaveGroup'),
      t('chats.leaveGroupConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('chats.leave'),
          style: 'destructive',
          onPress: async () => {
            try {
              await leaveGroup(selectedChat.$id, user.$id);
              setChatMenuVisible(false);
              await loadChats(false);
            } catch {
              Alert.alert(t('common.error'), t('chats.leaveGroupError'));
            }
          },
        },
      ]
    );
  };

  const handleOpenGroupSettings = () => {
    if (!selectedChat) return;
    setChatMenuVisible(false);
    navigation.navigate('GroupSettings', { chat: selectedChat });
  };

  const getSectionData = () => {
    const sections = [];
    const shouldIncludeByFilter = (filterKey) => activeFilter === 'all' || activeFilter === filterKey;
    const isArchived = (chat) => Boolean(archivedChatMap[chat.$id]);

    const blockedSet = new Set([...(user?.blockedUsers || []), ...(user?.chatBlockedUsers || [])]);
    const visiblePrivateChats = blockedSet.size > 0
      ? privateChats.filter(c => {
          const otherUserId = c.participants?.find(id => id !== user?.$id);
          return !blockedSet.has(otherUserId);
        })
      : privateChats;

    const activeDefaultGroups = defaultGroups.filter((chat) => !isArchived(chat));
    const activeCustomGroups = customGroups.filter((chat) => !isArchived(chat));
    const activePrivateChats = visiblePrivateChats.filter((chat) => !isArchived(chat));

    const archivedChats = sortChatsByActivity([
      ...defaultGroups,
      ...customGroups,
      ...visiblePrivateChats,
    ].filter((chat) => isArchived(chat)));

    if (showArchivedChats) {
      if (archivedChats.length > 0) {
        sections.push({
          key: 'archived',
          title: t('chats.archivedChats'),
          data: archivedChats,
          icon: 'archive',
          color: '#F59E0B',
        });
      }

      return sections;
    }

    if (shouldIncludeByFilter('class') && activeDefaultGroups.length > 0) {
      sections.push({
        key: 'class',
        title: t('chats.classLabel'),
        data: sortChatsByActivity(activeDefaultGroups),
        icon: 'school',
        color: '#3B82F6',
      });
    }

    if (shouldIncludeByFilter('groups') && activeCustomGroups.length > 0) {
      sections.push({
        key: 'groups',
        title: t('chats.groupsLabel'),
        data: sortChatsByActivity(activeCustomGroups),
        icon: 'people',
        color: '#F59E0B',
      });
    }

    if (shouldIncludeByFilter('direct') && activePrivateChats.length > 0) {
        sections.push({
          key: 'direct',
          title: t('chats.directLabel'),
          data: sortChatsByActivity(activePrivateChats),
          icon: 'chatbubble',
          color: '#10B981',
        });
    }

    return sections;
  };

  const renderSectionHeader = ({ section }) => (
    <View style={styles.sectionHeader}>
      <Ionicons name={section.icon} size={moderateScale(12)} color={section.color} />
      <Text style={[styles.sectionTitle, { color: theme.textSecondary, fontSize: fontSize(11) }]}>
        {section.title}
      </Text>
      <Text style={[styles.sectionCount, { color: theme.textSecondary, fontSize: fontSize(10) }]}>
        {section.data.length}
      </Text>
    </View>
  );

  const renderChatItem = ({ item, section }) => {
    const isArchivedSection = section?.key === 'archived';
    const partnerId = item.type === 'private' ? item.otherUser?.$id : null;
    const partnerIsRep = partnerId ? isUserRepresentative(partnerId) : false;

    return (
      <ChatListItem 
        chat={item}
        onPress={() => handleChatPress(item)}
        onLongPress={() => openChatMenu(item)}
        onArchive={() => handleArchiveChat(item, !isArchivedSection)}
        swipeActionLabel={isArchivedSection ? t('chats.unarchive') : t('chats.archive')}
        currentUserId={user?.$id}
        unreadCount={unreadCounts[item.$id] || 0}
        clearedAt={clearedAtMap[item.$id] || null}
        isPartnerRep={partnerIsRep}
      />
    );
  };

  const archivedUnreadChatsCount = [
    ...defaultGroups,
    ...customGroups,
    ...privateChats,
  ].filter((chat) => archivedChatMap[chat.$id] && (unreadCounts[chat.$id] || 0) > 0).length;

  const renderArchivedAccess = () => null;

  const renderEmpty = () => {
    if (loading || initializing) {
      return null;
    }

    if (showArchivedChats) {
      return (
        <UnifiedEmptyState
          iconName="archive-outline"
          title={t('chats.noArchivedChatsTitle')}
          description={t('chats.noArchivedChatsMessage')}
          actionLabel={t('common.goBack')}
          actionIconName="arrow-back"
          onAction={() => setShowArchivedChats(false)}
        />
      );
    }
    
    return (
      <UnifiedEmptyState
        iconName="chatbubbles-outline"
        title={t('chats.emptyTitle')}
        description={t('chats.emptyMessage')}
        actionLabel={t('chats.startNewChat')}
        actionIconName="search"
        onAction={() => navigation.navigate('UserSearch')}
      />
    );
  };

  const filterOptions = [
    { key: 'all', label: t('chats.filterAll') },
    { key: 'class', label: t('chats.filterClass') },
    { key: 'groups', label: t('chats.filterGroups') },
    { key: 'direct', label: t('chats.filterDirect') },
  ];

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <View style={styles.headerTop}>
        <View style={styles.titleRow}>
          {showArchivedChats && (
            <TouchableOpacity
              style={[styles.backButton, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)' }]}
              activeOpacity={0.7}
              onPress={() => setShowArchivedChats(false)}
              accessibilityRole="button"
              accessibilityLabel={t('common.goBack')}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="arrow-back" size={moderateScale(16)} color={theme.text} />
            </TouchableOpacity>
          )}
          <Text style={[styles.headerTitle, { color: theme.text, fontSize: fontSize(22) }]}>
            {showArchivedChats ? t('chats.archivedChats') : t('chats.title')}
          </Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.iconButton, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)' }]}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('UserSearch')}
            accessibilityRole="button"
            accessibilityLabel={t('chats.startNewChat')}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="search" size={moderateScale(18)} color={theme.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.iconButton,
              {
                backgroundColor: showArchivedChats
                  ? (isDarkMode ? 'rgba(245,158,11,0.22)' : 'rgba(245,158,11,0.16)')
                  : (isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)'),
              },
            ]}
            activeOpacity={0.7}
            onPress={() => setShowArchivedChats((prev) => !prev)}
            accessibilityRole="button"
            accessibilityLabel={t('chats.archivedChats')}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="archive-outline" size={moderateScale(17)} color="#F59E0B" />
            {archivedUnreadChatsCount > 0 && (
              <View style={[styles.archiveCountBadge, { backgroundColor: isDarkMode ? 'rgba(59,130,246,0.92)' : '#3B82F6' }]}>
                <Text style={styles.archiveCountBadgeText}>{archivedUnreadChatsCount > 99 ? '99+' : archivedUnreadChatsCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.iconButton, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)' }]}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('CreateGroup')}
            accessibilityRole="button"
            accessibilityLabel={t('chats.createGroup')}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="add" size={moderateScale(18)} color="#F59E0B" />
          </TouchableOpacity>
        </View>
      </View>
      
      {!showArchivedChats && (
        <View style={styles.filterContainer}>
          {filterOptions.map((filter) => (
            <TouchableOpacity
              key={filter.key}
              style={[
                styles.filterPill,
                { 
                  backgroundColor: activeFilter === filter.key 
                    ? theme.primary 
                    : isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' 
                }
              ]}
              activeOpacity={0.7}
              onPress={() => setActiveFilter(filter.key)}
              accessibilityRole="button"
              accessibilityLabel={filter.label}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={[
                styles.filterPillText,
                { 
                  color: activeFilter === filter.key ? '#FFFFFF' : theme.textSecondary,
                  fontSize: fontSize(11)
                }
              ]}>
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );

  if (initializing) {
    return (
      <View style={styles.container}>
        <StatusBar 
          barStyle={isDarkMode ? 'light-content' : 'dark-content'} 
          backgroundColor="transparent"
          translucent
        />
        <LinearGradient
          colors={isDarkMode 
            ? ['#1a1a2e', '#16213e', '#0f3460'] 
            : ['#f0f4ff', '#d8e7ff', '#c0deff']
          }
          style={styles.gradient}>
          <AnimatedBackground particleCount={18} />
          <View style={styles.loadingContainer}>
            <ChatListSkeleton count={6} />
          </View>
        </LinearGradient>
      </View>
    );
  }

  if (loading && !refreshing) {
    return (
      <View style={styles.container}>
        <StatusBar 
          barStyle={isDarkMode ? 'light-content' : 'dark-content'} 
          backgroundColor="transparent"
          translucent
        />
        <LinearGradient
          colors={isDarkMode 
            ? ['#1a1a2e', '#16213e', '#0f3460'] 
            : ['#f0f4ff', '#d8e7ff', '#c0deff']
          }
          style={styles.gradient}>
          <AnimatedBackground particleCount={18} />
          <View style={styles.loadingContainer}>
            <ChatListSkeleton count={7} />
          </View>
        </LinearGradient>
      </View>
    );
  }

  const sections = getSectionData();
  const hasContent = sections.some((section) => section.data.length > 0);

      return (
        <View style={styles.container}>
          <StatusBar 
            barStyle={isDarkMode ? 'light-content' : 'dark-content'} 
            backgroundColor="transparent"
            translucent
          />
      
          <LinearGradient
            colors={isDarkMode 
              ? ['#1a1a2e', '#16213e', '#0f3460'] 
              : ['#f0f4ff', '#d8e7ff', '#c0deff']
            }
            style={styles.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}>
        
            <AnimatedBackground particleCount={18} />
        
            <View style={[styles.content, { paddingTop: insets.top + spacing.sm }]}> 
              {hasContent ? (
                <SectionList
                  sections={sections}
                  renderItem={renderChatItem}
                  renderSectionHeader={renderSectionHeader}
                  keyExtractor={(item) => item.$id}
                  contentContainerStyle={[styles.listContent, contentStyle]}
                  ListHeaderComponent={renderHeader}
                  stickySectionHeadersEnabled={false}
                  windowSize={11}
                  maxToRenderPerBatch={10}
                  initialNumToRender={12}
                  removeClippedSubviews={Platform.OS === 'android'}
                  refreshControl={
                    <RefreshControl
                      refreshing={refreshing}
                      onRefresh={handleRefresh}
                      tintColor={theme.primary}
                      colors={[theme.primary]}
                    />
                  }
                />
              ) : (
                <FlatList
                  data={[]}
                  renderItem={() => null}
                  ListHeaderComponent={renderHeader}
                  ListEmptyComponent={renderEmpty}
                  contentContainerStyle={[styles.listContent, contentStyle]}
                  windowSize={8}
                  maxToRenderPerBatch={8}
                  initialNumToRender={1}
                  removeClippedSubviews={Platform.OS === 'android'}
                  refreshControl={
                    <RefreshControl
                      refreshing={refreshing}
                      onRefresh={handleRefresh}
                      tintColor={theme.primary}
                      colors={[theme.primary]}
                    />
                  }
                />
              )}
            </View>

            <Modal
              visible={chatMenuVisible}
              transparent
              animationType="fade"
              onRequestClose={closeChatMenu}
            >
              <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={closeChatMenu}>
                <View
                  style={[
                    styles.menuCard,
                    { backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF' },
                  ]}
                >
                  <Text style={[styles.menuTitle, { color: theme.text, fontSize: fontSize(15) }]} numberOfLines={1}>
                    {getSelectedChatMenuTitle()}
                  </Text>

                  {selectedChat?.type === 'private' && (
                    <TouchableOpacity style={styles.menuItem} onPress={handleVisitSelectedProfile}>
                      <Ionicons name="person-outline" size={moderateScale(18)} color={theme.primary} />
                      <Text style={[styles.menuItemText, { color: theme.text, fontSize: fontSize(14) }]}>
                        {t('chats.visitProfile')}
                      </Text>
                    </TouchableOpacity>
                  )}

                  {selectedChat?.type === 'custom_group' && (
                    <TouchableOpacity style={styles.menuItem} onPress={handleOpenGroupSettings}>
                      <Ionicons name="settings-outline" size={moderateScale(18)} color={theme.primary} />
                      <Text style={[styles.menuItemText, { color: theme.text, fontSize: fontSize(14) }]}>
                        {t('chats.groupSettings')}
                      </Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity style={styles.menuItem} onPress={openMuteOptions}>
                    <Ionicons
                      name={muteStatusMap[selectedChat?.$id] ? 'notifications-outline' : 'notifications-off-outline'}
                      size={moderateScale(18)}
                      color={theme.primary}
                    />
                    <Text style={[styles.menuItemText, { color: theme.text, fontSize: fontSize(14) }]}>
                      {muteStatusMap[selectedChat?.$id] ? t('chats.unmute') : t('chats.mute')}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={async () => {
                      const isArchived = Boolean(archivedChatMap[selectedChat?.$id]);
                      await handleArchiveChat(selectedChat, !isArchived);
                      closeChatMenu();
                    }}
                  >
                    <Ionicons name="archive-outline" size={moderateScale(18)} color="#F59E0B" />
                    <Text style={[styles.menuItemText, { color: theme.text, fontSize: fontSize(14) }]}>
                      {archivedChatMap[selectedChat?.$id] ? t('chats.unarchive') : t('chats.archive')}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => {
                      setChatMenuVisible(false);
                      Alert.alert(t('common.info'), t('chats.searchComingSoon'));
                    }}
                  >
                    <Ionicons name="search-outline" size={moderateScale(18)} color={theme.primary} />
                    <Text style={[styles.menuItemText, { color: theme.text, fontSize: fontSize(14) }]}>
                      {t('chats.searchInChat')}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.menuItem} onPress={handleClearSelectedChat}>
                    <Ionicons name="trash-outline" size={moderateScale(18)} color={theme.primary} />
                    <Text style={[styles.menuItemText, { color: theme.text, fontSize: fontSize(14) }]}>
                      {t('chats.clearChat')}
                    </Text>
                  </TouchableOpacity>

                  {selectedChat?.type === 'private' && (
                    <TouchableOpacity style={styles.menuItem} onPress={handleBlockSelectedUser}>
                      <Ionicons name="ban-outline" size={moderateScale(18)} color="#EF4444" />
                      <Text style={[styles.menuItemText, { color: '#EF4444', fontSize: fontSize(14) }]}>
                        {t('chats.blockUser')}
                      </Text>
                    </TouchableOpacity>
                  )}

                  {selectedChat?.type === 'private' && (
                    <TouchableOpacity style={styles.menuItem} onPress={handleDeleteSelectedConversation}>
                      <Ionicons name="trash" size={moderateScale(18)} color="#EF4444" />
                      <Text style={[styles.menuItemText, { color: '#EF4444', fontSize: fontSize(14) }]}>
                        {t('chats.deleteConversation')}
                      </Text>
                    </TouchableOpacity>
                  )}

                  {selectedChat?.type !== 'private' && (
                    <TouchableOpacity style={styles.menuItem} onPress={handleLeaveSelectedGroup}>
                      <Ionicons name="exit-outline" size={moderateScale(18)} color="#EF4444" />
                      <Text style={[styles.menuItemText, { color: '#EF4444', fontSize: fontSize(14) }]}>
                        {t('chats.leaveGroup')}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </TouchableOpacity>
            </Modal>

            <Modal
              visible={muteModalVisible}
              transparent
              animationType="slide"
              onRequestClose={closeMuteOptions}
            >
              <View style={styles.modalOverlay}>
                <View
                  style={[
                    styles.muteModalCard,
                    { backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF' },
                  ]}
                >
                  <Text style={[styles.menuTitle, { color: theme.text, fontSize: fontSize(16) }]}> 
                    {t('chats.muteOptions')}
                  </Text>

                  {muteStatusMap[selectedChat?.$id] && (
                    <TouchableOpacity style={styles.menuItem} onPress={handleChatUnmute}>
                      <Ionicons name="notifications-outline" size={moderateScale(18)} color="#10B981" />
                      <Text style={[styles.menuItemText, { color: '#10B981', fontSize: fontSize(14) }]}>
                        {t('chats.unmute')}
                      </Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity style={styles.menuItem} onPress={() => handleChatMute(MUTE_DURATIONS.ONE_HOUR)}>
                    <Ionicons name="time-outline" size={moderateScale(18)} color={theme.primary} />
                    <Text style={[styles.menuItemText, { color: theme.text, fontSize: fontSize(14) }]}>
                      {t('chats.muteFor1Hour')}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.menuItem} onPress={() => handleChatMute(MUTE_DURATIONS.EIGHT_HOURS)}>
                    <Ionicons name="time-outline" size={moderateScale(18)} color={theme.primary} />
                    <Text style={[styles.menuItemText, { color: theme.text, fontSize: fontSize(14) }]}>
                      {t('chats.muteFor8Hours')}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.menuItem} onPress={() => handleChatMute(MUTE_DURATIONS.ONE_DAY)}>
                    <Ionicons name="today-outline" size={moderateScale(18)} color={theme.primary} />
                    <Text style={[styles.menuItemText, { color: theme.text, fontSize: fontSize(14) }]}>
                      {t('chats.muteFor1Day')}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.menuItem} onPress={() => handleChatMute(MUTE_DURATIONS.ONE_WEEK)}>
                    <Ionicons name="calendar-outline" size={moderateScale(18)} color={theme.primary} />
                    <Text style={[styles.menuItemText, { color: theme.text, fontSize: fontSize(14) }]}>
                      {t('chats.muteFor1Week')}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.menuItem} onPress={() => handleChatMute(MUTE_DURATIONS.FOREVER)}>
                    <Ionicons name="notifications-off-outline" size={moderateScale(18)} color="#F59E0B" />
                    <Text style={[styles.menuItemText, { color: theme.text, fontSize: fontSize(14) }]}>
                      {t('chats.muteForever')}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.modalCancelButton} onPress={closeMuteOptions}>
                    <Text style={[styles.modalCancelText, { color: theme.textSecondary, fontSize: fontSize(14) }]}>
                      {t('common.cancel')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Modal>
          </LinearGradient>

          <RepDetectionPopup
            visible={needsRep}
            hasActiveElection={hasActiveElection}
            onVote={() => {
              dismissRepPopup();
              navigation.navigate('RepVoting', { department: user?.department, stage: user?.stage });
            }}
            onDismiss={dismissRepPopup}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'stretch',
    paddingHorizontal: wp(4),
  },
  loadingText: {
    marginTop: spacing.sm,
    fontWeight: '500',
  },
  content: {
    flex: 1,
    paddingBottom: hp(12),
  },
  listContent: {
    paddingHorizontal: wp(4),
    paddingTop: spacing.sm,
    flexGrow: 1,
  },
  headerContainer: {
    marginBottom: spacing.sm,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexShrink: 1,
  },
  backButton: {
    width: moderateScale(30),
    height: moderateScale(30),
    borderRadius: moderateScale(15),
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  headerActions: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  iconButton: {
    width: moderateScale(36),
    height: moderateScale(36),
    borderRadius: moderateScale(18),
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  archiveCountBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: moderateScale(15),
    height: moderateScale(15),
    borderRadius: moderateScale(7.5),
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  archiveCountBadgeText: {
    color: '#FFFFFF',
    fontSize: fontSize(8),
    fontWeight: '700',
  },
  filterContainer: {
    flexDirection: 'row',
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  filterPill: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: moderateScale(12),
  },
  filterPillText: {
    fontWeight: '500',
  },
  quickActionCard: {
    flex: 1,
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
  },
  quickActionIcon: {
    width: moderateScale(48),
    height: moderateScale(48),
    borderRadius: moderateScale(24),
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickActionText: {
    fontWeight: '500',
    textAlign: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.xs,
    gap: spacing.xs,
  },
  sectionTitle: {
    fontWeight: '600',
    flex: 1,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionCount: {
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: wp(5),
    paddingTop: hp(5),
  },
  emptyCard: {
    borderRadius: 20,
    padding: spacing.xl,
    alignItems: 'center',
    width: '100%',
    maxWidth: 320,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  emptyIconContainer: {
    width: moderateScale(80),
    height: moderateScale(80),
    borderRadius: moderateScale(40),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontWeight: '700',
    marginBottom: spacing.sm,
    textAlign: 'center',
    writingDirection: 'auto',
  },
  emptyMessage: {
    textAlign: 'center',
    lineHeight: fontSize(20),
    paddingHorizontal: wp(5),
    writingDirection: 'auto',
  },
  emptyActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: 12,
    marginTop: spacing.lg,
    gap: spacing.xs,
  },
  emptyActionButtonText: {
    color: '#FFFFFF',
    fontSize: fontSize(14),
    fontWeight: '600',
    writingDirection: 'auto',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  menuCard: {
    width: '100%',
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  muteModalCard: {
    width: '100%',
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  menuTitle: {
    fontWeight: '700',
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  menuItemText: {
    fontWeight: '500',
  },
  modalCancelButton: {
    marginTop: spacing.xs,
    alignSelf: 'flex-end',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  modalCancelText: {
    fontWeight: '600',
  },
});

export default Chats;