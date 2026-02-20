import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TextInput,
  TouchableOpacity,
  FlatList,
  Modal,
  RefreshControl,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppSettings } from '../context/AppSettingsContext';
import { useUser } from '../context/UserContext';
import { useTranslation } from '../hooks/useTranslation';
import { useLectureChannelsRealtime } from '../hooks/useRealtimeSubscription';
import {
  createLectureChannel,
  getLectureChannels,
  getLectureChannelShareLink,
  getMyLectureChannels,
  LECTURE_ACCESS_TYPES,
  LECTURE_CHANNEL_TYPES,
  requestJoinLectureChannel,
} from '../../database/lectures';
import { CHAT_TYPES, getChats } from '../../database/chats';
import { wp, fontSize, spacing } from '../utils/responsive';
import { borderRadius } from '../theme/designTokens';

const CHANNEL_FILTERS = {
  ALL: 'all',
  OFFICIAL: 'official',
  COMMUNITY: 'community',
};

const LECTURE_WINDOWS = {
  DISCOVER: 'discover',
  MY: 'my',
};

const logLectureTab = (event, payload = {}) => {
  console.log('[LectureTab]', event, payload);
};

const logLectureTabError = (event, error, payload = {}) => {
  console.error('[LectureTab]', event, {
    ...payload,
    message: error?.message || String(error),
  });
};

const parseLectureSuggestionSettings = (settingsJson) => {
  if (!settingsJson) {
    return {
      suggestToDepartment: false,
      suggestToStage: false,
      suggestedDepartment: '',
      suggestedStage: '',
    };
  }

  try {
    const parsed = typeof settingsJson === 'string' ? JSON.parse(settingsJson) : settingsJson;
    return {
      suggestToDepartment: !!parsed?.suggestToDepartment,
      suggestToStage: !!parsed?.suggestToStage,
      suggestedDepartment: String(parsed?.suggestedDepartment || '').trim(),
      suggestedStage: String(parsed?.suggestedStage || '').trim(),
    };
  } catch {
    return {
      suggestToDepartment: false,
      suggestToStage: false,
      suggestedDepartment: '',
      suggestedStage: '',
    };
  }
};

const canLinkGroupToLectureChannel = (chat, userId) => {
  if (!chat?.$id || !userId) {
    return false;
  }

  if (chat.type === CHAT_TYPES.DEPARTMENT_GROUP || chat.type === 'private') {
    return false;
  }

  const representatives = Array.isArray(chat.representatives) ? chat.representatives : [];
  const admins = Array.isArray(chat.admins) ? chat.admins : [];

  if (chat.type === CHAT_TYPES.STAGE_GROUP) {
    return representatives.includes(userId);
  }

  return admins.includes(userId) || representatives.includes(userId);
};

