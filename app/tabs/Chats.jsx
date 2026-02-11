import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet,
  StatusBar,
  Platform,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  SectionList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppSettings } from '../context/AppSettingsContext';
import { useUser } from '../context/UserContext';
import AnimatedBackground from '../components/AnimatedBackground';
import ChatListItem from '../components/ChatListItem';
import { 
  initializeUserGroups,
  getAllUserChats,
} from '../../database/chatHelpers';
import { getUserById } from '../../database/users';
import { getUnreadCount, decryptChatPreview, isChatRemovedByUser } from '../../database/chats';
import { getChatClearedAt } from '../../database/userChatSettings';
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

const Chats = ({ navigation }) => {
  const { t, theme, isDarkMode } = useAppSettings();
  const { user } = useUser();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [defaultGroups, setDefaultGroups] = useState([]);
  const [customGroups, setCustomGroups] = useState([]);
  const [privateChats, setPrivateChats] = useState([]);
  const [activeFilter, setActiveFilter] = useState('all');
  const [unreadCounts, setUnreadCounts] = useState({});
  const [clearedAtMap, setClearedAtMap] = useState({});

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
    
    // Update the chat in the appropriate list
    const updateChatInList = (list, setList) => {
      const index = list.findIndex(c => c.$id === resolvedPayload.$id);
      if (index >= 0) {
        setList(prev => {
          const updated = [...prev];
          updated[index] = { ...updated[index], ...resolvedPayload };
          return updated.sort((a, b) => {
            const dateA = new Date(a.lastMessageAt || a.$createdAt || 0);
            const dateB = new Date(b.lastMessageAt || b.$createdAt || 0);
            return dateB - dateA;
          });
        });
        return true;
      }
      return false;
    };

    const addChatToList = async () => {
      if (!resolvedPayload?.$id) return false;

      if (resolvedPayload.type === 'private') {
        let chatToAdd = resolvedPayload;
        const otherUserId = resolvedPayload.participants?.find(id => id !== user?.$id);
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

    // Try updating in each list
    let updated = updateChatInList(defaultGroups, setDefaultGroups);
    if (!updated) {
      updated = updateChatInList(customGroups, setCustomGroups);
    }
    if (!updated) {
      updated = updateChatInList(privateChats, setPrivateChats);
    }
    if (!updated) {
      await addChatToList();
    }

    // Refresh unread count for this chat
    if (user?.$id) {
      const count = await getUnreadCount(resolvedPayload.$id, user.$id);
      setUnreadCounts(prev => ({ ...prev, [resolvedPayload.$id]: count }));
    }
  }, [defaultGroups, customGroups, privateChats, user?.$id]);

  // Subscribe to chat list updates
  useChatList(user?.$id, handleRealtimeChatUpdate, !!user?.$id);

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
      await loadChats(false);
    } catch (error) {
      setInitializing(false);
      setLoading(false);
    }
  };

  const loadUnreadCounts = async (allChats) => {
    if (!user?.$id || allChats.length === 0) return;
    
    const counts = {};
    await Promise.all(
      allChats.map(async (chat) => {
        const count = await getUnreadCount(chat.$id, user.$id);
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

  const loadChats = async (useCache = true) => {
    if (!user?.department) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const stageValue = stageToValue(user.stage);
      
      const chats = await getAllUserChats(user.$id, user.department, stageValue, useCache);
      
      setDefaultGroups(chats.defaultGroups || []);
      setCustomGroups(chats.customGroups || []);

      // Filter out private chats where the partner is blocked or the user has removed the conversation
      const blockedUsers = user?.blockedUsers || [];
      const allPrivateChats = chats.privateChats || [];
      const filteredPrivateChats = allPrivateChats.filter(c => {
        // Filter out chats removed by the current user
        if (isChatRemovedByUser(c, user?.$id)) return false;
        // Filter out chats where the partner is blocked
        if (Array.isArray(blockedUsers) && blockedUsers.length > 0) {
          const otherUserId = c.otherUser?.$id || c.otherUser?.id || c.participants?.find(id => id !== user?.$id);
          if (blockedUsers.includes(otherUserId)) return false;
        }
        return true;
      });
      setPrivateChats(filteredPrivateChats);
      
      // Load unread counts for all chats
      const allChats = [
        ...(chats.defaultGroups || []),
        ...(chats.customGroups || []),
        ...(chats.privateChats || []),
      ];
      loadUnreadCounts(allChats);
      loadClearedAtTimestamps(allChats);
    } catch (error) {
      setDefaultGroups([]);
      setCustomGroups([]);
      setPrivateChats([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadChats(false);
    setRefreshing(false);
  };

  // Reload chats when screen comes into focus (e.g., returning from ChatRoom)
  useFocusEffect(
    useCallback(() => {
      if (user?.department && !initializing) {
        loadChats(false);
      }
    }, [user?.department, initializing])
  );

  const handleChatPress = (chat) => {
    navigation.navigate('ChatRoom', { chat });
  };

  const getSectionData = () => {
    const sections = [];

    if ((activeFilter === 'all' || activeFilter === 'class') && defaultGroups.length > 0) {
      sections.push({
        title: t('chats.classLabel'),
        data: defaultGroups,
        icon: 'school',
        color: '#3B82F6',
      });
    }

    if ((activeFilter === 'all' || activeFilter === 'groups') && customGroups.length > 0) {
      sections.push({
        title: t('chats.groupsLabel'),
        data: customGroups,
        icon: 'people',
        color: '#F59E0B',
      });
    }

    if ((activeFilter === 'all' || activeFilter === 'direct') && privateChats.length > 0) {
      const blockedSet = new Set(user?.blockedUsers || []);
      const visiblePrivateChats = blockedSet.size > 0
        ? privateChats.filter(c => {
            const otherUserId = c.participants?.find(id => id !== user?.$id);
            return !blockedSet.has(otherUserId);
          })
        : privateChats;

      if (visiblePrivateChats.length > 0) {
        sections.push({
          title: t('chats.directLabel'),
          data: visiblePrivateChats,
          icon: 'chatbubble',
          color: '#10B981',
        });
      }
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

  const renderChatItem = ({ item }) => (
    <ChatListItem 
      chat={item} 
      onPress={() => handleChatPress(item)}
      currentUserId={user?.$id}
      unreadCount={unreadCounts[item.$id] || 0}
      clearedAt={clearedAtMap[item.$id] || null}
    />
  );

  const renderEmpty = () => {
    if (loading || initializing) {
      return null;
    }
    
    return (
      <View style={styles.emptyContainer}>
        <View style={[styles.emptyCard, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.8)' }]}>
          <View style={[styles.emptyIconContainer, { backgroundColor: isDarkMode ? 'rgba(10, 132, 255, 0.15)' : 'rgba(0, 122, 255, 0.08)' }]}>
            <Ionicons name="chatbubbles" size={moderateScale(48)} color={theme.primary} />
          </View>
          <Text style={[styles.emptyTitle, { fontSize: fontSize(20), color: theme.text }]}>
            {t('chats.emptyTitle')}
          </Text>
          <Text style={[styles.emptyMessage, { fontSize: fontSize(14), color: theme.textSecondary }]}>
            {t('chats.emptyMessage')}
          </Text>
          <TouchableOpacity
            style={[styles.emptyActionButton, { backgroundColor: theme.primary }]}
            onPress={() => navigation.navigate('UserSearch')}
            activeOpacity={0.8}
          >
            <Ionicons name="search" size={moderateScale(18)} color="#FFFFFF" />
            <Text style={styles.emptyActionButtonText}>{t('chats.startNewChat')}</Text>
          </TouchableOpacity>
        </View>
      </View>
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
        <Text style={[styles.headerTitle, { color: theme.text, fontSize: fontSize(22) }]}>
          {t('chats.title')}
        </Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.iconButton, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)' }]}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('UserSearch')}>
            <Ionicons name="search" size={moderateScale(18)} color={theme.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.iconButton, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)' }]}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('CreateGroup')}>
            <Ionicons name="add" size={moderateScale(18)} color="#F59E0B" />
          </TouchableOpacity>
        </View>
      </View>
      
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
            onPress={() => setActiveFilter(filter.key)}>
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
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={[styles.loadingText, { color: theme.textSecondary, fontSize: fontSize(14) }]}>
              {t('chats.settingUpGroups')}
            </Text>
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
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={[styles.loadingText, { color: theme.textSecondary, fontSize: fontSize(14) }]}>
              {t('chats.loadingChats')}
            </Text>
          </View>
        </LinearGradient>
      </View>
    );
  }

  const sections = getSectionData();
  const hasContent = sections.length > 0;

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
              contentContainerStyle={styles.listContent}
              ListHeaderComponent={renderHeader}
              stickySectionHeadersEnabled={false}
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
              contentContainerStyle={styles.listContent}
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
      </LinearGradient>
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
    alignItems: 'center',
    gap: spacing.md,
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
});

export default Chats;