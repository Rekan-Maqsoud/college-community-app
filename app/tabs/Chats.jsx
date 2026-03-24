import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  AppState,
  View, 
  Text, 
  StyleSheet,
  StatusBar,
  Platform,
  RefreshControl,
  TouchableOpacity,
  SectionList,
  Modal,
  Alert,
  Animated,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useIsFocused } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppSettings } from '../context/AppSettingsContext';
import { useUser } from '../context/UserContext';
import ChatListItem from '../components/ChatListItem';
import RepDetectionPopup from '../components/RepDetectionPopup';
import useRepDetection from '../hooks/useRepDetection';
import UnifiedEmptyState from '../components/UnifiedEmptyState';
import { GlassContainer, GlassIconButton, GlassModalCard } from '../components/GlassComponents';
import { ChatListSkeleton } from '../components/SkeletonLoader';
import { 
  initializeUserGroups,
  getAllUserChats,
  leaveGroup,
} from '../../database/chatHelpers';
import { getUserById , blockUser, blockUserChatOnly } from '../../database/users';
import {
  getUnreadCount,
  decryptChatPreview,
  isChatRemovedByUser,
  removePrivateChatForUser,
  deleteChat,
} from '../../database/chats';

import {
  getUserChatSettingsMap,
  muteChat,
  unmuteChat,
  setChatArchived,
  setChatClearedAt,
  MUTE_DURATIONS,
  MUTE_TYPES,
} from '../../database/userChatSettings';
import { 
  wp, 
  hp, 
  fontSize, 
  spacing, 
  moderateScale,
} from '../utils/responsive';
import { borderRadius } from '../theme/designTokens';
import { useChatList, useRealtimeSubscription } from '../hooks/useRealtimeSubscription';
import { config } from '../../database/config';
import useLayout from '../hooks/useLayout';
import { dismissPresentedNotificationsByTarget } from '../../services/pushNotificationService';
import { REFRESH_TOPICS, subscribeToRefreshTopic } from '../utils/dataRefreshBus';
import { hasAcademicOtherSelection } from '../utils/academicSelection';
import { unreadCountCacheManager } from '../utils/cacheManager';
import { getArchivedCountBadgeText, getMuteOptionState } from '../utils/uiStateHelpers';
import telemetry from '../utils/telemetry';