const CreateChannelModal = ({
  visible,
  onClose,
  onCreate,
  t,
  colors,
  creating,
  groups,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [channelType, setChannelType] = useState(LECTURE_CHANNEL_TYPES.COMMUNITY);
  const [needsApproval, setNeedsApproval] = useState(false);
  const [linkedGroupId, setLinkedGroupId] = useState('');

  const handleSubmit = async () => {
    const accessType = channelType === LECTURE_CHANNEL_TYPES.OFFICIAL
      ? LECTURE_ACCESS_TYPES.APPROVAL_REQUIRED
      : needsApproval
        ? LECTURE_ACCESS_TYPES.APPROVAL_REQUIRED
        : LECTURE_ACCESS_TYPES.OPEN;

    const success = await onCreate({
      name,
      description,
      channelType,
      accessType,
      linkedChatId: linkedGroupId,
    });

    if (success) {
      setName('');
      setDescription('');
      setChannelType(LECTURE_CHANNEL_TYPES.COMMUNITY);
      setNeedsApproval(false);
      setLinkedGroupId('');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={[styles.modalBackdrop, { backgroundColor: colors.overlay }]}> 
        <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}> 
          <Text style={[styles.modalTitle, { color: colors.text }]}>{t('lectures.createChannel')}</Text>

          <TextInput
            value={name}
            onChangeText={setName}
            placeholder={t('lectures.channelNamePlaceholder')}
            placeholderTextColor={colors.textSecondary}
            style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBackground }]}
          />

          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder={t('lectures.channelDescriptionPlaceholder')}
            placeholderTextColor={colors.textSecondary}
            multiline
            style={[
              styles.input,
              styles.multilineInput,
              { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBackground },
            ]}
          />

          <View style={styles.typeRow}>
            <TouchableOpacity
              style={[
                styles.chip,
                {
                  borderColor: colors.border,
                  backgroundColor: channelType === LECTURE_CHANNEL_TYPES.OFFICIAL ? colors.primary : 'transparent',
                },
              ]}
              onPress={() => setChannelType(LECTURE_CHANNEL_TYPES.OFFICIAL)}>
              <Text style={[styles.chipText, { color: channelType === LECTURE_CHANNEL_TYPES.OFFICIAL ? '#FFFFFF' : colors.text }]}> 
                {t('lectures.official')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.chip,
                {
                  borderColor: colors.border,
                  backgroundColor: channelType === LECTURE_CHANNEL_TYPES.COMMUNITY ? colors.primary : 'transparent',
                },
              ]}
              onPress={() => setChannelType(LECTURE_CHANNEL_TYPES.COMMUNITY)}>
              <Text style={[styles.chipText, { color: channelType === LECTURE_CHANNEL_TYPES.COMMUNITY ? '#FFFFFF' : colors.text }]}> 
                {t('lectures.community')}
              </Text>
            </TouchableOpacity>
          </View>

          {channelType === LECTURE_CHANNEL_TYPES.COMMUNITY && (
            <TouchableOpacity
              style={[styles.toggleRow, { borderColor: colors.border, backgroundColor: colors.inputBackground }]}
              onPress={() => setNeedsApproval(prev => !prev)}>
              <Text style={[styles.toggleText, { color: colors.text }]}>{t('lectures.requireApproval')}</Text>
              <Ionicons name={needsApproval ? 'checkbox' : 'square-outline'} size={20} color={colors.primary} />
            </TouchableOpacity>
          )}

          <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('lectures.chooseLinkedGroup')}</Text>

          <TouchableOpacity
            style={[
              styles.groupOption,
              {
                borderColor: linkedGroupId ? colors.border : colors.primary,
                backgroundColor: colors.inputBackground,
              },
            ]}
            onPress={() => setLinkedGroupId('')}>
            <Text style={[styles.groupOptionText, { color: colors.text }]}>{t('lectures.noLink')}</Text>
            {!linkedGroupId && <Ionicons name="checkmark-circle" size={18} color={colors.primary} />}
          </TouchableOpacity>

          {groups.map(group => (
            <TouchableOpacity
              key={group.$id}
              style={[
                styles.groupOption,
                {
                  borderColor: linkedGroupId === group.$id ? colors.primary : colors.border,
                  backgroundColor: colors.inputBackground,
                },
              ]}
              onPress={() => setLinkedGroupId(group.$id)}>
              <View style={styles.groupOptionMeta}>
                <Text style={[styles.groupOptionText, { color: colors.text }]} numberOfLines={1}>{group.name}</Text>
                <Text style={[styles.groupOptionHint, { color: colors.textSecondary }]} numberOfLines={1}>
                  {group.type === CHAT_TYPES.STAGE_GROUP ? t('lectures.stageGroup') : t('lectures.customGroup')}
                </Text>
              </View>
              {linkedGroupId === group.$id && <Ionicons name="checkmark-circle" size={18} color={colors.primary} />}
            </TouchableOpacity>
          ))}

          {groups.length === 0 && (
            <Text style={[styles.emptyGroupText, { color: colors.textSecondary }]}>{t('lectures.noEligibleGroups')}</Text>
          )}

          <View style={styles.modalButtons}>
            <TouchableOpacity style={[styles.modalBtn, { borderColor: colors.border }]} onPress={onClose}>
              <Text style={[styles.modalBtnText, { color: colors.textSecondary }]}>{t('common.cancel')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modalBtn, { backgroundColor: colors.primary, borderColor: colors.primary }]}
              onPress={handleSubmit}
              disabled={creating}>
              <Text style={[styles.modalBtnText, { color: '#FFFFFF' }]}> 
                {creating ? t('lectures.creating') : t('lectures.create')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const Lecture = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { colors, isDarkMode } = useAppSettings();
  const { user } = useUser();
  const { t } = useTranslation();

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState(CHANNEL_FILTERS.ALL);
  const [activeWindow, setActiveWindow] = useState(LECTURE_WINDOWS.DISCOVER);
  const [allChannels, setAllChannels] = useState([]);
  const [myChannels, setMyChannels] = useState([]);
  const [availableGroups, setAvailableGroups] = useState([]);

  const [createOpen, setCreateOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);

  const myChannelIds = useMemo(() => new Set((myChannels || []).map(channel => channel.$id)), [myChannels]);

  const suggestedChannels = useMemo(() => {
    if (!Array.isArray(allChannels) || !allChannels.length) {
      return [];
    }

    const userDepartment = String(user?.department || '').trim().toLowerCase();
    const userStage = String(user?.stage || user?.year || '').trim();

    return allChannels.filter((channel) => {
      const settings = parseLectureSuggestionSettings(channel?.settingsJson);
      if (!settings.suggestToDepartment && !settings.suggestToStage) {
        return false;
      }

      const departmentMatch = settings.suggestToDepartment
        && !!userDepartment
        && (!!settings.suggestedDepartment ? settings.suggestedDepartment.toLowerCase() === userDepartment : true);

      const stageMatch = settings.suggestToStage
        && !!userStage
        && (!!settings.suggestedStage ? settings.suggestedStage === userStage || settings.suggestedStage === 'all' : true);

      return departmentMatch || stageMatch;
    });
  }, [allChannels, user?.department, user?.stage, user?.year]);

  const channelAccessLabel = (channel) => {
    if (!channel) {
      return '';
    }

    if (channel.channelType === LECTURE_CHANNEL_TYPES.OFFICIAL) {
      return t('lectures.officialApproval');
    }

    return channel.accessType === LECTURE_ACCESS_TYPES.OPEN
      ? t('lectures.openChannel')
      : t('lectures.approvalRequired');
  };

  const loadAvailableGroups = useCallback(async () => {
    if (!user?.$id) {
      setAvailableGroups([]);
      return;
    }

    try {
      const chats = await getChats(user.$id);
      const filtered = (Array.isArray(chats) ? chats : []).filter(chat => canLinkGroupToLectureChannel(chat, user.$id));
      setAvailableGroups(filtered);
    } catch (error) {
      logLectureTabError('loadAvailableGroups:error', error, { userId: user?.$id || '' });
      setAvailableGroups([]);
    }
  }, [user?.$id]);

  const loadChannels = useCallback(async ({ showLoading = true } = {}) => {
    logLectureTab('loadChannels:start', {
      showLoading,
      filter,
      hasSearch: !!search,
      userId: user?.$id || '',
    });

    try {
      if (showLoading) {
        setLoading(true);
      }

      const [channels, mine] = await Promise.all([
        getLectureChannels({
          search,
          channelType: filter,
          limit: 50,
          offset: 0,
        }),
        getMyLectureChannels(user?.$id),
      ]);

      setAllChannels(channels);
      setMyChannels(mine);
      logLectureTab('loadChannels:success', {
        channelsCount: channels.length,
        myChannelsCount: mine.length,
      });
    } catch (error) {
      logLectureTabError('loadChannels:error', error, {
        filter,
        hasSearch: !!search,
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter, search, user?.$id]);

  React.useEffect(() => {
    logLectureTab('effect:initialLoad', {});
    loadChannels();
    loadAvailableGroups();
  }, [loadChannels, loadAvailableGroups]);

  useLectureChannelsRealtime(() => {
    loadChannels({ showLoading: false });
  }, true);

  const refresh = async () => {
    setRefreshing(true);
    await Promise.all([
      loadChannels({ showLoading: false }),
      loadAvailableGroups(),
    ]);
  };

  const handleCreateChannel = async (payload) => {
    logLectureTab('createChannel:start', {
      channelType: payload?.channelType || '',
      hasName: !!payload?.name,
      linkedChatId: payload?.linkedChatId || '',
    });

    try {
      setCreateLoading(true);
      const channel = await createLectureChannel(payload);
      setCreateOpen(false);
      await loadChannels({ showLoading: false });
      navigation.navigate('LectureChannel', {
        channelId: channel.$id,
      });
      logLectureTab('createChannel:success', { channelId: channel?.$id || '' });
      return true;
    } catch (error) {
      logLectureTabError('createChannel:error', error);
      return false;
    } finally {
      setCreateLoading(false);
    }
  };

  const handleRequestJoin = async (channelId) => {
    logLectureTab('requestJoin:start', { channelId });
    try {
      await requestJoinLectureChannel(channelId);
      await loadChannels({ showLoading: false });
      logLectureTab('requestJoin:success', { channelId });
    } catch (error) {
      logLectureTabError('requestJoin:error', error, { channelId });
    }
  };

  const handleShareChannel = async (channelId) => {
    logLectureTab('shareChannel:start', { channelId });
    try {
      const shareLink = getLectureChannelShareLink(channelId);
      await Share.share({
        title: t('lectures.shareChannel'),
        message: `${t('lectures.shareChannelMessage')}\n${shareLink}`,
      });
      logLectureTab('shareChannel:success', { channelId });
    } catch (error) {
      logLectureTabError('shareChannel:error', error, { channelId });
    }
  };

  const openChannel = (channel) => {
    if (!channel?.$id) {
      return;
    }

    navigation.navigate('LectureChannel', {
      channelId: channel.$id,
    });
  };

  const renderChannelCard = ({ item }) => {
    const joined = myChannelIds.has(item.$id);

    return (
      <TouchableOpacity
        style={[styles.channelCard, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={() => openChannel(item)}>
        <View style={styles.channelHeader}>
          <Text style={[styles.channelName, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
          <Text style={[styles.channelTypeBadge, { color: colors.primary }]}>
            {item.channelType === LECTURE_CHANNEL_TYPES.OFFICIAL ? t('lectures.official') : t('lectures.community')}
          </Text>
        </View>

        <Text style={[styles.channelDescription, { color: colors.textSecondary }]} numberOfLines={2}>
          {item.description || t('lectures.noDescription')}
        </Text>

        <View style={styles.channelMetaRow}>
          <Text style={[styles.metaText, { color: colors.textSecondary }]}> 
            {channelAccessLabel(item)}
          </Text>
          <Text style={[styles.metaText, { color: colors.textSecondary }]}> 
            {t('lectures.membersCount').replace('{count}', String(item.membersCount || 0))}
          </Text>
        </View>

        <View style={styles.cardActions}>
          <TouchableOpacity
            style={[styles.secondaryBtn, { borderColor: colors.border }]}
            onPress={() => handleShareChannel(item.$id)}>
            <Text style={[styles.secondaryBtnText, { color: colors.text }]}>{t('lectures.share')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.secondaryBtn, { borderColor: colors.border }]}
            onPress={() => openChannel(item)}>
            <Text style={[styles.secondaryBtnText, { color: colors.text }]}>{t('lectures.openChannel')}</Text>
          </TouchableOpacity>

          {!joined && (
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
              onPress={() => handleRequestJoin(item.$id)}>
              <Text style={styles.primaryBtnText}>{t('lectures.join')}</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const listData = activeWindow === LECTURE_WINDOWS.DISCOVER ? allChannels : myChannels;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}> 
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor="transparent"
        translucent
      />

      <View style={[styles.header, { paddingTop: insets.top + spacing.sm, borderBottomColor: colors.border }]}> 
        <Text style={[styles.screenTitle, { color: colors.text }]}>{t('lectures.title')}</Text>
        <TouchableOpacity style={[styles.createHeaderBtn, { backgroundColor: colors.primary }]} onPress={() => setCreateOpen(true)}>
          <Ionicons name="add" size={18} color="#FFFFFF" />
          <Text style={styles.createHeaderBtnText}>{t('lectures.create')}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.windowSwitcher}>
        <TouchableOpacity
          style={[
            styles.windowBtn,
            {
              borderColor: colors.border,
              backgroundColor: activeWindow === LECTURE_WINDOWS.DISCOVER ? colors.primary : 'transparent',
            },
          ]}
          onPress={() => setActiveWindow(LECTURE_WINDOWS.DISCOVER)}>
          <Text style={[styles.windowBtnText, { color: activeWindow === LECTURE_WINDOWS.DISCOVER ? '#FFFFFF' : colors.text }]}> 
            {t('lectures.discoverWindow')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.windowBtn,
            {
              borderColor: colors.border,
              backgroundColor: activeWindow === LECTURE_WINDOWS.MY ? colors.primary : 'transparent',
            },
          ]}
          onPress={() => setActiveWindow(LECTURE_WINDOWS.MY)}>
          <Text style={[styles.windowBtnText, { color: activeWindow === LECTURE_WINDOWS.MY ? '#FFFFFF' : colors.text }]}> 
            {t('lectures.myWindow')}
          </Text>
        </TouchableOpacity>
      </View>

      {activeWindow === LECTURE_WINDOWS.DISCOVER && (
        <View style={styles.searchWrap}>
          <TextInput
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={() => loadChannels()}
            placeholder={t('lectures.searchPlaceholder')}
            placeholderTextColor={colors.textSecondary}
            style={[styles.searchInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBackground }]}
          />

          <View style={styles.filterRow}>
            {[CHANNEL_FILTERS.ALL, CHANNEL_FILTERS.OFFICIAL, CHANNEL_FILTERS.COMMUNITY].map(item => (
              <TouchableOpacity
                key={item}
                style={[
                  styles.filterChip,
                  {
                    borderColor: colors.border,
                    backgroundColor: filter === item ? colors.primary : 'transparent',
                  },
                ]}
                onPress={() => setFilter(item)}>
                <Text style={[styles.filterChipText, { color: filter === item ? '#FFFFFF' : colors.text }]}>
                  {item === CHANNEL_FILTERS.ALL
                    ? t('lectures.all')
                    : item === CHANNEL_FILTERS.OFFICIAL
                      ? t('lectures.official')
                      : t('lectures.community')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.suggestedWrap}>
            <Text style={[styles.suggestedTitle, { color: colors.text }]}>{t('lectures.suggestedChannels')}</Text>
            {suggestedChannels.length > 0 ? (
              <FlatList
                horizontal
                showsHorizontalScrollIndicator={false}
                data={suggestedChannels}
                keyExtractor={(item) => item.$id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.suggestedCard, { borderColor: colors.border, backgroundColor: colors.card }]}
                    onPress={() => openChannel(item)}>
                    <Text style={[styles.suggestedCardTitle, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
                    <Text style={[styles.suggestedCardSub, { color: colors.textSecondary }]} numberOfLines={1}>
                      {item.channelType === LECTURE_CHANNEL_TYPES.OFFICIAL ? t('lectures.official') : t('lectures.community')}
                    </Text>
                  </TouchableOpacity>
                )}
              />
            ) : (
              <Text style={[styles.suggestedEmpty, { color: colors.textSecondary }]}>{t('lectures.noSuggestedChannels')}</Text>
            )}
          </View>
        </View>
      )}

      <FlatList
        style={styles.list}
        contentContainerStyle={styles.listContent}
        data={listData}
        keyExtractor={(item) => item.$id}
        renderItem={renderChannelCard}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyWrap}>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}> 
                {activeWindow === LECTURE_WINDOWS.DISCOVER ? t('lectures.emptyChannels') : t('lectures.emptyMyChannels')}
              </Text>
            </View>
          ) : null
        }
      />

      <CreateChannelModal
        visible={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={handleCreateChannel}
        t={t}
        colors={colors}
        creating={createLoading}
        groups={availableGroups}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    borderBottomWidth: 1,
    paddingHorizontal: wp(4),
    paddingBottom: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  screenTitle: {
    fontSize: fontSize(22),
    fontWeight: '700',
  },
  createHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  createHeaderBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: fontSize(13),
  },
  windowSwitcher: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: wp(4),
    paddingVertical: spacing.sm,
  },
  windowBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: borderRadius.round,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  windowBtnText: {
    fontSize: fontSize(12),
    fontWeight: '700',
  },
  searchWrap: {
    paddingHorizontal: wp(4),
    paddingBottom: spacing.sm,
  },
  searchInput: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
    fontSize: fontSize(13),
  },
  filterRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  suggestedWrap: {
    marginTop: spacing.sm,
  },
  suggestedTitle: {
    fontSize: fontSize(12),
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  suggestedCard: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    marginRight: spacing.xs,
    minWidth: wp(36),
  },
  suggestedCardTitle: {
    fontSize: fontSize(12),
    fontWeight: '700',
  },
  suggestedCardSub: {
    fontSize: fontSize(10),
    marginTop: 2,
  },
  suggestedEmpty: {
    fontSize: fontSize(11),
  },
  filterChip: {
    borderWidth: 1,
    borderRadius: borderRadius.round,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  filterChipText: {
    fontSize: fontSize(11),
    fontWeight: '600',
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: wp(4),
    paddingBottom: spacing.xxl,
  },
  channelCard: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  channelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
    gap: spacing.sm,
  },
  channelName: {
    flex: 1,
    fontSize: fontSize(14),
    fontWeight: '700',
  },
  channelTypeBadge: {
    fontSize: fontSize(10),
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  channelDescription: {
    fontSize: fontSize(12),
    marginBottom: spacing.sm,
  },
  channelMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  metaText: {
    fontSize: fontSize(11),
    flex: 1,
  },
  cardActions: {
    flexDirection: 'row',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  secondaryBtn: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryBtnText: {
    fontSize: fontSize(11),
    fontWeight: '600',
  },
  primaryBtn: {
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryBtnText: {
    fontSize: fontSize(11),
    fontWeight: '700',
    color: '#FFFFFF',
  },
  emptyWrap: {
    paddingVertical: spacing.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: fontSize(12),
    textAlign: 'center',
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: wp(6),
  },
  modalCard: {
    borderWidth: 1,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    maxHeight: '88%',
  },
  modalTitle: {
    fontSize: fontSize(16),
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
    fontSize: fontSize(12),
  },
  multilineInput: {
    minHeight: 90,
    textAlignVertical: 'top',
  },
  typeRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.sm,
    flexWrap: 'wrap',
  },
  chip: {
    borderWidth: 1,
    borderRadius: borderRadius.round,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  chipText: {
    fontSize: fontSize(11),
    fontWeight: '600',
  },
  toggleRow: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleText: {
    fontSize: fontSize(12),
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: fontSize(13),
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  groupOption: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    marginBottom: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  groupOptionMeta: {
    flex: 1,
  },
  groupOptionText: {
    fontSize: fontSize(12),
    fontWeight: '600',
  },
  groupOptionHint: {
    fontSize: fontSize(11),
    marginTop: 2,
  },
  emptyGroupText: {
    fontSize: fontSize(11),
    marginTop: spacing.xs,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  modalBtn: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  modalBtnText: {
    fontSize: fontSize(12),
    fontWeight: '700',
  },
});

export default Lecture;
