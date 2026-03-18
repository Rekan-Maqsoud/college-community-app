import React, { useCallback, useMemo, useState } from 'react';
import { Alert } from 'react-native';
import { useAppSettings } from '../../context/AppSettingsContext';
import { useUser } from '../../context/UserContext';
import { useTranslation } from '../../hooks/useTranslation';
import {
  useRealtimeSubscription,
  useLectureAssetsRealtime,
  useLectureChannelsRealtime,
  useLectureCommentsRealtime,
  useLectureMembershipsRealtime,
} from '../../hooks/useRealtimeSubscription';
import {
  getLectureAssets,
  getLectureChannelById,
  getLectureComments,
  getLectureJoinRequests,
  getLectureMembershipSummary,
  getLectureManagers,
  LECTURE_UPLOAD_TYPES,
  updateLectureChannelSettings,
} from '../../../database/lectures';
import { getChats } from '../../../database/chats';
import { config } from '../../../database/config';
import { getUserById, searchUsers } from '../../../database/users';
import { getActorIdentityIds, getPrimaryActorId } from '../../utils/actorIdentity';
import { userCacheManager } from '../../utils/cacheManager';
import { canLinkLectureGroup, canManageLectureChannel } from '../../utils/lectureAccess';
import {
  isNotFoundError,
  parseChannelSettings,
  parseStatsUserIds,
} from './lectureChannelUtils';
import { useLectureChannelControllerActions } from './useLectureChannelControllerActions';
import { useCustomAlert } from '../../hooks/useCustomAlert';

const logLectureChannel = (event, payload = {}) => {
};

const logLectureChannelError = (event, error, payload = {}) => {
};

