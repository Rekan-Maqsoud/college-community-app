import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TextInput,
  TouchableOpacity,
  Modal,
  RefreshControl,
  Share,
  ActivityIndicator,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppSettings } from '../context/AppSettingsContext';
import { useUser } from '../context/UserContext';
import { useTranslation } from '../hooks/useTranslation';
import AnimatedBackground from '../components/AnimatedBackground';
import { GlassIconButton, GlassPill, GlassModalCard, GlassContainer } from '../components/GlassComponents';
import { getActorIdentityIds, getPrimaryActorId, matchesAnyActorIdentity } from '../utils/actorIdentity';
import { canLinkLectureGroup } from '../utils/lectureAccess';
import { useLectureChannelsRealtime } from '../hooks/useRealtimeSubscription';
import {
  createLectureChannel,
  getLectureChannels,
  getLectureChannelShareLink,
  getLecturePinnedChannelIds,
  getMyLectureChannels,
  getMyPendingLectureChannelIds,
  LECTURE_ACCESS_TYPES,
  LECTURE_CHANNEL_TYPES,
  requestJoinLectureChannel,
  setLecturePinnedChannelIds,
} from '../../database/lectures';
import { getClassRepresentatives } from '../../database/repElections';
import { CHAT_TYPES, getChats } from '../../database/chats';
import { wp, fontSize, spacing, moderateScale } from '../utils/responsive';
import { borderRadius } from '../theme/designTokens';
import useLayout from '../hooks/useLayout';
import telemetry from '../utils/telemetry';

const CHANNEL_FILTERS = {
  ALL: 'all',
  OFFICIAL: 'official',
  COMMUNITY: 'community',
};

