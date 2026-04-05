import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TextInput,
  TouchableOpacity,
  Modal,
  Platform,
  RefreshControl,
  Share,
  ActivityIndicator,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import IoniconSvg from '../components/icons/IoniconSvg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppSettings } from '../context/AppSettingsContext';
import { useUser } from '../context/UserContext';
import { useTranslation } from '../hooks/useTranslation';
import { GlassContainer, GlassIconButton, GlassInput } from '../components/GlassComponents';
import TutorialHighlight from '../components/tutorial/TutorialHighlight';
import ScreenTutorialCard from '../components/tutorial/ScreenTutorialCard';
import { ChatListSkeleton } from '../components/SkeletonLoader';
import ModalBackdrop from '../components/ModalBackdrop';
import LectureWindowSelector from '../components/LectureWindowSelector';
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
import useScreenTutorial from '../hooks/useScreenTutorial';
import { isGuest } from '../utils/guestUtils';

const CHANNEL_FILTERS = {
  ALL: 'all',
  OFFICIAL: 'official',
  COMMUNITY: 'community',
  GUEST: 'guest',
};

const LECTURE_WINDOWS = {
  COMMUNITY: 'community',
  OFFICIAL: 'official',
  GUEST: 'guest',
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

const parseLectureWindowSettings = (settingsJson) => {
  if (!settingsJson) {
    return {};
  }

  try {
    return typeof settingsJson === 'string' ? JSON.parse(settingsJson) : settingsJson;
  } catch {
    return {};
  }
};

const isGuestLectureChannel = (channel) => {
  if (!channel || typeof channel !== 'object') {
    return false;
  }

  const channelType = String(channel.channelType || '').trim().toLowerCase();
  if (channelType === LECTURE_WINDOWS.GUEST) {
    return true;
  }

  const tags = Array.isArray(channel.tags)
    ? channel.tags.map(tag => String(tag || '').trim().toLowerCase())
    : [];

  const hasGuestTag = tags.some(tag => (
    tag === 'guest'
    || tag === 'guests'
    || tag === 'guest-only'
    || tag === 'guest_only'
    || tag === 'for-guest'
    || tag === 'for-guests'
  ));

  if (hasGuestTag) {
    return true;
  }

  const settings = parseLectureWindowSettings(channel.settingsJson);
  const audience = String(
    settings?.audience
    || settings?.targetAudience
    || settings?.visibility
    || ''
  ).trim().toLowerCase();

  return settings?.guestOnly === true || audience === 'guest' || audience === 'guests';
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
  isRTL,
  isGuestMode,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [channelType, setChannelType] = useState(
    () => (isGuestMode ? LECTURE_CHANNEL_TYPES.GUEST : LECTURE_CHANNEL_TYPES.COMMUNITY)
  );
  const [needsApproval, setNeedsApproval] = useState(false);
  const [linkedGroupId, setLinkedGroupId] = useState('');
  const [nameFocused, setNameFocused] = useState(false);
  const [descriptionFocused, setDescriptionFocused] = useState(false);
  const NAME_MAX_LENGTH = 50;
  const DESCRIPTION_MAX_LENGTH = 300;

  const isNameValid = name.trim().length >= 2;

  useEffect(() => {
    setChannelType(isGuestMode ? LECTURE_CHANNEL_TYPES.GUEST : LECTURE_CHANNEL_TYPES.COMMUNITY);
  }, [isGuestMode]);

  const handleSubmit = async () => {
    if (!isNameValid) return;

    const resolvedChannelType = isGuestMode ? LECTURE_CHANNEL_TYPES.GUEST : channelType;

    const accessType = resolvedChannelType === LECTURE_CHANNEL_TYPES.OFFICIAL
      ? LECTURE_ACCESS_TYPES.APPROVAL_REQUIRED
      : isGuestMode
        ? LECTURE_ACCESS_TYPES.OPEN
      : needsApproval
        ? LECTURE_ACCESS_TYPES.APPROVAL_REQUIRED
        : LECTURE_ACCESS_TYPES.OPEN;

    const success = await onCreate({
      name,
      description,
      channelType: resolvedChannelType,
      accessType,
      linkedChatId: linkedGroupId,
    });

    if (success) {
      setName('');
      setDescription('');
      setChannelType(isGuestMode ? LECTURE_CHANNEL_TYPES.GUEST : LECTURE_CHANNEL_TYPES.COMMUNITY);
      setNeedsApproval(false);
      setLinkedGroupId('');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={[styles.modalBackdrop, { backgroundColor: colors.overlay }]}> 
        {Platform.OS !== 'android' ? <BlurView intensity={34} tint="dark" style={styles.modalBackdropBlur} /> : null}
        <View pointerEvents="none" style={[styles.modalBackdropScrim, { backgroundColor: colors.scrim || 'rgba(7, 12, 26, 0.40)' }]} />
        <GlassContainer borderRadius={borderRadius.xl} style={styles.createModalGlass}>
        <View style={[styles.modalCard, { backgroundColor: 'transparent', borderColor: `${colors.primary}33` }]}> 
          <View style={[styles.modalHeader, isRTL && styles.rowReverse]}>
            <View style={[styles.modalHeaderLeft, isRTL && styles.rowReverse]}>
              <IoniconSvg name="school-outline" size={20} color={colors.primary} />
              <Text style={[styles.modalTitle, isRTL && styles.directionalText, { color: colors.text }]}> 
                {isGuestMode ? t('lectures.createGuestChannel') : t('lectures.createChannel')}
              </Text>
            </View>
            <GlassIconButton
              size={32}
              borderRadiusValue={16}
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <IoniconSvg name="close" size={22} color={colors.textSecondary} />
            </GlassIconButton>
          </View>

          <GlassInput
            focused={nameFocused}
            style={[
              styles.inputGlass,
              !isNameValid && name.length > 0 ? styles.inputGlassError : null,
            ]}>
            <TextInput
              value={name}
              onChangeText={setName}
              onFocus={() => setNameFocused(true)}
              onBlur={() => setNameFocused(false)}
              placeholder={t('lectures.channelNamePlaceholder')}
              placeholderTextColor={colors.textSecondary}
              style={[styles.input, isRTL && styles.directionalInput, { color: colors.text }]}
              maxLength={NAME_MAX_LENGTH}
            />
          </GlassInput>
          <Text style={[styles.inputCounter, isRTL && styles.directionalText, { color: colors.textSecondary }]}>
            {`${name.length}/${NAME_MAX_LENGTH}`}
          </Text>
          {name.length > 0 && !isNameValid && (
            <Text style={styles.validationHint}>{t('lectures.nameMinLength')}</Text>
          )}

          <GlassInput focused={descriptionFocused} style={styles.inputGlass}>
            <TextInput
              value={description}
              onChangeText={setDescription}
              onFocus={() => setDescriptionFocused(true)}
              onBlur={() => setDescriptionFocused(false)}
              placeholder={t('lectures.channelDescriptionPlaceholder')}
              placeholderTextColor={colors.textSecondary}
              multiline
              style={[
                styles.input,
                styles.multilineInput,
                isRTL && styles.directionalInput,
                { color: colors.text },
              ]}
              maxLength={DESCRIPTION_MAX_LENGTH}
            />
          </GlassInput>
          <Text style={[styles.inputCounter, isRTL && styles.directionalText, { color: colors.textSecondary }]}>
            {`${description.length}/${DESCRIPTION_MAX_LENGTH}`}
          </Text>

          {!isGuestMode && (
            <>
              <Text style={[styles.sectionLabel, isRTL && styles.directionalText, { color: colors.textSecondary }]}>{t('lectures.channelTypeLabel')}</Text>
              <View style={[styles.typeRow, isRTL && styles.rowReverse]}>
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
                    <IoniconSvg
                      name={canCreateOfficial ? 'shield-checkmark-outline' : 'lock-closed-outline'}
                      size={14}
                      color={canCreateOfficial
                        ? (channelType === LECTURE_CHANNEL_TYPES.OFFICIAL ? '#FFFFFF' : colors.text)
                        : colors.textSecondary}
                    />
                    <Text style={[styles.chipText, isRTL && styles.directionalText, { color: canCreateOfficial
                        ? (channelType === LECTURE_CHANNEL_TYPES.OFFICIAL ? '#FFFFFF' : colors.text)
                        : colors.textSecondary }]}> 
                      {t('lectures.official')}
                    </Text>
                  </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.chip,
                    {
                      borderColor: channelType === LECTURE_CHANNEL_TYPES.COMMUNITY ? colors.primary : colors.border,
                      backgroundColor: channelType === LECTURE_CHANNEL_TYPES.COMMUNITY ? colors.primary : 'transparent',
                    },
                  ]}
                  onPress={() => setChannelType(LECTURE_CHANNEL_TYPES.COMMUNITY)}>
                  <IoniconSvg name="people-outline" size={14} color={channelType === LECTURE_CHANNEL_TYPES.COMMUNITY ? '#FFFFFF' : colors.text} />
                  <Text style={[styles.chipText, isRTL && styles.directionalText, { color: channelType === LECTURE_CHANNEL_TYPES.COMMUNITY ? '#FFFFFF' : colors.text }]}> 
                    {t('lectures.community')}
                  </Text>
                </TouchableOpacity>
              </View>

              {!canCreateOfficial && (
                <Text style={[styles.officialHint, isRTL && styles.directionalText, { color: colors.textSecondary, fontStyle: 'italic' }]}>{t('lectures.officialHintForStudents')}</Text>
              )}
            </>
          )}

          {!isGuestMode && channelType === LECTURE_CHANNEL_TYPES.COMMUNITY && (
            <GlassContainer borderRadius={borderRadius.md} style={styles.createModalOptionGlass}>
              <TouchableOpacity
                style={[styles.toggleRow, isRTL && styles.rowReverse, { borderColor: `${colors.primary}33`, backgroundColor: 'transparent' }]}
                onPress={() => setNeedsApproval(prev => !prev)}>
                <Text style={[styles.toggleText, isRTL && styles.directionalText, { color: colors.text }]}>{t('lectures.requireApproval')}</Text>
                <IoniconSvg name={needsApproval ? 'checkbox' : 'square-outline'} size={20} color={colors.primary} />
              </TouchableOpacity>
            </GlassContainer>
          )}

          {canLinkGroups && (
            <>
              <Text style={[styles.sectionTitle, isRTL && styles.directionalText, { color: colors.text }]}>{t('lectures.chooseLinkedGroup')}</Text>

              <GlassContainer borderRadius={borderRadius.md} style={styles.createModalOptionGlass}>
                <TouchableOpacity
                  style={[
                    styles.groupOption,
                    isRTL && styles.rowReverse,
                    {
                      borderColor: linkedGroupId ? `${colors.primary}33` : colors.primary,
                      backgroundColor: 'transparent',
                    },
                  ]}
                  onPress={() => setLinkedGroupId('')}>
                  <Text style={[styles.groupOptionText, isRTL && styles.directionalText, { color: colors.text }]}>{t('lectures.noLink')}</Text>
                  {!linkedGroupId && <IoniconSvg name="checkmark-circle" size={18} color={colors.primary} />}
                </TouchableOpacity>
              </GlassContainer>

              {groups.map(group => (
                <GlassContainer key={group.$id} borderRadius={borderRadius.md} style={styles.createModalOptionGlass}>
                  <TouchableOpacity
                    style={[
                      styles.groupOption,
                      isRTL && styles.rowReverse,
                      {
                        borderColor: linkedGroupId === group.$id ? colors.primary : `${colors.primary}33`,
                        backgroundColor: 'transparent',
                      },
                    ]}
                    onPress={() => setLinkedGroupId(group.$id)}>
                    <View style={styles.groupOptionMeta}>
                      <Text style={[styles.groupOptionText, isRTL && styles.directionalText, { color: colors.text }]} numberOfLines={1}>{group.name}</Text>
                      <Text style={[styles.groupOptionHint, isRTL && styles.directionalText, { color: colors.textSecondary }]} numberOfLines={1}>
                        {group.type === CHAT_TYPES.STAGE_GROUP ? t('lectures.stageGroup') : t('lectures.customGroup')}
                      </Text>
                    </View>
                    {linkedGroupId === group.$id && <IoniconSvg name="checkmark-circle" size={18} color={colors.primary} />}
                  </TouchableOpacity>
                </GlassContainer>
              ))}

              {groups.length === 0 && (
                <Text style={[styles.emptyGroupText, isRTL && styles.directionalText, { color: colors.textSecondary }]}>{t('lectures.noEligibleGroups')}</Text>
              )}
            </>
          )}

          <View style={[styles.modalButtons, isRTL && styles.rowReverse]}>
            <TouchableOpacity style={[styles.modalBtn, { borderColor: colors.border }]} onPress={onClose}>
              <Text style={[styles.modalBtnText, isRTL && styles.directionalText, { color: colors.textSecondary }]}>{t('common.cancel')}</Text>
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
                <Text style={[styles.modalBtnText, isRTL && styles.directionalText, { color: isNameValid ? '#FFFFFF' : colors.textSecondary }]}> 
                  {t('lectures.create')}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
        </GlassContainer>
      </View>
    </Modal>
  );
};