const Chats = ({ navigation }) => {
  const { t, theme, isDarkMode, isRTL } = useAppSettings();
  const { user, refreshUser } = useUser();
  const insets = useSafeAreaInsets();
  const { contentStyle } = useLayout();
  const isFocused = useIsFocused();
  const { needsRep, hasActiveElection, isUserRepresentative, dismiss: dismissRepPopup } = useRepDetection(user);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [defaultGroups, setDefaultGroups] = useState([]);
  const [customGroups, setCustomGroups] = useState([]);
  const [privateChats, setPrivateChats] = useState([]);
  const [activeFilter, setActiveFilter] = useState('all');
  const [filterContainerWidth, setFilterContainerWidth] = useState(0);
  const [unreadCounts, setUnreadCounts] = useState({});
  const [clearedAtMap, setClearedAtMap] = useState({});
  const [muteStatusMap, setMuteStatusMap] = useState({});
  const [muteDetailsMap, setMuteDetailsMap] = useState({});
  const [archivedChatMap, setArchivedChatMap] = useState({});
  const [showArchivedChats, setShowArchivedChats] = useState(false);
  const [selectedChat, setSelectedChat] = useState(null);
  const [chatMenuVisible, setChatMenuVisible] = useState(false);
  const [muteModalVisible, setMuteModalVisible] = useState(false);
  const isAcademicOtherUser = hasAcademicOtherSelection({
    university: user?.university,
    college: user?.college,
    department: user?.department,
  });

  const defaultGroupsRef = useRef([]);
  const customGroupsRef = useRef([]);
  const privateChatsRef = useRef([]);
  const unreadSyncTimersRef = useRef({});
  const processedMessageIdsRef = useRef({});
  const appStateRef = useRef(AppState.currentState);
  const [appStateStatus, setAppStateStatus] = useState(AppState.currentState);
  const lastNetworkSyncAtRef = useRef(0);
  const isSyncInFlightRef = useRef(false);
  const initializeSignatureRef = useRef(null);
  const filterIndicatorAnim = useRef(new Animated.Value(0)).current;
  const hasMeasuredFilterContainerRef = useRef(false);

  useEffect(() => {
    defaultGroupsRef.current = defaultGroups;
  }, [defaultGroups]);

  useEffect(() => {
    customGroupsRef.current = customGroups;
  }, [customGroups]);

  useEffect(() => {
    privateChatsRef.current = privateChats;
  }, [privateChats]);

  useEffect(() => {
    return () => {
      const timers = unreadSyncTimersRef.current;
      Object.keys(timers).forEach((chatId) => {
        if (timers[chatId]) {
          clearTimeout(timers[chatId]);
        }
      });
      unreadSyncTimersRef.current = {};
      processedMessageIdsRef.current = {};
    };
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      appStateRef.current = nextState;
      setAppStateStatus(nextState);
    });

    return () => {
      subscription?.remove();
    };
  }, []);

  const isScreenActive = isFocused && appStateStatus === 'active';
  const userChatLoadSignature = useMemo(() => {
    if (!user?.$id) {
      return null;
    }

    return JSON.stringify({
      userId: user.$id,
      department: user.department || '',
      stage: user.stage || '',
      academicOther: isAcademicOtherUser,
      blockedUsers: [...(user.blockedUsers || [])].sort(),
      chatBlockedUsers: [...(user.chatBlockedUsers || [])].sort(),
    });
  }, [
    isAcademicOtherUser,
    user?.$id,
    user?.department,
    user?.stage,
    user?.blockedUsers,
    user?.chatBlockedUsers,
  ]);

  const hasProcessedMessageEvent = useCallback((messageId) => {
    if (!messageId) {
      return false;
    }

    const now = Date.now();
    const processedMap = processedMessageIdsRef.current;
    const previousTs = processedMap[messageId];

    if (previousTs && now - previousTs < 2 * 60 * 1000) {
      return true;
    }

    processedMap[messageId] = now;

    const keys = Object.keys(processedMap);
    if (keys.length > 800) {
      keys.forEach((key) => {
        if (now - Number(processedMap[key] || 0) > 2 * 60 * 1000) {
          delete processedMap[key];
        }
      });
    }

    return false;
  }, []);

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
    const resolvedPayload = user?.$id
      ? await decryptChatPreview(payload, user.$id)
      : payload;
    
    const mergeChatState = (existingChat, incomingChat) => {
      if (!existingChat) return incomingChat;

      const existingTs = new Date(existingChat.lastMessageAt || existingChat.$updatedAt || existingChat.$createdAt || 0).getTime();
      const incomingTs = new Date(incomingChat.lastMessageAt || incomingChat.$updatedAt || incomingChat.$createdAt || 0).getTime();
      const hasFreshMessage = incomingTs >= existingTs;

      return {
        ...existingChat,
        ...incomingChat,
        lastMessage: hasFreshMessage
          ? (incomingChat.lastMessage ?? existingChat.lastMessage)
          : existingChat.lastMessage,
        lastMessageAt: hasFreshMessage
          ? (incomingChat.lastMessageAt || existingChat.lastMessageAt)
          : existingChat.lastMessageAt,
        lastMessageSenderId: hasFreshMessage
          ? (incomingChat.lastMessageSenderId || existingChat.lastMessageSenderId)
          : existingChat.lastMessageSenderId,
        messageCount: Math.max(
          Number(existingChat.messageCount || 0),
          Number(incomingChat.messageCount || 0)
        ),
      };
    };

    // Update the chat in the appropriate list using functional state updates
    // to avoid stale closure issues
    const updateChatInList = (setList) => {
      let found = false;
      setList(prev => {
        const index = prev.findIndex(c => c.$id === resolvedPayload.$id);
        if (index < 0) return prev;
        found = true;
        const updated = [...prev];
        updated[index] = mergeChatState(updated[index], resolvedPayload);
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
          } catch (_error) {
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

  }, [user?.$id, user?.blockedUsers, user?.chatBlockedUsers]);

  const syncUnreadCountForChat = useCallback(async (chatId) => {
    if (!chatId || !user?.$id) {
      return;
    }

    try {
      const unread = await getUnreadCount(chatId, user.$id);
      setUnreadCounts((prev) => {
        const previousCount = Number(prev[chatId] || 0);
        if (previousCount === unread) {
          return prev;
        }

        return {
          ...prev,
          [chatId]: unread,
        };
      });
    } catch (_error) {
      // Silent fail - unread count will refresh on next sync
    }
  }, [user?.$id]);

  const scheduleUnreadSyncForChat = useCallback((chatId, delayMs = 250) => {
    if (!chatId || !user?.$id) {
      return;
    }

    const timers = unreadSyncTimersRef.current;
    if (timers[chatId]) {
      clearTimeout(timers[chatId]);
    }

    timers[chatId] = setTimeout(() => {
      delete timers[chatId];
      syncUnreadCountForChat(chatId);
    }, delayMs);
  }, [syncUnreadCountForChat, user?.$id]);

  const handleRealtimeMessageUpdate = useCallback((payload, events = []) => {
    const chatId = payload?.chatId;
    if (!chatId || !user?.$id) {
      return;
    }

    const isCreate = events.some((event) => event.includes('.create'));
    const isUpdate = events.some((event) => event.includes('.update'));

    if (isCreate) {
      if (hasProcessedMessageEvent(payload?.$id)) {
        return;
      }

      if (payload?.senderId === user.$id) {
        setUnreadCounts((prev) => ({ ...prev, [chatId]: 0 }));
      } else {
        setUnreadCounts((prev) => {
          const previousCount = Number(prev[chatId] || 0);
          return {
            ...prev,
            [chatId]: previousCount + 1,
          };
        });
        scheduleUnreadSyncForChat(chatId, 600);
      }
      return;
    }

    if (isUpdate) {
      scheduleUnreadSyncForChat(chatId);
      return;
    }

    scheduleUnreadSyncForChat(chatId);
  }, [hasProcessedMessageEvent, scheduleUnreadSyncForChat, user?.$id]);

  const handleRealtimeMessageDelete = useCallback((payload) => {
    const chatId = payload?.chatId;
    if (!chatId) {
      return;
    }
    scheduleUnreadSyncForChat(chatId);
  }, [scheduleUnreadSyncForChat]);

  // Subscribe to chat list updates
  useChatList(user?.$id, handleRealtimeChatUpdate, !!user?.$id && isScreenActive);

  // Subscribe to message-level realtime updates to keep unread badges live
  useRealtimeSubscription(
    config.messagesCollectionId,
    handleRealtimeMessageUpdate,
    handleRealtimeMessageDelete,
    { enabled: !!user?.$id && !!config.messagesCollectionId && isScreenActive }
  );

  const loadUnreadCounts = useCallback(async (allChats) => {
    if (!user?.$id || allChats.length === 0) return;
    const unreadTrace = telemetry.startTrace('chats_load_unread_counts', {
      userId: user.$id,
      chatCount: allChats.length,
    });

    try {
      // Render fast from local cache first, then revalidate from network.
      const cachedCounts = {};
      await Promise.all(
        allChats.map(async (chat) => {
          const cached = await unreadCountCacheManager.getCachedChatUnreadCount(chat.$id, user.$id);
          if (cached && typeof cached.value === 'number') {
            cachedCounts[chat.$id] = cached.value;
          }
        })
      );

      if (Object.keys(cachedCounts).length > 0) {
        setUnreadCounts((prev) => ({ ...prev, ...cachedCounts }));
      }

      const counts = {};
      await Promise.all(
        allChats.map(async (chat) => {
          const count = await getUnreadCount(chat.$id, user.$id);
          counts[chat.$id] = count;
          await unreadCountCacheManager.cacheChatUnreadCount(chat.$id, user.$id, count);
        })
      );
      setUnreadCounts((prev) => ({ ...prev, ...counts }));
      unreadTrace.finish({ success: true, meta: { resolvedCount: Object.keys(counts).length } });
    } catch (error) {
      unreadTrace.finish({ success: false, error });
    }
  }, [user?.$id]);

  const loadChatStateMaps = useCallback(async (allChats) => {
    if (!user?.$id || allChats.length === 0) return;
    const clearedTrace = telemetry.startTrace('chats_load_cleared_timestamps', {
      userId: user.$id,
      chatCount: allChats.length,
    });
    
    try {
      const settingsMap = await getUserChatSettingsMap(user.$id, allChats.map((chat) => chat.$id));
      const timestamps = {};
      const muteMap = {};
      const muteDetails = {};
      const archivedMap = {};
      const now = Date.now();
      const expiredMuteChatIds = [];

      allChats.forEach((chat) => {
        const settings = settingsMap?.[chat.$id] || null;
        const muteExpiresAt = settings?.muteExpiresAt ? new Date(settings.muteExpiresAt).getTime() : null;
        const isMuteExpired = Boolean(muteExpiresAt && muteExpiresAt <= now);

        if (settings?.clearedAt) {
          timestamps[chat.$id] = settings.clearedAt;
        }

        muteMap[chat.$id] = Boolean(settings?.isMuted) && !isMuteExpired;
        muteDetails[chat.$id] = {
          isMuted: Boolean(settings?.isMuted) && !isMuteExpired,
          muteExpiresAt: isMuteExpired ? null : (settings?.muteExpiresAt || null),
        };
        archivedMap[chat.$id] = Boolean(settings?.isArchived);

        if (isMuteExpired) {
          expiredMuteChatIds.push(chat.$id);
        }
      });

      setClearedAtMap(timestamps);
      setMuteStatusMap(muteMap);
  setMuteDetailsMap(muteDetails);
      setArchivedChatMap(archivedMap);
      expiredMuteChatIds.forEach((chatId) => {
        unmuteChat(user.$id, chatId).catch(() => {});
      });

      clearedTrace.finish({ success: true, meta: { resolvedCount: Object.keys(timestamps).length } });
    } catch (error) {
      clearedTrace.finish({ success: false, error });
    }
  }, [user?.$id]);

  const applyChatBuckets = useCallback((chatsPayload) => {
    const normalizedDefaultGroups = Array.isArray(chatsPayload?.defaultGroups) ? chatsPayload.defaultGroups : [];
    const normalizedCustomGroups = Array.isArray(chatsPayload?.customGroups) ? chatsPayload.customGroups : [];
    const normalizedPrivateChats = Array.isArray(chatsPayload?.privateChats) ? chatsPayload.privateChats : [];

    setDefaultGroups(normalizedDefaultGroups);
    setCustomGroups(normalizedCustomGroups);

    const blockedUsers = user?.blockedUsers || [];
    const chatBlockedUsers = user?.chatBlockedUsers || [];
    const blockedSet = new Set([...blockedUsers, ...chatBlockedUsers]);
    const filteredPrivateChats = normalizedPrivateChats.filter(c => {
      if (isChatRemovedByUser(c, user?.$id)) return false;
      if (blockedSet.size > 0) {
        const otherUserId = c.otherUser?.$id || c.otherUser?.id || c.participants?.find(id => id !== user?.$id);
        if (blockedSet.has(otherUserId)) return false;
      }
      return true;
    });

    setPrivateChats(filteredPrivateChats);

    return [
      ...normalizedDefaultGroups,
      ...normalizedCustomGroups,
      ...filteredPrivateChats,
    ];
  }, [user?.$id, user?.blockedUsers, user?.chatBlockedUsers]);

  const loadChats = useCallback(async (options = {}) => {
    const {
      showLoader = true,
      preferCache = false,
      forceNetwork = false,
      skipAuxiliary = false,
    } = options;

    const loadTrace = telemetry.startTrace('chats_load', {
      userId: user?.$id,
      showLoader,
      preferCache,
      forceNetwork,
    });

    if (!user?.$id) {
      loadTrace.finish({ success: false, meta: { reason: 'missing_user' } });
      setLoading(false);
      return;
    }

    try {
      const hasExistingChats =
        defaultGroupsRef.current.length > 0 ||
        customGroupsRef.current.length > 0 ||
        privateChatsRef.current.length > 0;

      if (showLoader && !hasExistingChats) {
        setLoading(true);
      }

      const stageValue = stageToValue(user.stage);
      const departmentForGroups = isAcademicOtherUser ? null : user?.department;
      const stageForGroups = isAcademicOtherUser ? null : stageValue;

      if (preferCache && !forceNetwork) {
        const cachedChats = await getAllUserChats(user.$id, departmentForGroups, stageForGroups, {
          useCache: true,
          skipNetwork: true,
        });

        const cachedAllChats = applyChatBuckets(cachedChats);
        if (cachedAllChats.length > 0) {
          setLoading(false);
        }
      }

      const chats = await getAllUserChats(user.$id, departmentForGroups, stageForGroups, {
        useCache: !forceNetwork,
        skipNetwork: false,
      });

      const allChats = applyChatBuckets(chats);
      if (showLoader) {
        setLoading(false);
      }

      loadTrace.finish({
        success: true,
        meta: {
          totalChats: allChats.length,
          defaultGroups: Array.isArray(chats?.defaultGroups) ? chats.defaultGroups.length : 0,
          customGroups: Array.isArray(chats?.customGroups) ? chats.customGroups.length : 0,
          privateChats: Array.isArray(chats?.privateChats) ? chats.privateChats.length : 0,
        },
      });

      if (!skipAuxiliary) {
        const loadAuxiliaryData = async () => {
          await Promise.all([
            loadUnreadCounts(allChats),
            loadChatStateMaps(allChats),
          ]);
        };

        loadAuxiliaryData().catch(() => {});
      }
    } catch (error) {
      loadTrace.finish({ success: false, error });
      setDefaultGroups([]);
      setCustomGroups([]);
      setPrivateChats([]);
      setLoading(false);
    }
  }, [applyChatBuckets, isAcademicOtherUser, loadChatStateMaps, loadUnreadCounts, user?.$id, user?.department, user?.stage]);

  useEffect(() => {
    if (!user?.$id) {
      initializeSignatureRef.current = null;
      setLoading(false);
      setInitializing(false);
      return;
    }

    if (initializeSignatureRef.current === userChatLoadSignature) {
      return;
    }

    initializeSignatureRef.current = userChatLoadSignature;

    const initializeAndLoadChats = async () => {
      const stageValue = stageToValue(user?.stage);
      const departmentForGroups = isAcademicOtherUser ? null : user?.department;
      const stageForGroups = isAcademicOtherUser ? null : stageValue;

      const initTrace = telemetry.startTrace('chats_initialize', {
        userId: user?.$id,
        hasAcademicOther: isAcademicOtherUser,
      });

      try {
        setInitializing(true);
        const groupsInitPromise = initializeUserGroups(departmentForGroups, stageForGroups, user.$id)
          .catch(() => null);

        await loadChats({ showLoader: true, preferCache: true, skipAuxiliary: true });
        setInitializing(false);

        await groupsInitPromise;
        await loadChats({ showLoader: false, forceNetwork: true });
        initTrace.finish({ success: true });
      } catch (error) {
        initTrace.finish({ success: false, error });
        setInitializing(false);
        setLoading(false);
      }
    };

    initializeAndLoadChats();
  }, [isAcademicOtherUser, loadChats, user?.$id, user?.department, user?.stage, userChatLoadSignature]);

  const triggerSmartRefresh = useCallback(async (
    reason,
    { minIntervalMs = 12000, force = false } = {}
  ) => {
    if (!user?.$id || !isScreenActive) {
      return;
    }

    if (isSyncInFlightRef.current) {
      return;
    }

    const now = Date.now();
    if (!force && now - lastNetworkSyncAtRef.current < minIntervalMs) {
      return;
    }

    isSyncInFlightRef.current = true;
    try {
      await loadChats({ showLoader: false });
      lastNetworkSyncAtRef.current = Date.now();
    } finally {
      isSyncInFlightRef.current = false;
    }
  }, [isScreenActive, loadChats, user?.$id]);

  useEffect(() => {
    if (!isScreenActive) {
      // Reset the throttle gate so the next time the screen becomes active the
      // refresh always runs — while inactive the realtime subscription is off
      // and any new messages for other chats would be missed.
      lastNetworkSyncAtRef.current = 0;
      return;
    }

    triggerSmartRefresh('screen-active', { minIntervalMs: 6000 });
  }, [isScreenActive, triggerSmartRefresh]);

  useEffect(() => {
    const unsubscribe = subscribeToRefreshTopic(REFRESH_TOPICS.CHATS, (payload = {}) => {
      if (payload?.chatId) {
        scheduleUnreadSyncForChat(payload.chatId, 300);
      }

      triggerSmartRefresh('push-chat', { minIntervalMs: 3500 });
    });

    return unsubscribe;
  }, [scheduleUnreadSyncForChat, triggerSmartRefresh]);

  const handleRefresh = async () => {
    const refreshTrace = telemetry.startTrace('chats_pull_to_refresh', {
      userId: user?.$id,
    });
    setRefreshing(true);
    try {
      await loadChats({ showLoader: false, forceNetwork: true });
      lastNetworkSyncAtRef.current = Date.now();
      refreshTrace.finish({ success: true });
    } catch (error) {
      refreshTrace.finish({ success: false, error });
    } finally {
      setRefreshing(false);
    }
  };

  const handleChatPress = (chat) => {
    setUnreadCounts((prev) => ({ ...prev, [chat.$id]: 0 }));
    dismissPresentedNotificationsByTarget({ chatId: chat.$id }).catch(() => {});
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
    const targetUserId = String(selectedChat?.otherUser?.$id || selectedChat?.otherUser?.id || '').trim();
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
              await loadChats();
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
              await loadChats();
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
              await loadChats();
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
      setMuteDetailsMap((prev) => ({
        ...prev,
        [selectedChat.$id]: {
          isMuted: true,
          muteExpiresAt: duration == null ? null : new Date(Date.now() + duration).toISOString(),
        },
      }));
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
      setMuteDetailsMap((prev) => ({
        ...prev,
        [selectedChat.$id]: {
          isMuted: false,
          muteExpiresAt: null,
        },
      }));
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
              await loadChats();
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
    <View style={[styles.sectionHeader, isRTL && styles.rowReverse]}>
      <Ionicons name={section.icon} size={moderateScale(12)} color={section.color} />
      <Text style={[styles.sectionTitle, isRTL && styles.directionalText, { color: theme.textSecondary, fontSize: fontSize(11) }]}>
        {section.title}
      </Text>
      <Text style={[styles.sectionCount, isRTL && styles.directionalText, { color: theme.textSecondary, fontSize: fontSize(10) }]}>
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
  const archivedChatsCount = [
    ...defaultGroups,
    ...customGroups,
    ...privateChats,
  ].filter((chat) => archivedChatMap[chat.$id]).length;
  const selectedMuteState = getMuteOptionState({
    isMuted: Boolean(muteDetailsMap[selectedChat?.$id]?.isMuted),
    muteExpiresAt: muteDetailsMap[selectedChat?.$id]?.muteExpiresAt || null,
  });
  const formatMuteStatusTime = (timestamp) => {
    if (!timestamp) {
      return '';
    }

    try {
      return new Intl.DateTimeFormat(undefined, {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      }).format(new Date(timestamp));
    } catch (_error) {
      return new Date(timestamp).toLocaleString();
    }
  };
  const selectedMuteStatusText = selectedMuteState.isMuted
    ? (selectedMuteState.isForever
      ? t('chats.mutedForever')
      : t('chats.mutedUntil').replace('{time}', formatMuteStatusTime(muteDetailsMap[selectedChat?.$id]?.muteExpiresAt)))
    : t('chats.notMuted');

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
          actionIconName={isRTL ? 'arrow-forward' : 'arrow-back'}
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

  const selectedFilterIndex = Math.max(0, filterOptions.findIndex((option) => option.key === activeFilter));
  const visibleFilterOptions = isRTL ? [...filterOptions].reverse() : filterOptions;
  const selectedVisualFilterIndex = isRTL
    ? (filterOptions.length - 1 - selectedFilterIndex)
    : selectedFilterIndex;
  const filterTabWidth = filterContainerWidth > 0 ? (filterContainerWidth / filterOptions.length) : 0;

  useEffect(() => {
    if (filterContainerWidth <= 0) {
      return;
    }

    if (!hasMeasuredFilterContainerRef.current) {
      filterIndicatorAnim.setValue(selectedVisualFilterIndex);
      hasMeasuredFilterContainerRef.current = true;
      return;
    }

    const animation = Animated.spring(filterIndicatorAnim, {
      toValue: selectedVisualFilterIndex,
      useNativeDriver: true,
      tension: 68,
      friction: 12,
    });

    animation.start();
  }, [filterContainerWidth, filterIndicatorAnim, selectedVisualFilterIndex]);

  const filterTranslateX = filterIndicatorAnim.interpolate({
    inputRange: [0, 1, 2, 3],
    outputRange: [0, filterTabWidth, filterTabWidth * 2, filterTabWidth * 3],
  });

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <View style={[styles.headerTop, isRTL && styles.rowReverse]}>
        <View style={[styles.titleRow, isRTL && styles.rowReverse]}>
          {showArchivedChats && (
            <TouchableOpacity
              style={[styles.backButton]}
              activeOpacity={0.7}
              onPress={() => setShowArchivedChats(false)}
              accessibilityRole="button"
              accessibilityLabel={t('common.goBack')}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <GlassIconButton size={moderateScale(34)} borderRadiusValue={moderateScale(17)}>
                <Ionicons name={isRTL ? 'arrow-forward' : 'arrow-back'} size={moderateScale(16)} color={theme.text} />
              </GlassIconButton>
            </TouchableOpacity>
          )}
          <Text style={[styles.headerTitle, isRTL && styles.directionalText, { color: theme.text, fontSize: fontSize(22) }]}>
            {showArchivedChats ? t('chats.archivedChats') : t('chats.title')}
          </Text>
        </View>
        <View style={[styles.headerActions, isRTL && styles.rowReverse]}>
          <TouchableOpacity
            style={[styles.iconButton]}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('UserSearch')}
            accessibilityRole="button"
            accessibilityLabel={t('chats.startNewChat')}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <GlassIconButton size={moderateScale(36)} borderRadiusValue={moderateScale(12)}>
              <Ionicons name="search" size={moderateScale(18)} color={theme.primary} />
            </GlassIconButton>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.iconButton]}
            activeOpacity={0.7}
            onPress={() => setShowArchivedChats((prev) => !prev)}
            accessibilityRole="button"
            accessibilityLabel={t('chats.archivedCount').replace('{count}', String(archivedChatsCount))}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <GlassIconButton
              size={moderateScale(36)}
              borderRadiusValue={moderateScale(12)}
              active={showArchivedChats}
              activeColor="#F59E0B"
            >
              <Ionicons name="archive-outline" size={moderateScale(17)} color="#F59E0B" />
            </GlassIconButton>
            {archivedChatsCount > 0 && (
              <View
                pointerEvents="none"
                style={[
                  styles.archiveCountBadge,
                  { backgroundColor: isDarkMode ? 'rgba(59,130,246,0.92)' : '#3B82F6' },
                ]}
              >
                <Text style={styles.archiveCountBadgeText}>{getArchivedCountBadgeText(archivedChatsCount)}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.iconButton]}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('CreateGroup')}
            accessibilityRole="button"
            accessibilityLabel={t('chats.createGroup')}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <GlassIconButton size={moderateScale(36)} borderRadiusValue={moderateScale(12)}>
              <Ionicons name="add" size={moderateScale(18)} color="#F59E0B" />
            </GlassIconButton>
          </TouchableOpacity>
        </View>
      </View>

      {!showArchivedChats && archivedChatsCount > 0 && (
        <TouchableOpacity
          style={[styles.archivedSummaryButton, isRTL && styles.archivedSummaryButtonRtl]}
          activeOpacity={0.8}
          onPress={() => setShowArchivedChats(true)}
          accessibilityRole="button"
          accessibilityLabel={t('chats.archivedCount').replace('{count}', String(archivedChatsCount))}
        >
          <GlassContainer style={styles.archivedSummaryChip} borderRadius={moderateScale(12)}>
            <Ionicons name="archive-outline" size={moderateScale(15)} color="#F59E0B" />
            <Text style={[styles.archivedSummaryText, isRTL && styles.directionalText, { color: theme.text }]}>
              {t('chats.archivedCount').replace('{count}', String(archivedChatsCount))}
            </Text>
            {archivedUnreadChatsCount > 0 ? (
              <View style={[styles.archiveCountBadge, { position: 'relative', top: 0, right: 0, backgroundColor: isDarkMode ? 'rgba(59,130,246,0.92)' : '#3B82F6' }]}>
                <Text style={styles.archiveCountBadgeText}>{getArchivedCountBadgeText(archivedUnreadChatsCount)}</Text>
              </View>
            ) : null}
          </GlassContainer>
        </TouchableOpacity>
      )}
      
      {!showArchivedChats && (
        <View
          style={styles.filterContainer}
          onLayout={(event) => {
            const width = event.nativeEvent.layout.width;
            if (width && width !== filterContainerWidth) {
              setFilterContainerWidth(width);
            }
          }}
        >
          <GlassContainer style={StyleSheet.absoluteFill} borderRadius={moderateScale(12)} />
          <View style={styles.filterRow}>
            {filterContainerWidth > 0 && (
              <Animated.View
                style={[
                  styles.filterIndicator,
                  {
                    width: filterTabWidth,
                    backgroundColor: theme.primary,
                    transform: [{ translateX: filterTranslateX }],
                  },
                ]}
              />
            )}
            {visibleFilterOptions.map((filter) => (
              <TouchableOpacity
                key={filter.key}
                style={[styles.filterPill, { width: filterTabWidth || `${100 / filterOptions.length}%` }]}
                activeOpacity={0.7}
                onPress={() => setActiveFilter(filter.key)}
                accessibilityRole="button"
                accessibilityLabel={filter.label}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={[
                  styles.filterPillText,
                  isRTL && styles.directionalText,
                  {
                    color: activeFilter === filter.key ? '#FFFFFF' : (isDarkMode ? 'rgba(255,255,255,0.84)' : theme.textSecondary),
                    fontSize: fontSize(11),
                  }
                ]}>
                  {filter.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
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
            : ['#e3f2fd', '#bbdefb', '#90caf9']
          }
          style={styles.gradient}>
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
            : ['#e3f2fd', '#bbdefb', '#90caf9']
          }
          style={styles.gradient}>
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
              : ['#e3f2fd', '#bbdefb', '#90caf9']
            }
            style={styles.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}>

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
                <FlashList
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
                <GlassModalCard
                  style={[styles.menuCard]}
                  padding={16}
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
                </GlassModalCard>
              </TouchableOpacity>
            </Modal>

            <Modal
              visible={muteModalVisible}
              transparent
              animationType="slide"
              onRequestClose={closeMuteOptions}
            >
              <View style={styles.modalOverlay}>
                <GlassModalCard
                  style={[styles.muteModalCard]}
                  padding={16}
                >
                  <Text style={[styles.menuTitle, { color: theme.text, fontSize: fontSize(16) }]}> 
                    {t('chats.muteOptions')}
                  </Text>

                  <View style={[styles.muteStatusCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    <Text style={[styles.muteStatusLabel, { color: theme.textSecondary, fontSize: fontSize(11) }]}>
                      {t('chats.currentMuteStatus')}
                    </Text>
                    <Text style={[styles.muteStatusText, { color: theme.text, fontSize: fontSize(14) }]}>
                      {selectedMuteStatusText}
                    </Text>
                  </View>

                  {muteStatusMap[selectedChat?.$id] && (
                    <TouchableOpacity style={styles.menuItem} onPress={handleChatUnmute}>
                      <Ionicons name="notifications-outline" size={moderateScale(18)} color="#10B981" />
                      <Text style={[styles.menuItemText, { color: '#10B981', fontSize: fontSize(14) }]}>
                        {t('chats.unmute')}
                      </Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    style={[
                      styles.menuItem,
                      selectedMuteState.activeOption === 'oneHour' && { backgroundColor: theme.primary + '12' },
                    ]}
                    onPress={() => handleChatMute(MUTE_DURATIONS.ONE_HOUR)}
                  >
                    <Ionicons name="time-outline" size={moderateScale(18)} color={theme.primary} />
                    <Text style={[
                      styles.menuItemText,
                      { color: theme.text, fontSize: fontSize(14) },
                      selectedMuteState.activeOption === 'oneHour' && { color: theme.primary },
                    ]}>
                      {t('chats.muteFor1Hour')}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.menuItem,
                      selectedMuteState.activeOption === 'eightHours' && { backgroundColor: theme.primary + '12' },
                    ]}
                    onPress={() => handleChatMute(MUTE_DURATIONS.EIGHT_HOURS)}
                  >
                    <Ionicons name="time-outline" size={moderateScale(18)} color={theme.primary} />
                    <Text style={[
                      styles.menuItemText,
                      { color: theme.text, fontSize: fontSize(14) },
                      selectedMuteState.activeOption === 'eightHours' && { color: theme.primary },
                    ]}>
                      {t('chats.muteFor8Hours')}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.menuItem,
                      selectedMuteState.activeOption === 'oneDay' && { backgroundColor: theme.primary + '12' },
                    ]}
                    onPress={() => handleChatMute(MUTE_DURATIONS.ONE_DAY)}
                  >
                    <Ionicons name="today-outline" size={moderateScale(18)} color={theme.primary} />
                    <Text style={[
                      styles.menuItemText,
                      { color: theme.text, fontSize: fontSize(14) },
                      selectedMuteState.activeOption === 'oneDay' && { color: theme.primary },
                    ]}>
                      {t('chats.muteFor1Day')}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.menuItem,
                      selectedMuteState.activeOption === 'oneWeek' && { backgroundColor: theme.primary + '12' },
                    ]}
                    onPress={() => handleChatMute(MUTE_DURATIONS.ONE_WEEK)}
                  >
                    <Ionicons name="calendar-outline" size={moderateScale(18)} color={theme.primary} />
                    <Text style={[
                      styles.menuItemText,
                      { color: theme.text, fontSize: fontSize(14) },
                      selectedMuteState.activeOption === 'oneWeek' && { color: theme.primary },
                    ]}>
                      {t('chats.muteFor1Week')}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.menuItem,
                      selectedMuteState.activeOption === 'forever' && { backgroundColor: theme.primary + '12' },
                    ]}
                    onPress={() => handleChatMute(MUTE_DURATIONS.FOREVER)}
                  >
                    <Ionicons name="notifications-off-outline" size={moderateScale(18)} color="#F59E0B" />
                    <Text style={[
                      styles.menuItemText,
                      { color: theme.text, fontSize: fontSize(14) },
                      selectedMuteState.activeOption === 'forever' && { color: theme.primary },
                    ]}>
                      {t('chats.muteForever')}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.modalCancelButton} onPress={closeMuteOptions}>
                    <Text style={[styles.modalCancelText, { color: theme.textSecondary, fontSize: fontSize(14) }]}>
                      {t('common.cancel')}
                    </Text>
                  </TouchableOpacity>
                </GlassModalCard>
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
  rowReverse: {
    flexDirection: 'row-reverse',
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
    top: -6,
    right: -6,
    minWidth: moderateScale(20),
    height: moderateScale(18),
    borderRadius: moderateScale(9),
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: moderateScale(4),
  },
  archiveCountBadgeText: {
    color: '#FFFFFF',
    fontSize: fontSize(8.5),
    fontWeight: '700',
    lineHeight: fontSize(9),
    includeFontPadding: false,
  },
  filterContainer: {
    marginTop: spacing.sm,
    height: moderateScale(40),
    borderRadius: moderateScale(12),
    overflow: 'hidden',
  },
  archivedSummaryButton: {
    marginTop: spacing.sm,
    alignSelf: 'flex-start',
  },
  archivedSummaryButtonRtl: {
    alignSelf: 'flex-end',
  },
  archivedSummaryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  archivedSummaryText: {
    fontWeight: '600',
    fontSize: fontSize(12),
  },
  filterRow: {
    flexDirection: 'row',
    position: 'relative',
    height: '100%',
    width: '100%',
  },
  filterIndicator: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: moderateScale(12),
    zIndex: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  filterPill: {
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
    paddingHorizontal: spacing.xs,
  },
  filterPillText: {
    fontWeight: '600',
    textAlign: 'center',
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
  directionalText: {
    textAlign: 'right',
    writingDirection: 'rtl',
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
  muteStatusCard: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
  },
  muteStatusLabel: {
    fontWeight: '600',
    marginBottom: 2,
  },
  muteStatusText: {
    fontWeight: '600',
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