export const useLectureChannelController = ({ channelId, navigation }) => {
  const { colors, isDarkMode } = useAppSettings();
  const { user } = useUser();
  const { t } = useTranslation();
  const { alertConfig, showAlert, hideAlert } = useCustomAlert();

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showUploadComposer, setShowUploadComposer] = useState(false);
  const [showSettingsStats, setShowSettingsStats] = useState(false);

  const [channel, setChannel] = useState(null);
  const [assets, setAssets] = useState([]);
  const [membershipSummary, setMembershipSummary] = useState(null);
  const [joinRequests, setJoinRequests] = useState([]);
  const [managers, setManagers] = useState([]);
  const [userProfiles, setUserProfiles] = useState({});
  const [availableGroups, setAvailableGroups] = useState([]);
  const [allGroups, setAllGroups] = useState([]);

  const [newUploadTitle, setNewUploadTitle] = useState('');
  const [newUploadDescription, setNewUploadDescription] = useState('');
  const [newUploadType, setNewUploadType] = useState(LECTURE_UPLOAD_TYPES.FILE);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [externalUrl, setExternalUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const [settingsDraft, setSettingsDraft] = useState(parseChannelSettings(null));
  const [linkedChatId, setLinkedChatId] = useState('');
  const [managerUserId, setManagerUserId] = useState('');
  const [addingManager, setAddingManager] = useState(false);
  const [managerError, setManagerError] = useState('');
  const [managerStatus, setManagerStatus] = useState('');
  const [managerSuggestions, setManagerSuggestions] = useState([]);
  const [searchingManagerSuggestions, setSearchingManagerSuggestions] = useState(false);
  const [showGroupPicker, setShowGroupPicker] = useState(false);

  const [commentsModalAsset, setCommentsModalAsset] = useState(null);
  const [assetComments, setAssetComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [postingComment, setPostingComment] = useState(false);
  const [assetMenuOpen, setAssetMenuOpen] = useState(false);
  const [assetMenuTarget, setAssetMenuTarget] = useState(null);
  const [assetStatsOpen, setAssetStatsOpen] = useState(false);
  const [assetStatsTarget, setAssetStatsTarget] = useState(null);
  const [organizerOpen, setOrganizerOpen] = useState(false);

  const autoSaveTimerRef = React.useRef(null);
  const managerSearchTimerRef = React.useRef(null);
  const userProfilesRef = React.useRef({});
  const loadingInFlightRef = React.useRef(false);
  const channelUnavailableRef = React.useRef(false);
  const hasShownUnavailableAlertRef = React.useRef(false);
  const hasAutoOpenedUploadComposerRef = React.useRef(false);

  React.useEffect(() => {
    userProfilesRef.current = userProfiles;
  }, [userProfiles]);

  const membership = membershipSummary?.membership || null;
  const actorIdentityIds = useMemo(() => {
    return getActorIdentityIds(user);
  }, [user]);
  const primaryActorId = useMemo(() => getPrimaryActorId(user), [user]);

  React.useEffect(() => {
    logLectureChannel('identity:resolved', {
      channelId,
      userId: user?.$id || '',
      accountId: user?.accountId || '',
      appUserId: user?.userId || '',
      actorIdentityIds,
      primaryActorId,
    });
  }, [actorIdentityIds, channelId, primaryActorId, user?.$id, user?.accountId, user?.userId]);

  const orderedAssets = useMemo(() => {
    const list = Array.isArray(assets) ? [...assets] : [];
    const order = Array.isArray(settingsDraft.assetOrder) ? settingsDraft.assetOrder : [];
    const indexMap = new Map(order.map((id, index) => [id, index]));

    return list.sort((first, second) => {
      const firstOrder = indexMap.has(first?.$id) ? indexMap.get(first.$id) : Number.MAX_SAFE_INTEGER;
      const secondOrder = indexMap.has(second?.$id) ? indexMap.get(second.$id) : Number.MAX_SAFE_INTEGER;

      if (firstOrder !== secondOrder) {
        return firstOrder - secondOrder;
      }

      const firstDate = new Date(first?.$createdAt || 0).getTime();
      const secondDate = new Date(second?.$createdAt || 0).getTime();
      return secondDate - firstDate;
    });
  }, [assets, settingsDraft.assetOrder]);

  const assetListData = useMemo(() => {
    const folders = Array.isArray(settingsDraft.assetFolders) ? settingsDraft.assetFolders : [];
    const folderMap = settingsDraft.assetFolderMap || {};
    const grouped = new Map();

    folders.forEach((folder) => {
      grouped.set(folder.id, {
        id: folder.id,
        name: folder.name,
        items: [],
      });
    });

    const unassigned = [];
    orderedAssets.forEach((asset) => {
      const folderId = folderMap[asset.$id] || '';
      const group = grouped.get(folderId);
      if (group) {
        group.items.push(asset);
      } else {
        unassigned.push(asset);
      }
    });

    const output = [];
    grouped.forEach((group) => {
      if (!group.items.length) {
        return;
      }

      output.push({ type: 'folder', id: `folder_${group.id}`, name: group.name, folderId: group.id });
      group.items.forEach((asset) => {
        output.push({ type: 'asset', id: asset.$id, asset });
      });
    });

    if (unassigned.length) {
      output.push({ type: 'folder', id: 'folder_unassigned', name: t('lectures.unassigned'), folderId: '' });
      unassigned.forEach((asset) => {
        output.push({ type: 'asset', id: asset.$id, asset });
      });
    }

    return output;
  }, [orderedAssets, settingsDraft.assetFolders, settingsDraft.assetFolderMap, t]);

  const isManager = useMemo(() => {
    const membershipRole = String(membership?.role || '').trim().toLowerCase();
    if (membershipRole === 'owner' || membershipRole === 'manager' || membershipRole === 'admin') {
      return true;
    }

    return canManageLectureChannel({
      ...channel,
      managerIds: managers,
    }, actorIdentityIds);
  }, [actorIdentityIds, channel, managers, membership?.role]);

  const isOwner = useMemo(() => {
    if (String(membership?.role || '').trim().toLowerCase() === 'owner') {
      return true;
    }

    return actorIdentityIds.some(identityId => identityId === String(channel?.ownerId || '').trim());
  }, [actorIdentityIds, channel?.ownerId, membership?.role]);

  const canUpload = useMemo(() => {
    if (isManager) {
      return true;
    }

    return !!membership && membership.joinStatus === 'approved' && !!settingsDraft.allowUploadsFromMembers;
  }, [membership, isManager, settingsDraft.allowUploadsFromMembers]);

  React.useEffect(() => {
    logLectureChannel('permissions:snapshot', {
      channelId,
      channelOwnerId: channel?.ownerId || '',
      managerIds: managers,
      membershipId: membership?.$id || '',
      membershipUserId: membership?.userId || '',
      membershipJoinStatus: membership?.joinStatus || '',
      membershipRole: membership?.role || '',
      allowUploadsFromMembers: !!settingsDraft.allowUploadsFromMembers,
      isOwner,
      isManager,
      canUpload,
      settingsOpen,
      showUploadComposer,
    });
  }, [canUpload, channel?.ownerId, channelId, isManager, isOwner, managers, membership?.$id, membership?.joinStatus, membership?.role, membership?.userId, settingsDraft.allowUploadsFromMembers, settingsOpen, showUploadComposer]);

  const membershipResolved = useMemo(() => membershipSummary !== null, [membershipSummary]);

  const stats = useMemo(() => {
    const files = assets.filter(asset => asset.uploadType === LECTURE_UPLOAD_TYPES.FILE).length;
    const videos = assets.filter(asset => asset.uploadType === LECTURE_UPLOAD_TYPES.YOUTUBE).length;
    const links = assets.filter(asset => asset.uploadType === LECTURE_UPLOAD_TYPES.LINK).length;
    const pinned = assets.filter(asset => !!asset.isPinned).length;
    const totalBytes = assets.reduce((sum, asset) => sum + Number(asset.fileSize || 0), 0);

    return {
      total: assets.length,
      files,
      videos,
      links,
      pinned,
      totalBytes,
    };
  }, [assets]);

  const connectedGroup = useMemo(() => {
    const pool = [
      ...(Array.isArray(allGroups) ? allGroups : []),
      ...(Array.isArray(availableGroups) ? availableGroups : []),
    ];
    const map = new Map(pool.filter(Boolean).map(item => [item.$id, item]));
    return linkedChatId ? (map.get(linkedChatId) || null) : null;
  }, [allGroups, availableGroups, linkedChatId]);

  const linkableGroups = useMemo(() => {
    return (Array.isArray(availableGroups) ? availableGroups : []).filter(group => group?.$id && group.$id !== linkedChatId);
  }, [availableGroups, linkedChatId]);

  const stageSuggestions = useMemo(() => {
    const values = new Set();

    const pushValue = (value) => {
      const normalized = String(value || '').trim().toLowerCase();
      if (!normalized) {
        return;
      }

      values.add(normalized === 'all' ? 'all' : normalized);
    };

    pushValue(settingsDraft?.suggestedStage);
    pushValue(channel?.stage);
    pushValue(user?.stage);

    (allGroups || []).forEach((group) => {
      pushValue(group?.stage);
    });

    ['all', '1', '2', '3', '4', '5', '6'].forEach(pushValue);

    return Array.from(values).sort((first, second) => {
      if (first === 'all') return -1;
      if (second === 'all') return 1;
      return Number(first) - Number(second);
    });
  }, [allGroups, channel?.stage, settingsDraft?.suggestedStage, user?.stage]);

  const normalizeProfileIdentity = useCallback((profile, fallbackId = '') => {
    const userId = String(profile?.$id || fallbackId || '').trim();
    if (!userId) {
      return null;
    }

    return {
      $id: userId,
      name: String(profile?.name || profile?.fullName || t('common.user')),
      profilePicture: String(profile?.profilePicture || ''),
      updatedAt: String(profile?.$updatedAt || profile?.updatedAt || ''),
    };
  }, [t]);

  const resolveUserNames = useCallback(async (ids = []) => {
    const uniqueIds = [...new Set((ids || []).filter(Boolean).map(item => String(item)))];
    if (!uniqueIds.length) {
      return;
    }

    const missing = uniqueIds.filter(id => !userProfilesRef.current[id]);
    if (!missing.length) {
      return;
    }

    const entries = await Promise.all(
      missing.map(async (id) => {
        try {
          const cached = await userCacheManager.getCachedUserData(id);
          const cachedIdentity = normalizeProfileIdentity(cached, id);

          if (cachedIdentity) {
            return [id, cachedIdentity];
          }

          const profile = await getUserById(id);
          const identity = normalizeProfileIdentity(profile, id);
          if (!identity) {
            return [id, normalizeProfileIdentity({ $id: id, name: t('common.user') }, id)];
          }

          await userCacheManager.cacheUserData(id, identity);
          return [id, identity];
        } catch {
          return [id, normalizeProfileIdentity({ $id: id, name: t('common.user') }, id)];
        }
      })
    );

    const nextProfiles = Object.fromEntries(entries.filter(([, identity]) => !!identity));
    if (!Object.keys(nextProfiles).length) {
      return;
    }

    setUserProfiles(prev => ({
      ...prev,
      ...nextProfiles,
    }));
  }, [normalizeProfileIdentity, t]);

  const loadData = useCallback(async ({ showLoading = true } = {}) => {
    if (!channelId || channelUnavailableRef.current || loadingInFlightRef.current) {
      return;
    }

    loadingInFlightRef.current = true;

    logLectureChannel('loadData:start', {
      channelId,
      showLoading,
      userId: primaryActorId,
    });

    try {
      if (showLoading) {
        setLoading(true);
      }

      const [channelDoc, summary, managerIds] = await Promise.all([
        getLectureChannelById(channelId),
        getLectureMembershipSummary(channelId),
        getLectureManagers(channelId),
      ]);

      let chats = [];
      if (primaryActorId) {
        try {
          chats = await getChats(primaryActorId);
        } catch (chatLookupError) {
          logLectureChannelError('loadData:chats_error', chatLookupError, {
            channelId,
            userId: primaryActorId,
          });
          chats = [];
        }
      }

      logLectureChannel('loadData:raw_results', {
        channelId,
        channelOwnerId: channelDoc?.ownerId || '',
        channelManagerIds: channelDoc?.managerIds || '',
        summaryMembershipId: summary?.membership?.$id || '',
        summaryMembershipUserId: summary?.membership?.userId || '',
        summaryMembershipJoinStatus: summary?.membership?.joinStatus || '',
        summaryMembershipRole: summary?.membership?.role || '',
        managerIds,
        chatsCount: Array.isArray(chats) ? chats.length : 0,
      });

      setChannel(channelDoc);
      setMembershipSummary(summary);
      setManagers(managerIds);
      setLinkedChatId(channelDoc?.linkedChatId || '');
      setSettingsDraft(parseChannelSettings(channelDoc?.settingsJson));

      await resolveUserNames([
        channelDoc?.ownerId,
        ...managerIds,
      ]);

      const hasApprovedMembership = summary?.membership?.joinStatus === 'approved';
      const hasManagerAccess = canManageLectureChannel({
        ...channelDoc,
        managerIds,
      }, actorIdentityIds);
      const canAccessAssets = hasApprovedMembership || hasManagerAccess;
      let loadedAssetsCount = 0;

      if (canAccessAssets) {
        try {
          const assetsData = await getLectureAssets({ channelId, limit: 100, offset: 0 });
          loadedAssetsCount = assetsData.length;
          setAssets(assetsData);

          const statsUserIds = assetsData.flatMap((asset) => ([
            ...parseStatsUserIds(asset?.viewedBy),
            ...parseStatsUserIds(asset?.openedBy),
            ...parseStatsUserIds(asset?.downloadedBy),
          ]));
          await resolveUserNames(statsUserIds);
        } catch (assetsError) {
          setAssets([]);
          logLectureChannelError('loadData:assets_error', assetsError, { channelId });
        }
      } else {
        setAssets([]);
      }

      const groups = (Array.isArray(chats) ? chats : []).filter(chat => canLinkLectureGroup(chat, actorIdentityIds));
      setAllGroups(Array.isArray(chats) ? chats : []);
      setAvailableGroups(groups);

      if (hasManagerAccess) {
        try {
          const requests = await getLectureJoinRequests(channelId);
          setJoinRequests(requests);

          await resolveUserNames(requests.map(request => request.userId));
        } catch (requestsError) {
          setJoinRequests([]);
          logLectureChannelError('loadData:join_requests_error', requestsError, { channelId });
        }
      } else {
        setJoinRequests([]);
      }

      logLectureChannel('loadData:success', {
        channelId,
        assetsCount: loadedAssetsCount,
        managersCount: managerIds.length,
      });
    } catch (error) {
      if (isNotFoundError(error)) {
        if (!channelUnavailableRef.current) {
          channelUnavailableRef.current = true;
          setSettingsOpen(false);
          setCommentsModalAsset(null);
          setAssetComments([]);
          setAssets([]);
          setJoinRequests([]);
          setManagers([]);
          setChannel(null);

          if (!hasShownUnavailableAlertRef.current) {
            hasShownUnavailableAlertRef.current = true;
            Alert.alert(
              t('lectures.channelUnavailableTitle'),
              t('lectures.channelUnavailableMessage'),
              [
                {
                  text: t('common.ok'),
                  onPress: () => {
                    navigation?.goBack?.();
                  },
                },
              ]
            );
          }
        }
      } else {
        logLectureChannelError('loadData:error', error, { channelId });
      }
    } finally {
      loadingInFlightRef.current = false;
      setLoading(false);
      setRefreshing(false);
    }
  }, [actorIdentityIds, channelId, navigation, primaryActorId, resolveUserNames, t]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  React.useEffect(() => {
    hasAutoOpenedUploadComposerRef.current = false;
    setShowUploadComposer(false);
    logLectureChannel('channel:changed_reset_ui', { channelId });
  }, [channelId]);

  React.useEffect(() => {
    if (hasAutoOpenedUploadComposerRef.current || loading || !canUpload || assets.length > 0) {
      logLectureChannel('upload:auto_open_skipped', {
        channelId,
        hasAutoOpened: hasAutoOpenedUploadComposerRef.current,
        loading,
        canUpload,
        assetsCount: assets.length,
      });
      return;
    }

    hasAutoOpenedUploadComposerRef.current = true;
    setShowUploadComposer(true);
    logLectureChannel('upload:auto_open', {
      channelId,
      assetsCount: assets.length,
    });
  }, [assets.length, canUpload, loading, channelId]);

  const clearManagerSearchTimer = useCallback(() => {
    const timerId = managerSearchTimerRef.current;
    if (timerId) {
      clearTimeout(timerId);
      managerSearchTimerRef.current = null;
    }
  }, []);

  useLectureAssetsRealtime(channelId, () => {
    if (channelUnavailableRef.current) {
      return;
    }

    loadData({ showLoading: false });
  }, true);

  useLectureMembershipsRealtime(channelId, () => {
    if (channelUnavailableRef.current) {
      return;
    }

    loadData({ showLoading: false });
  }, true);

  useLectureChannelsRealtime((payload) => {
    if (channelUnavailableRef.current) {
      return;
    }

    if (payload?.$id === channelId) {
      loadData({ showLoading: false });
    }
  }, true);

  useRealtimeSubscription(
    config.usersCollectionId,
    async (payload) => {
      const userId = String(payload?.$id || '').trim();
      if (!userId || !userProfilesRef.current[userId]) {
        return;
      }

      const nextIdentity = normalizeProfileIdentity(payload, userId);
      if (!nextIdentity) {
        return;
      }

      const currentIdentity = userProfilesRef.current[userId] || {};
      const hasChanged =
        String(currentIdentity?.name || '') !== String(nextIdentity?.name || '') ||
        String(currentIdentity?.profilePicture || '') !== String(nextIdentity?.profilePicture || '') ||
        String(currentIdentity?.updatedAt || '') !== String(nextIdentity?.updatedAt || '');

      if (!hasChanged) {
        return;
      }

      setUserProfiles(prev => ({
        ...prev,
        [userId]: nextIdentity,
      }));

      await userCacheManager.cacheUserData(userId, nextIdentity);
    },
    null,
    { enabled: !!channelId && !!config.usersCollectionId }
  );

  React.useEffect(() => clearManagerSearchTimer, [clearManagerSearchTimer]);

  const loadComments = useCallback(async (asset) => {
    if (!asset?.$id || !channelId) {
      return;
    }

    logLectureChannel('loadComments:start', {
      channelId,
      assetId: asset.$id,
    });

    try {
      const comments = await getLectureComments({ channelId, assetId: asset.$id, limit: 300 });
      setAssetComments(comments);
      await resolveUserNames(comments.map(comment => comment.userId));
      logLectureChannel('loadComments:success', {
        channelId,
        assetId: asset.$id,
        commentsCount: comments.length,
      });
    } catch (error) {
      logLectureChannelError('loadComments:error', error, { channelId, assetId: asset?.$id || '' });
      setAssetComments([]);
    }
  }, [channelId, resolveUserNames]);

  useLectureCommentsRealtime(commentsModalAsset?.$id || '', () => {
    if (commentsModalAsset?.$id) {
      loadComments(commentsModalAsset);
    }
  }, !!commentsModalAsset?.$id);

  const handleSaveSettings = async (overrides = {}) => {
    if (!isManager || savingSettings) {
      return false;
    }

    const draft = { ...settingsDraft, ...overrides };
    const chatId = overrides.linkedChatId !== undefined ? overrides.linkedChatId : linkedChatId;

    logLectureChannel('saveSettings:start', {
      channelId,
      linkedChatId: chatId,
      allowUploadsFromMembers: !!draft.allowUploadsFromMembers,
      suggestToDepartment: !!draft.suggestToDepartment,
      suggestToStage: !!draft.suggestToStage,
    });

    try {
      setSavingSettings(true);
      setManagerError('');
      setManagerStatus('');
      await updateLectureChannelSettings(channelId, {
        linkedChatId: chatId,
        settingsJson: {
          allowComments: true,
          allowUploadsFromMembers: !!draft.allowUploadsFromMembers,
          suggestToDepartment: !!draft.suggestToDepartment,
          suggestToStage: !!draft.suggestToStage,
          suggestedDepartment: draft.suggestToDepartment
            ? (draft.suggestedDepartment || user?.department || '')
            : '',
          suggestedStage: draft.suggestToStage
            ? String(draft.suggestedStage || '').trim()
            : '',
          assetFolders: Array.isArray(draft.assetFolders) ? draft.assetFolders : [],
          assetFolderMap: draft.assetFolderMap || {},
          assetOrder: Array.isArray(draft.assetOrder) ? draft.assetOrder : [],
        },
      });
      await loadData({ showLoading: false });
      setShowGroupPicker(false);
      logLectureChannel('saveSettings:success', {
        channelId,
        linkedChatId: chatId,
      });
      return true;
    } catch (error) {
      logLectureChannelError('saveSettings:error', error, { channelId });
      return false;
    } finally {
      setSavingSettings(false);
    }
  };

  const searchManagerSuggestions = useCallback(async (query) => {
    const normalizedQuery = String(query || '').trim();
    if (normalizedQuery.length < 2) {
      setManagerSuggestions([]);
      setSearchingManagerSuggestions(false);
      return;
    }

    setSearchingManagerSuggestions(true);

    try {
      const candidates = await searchUsers(normalizedQuery, 8);
      const filtered = (Array.isArray(candidates) ? candidates : []).filter((candidate) => {
        const userId = String(candidate?.$id || '').trim();
        if (!userId) {
          return false;
        }

        if (userId === channel?.ownerId) {
          return false;
        }

        if (managers.includes(userId)) {
          return false;
        }

        return true;
      });

      setManagerSuggestions(filtered);
      await resolveUserNames(filtered.map(item => item?.$id));
    } catch {
      setManagerSuggestions([]);
    } finally {
      setSearchingManagerSuggestions(false);
    }
  }, [channel?.ownerId, managers, resolveUserNames]);

  const resolveName = useCallback((userId) => userProfiles[userId]?.name || t('lectures.unknownUser'), [t, userProfiles]);
  const controllerActions = useLectureChannelControllerActions({
    addingManager,
    autoSaveTimerRef,
    canUpload,
    channel,
    channelId,
    commentsModalAsset,
    handleSaveSettings,
    isManager,
    isOwner,
    linkedChatId,
    loadComments,
    loadData,
    managerSearchTimerRef,
    managerSuggestions,
    managerUserId,
    managers,
    membership,
    navigation,
    newComment,
    newUploadTitle,
    newUploadType,
    resolveName,
    resolveUserNames,
    savingSettings,
    searchManagerSuggestions,
    selectedFile,
    setAddingManager,
    setAssetComments,
    setAssetMenuOpen,
    setAssetMenuTarget,
    setCommentsModalAsset,
    setExternalUrl,
    setManagerError,
    setManagerStatus,
    setManagerSuggestions,
    setManagerUserId,
    setNewComment,
    setNewUploadDescription,
    setNewUploadTitle,
    setNewUploadType,
    setOrganizerOpen,
    setPostingComment,
    setRefreshing,
    setSavingSettings,
    setSearchingManagerSuggestions,
    setSelectedFile,
    setShowGroupPicker,
    setShowSettingsStats,
    setUploadError,
    setUploading,
    setShowUploadComposer,
    setYoutubeUrl,
    showAlert,
    t,
    user,
    youtubeUrl,
    externalUrl,
    newUploadDescription,
    logLectureChannel,
    logLectureChannelError,
  });

  return {
    actions: {
      canViewAssetInfo: controllerActions.canViewAssetInfo,
      closeComments: controllerActions.closeComments,
      confirmAddManager: controllerActions.confirmAddManager,
      handleAddManager: controllerActions.handleAddManager,
      handleApproveRequest: controllerActions.handleApproveRequest,
      handleDeleteChannel: controllerActions.handleDeleteChannel,
      handleJoin: controllerActions.handleJoin,
      handleManagerInputChange: controllerActions.handleManagerInputChange,
      handleOrganizerSave: controllerActions.handleOrganizerSave,
      handleRemoveManager: controllerActions.handleRemoveManager,
      handleSaveSettings,
      handleToggleAccess: controllerActions.handleToggleAccess,
      handleToggleNotifications: controllerActions.handleToggleNotifications,
      handleTogglePin: controllerActions.handleTogglePin,
      handleUpload: controllerActions.handleUpload,
      loadData,
      onRefresh: controllerActions.onRefresh,
      openAssetMenu: controllerActions.openAssetMenu,
      openComments: controllerActions.openComments,
      pickFile: controllerActions.pickFile,
      removeComment: controllerActions.removeComment,
      resolveName,
      setAssetMenuOpen,
      setAssetStatsOpen,
      setAssetStatsTarget,
      setLinkedChatId,
      setManagerError,
      setManagerStatus,
      setNewComment,
      setNewUploadDescription,
      setNewUploadTitle,
      setNewUploadType,
      setOrganizerOpen,
      setSettingsDraft,
      setSettingsOpen,
      setShowGroupPicker,
      setShowSettingsStats,
      setShowUploadComposer,
      setYoutubeUrl,
      setExternalUrl,
      hideAlert,
      submitComment: controllerActions.submitComment,
    },
    computed: {
      assetListData,
      canUpload,
      connectedGroup,
      isManager,
      isOwner,
      linkableGroups,
      membership,
      membershipResolved,
      stageSuggestions,
      stats,
    },
    refs: {
      autoSaveTimerRef,
    },
    state: {
      addingManager,
      allGroups,
      assetComments,
      assetMenuOpen,
      assetMenuTarget,
      assets,
      assetStatsOpen,
      assetStatsTarget,
      availableGroups,
      channel,
      colors,
      commentsModalAsset,
      externalUrl,
      isDarkMode,
      joinRequests,
      linkedChatId,
      loading,
      managerError,
      managerStatus,
      managerSuggestions,
      managerUserId,
      managers,
      membershipSummary,
      newComment,
      newUploadDescription,
      newUploadTitle,
      newUploadType,
      organizerOpen,
      postingComment,
      refreshing,
      savingSettings,
      searchingManagerSuggestions,
      selectedFile,
      settingsDraft,
      settingsOpen,
      showGroupPicker,
      showSettingsStats,
      showUploadComposer,
      t,
      alertConfig,
      uploadError,
      uploading,
      user,
      userProfiles,
      youtubeUrl,
    },
    telemetry: {
      logLectureChannel,
      logLectureChannelError,
    },
  };
};