const Lecture = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { colors, isDarkMode, isRTL } = useAppSettings();
  const { user } = useUser();
  const { t } = useTranslation();
  const { contentStyle } = useLayout();
  const isGuestUser = isGuest(user);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [searchVisible, setSearchVisible] = useState(false);
  const [filter, setFilter] = useState(CHANNEL_FILTERS.ALL);
  const [activeWindow, setActiveWindow] = useState(
    isGuestUser ? LECTURE_WINDOWS.GUEST : LECTURE_WINDOWS.COMMUNITY
  );
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
  const [loadChannelsFailed, setLoadChannelsFailed] = useState(false);
  const [guestWindowInfoOpen, setGuestWindowInfoOpen] = useState(false);
  const lastRealtimeReloadAtRef = useRef(0);
  const realtimeReloadTimeoutRef = useRef(null);
  const loadChannelsInFlightRef = useRef(false);

  const tutorialSteps = useMemo(() => {
    const sharedSteps = [
      {
        target: 'search',
        title: t('tutorial.lecture.searchTitle'),
        description: t('tutorial.lecture.searchDescription'),
      },
      {
        target: 'window',
        title: t('tutorial.lecture.windowTitle'),
        description: t('tutorial.lecture.windowDescription'),
      },
      {
        target: 'channels',
        title: t('tutorial.lecture.channelsTitle'),
        description: t('tutorial.lecture.channelsDescription'),
      },
    ];

    if (isGuestUser) {
      return sharedSteps;
    }

    return [
      sharedSteps[0],
      {
        target: 'create',
        title: t('tutorial.lecture.createTitle'),
        description: t('tutorial.lecture.createDescription'),
      },
      sharedSteps[1],
      sharedSteps[2],
    ];
  }, [isGuestUser, t]);

  const tutorial = useScreenTutorial(isGuestUser ? 'lecture_guest' : 'lecture', tutorialSteps);

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

  const lectureWindowOptions = useMemo(() => {
    if (isGuestUser) {
      return [
        {
          type: LECTURE_WINDOWS.GUEST,
          icon: 'person-outline',
          label: t('lectures.guestWindow'),
        },
      ];
    }

    return [
      {
        type: LECTURE_WINDOWS.COMMUNITY,
        icon: 'people-outline',
        label: t('lectures.communityWindow'),
      },
      {
        type: LECTURE_WINDOWS.OFFICIAL,
        icon: 'school-outline',
        label: t('lectures.officialWindow'),
      },
    ];
  }, [isGuestUser, t]);

  const suggestedChannels = useMemo(() => {
    if (isGuestUser) {
      return [];
    }

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
  }, [allChannels, isGuestUser, user?.department, user?.stage, user?.year]);

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
  }, [actorIdentityIds, logLectureTabError, primaryActorId]);

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
  }, [actorIdentityIds, logLectureTabError, primaryActorId, user?.department, user?.stage]);

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
  }, [logLectureTab, logLectureTabError, primaryActorId]);

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
  }, [logLectureTab, logLectureTabError, pinnedChannelIds, primaryActorId]);

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
      setLoadChannelsFailed(false);
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
      setLoadChannelsFailed(true);
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
  }, [loadAvailableGroups, loadChannels, loadPinnedChannels, loadRepresentativeAccess, logLectureTab, primaryActorId]);

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
    if (isGuestUser) {
      setActiveWindow(LECTURE_WINDOWS.GUEST);
      return;
    }

    setActiveWindow((previous) => (
      previous === LECTURE_WINDOWS.GUEST ? LECTURE_WINDOWS.COMMUNITY : previous
    ));
  }, [isGuestUser]);

  React.useEffect(() => {
    if (activeWindow === LECTURE_WINDOWS.OFFICIAL) {
      setFilter(CHANNEL_FILTERS.OFFICIAL);
    } else if (activeWindow === LECTURE_WINDOWS.GUEST) {
      setFilter(CHANNEL_FILTERS.GUEST);
    } else {
      setFilter(CHANNEL_FILTERS.COMMUNITY);
    }
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
        activeOpacity={canOpen ? 0.7 : 1}
        onPress={() => openChannel(item)}
        disabled={!canOpen}
        onLongPress={() => {
          setChannelMenuTarget(item);
          setChannelMenuOpen(true);
        }}
        delayLongPress={280}>
        <GlassContainer
          borderRadius={borderRadius.lg}
          style={[styles.channelCard]}>
        <View style={[styles.channelHeader, isRTL && styles.rowReverse]}>
          <View style={[styles.channelHeaderLeft, isRTL && styles.rowReverse]}>
            <View style={[styles.channelIcon, { backgroundColor: isOfficial ? `${colors.primary}20` : `${colors.textSecondary}15` }]}>
              <IoniconSvg
                name={isOfficial ? 'school' : 'people'}
                size={18}
                color={isOfficial ? colors.primary : colors.textSecondary}
              />
            </View>
            <View style={styles.channelTitleWrap}>
              <View style={[styles.channelNameRow, isRTL && styles.rowReverse]}>
                {isPinned && <IoniconSvg name="pin" size={12} color={colors.primary} style={isRTL ? { marginLeft: spacing.xs } : { marginRight: spacing.xs }} />}
                <Text style={[styles.channelName, isRTL && styles.directionalText, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
              </View>
              <Text style={[styles.channelDescription, isRTL && styles.directionalText, { color: colors.textSecondary }]} numberOfLines={2}>
                {item.description || t('lectures.noDescription')}
              </Text>
            </View>
          </View>

          <View style={[styles.channelHeaderRight, isRTL && styles.rowReverse]}>
            {joined && (
              <View style={[styles.statusBadge, { backgroundColor: `${colors.joined || '#10b981'}20` }]}>
                <IoniconSvg name="checkmark-circle" size={12} color={colors.joined || '#10b981'} />
                <Text style={[styles.statusBadgeText, isRTL && styles.directionalText, { color: colors.joined || '#10b981' }]}>{t('lectures.joined')}</Text>
              </View>
            )}
            {isPending && !joined && (
              <View style={[styles.statusBadge, { backgroundColor: '#f59e0b20' }]}>
                <IoniconSvg name="time-outline" size={12} color="#f59e0b" />
                <Text style={[styles.statusBadgeText, isRTL && styles.directionalText, { color: '#f59e0b' }]}>{t('lectures.pending')}</Text>
              </View>
            )}
          </View>
        </View>

        <View style={[styles.channelMetaRow, isRTL && styles.rowReverse]}>
          <View style={[styles.metaItem, isRTL && styles.rowReverse]}>
            <IoniconSvg name={isOfficial ? 'shield-checkmark-outline' : 'lock-open-outline'} size={12} color={colors.textSecondary} />
            <Text style={[styles.metaText, isRTL && styles.directionalText, { color: colors.textSecondary }]}> 
              {channelAccessLabel(item)}
            </Text>
          </View>
          <View style={[styles.metaItem, isRTL && styles.rowReverse]}>
            <IoniconSvg name="people-outline" size={12} color={colors.textSecondary} />
            <Text style={[styles.metaText, isRTL && styles.directionalText, { color: colors.textSecondary }]}> 
              {t('lectures.membersCount').replace('{count}', String(item.membersCount || 0))}
            </Text>
          </View>
        </View>

        {!joined && !isPending && (
          <View style={[styles.cardActions, isRTL && styles.rowReverse]}>
            <TouchableOpacity
              style={[styles.joinBtn, { backgroundColor: colors.primary }]}
              onPress={() => handleRequestJoin(item.$id)}
              disabled={isJoining}>
              {isJoining ? (
                <ActivityIndicator size="small" color={colors.buttonText || '#FFFFFF'} />
              ) : (
                <>
                  <IoniconSvg name="enter-outline" size={14} color={colors.buttonText || '#FFFFFF'} />
                  <Text style={[styles.joinBtnText, isRTL && styles.directionalText, { color: colors.buttonText || '#FFFFFF' }]}>{t('lectures.join')}</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
        </GlassContainer>
      </TouchableOpacity>
    );
  };

  const listData = useMemo(() => {
    const source = (Array.isArray(allChannels) ? allChannels : []).filter((channel) => {
      if (activeWindow === LECTURE_WINDOWS.OFFICIAL) {
        return channel?.channelType === LECTURE_CHANNEL_TYPES.OFFICIAL;
      }

      if (activeWindow === LECTURE_WINDOWS.GUEST) {
        return isGuestLectureChannel(channel);
      }

      if (isGuestLectureChannel(channel)) {
        return false;
      }

      return channel?.channelType !== LECTURE_CHANNEL_TYPES.OFFICIAL;
    });

    return sortChannelsWithPins(source);
  }, [activeWindow, allChannels, sortChannelsWithPins]);

  const channelMenuTargetJoined = !!(channelMenuTarget?.$id && myChannelIds.has(channelMenuTarget.$id));
  const channelMenuTargetPinned = !!(channelMenuTarget?.$id && pinnedChannelIdSet.has(channelMenuTarget.$id));
  const emptyWindowIconName = activeWindow === LECTURE_WINDOWS.OFFICIAL
    ? 'school-outline'
    : activeWindow === LECTURE_WINDOWS.GUEST
      ? 'person-outline'
      : 'people-outline';
  const emptyWindowTitle = activeWindow === LECTURE_WINDOWS.OFFICIAL
    ? t('lectures.emptyOfficialTitle')
    : activeWindow === LECTURE_WINDOWS.GUEST
      ? t('lectures.emptyGuestTitle')
      : t('lectures.emptyCommunityTitle');
  const emptyWindowDescription = activeWindow === LECTURE_WINDOWS.OFFICIAL
    ? t('lectures.emptyOfficialChannels')
    : activeWindow === LECTURE_WINDOWS.GUEST
      ? t('lectures.emptyGuestChannels')
      : t('lectures.emptyCommunityChannels');

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}> 
      <LinearGradient
        colors={colors.gradientBackground || (isDarkMode
          ? ['#1a1a2e', '#16213e', '#0f3460']
          : ['#e3f2fd', '#bbdefb', '#90caf9'])
        }
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor="transparent"
        translucent
      />

      <View style={[styles.header, isRTL && styles.rowReverse, { paddingTop: insets.top + spacing.sm, borderBottomColor: colors.border }]}> 
        <Text style={[styles.screenTitle, isRTL && styles.directionalText, { color: colors.text }]}>{t('lectures.title')}</Text>
        <View style={[styles.headerActions, isRTL && styles.rowReverse]}>
          <TutorialHighlight
            active={tutorial.activeTarget === 'search' && tutorial.isVisible}
            theme={colors}
            isDarkMode={isDarkMode}
            style={styles.tutorialHeaderAction}
            borderRadius={moderateScale(12)}
          >
            <GlassIconButton
              size={moderateScale(36)}
              borderRadiusValue={moderateScale(12)}
              activeOpacity={0.7}
              onPress={() => setSearchVisible(prev => !prev)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <IoniconSvg name="search" size={moderateScale(18)} color={colors.primary} />
            </GlassIconButton>
          </TutorialHighlight>

          {isGuestUser && (
            <GlassIconButton
              size={moderateScale(36)}
              borderRadiusValue={moderateScale(12)}
              activeOpacity={0.7}
              onPress={() => setGuestWindowInfoOpen(true)}
              accessibilityRole="button"
              accessibilityLabel={t('lectures.guestWindowInfoTitle')}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={[styles.guestHelpIcon, { color: colors.primary }]}>!</Text>
            </GlassIconButton>
          )}
          
          {isGuestUser ? (
            <GlassIconButton
              size={moderateScale(36)}
              borderRadiusValue={moderateScale(12)}
              activeOpacity={0.7}
              onPress={() => setCreateOpen(true)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <IoniconSvg name="add" size={moderateScale(20)} color={colors.primary} />
            </GlassIconButton>
          ) : (
            <TutorialHighlight
              active={tutorial.activeTarget === 'create' && tutorial.isVisible}
              theme={colors}
              isDarkMode={isDarkMode}
              style={styles.tutorialHeaderAction}
              borderRadius={moderateScale(12)}
            >
              <GlassIconButton
                size={moderateScale(36)}
                borderRadiusValue={moderateScale(12)}
                activeOpacity={0.7}
                onPress={() => setCreateOpen(true)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <IoniconSvg name="add" size={moderateScale(20)} color={colors.primary} />
              </GlassIconButton>
            </TutorialHighlight>
          )}
        </View>
      </View>

      {searchVisible && (
        <View style={styles.searchWrap}>
          <GlassContainer borderRadius={borderRadius.lg} style={[styles.searchInputWrap, isRTL && styles.rowReverse]}>
            <IoniconSvg name="search-outline" size={16} color={colors.textSecondary} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              onSubmitEditing={() => loadChannels({ showLoading: true, searchValue: search })}
              placeholder={t('lectures.searchPlaceholder')}
              placeholderTextColor={colors.textSecondary}
              style={[styles.searchInput, isRTL && styles.directionalInput, { color: colors.text }]}
              autoFocus
              returnKeyType="search"
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => { setSearch(''); loadChannels({ showLoading: true, searchValue: '' }); }} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                <IoniconSvg name="close-circle" size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          </GlassContainer>
        </View>
      )}

      <TutorialHighlight
        active={tutorial.activeTarget === 'window' && tutorial.isVisible}
        theme={colors}
        isDarkMode={isDarkMode}
        style={styles.windowSwitcher}
        borderRadius={borderRadius.lg}
      >
        <LectureWindowSelector
          selectedWindow={activeWindow}
          onWindowChange={setActiveWindow}
          windows={lectureWindowOptions}
        />
      </TutorialHighlight>

      {suggestedChannels.length > 0 && !searchVisible && (
        <View style={styles.suggestedWrap}>
          <Text style={[styles.suggestedTitle, isRTL && styles.directionalText, { color: colors.text }]}>{t('lectures.suggestedChannels')}</Text>
          <FlashList
            horizontal
            estimatedItemSize={wp(36)}
            showsHorizontalScrollIndicator={false}
            data={sortChannelsWithPins(suggestedChannels)}
            keyExtractor={(item) => item.$id}
            renderItem={({ item }) => {
              const sugJoined = myChannelIds.has(item.$id);
              return (
                <TouchableOpacity
                  activeOpacity={sugJoined ? 0.7 : 1}
                  disabled={!sugJoined}
                  onPress={() => openChannel(item)}>
                  <GlassContainer
                    borderRadius={borderRadius.lg}
                    style={[styles.suggestedCard]}>
                    <View style={styles.suggestedCardTop}>
                      <IoniconSvg
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
                      <View style={[styles.suggestedJoinedBadge, { backgroundColor: `${colors.joined || '#10b981'}15` }]}>
                        <IoniconSvg name="checkmark-circle" size={10} color={colors.joined || '#10b981'} />
                        <Text style={[styles.suggestedJoinedText, { color: colors.joined || '#10b981' }]}>{t('lectures.joined')}</Text>
                      </View>
                    )}
                  </GlassContainer>
                </TouchableOpacity>
              );
            }}
          />
        </View>
      )}

      <TutorialHighlight
        active={tutorial.activeTarget === 'channels' && tutorial.isVisible}
        theme={colors}
        isDarkMode={isDarkMode}
        style={styles.tutorialListHighlight}
        borderRadius={borderRadius.lg}
      >
        <FlashList
          estimatedItemSize={130}
          style={styles.list}
          contentContainerStyle={[styles.listContent, { paddingBottom: spacing.xxl + insets.bottom }, contentStyle]}
          data={listData}
          keyExtractor={(item) => item.$id}
          renderItem={renderChannelCard}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}
          ListEmptyComponent={
            loading ? (
              <View style={styles.loadingWrap}>
                <ChatListSkeleton count={6} />
              </View>
            ) : (
              <View style={styles.emptyWrap}>
                <IoniconSvg
                  name={emptyWindowIconName}
                  size={48}
                  color={colors.textSecondary}
                  style={{ marginBottom: spacing.md }}
                />
                <Text style={[styles.emptyTitle, { color: colors.text }]}> 
                  {emptyWindowTitle}
                </Text>
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}> 
                  {emptyWindowDescription}
                </Text>
                <TouchableOpacity
                  style={[styles.emptyCreateBtn, { backgroundColor: colors.primary }]}
                  onPress={() => setCreateOpen(true)}>
                  <IoniconSvg name="add" size={16} color={colors.buttonText || '#FFFFFF'} />
                  <Text style={[styles.emptyCreateBtnText, { color: colors.buttonText || '#FFFFFF' }]}> 
                    {isGuestUser ? t('lectures.createGuestChannel') : t('lectures.createChannel')}
                  </Text>
                </TouchableOpacity>
                {loadChannelsFailed && (
                  <TouchableOpacity
                    style={[styles.emptyRetryBtn, { borderColor: colors.border, backgroundColor: colors.inputBackground || 'transparent' }]}
                    onPress={() => loadChannels({ showLoading: true, searchValue: search })}>
                    <IoniconSvg name="refresh" size={14} color={colors.text} />
                    <Text style={[styles.emptyRetryBtnText, isRTL && styles.directionalText, { color: colors.text }]}>{t('common.retry')}</Text>
                  </TouchableOpacity>
                )}
              </View>
            )
          }
        />
      </TutorialHighlight>

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
        isRTL={isRTL}
        isGuestMode={isGuestUser}
      />

      <Modal
        visible={channelMenuOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setChannelMenuOpen(false)}>
        <ModalBackdrop
          style={styles.menuBackdrop}
          overlayColor={colors.overlay}
          scrimColor={colors.scrim || 'rgba(7, 12, 26, 0.38)'}
          useBlur={Platform.OS !== 'android'}
          blurIntensity={26}
          onPress={() => setChannelMenuOpen(false)}>
          <GlassContainer style={[styles.channelMenuCard]} padding={spacing.md}> 
            <View style={[styles.channelMenuHeader, isRTL && styles.rowReverse]}>
              <IoniconSvg
                name={channelMenuTarget?.channelType === LECTURE_CHANNEL_TYPES.OFFICIAL ? 'school' : 'people'}
                size={18}
                color={colors.primary}
              />
              <Text style={[styles.channelMenuTitle, isRTL && styles.directionalText, { color: colors.text }]} numberOfLines={1}>
                {channelMenuTarget?.name || t('lectures.channel')}
              </Text>
            </View>

            {channelMenuTargetJoined && (
              <TouchableOpacity
                style={[styles.channelMenuItem, isRTL && styles.rowReverse, { borderTopColor: colors.border }]}
                onPress={() => {
                  setChannelMenuOpen(false);
                  if (channelMenuTarget) {
                    openChannel(channelMenuTarget);
                  }
                }}
                accessibilityRole="button"
                accessibilityLabel={t('lectures.openChannel')}>
                <IoniconSvg name="enter-outline" size={16} color={colors.text} />
                <Text style={[styles.channelMenuItemText, isRTL && styles.directionalText, { color: colors.text }]}>{t('lectures.openChannel')}</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.channelMenuItem, isRTL && styles.rowReverse, { borderTopColor: colors.border }]}
              onPress={() => {
                const targetId = channelMenuTarget?.$id || '';
                setChannelMenuOpen(false);
                if (targetId) {
                  handleShareChannel(targetId);
                }
              }}
              accessibilityRole="button"
              accessibilityLabel={t('lectures.share')}>
              <IoniconSvg name="share-social-outline" size={16} color={colors.text} />
              <Text style={[styles.channelMenuItemText, isRTL && styles.directionalText, { color: colors.text }]}>{t('lectures.share')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.channelMenuItem, isRTL && styles.rowReverse, { borderTopColor: colors.border }]}
              onPress={async () => {
                const targetId = channelMenuTarget?.$id || '';
                setChannelMenuOpen(false);
                if (targetId) {
                  await handleTogglePinChannel(targetId);
                }
              }}
              accessibilityRole="button"
              accessibilityLabel={channelMenuTargetPinned ? t('lectures.unpinChannel') : t('lectures.pinChannel')}>
              <IoniconSvg name={channelMenuTargetPinned ? 'pin-outline' : 'pin'} size={16} color={colors.text} />
              <Text style={[styles.channelMenuItemText, isRTL && styles.directionalText, { color: colors.text }]}>
                {channelMenuTargetPinned ? t('lectures.unpinChannel') : t('lectures.pinChannel')}
              </Text>
            </TouchableOpacity>

            {!channelMenuTargetJoined && !!channelMenuTarget?.$id && !pendingChannelIdSet.has(channelMenuTarget?.$id) && (
              <TouchableOpacity
                style={[styles.channelMenuItem, isRTL && styles.rowReverse, { borderTopColor: colors.border }]}
                onPress={() => {
                  const targetId = channelMenuTarget.$id;
                  setChannelMenuOpen(false);
                  handleRequestJoin(targetId);
                }}
                accessibilityRole="button"
                accessibilityLabel={t('lectures.join')}>
                <IoniconSvg name="enter-outline" size={16} color={colors.primary} />
                <Text style={[styles.channelMenuItemText, isRTL && styles.directionalText, { color: colors.primary }]}>{t('lectures.join')}</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.channelMenuItem, isRTL && styles.rowReverse, { borderTopColor: colors.border }]}
              onPress={() => setChannelMenuOpen(false)}
              accessibilityRole="button"
              accessibilityLabel={t('common.cancel')}>
              <IoniconSvg name="close-outline" size={16} color={colors.textSecondary} />
              <Text style={[styles.channelMenuItemText, isRTL && styles.directionalText, { color: colors.textSecondary }]}>{t('common.cancel')}</Text>
            </TouchableOpacity>
          </GlassContainer>
        </ModalBackdrop>
      </Modal>

      <Modal
        visible={guestWindowInfoOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setGuestWindowInfoOpen(false)}>
        <ModalBackdrop
          style={styles.menuBackdrop}
          overlayColor={colors.overlay}
          scrimColor={colors.scrim || 'rgba(7, 12, 26, 0.38)'}
          useBlur={Platform.OS !== 'android'}
          blurIntensity={26}
          onPress={() => setGuestWindowInfoOpen(false)}>
          <GlassContainer style={[styles.guestInfoCard, { borderColor: colors.border }]} padding={spacing.md}>
            <View style={[styles.guestInfoHeader, isRTL && styles.rowReverse]}>
              <View style={[styles.guestInfoIconWrap, { backgroundColor: `${colors.primary}20` }]}>
                <Text style={[styles.guestInfoIconText, { color: colors.primary }]}>!</Text>
              </View>
              <Text style={[styles.guestInfoTitle, isRTL && styles.directionalText, { color: colors.text }]}>
                {t('lectures.guestWindowInfoTitle')}
              </Text>
            </View>

            <Text style={[styles.guestInfoBody, isRTL && styles.directionalText, { color: colors.textSecondary }]}> 
              {t('lectures.guestWindowInfoBody')}
            </Text>

            <TouchableOpacity
              style={[styles.guestInfoButton, { backgroundColor: colors.primary }]}
              onPress={() => setGuestWindowInfoOpen(false)}>
              <Text style={[styles.guestInfoButtonText, isRTL && styles.directionalText, { color: colors.buttonText || '#FFFFFF' }]}> 
                {t('common.ok')}
              </Text>
            </TouchableOpacity>
          </GlassContainer>
        </ModalBackdrop>
      </Modal>

      <ScreenTutorialCard
        visible={tutorial.isVisible}
        theme={colors}
        isRTL={isRTL}
        t={t}
        step={tutorial.currentStep}
        stepIndex={tutorial.currentIndex}
        totalSteps={tutorial.totalSteps}
        onPrev={tutorial.prevStep}
        onNext={tutorial.nextStep}
        onSkip={tutorial.skipTutorial}
      />
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
    fontWeight: '800',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  tutorialHeaderAction: {
    borderRadius: moderateScale(12),
  },
  rowReverse: {
    flexDirection: 'row-reverse',
  },
  headerIconBtn: {
    width: moderateScale(34),
    height: moderateScale(34),
    borderRadius: moderateScale(17),
    justifyContent: 'center',
    alignItems: 'center',
  },
  guestHelpIcon: {
    fontSize: fontSize(18),
    fontWeight: '800',
    lineHeight: fontSize(18),
  },
  searchWrap: {
    paddingHorizontal: wp(4),
    paddingVertical: spacing.sm,
  },
  searchInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
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
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  windowBtn: {
    flex: 1,
    flexDirection: 'row',
    borderRadius: borderRadius.round,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  windowBtnText: {
    fontSize: fontSize(15),
    fontWeight: '700',
    textAlign: 'center',
  },
  suggestedWrap: {
    paddingHorizontal: wp(4),
    paddingBottom: spacing.md,
  },
  suggestedTitle: {
    fontSize: fontSize(12),
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  suggestedCard: {
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginEnd: spacing.sm,
    minWidth: wp(36),
    maxWidth: wp(50),
    overflow: 'hidden',
  },
  suggestedCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  suggestedCardTitle: {
    fontSize: fontSize(12),
    fontWeight: '700',
    flex: 1,
  },
  suggestedCardSub: {
    fontSize: fontSize(10),
    marginTop: spacing.xs,
  },
  suggestedJoinedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
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
  tutorialListHighlight: {
    flex: 1,
    marginHorizontal: spacing.sm,
    marginBottom: spacing.sm,
  },
  listContent: {
    paddingHorizontal: wp(4),
    paddingTop: spacing.xs,
  },
  channelCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    overflow: 'hidden',
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
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
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
    gap: spacing.xs,
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
  },
  loadingWrap: {
    paddingVertical: spacing.xxl,
    justifyContent: 'center',
    alignItems: 'stretch',
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
  },
  emptyRetryBtn: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  emptyRetryBtnText: {
    fontSize: fontSize(12),
    fontWeight: '700',
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: wp(6),
    overflow: 'hidden',
  },
  modalBackdropBlur: {
    ...StyleSheet.absoluteFillObject,
  },
  modalBackdropScrim: {
    ...StyleSheet.absoluteFillObject,
  },
  modalCard: {
    borderWidth: 1,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    maxHeight: '88%',
  },
  createModalGlass: {
    borderRadius: borderRadius.xl,
  },
  createModalOptionGlass: {
    marginBottom: spacing.xs,
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
  inputCounter: {
    fontSize: fontSize(10),
    marginTop: -spacing.xs,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  inputGlass: {
    marginBottom: spacing.sm,
  },
  inputGlassError: {
    borderColor: '#ef4444',
  },
  input: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize(12),
  },
  multilineInput: {
    minHeight: 90,
    textAlignVertical: 'top',
  },
  typeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xs,
    flexWrap: 'nowrap',
  },
  chip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
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
    marginBottom: spacing.sm,
  },
  toggleRow: {
    borderWidth: 0,
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
    marginTop: spacing.xs,
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
    overflow: 'hidden',
  },
  menuBackdropBlur: {
    ...StyleSheet.absoluteFillObject,
  },
  menuBackdropScrim: {
    ...StyleSheet.absoluteFillObject,
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
  guestInfoCard: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    width: '100%',
    maxWidth: wp(88),
    alignSelf: 'center',
  },
  guestInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  guestInfoIconWrap: {
    width: moderateScale(26),
    height: moderateScale(26),
    borderRadius: moderateScale(13),
    justifyContent: 'center',
    alignItems: 'center',
  },
  guestInfoIconText: {
    fontSize: fontSize(16),
    fontWeight: '800',
  },
  guestInfoTitle: {
    flex: 1,
    fontSize: fontSize(14),
    fontWeight: '700',
  },
  guestInfoBody: {
    fontSize: fontSize(12),
    lineHeight: fontSize(18),
    marginBottom: spacing.md,
  },
  guestInfoButton: {
    alignSelf: 'flex-end',
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  guestInfoButtonText: {
    fontSize: fontSize(12),
    fontWeight: '700',
  },
  directionalText: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  directionalInput: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
});

export default Lecture;