const LECTURE_WINDOWS = {
  COMMUNITY: 'community',
  OFFICIAL: 'official',
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

const CreateChannelModal = ({
  visible,
  onClose,
  onCreate,
  t,
  colors,
  creating,
  groups,
  canCreateOfficial,
  canLinkGroups,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [channelType, setChannelType] = useState(LECTURE_CHANNEL_TYPES.COMMUNITY);
  const [needsApproval, setNeedsApproval] = useState(false);
  const [linkedGroupId, setLinkedGroupId] = useState('');

  const isNameValid = name.trim().length >= 2;

  const handleSubmit = async () => {
    if (!isNameValid) return;

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
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderLeft}>
              <Ionicons name="school-outline" size={20} color={colors.primary} />
              <Text style={[styles.modalTitle, { color: colors.text }]}>{t('lectures.createChannel')}</Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <TextInput
            value={name}
            onChangeText={setName}
            placeholder={t('lectures.channelNamePlaceholder')}
            placeholderTextColor={colors.textSecondary}
            style={[styles.input, { color: colors.text, borderColor: isNameValid || !name ? colors.border : '#ef4444', backgroundColor: colors.inputBackground }]}
          />
          {name.length > 0 && !isNameValid && (
            <Text style={styles.validationHint}>{t('lectures.nameMinLength')}</Text>
          )}

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

          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>{t('lectures.channelTypeLabel')}</Text>
          <View style={styles.typeRow}>
            <TouchableOpacity
              style={[
                styles.chip,
                {
                  borderColor: colors.border,
                  backgroundColor: canCreateOfficial
                    ? (channelType === LECTURE_CHANNEL_TYPES.OFFICIAL ? colors.primary : 'transparent')
                    : colors.inputBackground,
                  opacity: canCreateOfficial ? 1 : 0.5,
                },
              ]}
              onPress={() => { if (canCreateOfficial) setChannelType(LECTURE_CHANNEL_TYPES.OFFICIAL); }}
              disabled={!canCreateOfficial}
              activeOpacity={canCreateOfficial ? 0.7 : 1}>
                <Ionicons
                  name={canCreateOfficial ? 'shield-checkmark-outline' : 'lock-closed-outline'}
                  size={14}
                  color={canCreateOfficial
                    ? (channelType === LECTURE_CHANNEL_TYPES.OFFICIAL ? '#FFFFFF' : colors.text)
                    : colors.textSecondary}
                />
                <Text style={[styles.chipText, { color: canCreateOfficial
                    ? (channelType === LECTURE_CHANNEL_TYPES.OFFICIAL ? '#FFFFFF' : colors.text)
                    : colors.textSecondary }]}> 
                  {t('lectures.official')}
                </Text>
              </TouchableOpacity>
            {!canCreateOfficial && (
              <Text style={[styles.officialHint, { color: colors.textSecondary, fontStyle: 'italic' }]}>{t('lectures.officialHintForStudents')}</Text>
            )}

            <TouchableOpacity
              style={[
                styles.chip,
                {
                  borderColor: channelType === LECTURE_CHANNEL_TYPES.COMMUNITY ? colors.primary : colors.border,
                  backgroundColor: channelType === LECTURE_CHANNEL_TYPES.COMMUNITY ? colors.primary : 'transparent',
                },
              ]}
              onPress={() => setChannelType(LECTURE_CHANNEL_TYPES.COMMUNITY)}>
              <Ionicons name="people-outline" size={14} color={channelType === LECTURE_CHANNEL_TYPES.COMMUNITY ? '#FFFFFF' : colors.text} />
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

          {canLinkGroups && (
            <>
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
            </>
          )}

          <View style={styles.modalButtons}>
            <TouchableOpacity style={[styles.modalBtn, { borderColor: colors.border }]} onPress={onClose}>
              <Text style={[styles.modalBtnText, { color: colors.textSecondary }]}>{t('common.cancel')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.modalBtn,
                {
                  backgroundColor: isNameValid && !creating ? colors.primary : colors.border,
                  borderColor: isNameValid && !creating ? colors.primary : colors.border,
                },
              ]}
              onPress={handleSubmit}
              disabled={creating || !isNameValid}>
              {creating ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={[styles.modalBtnText, { color: isNameValid ? '#FFFFFF' : colors.textSecondary }]}> 
                  {t('lectures.create')}
                </Text>
              )}
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
  const { contentStyle } = useLayout();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [searchVisible, setSearchVisible] = useState(false);
  const [filter, setFilter] = useState(CHANNEL_FILTERS.ALL);
  const [activeWindow, setActiveWindow] = useState(LECTURE_WINDOWS.COMMUNITY);
  const [allChannels, setAllChannels] = useState([]);
  const [myChannels, setMyChannels] = useState([]);
  const [pendingChannelIds, setPendingChannelIds] = useState([]);
  const [availableGroups, setAvailableGroups] = useState([]);
  const [isClassRepresentative, setIsClassRepresentative] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [channelMenuOpen, setChannelMenuOpen] = useState(false);
  const [channelMenuTarget, setChannelMenuTarget] = useState(null);
  const [pinnedChannelIds, setPinnedChannelIds] = useState([]);
  const [joiningChannelId, setJoiningChannelId] = useState(null);
  const lastRealtimeReloadAtRef = useRef(0);
  const realtimeReloadTimeoutRef = useRef(null);
  const loadChannelsInFlightRef = useRef(false);

  const logLectureTab = useCallback((name, meta = {}) => {
    telemetry.recordEvent(`lecture_${name}`, meta);
  }, []);

  const logLectureTabError = useCallback((name, error, meta = {}) => {
    telemetry.recordEvent(`lecture_${name}`, {
      ...meta,
      error: error?.message || String(error || ''),
    });
  }, []);

  const myChannelIds = useMemo(() => new Set((myChannels || []).map(channel => channel.$id)), [myChannels]);
  const pendingChannelIdSet = useMemo(() => new Set((pendingChannelIds || []).filter(Boolean)), [pendingChannelIds]);
  const pinnedChannelIdSet = useMemo(() => new Set((pinnedChannelIds || []).filter(Boolean)), [pinnedChannelIds]);
  const actorIdentityIds = useMemo(() => getActorIdentityIds(user), [user]);
  const primaryActorId = useMemo(() => getPrimaryActorId(user), [user]);

  const canLinkGroups = useMemo(() => availableGroups.length > 0, [availableGroups.length]);

  const canCreateOfficial = useMemo(() => {
    if (!primaryActorId) return false;
    if (user?.role === 'teacher') return true;
    return isClassRepresentative;
  }, [isClassRepresentative, primaryActorId, user?.role]);

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

  const sortChannelsWithPins = useCallback((channels = []) => {
    const list = Array.isArray(channels) ? [...channels] : [];
    return list.sort((first, second) => {
      const firstPinned = pinnedChannelIdSet.has(first?.$id) ? 1 : 0;
      const secondPinned = pinnedChannelIdSet.has(second?.$id) ? 1 : 0;

      if (firstPinned !== secondPinned) {
        return secondPinned - firstPinned;
      }

      const firstDate = new Date(first?.$updatedAt || first?.$createdAt || 0).getTime();
      const secondDate = new Date(second?.$updatedAt || second?.$createdAt || 0).getTime();
      return secondDate - firstDate;
    });
  }, [pinnedChannelIdSet]);

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
    if (!primaryActorId) {
      setAvailableGroups([]);
      return;
    }

    try {
      const chats = await getChats(primaryActorId);
      const filtered = (Array.isArray(chats) ? chats : []).filter(chat => canLinkLectureGroup(chat, actorIdentityIds));
      setAvailableGroups(filtered);
    } catch (error) {
      logLectureTabError('loadAvailableGroups:error', error, { userId: primaryActorId });
      setAvailableGroups([]);
    }
  }, [actorIdentityIds, primaryActorId]);

  const loadRepresentativeAccess = useCallback(async () => {
    if (!primaryActorId || !user?.department || !user?.stage) {
      setIsClassRepresentative(false);
      return;
    }

    try {
      const representatives = await getClassRepresentatives(user.department, user.stage);
      const representativeIds = (Array.isArray(representatives) ? representatives : []).map(item => item?.userId);
      setIsClassRepresentative(matchesAnyActorIdentity(actorIdentityIds, representativeIds));
    } catch (error) {
      logLectureTabError('loadRepresentativeAccess:error', error, {
        userId: primaryActorId,
        department: user?.department || '',
        stage: user?.stage || '',
      });
      setIsClassRepresentative(false);
    }
  }, [actorIdentityIds, primaryActorId, user?.department, user?.stage]);

  const loadPinnedChannels = useCallback(async () => {
    if (!primaryActorId) {
      setPinnedChannelIds([]);
      return;
    }

    try {
      const pinnedIds = await getLecturePinnedChannelIds();
      const normalized = Array.isArray(pinnedIds) ? pinnedIds.filter(Boolean).map(id => String(id)) : [];
      setPinnedChannelIds(normalized);
      logLectureTab('loadPinnedChannels:success', {
        userId: primaryActorId,
        pinnedCount: normalized.length,
      });
    } catch (error) {
      logLectureTabError('loadPinnedChannels:error', error, {
        userId: primaryActorId,
      });
      setPinnedChannelIds([]);
    }
  }, [primaryActorId]);

  const persistPinnedChannels = useCallback(async (nextIds = []) => {
    if (!primaryActorId) {
      return;
    }

    const normalized = [...new Set((Array.isArray(nextIds) ? nextIds : []).filter(Boolean).map(id => String(id)))];
    const previous = pinnedChannelIds;
    setPinnedChannelIds(normalized);

    try {
      await setLecturePinnedChannelIds(normalized);
      logLectureTab('persistPinnedChannels:success', {
        userId: primaryActorId,
        pinnedCount: normalized.length,
      });
    } catch (error) {
      setPinnedChannelIds(previous);
      logLectureTabError('persistPinnedChannels:error', error, {
        userId: primaryActorId,
        pinnedCount: normalized.length,
      });
    }
  }, [pinnedChannelIds, primaryActorId]);

  const handleTogglePinChannel = useCallback(async (channelId) => {
    if (!channelId) {
      return;
    }

    const isPinned = pinnedChannelIdSet.has(channelId);
    const next = isPinned
      ? pinnedChannelIds.filter(id => id !== channelId)
      : [...pinnedChannelIds, channelId];

    await persistPinnedChannels(next);
  }, [persistPinnedChannels, pinnedChannelIdSet, pinnedChannelIds]);

  const loadChannels = useCallback(async ({ showLoading = true, searchValue = '' } = {}) => {
    if (loadChannelsInFlightRef.current && !showLoading) {
      return;
    }

    loadChannelsInFlightRef.current = true;
    const loadTrace = telemetry.startTrace('lecture_tab_load_channels', {
      filter,
      hasSearch: !!searchValue,
      showLoading,
      userId: primaryActorId,
    });

    logLectureTab('loadChannels:start', {
      showLoading,
      filter,
      hasSearch: !!searchValue,
      userId: primaryActorId,
    });

    try {
      if (showLoading) {
        setLoading(true);
      }

      const [channels, mine, pendingIds] = await Promise.all([
        getLectureChannels({
          search: searchValue,
          channelType: 'all',
          limit: 50,
          offset: 0,
        }),
        getMyLectureChannels(),
        getMyPendingLectureChannelIds(),
      ]);

      setAllChannels(channels);
      setMyChannels(mine);
      setPendingChannelIds(pendingIds);
      loadTrace.finish({
        success: true,
        meta: {
          channelsCount: channels.length,
          myChannelsCount: mine.length,
          pendingCount: pendingIds.length,
        },
      });
      logLectureTab('loadChannels:success', {
        channelsCount: channels.length,
        myChannelsCount: mine.length,
        pendingCount: pendingIds.length,
      });
    } catch (error) {
      loadTrace.finish({ success: false, error });
      logLectureTabError('loadChannels:error', error, {
        filter,
        hasSearch: !!searchValue,
      });
    } finally {
      loadChannelsInFlightRef.current = false;
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter, logLectureTab, logLectureTabError, primaryActorId]);

  React.useEffect(() => {
    if (!primaryActorId) {
      setLoading(false);
      return;
    }

    logLectureTab('effect:initialLoad', {});
    loadChannels({ showLoading: true, searchValue: '' });
    loadAvailableGroups();
    loadPinnedChannels();
    loadRepresentativeAccess();
  }, [loadAvailableGroups, loadPinnedChannels, loadRepresentativeAccess, primaryActorId]);

  const handleLectureRealtimeChange = useCallback(() => {
    const now = Date.now();
    const minIntervalMs = 1500;
    const elapsed = now - lastRealtimeReloadAtRef.current;

    if (elapsed >= minIntervalMs) {
      lastRealtimeReloadAtRef.current = now;
      loadChannels({ showLoading: false, searchValue: search });
      return;
    }

    if (realtimeReloadTimeoutRef.current) {
      return;
    }

    const waitMs = Math.max(0, minIntervalMs - elapsed);
    realtimeReloadTimeoutRef.current = setTimeout(() => {
      realtimeReloadTimeoutRef.current = null;
      lastRealtimeReloadAtRef.current = Date.now();
      loadChannels({ showLoading: false, searchValue: search });
    }, waitMs);
  }, [loadChannels, search]);

  useLectureChannelsRealtime(handleLectureRealtimeChange, true);

  useEffect(() => {
    return () => {
      if (realtimeReloadTimeoutRef.current) {
        clearTimeout(realtimeReloadTimeoutRef.current);
        realtimeReloadTimeoutRef.current = null;
      }
    };
  }, []);

  const refresh = async () => {
    setRefreshing(true);
    await Promise.all([
      loadChannels({ showLoading: false, searchValue: search }),
      loadAvailableGroups(),
      loadRepresentativeAccess(),
    ]);
  };

  React.useEffect(() => {
    setFilter(activeWindow === LECTURE_WINDOWS.OFFICIAL ? CHANNEL_FILTERS.OFFICIAL : CHANNEL_FILTERS.COMMUNITY);
    setSearch('');
    setSearchVisible(false);
  }, [activeWindow]);

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
      await loadChannels({ showLoading: false, searchValue: search });
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
    setJoiningChannelId(channelId);
    try {
      const membership = await requestJoinLectureChannel(channelId);
      const joinStatus = membership?.joinStatus || 'pending';

      if (joinStatus === 'approved') {
        await loadChannels({ showLoading: false, searchValue: search });
        logLectureTab('requestJoin:approved', { channelId });
      } else {
        setPendingChannelIds(prev => [...new Set([...(prev || []), channelId])]);
        logLectureTab('requestJoin:pending', { channelId });
      }
    } catch (error) {
      logLectureTabError('requestJoin:error', error, { channelId });
    } finally {
      setJoiningChannelId(null);
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

    if (!myChannelIds.has(channel.$id)) {
      return;
    }

    navigation.navigate('LectureChannel', {
      channelId: channel.$id,
    });
  };

  const renderChannelCard = ({ item }) => {
    const joined = myChannelIds.has(item.$id);
    const isPending = pendingChannelIdSet.has(item.$id);
    const isPinned = pinnedChannelIdSet.has(item.$id);
    const isJoining = joiningChannelId === item.$id;
    const isOfficial = item.channelType === LECTURE_CHANNEL_TYPES.OFFICIAL;
    const canOpen = joined;

    return (
      <TouchableOpacity
        style={[styles.channelCard, { backgroundColor: colors.card, borderColor: colors.border }]}
        activeOpacity={canOpen ? 0.7 : 1}
        onPress={() => openChannel(item)}
        disabled={!canOpen}
        onLongPress={() => {
          setChannelMenuTarget(item);
          setChannelMenuOpen(true);
        }}
        delayLongPress={280}>
        <View style={styles.channelHeader}>
          <View style={styles.channelHeaderLeft}>
            <View style={[styles.channelIcon, { backgroundColor: isOfficial ? `${colors.primary}20` : `${colors.textSecondary}15` }]}>
              <Ionicons
                name={isOfficial ? 'school' : 'people'}
                size={18}
                color={isOfficial ? colors.primary : colors.textSecondary}
              />
            </View>
            <View style={styles.channelTitleWrap}>
              <View style={styles.channelNameRow}>
                {isPinned && <Ionicons name="pin" size={12} color={colors.primary} style={{ marginRight: spacing.xs }} />}
                <Text style={[styles.channelName, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
              </View>
              <Text style={[styles.channelDescription, { color: colors.textSecondary }]} numberOfLines={1}>
                {item.description || t('lectures.noDescription')}
              </Text>
            </View>
          </View>

          <View style={styles.channelHeaderRight}>
            {joined && (
              <View style={[styles.statusBadge, { backgroundColor: '#10b98120' }]}>
                <Ionicons name="checkmark-circle" size={12} color="#10b981" />
                <Text style={[styles.statusBadgeText, { color: '#10b981' }]}>{t('lectures.joined')}</Text>
              </View>
            )}
            {isPending && !joined && (
              <View style={[styles.statusBadge, { backgroundColor: '#f59e0b20' }]}>
                <Ionicons name="time-outline" size={12} color="#f59e0b" />
                <Text style={[styles.statusBadgeText, { color: '#f59e0b' }]}>{t('lectures.pending')}</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.channelMetaRow}>
          <View style={styles.metaItem}>
            <Ionicons name={isOfficial ? 'shield-checkmark-outline' : 'lock-open-outline'} size={12} color={colors.textSecondary} />
            <Text style={[styles.metaText, { color: colors.textSecondary }]}> 
              {channelAccessLabel(item)}
            </Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="people-outline" size={12} color={colors.textSecondary} />
            <Text style={[styles.metaText, { color: colors.textSecondary }]}> 
              {t('lectures.membersCount').replace('{count}', String(item.membersCount || 0))}
            </Text>
          </View>
        </View>

        {!joined && !isPending && (
          <View style={styles.cardActions}>
            <TouchableOpacity
              style={[styles.joinBtn, { backgroundColor: colors.primary }]}
              onPress={() => handleRequestJoin(item.$id)}
              disabled={isJoining}>
              {isJoining ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="enter-outline" size={14} color="#FFFFFF" />
                  <Text style={styles.joinBtnText}>{t('lectures.join')}</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const listData = useMemo(() => {
    const source = (Array.isArray(allChannels) ? allChannels : []).filter((channel) => {
      if (activeWindow === LECTURE_WINDOWS.OFFICIAL) {
        return channel?.channelType === LECTURE_CHANNEL_TYPES.OFFICIAL;
      }

      return channel?.channelType !== LECTURE_CHANNEL_TYPES.OFFICIAL;
    });

    return sortChannelsWithPins(source);
  }, [activeWindow, allChannels, sortChannelsWithPins]);

  const channelMenuTargetJoined = !!(channelMenuTarget?.$id && myChannelIds.has(channelMenuTarget.$id));
  const channelMenuTargetPinned = !!(channelMenuTarget?.$id && pinnedChannelIdSet.has(channelMenuTarget.$id));

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}> 
      <AnimatedBackground particleCount={35} />
      <LinearGradient
        colors={isDarkMode ? ['#1a1a2e', '#16213e', '#0f3460'] : ['#e3f2fd', '#bbdefb', '#90caf9']}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor="transparent"
        translucent
      />

      <View style={[styles.header, { paddingTop: insets.top + spacing.sm, borderBottomColor: colors.border }]}> 
        <Text style={[styles.screenTitle, { color: colors.text }]}>{t('lectures.title')}</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.headerIconBtn]}
            activeOpacity={0.7}
            onPress={() => setSearchVisible(prev => !prev)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <GlassIconButton size={moderateScale(36)} borderRadiusValue={moderateScale(12)}>
              <Ionicons name="search" size={moderateScale(18)} color={colors.primary} />
            </GlassIconButton>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.headerIconBtn]}
            activeOpacity={0.7}
            onPress={() => setCreateOpen(true)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <GlassIconButton size={moderateScale(36)} borderRadiusValue={moderateScale(12)}>
              <Ionicons name="add" size={moderateScale(18)} color={colors.primary} />
            </GlassIconButton>
          </TouchableOpacity>
        </View>
      </View>

      {searchVisible && (
        <View style={styles.searchWrap}>
          <View style={[styles.searchInputWrap, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
            <Ionicons name="search-outline" size={16} color={colors.textSecondary} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              onSubmitEditing={() => loadChannels({ showLoading: true, searchValue: search })}
              placeholder={t('lectures.searchPlaceholder')}
              placeholderTextColor={colors.textSecondary}
              style={[styles.searchInput, { color: colors.text }]}
              autoFocus
              returnKeyType="search"
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => { setSearch(''); loadChannels({ showLoading: true, searchValue: '' }); }}>
                <Ionicons name="close-circle" size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      <View style={styles.windowSwitcher}>
        <TouchableOpacity
          style={[styles.windowBtn]}
          activeOpacity={0.7}
          onPress={() => setActiveWindow(LECTURE_WINDOWS.COMMUNITY)}>
          <GlassPill active={activeWindow === LECTURE_WINDOWS.COMMUNITY}>
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, gap: 6 }}>
              <Ionicons name="people-outline" size={14} color={activeWindow === LECTURE_WINDOWS.COMMUNITY ? '#FFFFFF' : colors.text} />
              <Text style={[styles.windowBtnText, { color: activeWindow === LECTURE_WINDOWS.COMMUNITY ? '#FFFFFF' : colors.text }]}> 
                {t('lectures.communityWindow')}
              </Text>
            </View>
          </GlassPill>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.windowBtn]}
          activeOpacity={0.7}
          onPress={() => setActiveWindow(LECTURE_WINDOWS.OFFICIAL)}>
          <GlassPill active={activeWindow === LECTURE_WINDOWS.OFFICIAL}>
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, gap: 6 }}>
              <Ionicons name="school-outline" size={14} color={activeWindow === LECTURE_WINDOWS.OFFICIAL ? '#FFFFFF' : colors.text} />
              <Text style={[styles.windowBtnText, { color: activeWindow === LECTURE_WINDOWS.OFFICIAL ? '#FFFFFF' : colors.text }]}> 
                {t('lectures.officialWindow')}
              </Text>
            </View>
          </GlassPill>
        </TouchableOpacity>
      </View>

      {suggestedChannels.length > 0 && !searchVisible && (
        <View style={styles.suggestedWrap}>
          <Text style={[styles.suggestedTitle, { color: colors.text }]}>{t('lectures.suggestedChannels')}</Text>
          <FlashList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={sortChannelsWithPins(suggestedChannels)}
            keyExtractor={(item) => item.$id}
            renderItem={({ item }) => {
              const sugJoined = myChannelIds.has(item.$id);
              return (
                <TouchableOpacity
                  style={[styles.suggestedCard, { borderColor: colors.border, backgroundColor: colors.card }]}
                  activeOpacity={sugJoined ? 0.7 : 1}
                  disabled={!sugJoined}
                  onPress={() => openChannel(item)}>
                  <View style={styles.suggestedCardTop}>
                    <Ionicons
                      name={item.channelType === LECTURE_CHANNEL_TYPES.OFFICIAL ? 'school' : 'people'}
                      size={14}
                      color={colors.primary}
                    />
                    <Text style={[styles.suggestedCardTitle, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
                  </View>
                  <Text style={[styles.suggestedCardSub, { color: colors.textSecondary }]} numberOfLines={1}>
                    {t('lectures.membersCount').replace('{count}', String(item.membersCount || 0))}
                  </Text>
                  {sugJoined && (
                    <View style={[styles.suggestedJoinedBadge, { backgroundColor: '#10b98115' }]}>
                      <Ionicons name="checkmark-circle" size={10} color="#10b981" />
                      <Text style={styles.suggestedJoinedText}>{t('lectures.joined')}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            }}
          />
        </View>
      )}

      <FlashList
        style={styles.list}
        contentContainerStyle={[styles.listContent, { paddingBottom: spacing.xxl + insets.bottom }, contentStyle]}
        data={listData}
        keyExtractor={(item) => item.$id}
        renderItem={renderChannelCard}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}
        ListEmptyComponent={
          loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : (
            <View style={styles.emptyWrap}>
              <Ionicons
                name={activeWindow === LECTURE_WINDOWS.OFFICIAL ? 'school-outline' : 'people-outline'}
                size={48}
                color={colors.textSecondary}
                style={{ marginBottom: spacing.md }}
              />
              <Text style={[styles.emptyTitle, { color: colors.text }]}> 
                {activeWindow === LECTURE_WINDOWS.OFFICIAL ? t('lectures.emptyOfficialTitle') : t('lectures.emptyCommunityTitle')}
              </Text>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}> 
                {activeWindow === LECTURE_WINDOWS.OFFICIAL ? t('lectures.emptyOfficialChannels') : t('lectures.emptyCommunityChannels')}
              </Text>
              <TouchableOpacity
                style={[styles.emptyCreateBtn, { backgroundColor: colors.primary }]}
                onPress={() => setCreateOpen(true)}>
                <Ionicons name="add" size={16} color="#FFFFFF" />
                <Text style={styles.emptyCreateBtnText}>{t('lectures.createChannel')}</Text>
              </TouchableOpacity>
            </View>
          )
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
        canCreateOfficial={canCreateOfficial}
        canLinkGroups={canLinkGroups}
      />

      <Modal
        visible={channelMenuOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setChannelMenuOpen(false)}>
        <TouchableOpacity
          activeOpacity={1}
          style={[styles.menuBackdrop, { backgroundColor: colors.overlay }]}
          onPress={() => setChannelMenuOpen(false)}>
          <GlassModalCard style={[styles.channelMenuCard]} padding={spacing.md}> 
            <View style={styles.channelMenuHeader}>
              <Ionicons
                name={channelMenuTarget?.channelType === LECTURE_CHANNEL_TYPES.OFFICIAL ? 'school' : 'people'}
                size={18}
                color={colors.primary}
              />
              <Text style={[styles.channelMenuTitle, { color: colors.text }]} numberOfLines={1}>
                {channelMenuTarget?.name || t('lectures.channel')}
              </Text>
            </View>

            {channelMenuTargetJoined && (
              <TouchableOpacity
                style={[styles.channelMenuItem, { borderTopColor: colors.border }]}
                onPress={() => {
                  setChannelMenuOpen(false);
                  if (channelMenuTarget) {
                    openChannel(channelMenuTarget);
                  }
                }}>
                <Ionicons name="enter-outline" size={16} color={colors.text} />
                <Text style={[styles.channelMenuItemText, { color: colors.text }]}>{t('lectures.openChannel')}</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.channelMenuItem, { borderTopColor: colors.border }]}
              onPress={() => {
                const targetId = channelMenuTarget?.$id || '';
                setChannelMenuOpen(false);
                if (targetId) {
                  handleShareChannel(targetId);
                }
              }}>
              <Ionicons name="share-social-outline" size={16} color={colors.text} />
              <Text style={[styles.channelMenuItemText, { color: colors.text }]}>{t('lectures.share')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.channelMenuItem, { borderTopColor: colors.border }]}
              onPress={async () => {
                const targetId = channelMenuTarget?.$id || '';
                setChannelMenuOpen(false);
                if (targetId) {
                  await handleTogglePinChannel(targetId);
                }
              }}>
              <Ionicons name={channelMenuTargetPinned ? 'pin-outline' : 'pin'} size={16} color={colors.text} />
              <Text style={[styles.channelMenuItemText, { color: colors.text }]}>
                {channelMenuTargetPinned ? t('lectures.unpinChannel') : t('lectures.pinChannel')}
              </Text>
            </TouchableOpacity>

            {!channelMenuTargetJoined && !!channelMenuTarget?.$id && !pendingChannelIdSet.has(channelMenuTarget?.$id) && (
              <TouchableOpacity
                style={[styles.channelMenuItem, { borderTopColor: colors.border }]}
                onPress={() => {
                  const targetId = channelMenuTarget.$id;
                  setChannelMenuOpen(false);
                  handleRequestJoin(targetId);
                }}>
                <Ionicons name="enter-outline" size={16} color={colors.primary} />
                <Text style={[styles.channelMenuItemText, { color: colors.primary }]}>{t('lectures.join')}</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.channelMenuItem, { borderTopColor: colors.border }]}
              onPress={() => setChannelMenuOpen(false)}>
              <Ionicons name="close-outline" size={16} color={colors.textSecondary} />
              <Text style={[styles.channelMenuItemText, { color: colors.textSecondary }]}>{t('common.cancel')}</Text>
            </TouchableOpacity>
          </GlassModalCard>
        </TouchableOpacity>
      </Modal>
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerIconBtn: {
    width: moderateScale(34),
    height: moderateScale(34),
    borderRadius: moderateScale(17),
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchWrap: {
    paddingHorizontal: wp(4),
    paddingVertical: spacing.sm,
  },
  searchInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: fontSize(13),
    padding: 0,
    margin: 0,
  },
  windowSwitcher: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: wp(4),
    paddingVertical: spacing.sm,
  },
  windowBtn: {
    flex: 1,
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: borderRadius.round,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  windowBtnText: {
    fontSize: fontSize(12),
    fontWeight: '700',
  },
  suggestedWrap: {
    paddingHorizontal: wp(4),
    paddingBottom: spacing.sm,
  },
  suggestedTitle: {
    fontSize: fontSize(12),
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  suggestedCard: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginRight: spacing.sm,
    minWidth: wp(36),
  },
  suggestedCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: 2,
  },
  suggestedCardTitle: {
    fontSize: fontSize(12),
    fontWeight: '700',
    flex: 1,
  },
  suggestedCardSub: {
    fontSize: fontSize(10),
    marginTop: 2,
  },
  suggestedJoinedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: spacing.xs,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    alignSelf: 'flex-start',
  },
  suggestedJoinedText: {
    fontSize: fontSize(9),
    color: '#10b981',
    fontWeight: '600',
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: wp(4),
  },
  channelCard: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  channelHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  channelHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  channelIcon: {
    width: moderateScale(36),
    height: moderateScale(36),
    borderRadius: moderateScale(10),
    justifyContent: 'center',
    alignItems: 'center',
  },
  channelTitleWrap: {
    flex: 1,
  },
  channelNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  channelHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  channelName: {
    flex: 1,
    fontSize: fontSize(14),
    fontWeight: '700',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.round,
  },
  statusBadgeText: {
    fontSize: fontSize(10),
    fontWeight: '700',
  },
  channelDescription: {
    fontSize: fontSize(12),
  },
  channelMetaRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    gap: spacing.md,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: fontSize(11),
  },
  cardActions: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  joinBtn: {
    flexDirection: 'row',
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xs,
    flex: 1,
  },
  joinBtnText: {
    fontSize: fontSize(12),
    fontWeight: '700',
    color: '#FFFFFF',
  },
  loadingWrap: {
    paddingVertical: spacing.xxl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyWrap: {
    paddingVertical: spacing.xxl,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: wp(10),
  },
  emptyTitle: {
    fontSize: fontSize(16),
    fontWeight: '700',
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: fontSize(12),
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  emptyCreateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  emptyCreateBtnText: {
    fontSize: fontSize(12),
    fontWeight: '700',
    color: '#FFFFFF',
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
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  modalTitle: {
    fontSize: fontSize(16),
    fontWeight: '700',
  },
  sectionLabel: {
    fontSize: fontSize(11),
    fontWeight: '600',
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  validationHint: {
    fontSize: fontSize(10),
    color: '#ef4444',
    marginTop: -spacing.xs,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
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
    gap: spacing.sm,
    marginBottom: spacing.sm,
    flexWrap: 'wrap',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderRadius: borderRadius.round,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  chipText: {
    fontSize: fontSize(11),
    fontWeight: '600',
  },
  officialHint: {
    fontSize: fontSize(10),
    fontStyle: 'italic',
    marginTop: spacing.xs,
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
    marginTop: spacing.md,
  },
  modalBtn: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    minWidth: wp(20),
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBtnText: {
    fontSize: fontSize(12),
    fontWeight: '700',
  },
  menuBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: wp(5),
    paddingBottom: spacing.xl,
  },
  channelMenuCard: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  channelMenuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  channelMenuTitle: {
    fontSize: fontSize(14),
    fontWeight: '700',
    flex: 1,
  },
  channelMenuItem: {
    borderTopWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  channelMenuItemText: {
    fontSize: fontSize(13),
    fontWeight: '600',
  },
});

export default Lecture;
