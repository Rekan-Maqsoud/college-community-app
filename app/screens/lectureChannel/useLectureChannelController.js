import React, { useCallback, useMemo, useState } from 'react';
import { Alert } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
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
  addLectureManager,
  removeLectureManager,
  createLectureAsset,
  createLectureComment,
  deleteLectureComment,
  getLectureAssets,
  getLectureChannelById,
  getLectureComments,
  getLectureJoinRequests,
  getLectureMembershipSummary,
  getLectureManagers,
  LECTURE_ACCESS_TYPES,
  LECTURE_CHANNEL_TYPES,
  LECTURE_UPLOAD_TYPES,
  requestJoinLectureChannel,
  setLectureMembershipNotification,
  updateLectureAssetPinStatus,
  updateLectureChannelSettings,
  updateLectureMembershipStatus,
} from '../../database/lectures';
import { getChats } from '../../database/chats';
import { config } from '../../database/config';
import { getUserById, searchUsers } from '../../database/users';
import { validateFileUploadSize } from '../../utils/fileUploadUtils';
import { deleteLectureChannelWithCleanup } from '../../database/lectureCleanup';
import { userCacheManager } from '../../utils/cacheManager';
import {
  canLinkGroupToChannel,
  isNotFoundError,
  parseChannelSettings,
  parseStatsUserIds,
} from './lectureChannelUtils';

const logLectureChannel = () => {};
const logLectureChannelError = () => {};

export const useLectureChannelController = ({ channelId, navigation }) => {
  const { colors, isDarkMode } = useAppSettings();
  const { user } = useUser();
  const { t } = useTranslation();

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

  React.useEffect(() => {
    userProfilesRef.current = userProfiles;
  }, [userProfiles]);

  const membership = membershipSummary?.membership || null;

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
    if (!channel || !user?.$id) {
      return false;
    }

    const managerIds = Array.isArray(managers) ? managers : [];
    return channel.ownerId === user.$id || managerIds.includes(user.$id);
  }, [channel, managers, user?.$id]);

  const isOwner = useMemo(() => {
    return String(channel?.ownerId || '').trim() === String(user?.$id || '').trim();
  }, [channel?.ownerId, user?.$id]);

  const canUpload = useMemo(() => {
    if (!membership || membership.joinStatus !== 'approved') {
      return false;
    }

    return isManager || !!settingsDraft.allowUploadsFromMembers;
  }, [membership, isManager, settingsDraft.allowUploadsFromMembers]);

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
      userId: user?.$id || '',
    });

    try {
      if (showLoading) {
        setLoading(true);
      }

      const [channelDoc, assetsData, summary, managerIds, chats] = await Promise.all([
        getLectureChannelById(channelId),
        getLectureAssets({ channelId, limit: 100, offset: 0 }),
        getLectureMembershipSummary(channelId, user?.$id),
        getLectureManagers(channelId),
        user?.$id ? getChats(user.$id) : Promise.resolve([]),
      ]);

      setChannel(channelDoc);
      setAssets(assetsData);
      setMembershipSummary(summary);
      setManagers(managerIds);
      setLinkedChatId(channelDoc?.linkedChatId || '');
      setSettingsDraft(parseChannelSettings(channelDoc?.settingsJson));

      const statsUserIds = assetsData.flatMap((asset) => ([
        ...parseStatsUserIds(asset?.viewedBy),
        ...parseStatsUserIds(asset?.openedBy),
        ...parseStatsUserIds(asset?.downloadedBy),
      ]));
      await resolveUserNames(statsUserIds);

      const groups = (Array.isArray(chats) ? chats : []).filter(chat => canLinkGroupToChannel(chat, user?.$id));
      setAllGroups(Array.isArray(chats) ? chats : []);
      setAvailableGroups(groups);

      if (channelDoc?.ownerId === user?.$id || managerIds.includes(user?.$id)) {
        const requests = await getLectureJoinRequests(channelId);
        setJoinRequests(requests);

        await resolveUserNames([
          ...managerIds,
          channelDoc?.ownerId,
          ...requests.map(request => request.userId),
        ]);
      } else {
        setJoinRequests([]);
      }

      logLectureChannel('loadData:success', {
        channelId,
        assetsCount: assetsData.length,
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
  }, [channelId, navigation, resolveUserNames, t, user?.$id]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

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

  React.useEffect(() => {
    return () => {
      if (managerSearchTimerRef.current) {
        clearTimeout(managerSearchTimerRef.current);
      }
    };
  }, []);

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

  const onRefresh = () => {
    setRefreshing(true);
    loadData({ showLoading: false });
  };

  const handleJoin = async () => {
    logLectureChannel('join:start', { channelId });
    try {
      await requestJoinLectureChannel(channelId);
      await loadData({ showLoading: false });
      logLectureChannel('join:success', { channelId });
    } catch (error) {
      logLectureChannelError('join:error', error, { channelId });
    }
  };

  const handleToggleNotifications = async () => {
    if (!membership) {
      return;
    }

    logLectureChannel('toggleNotifications:start', {
      channelId,
      currentValue: !!membership.notificationsEnabled,
    });

    try {
      await setLectureMembershipNotification({
        channelId,
        enabled: !membership.notificationsEnabled,
      });
      await loadData({ showLoading: false });
      logLectureChannel('toggleNotifications:success', {
        channelId,
        nextValue: !membership.notificationsEnabled,
      });
    } catch (error) {
      logLectureChannelError('toggleNotifications:error', error, { channelId });
    }
  };

  const handleToggleAccess = async () => {
    if (!channel || channel.channelType === LECTURE_CHANNEL_TYPES.OFFICIAL) {
      return;
    }

    const next = channel.accessType === LECTURE_ACCESS_TYPES.OPEN
      ? LECTURE_ACCESS_TYPES.APPROVAL_REQUIRED
      : LECTURE_ACCESS_TYPES.OPEN;

    logLectureChannel('toggleAccess:start', {
      channelId,
      nextAccessType: next,
    });

    try {
      await updateLectureChannelSettings(channelId, { accessType: next });
      await loadData({ showLoading: false });
      logLectureChannel('toggleAccess:success', {
        channelId,
        nextAccessType: next,
      });
    } catch (error) {
      logLectureChannelError('toggleAccess:error', error, { channelId });
    }
  };

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

  const handleManagerInputChange = useCallback((value) => {
    setManagerUserId(value);
    setManagerError('');
    setManagerStatus('');

    if (managerSearchTimerRef.current) {
      clearTimeout(managerSearchTimerRef.current);
    }

    managerSearchTimerRef.current = setTimeout(() => {
      searchManagerSuggestions(value);
    }, 220);
  }, [searchManagerSuggestions]);

  const resolveName = useCallback((userId) => userProfiles[userId]?.name || t('lectures.unknownUser'), [t, userProfiles]);

  const addManagerWithProfile = useCallback(async (profile) => {
    if (!profile?.$id || !isManager || addingManager) {
      return;
    }

    const targetManagerId = String(profile.$id);
    if (targetManagerId === channel?.ownerId || managers.includes(targetManagerId)) {
      setManagerStatus(t('lectures.managerAlreadyExists'));
      setManagerUserId('');
      return;
    }

    try {
      setAddingManager(true);
      setManagerError('');
      setManagerStatus('');

      await addLectureManager(channelId, targetManagerId);
      setManagerUserId('');
      setManagerSuggestions([]);
      setManagerStatus(t('lectures.managerAdded'));
      await resolveUserNames([targetManagerId]);
      await loadData({ showLoading: false });

      logLectureChannel('addManager:success', {
        channelId,
        managerUserId: targetManagerId,
      });
    } catch (error) {
      logLectureChannelError('addManager:error', error, { channelId });
      setManagerError(error?.message || t('common.error'));
    } finally {
      setAddingManager(false);
    }
  }, [addingManager, channel?.ownerId, channelId, isManager, loadData, managers, resolveUserNames, t]);

  const confirmAddManager = useCallback((profile) => {
    if (!profile?.$id) {
      return;
    }

    const managerName = String(profile?.name || profile?.fullName || t('lectures.unknownUser'));
    Alert.alert(
      t('lectures.confirmAddManagerTitle'),
      t('lectures.confirmAddManagerMessage').replace('{name}', managerName),
      [
        {
          text: t('common.cancel'),
          style: 'cancel',
        },
        {
          text: t('lectures.confirmAddManagerCta'),
          onPress: () => {
            addManagerWithProfile(profile);
          },
        },
      ]
    );
  }, [addManagerWithProfile, t]);

  const handleRemoveManager = useCallback((managerId) => {
    const normalizedManagerId = String(managerId || '').trim();
    if (!normalizedManagerId || !isOwner || normalizedManagerId === String(channel?.ownerId || '').trim()) {
      return;
    }

    const managerName = resolveName(normalizedManagerId);

    Alert.alert(
      t('lectures.removeManagerConfirmTitle'),
      t('lectures.removeManagerConfirmMessage').replace('{name}', managerName),
      [
        {
          text: t('common.cancel'),
          style: 'cancel',
        },
        {
          text: t('common.remove'),
          style: 'destructive',
          onPress: async () => {
            try {
              await removeLectureManager(channelId, normalizedManagerId);
              setManagerStatus(t('lectures.managerRemoved'));
              await loadData({ showLoading: false });
            } catch (error) {
              setManagerError(error?.message || t('common.error'));
            }
          },
        },
      ]
    );
  }, [channel?.ownerId, channelId, isOwner, loadData, resolveName, t]);

  const handleDeleteChannel = useCallback(() => {
    if (!isOwner || !channelId) {
      return;
    }

    Alert.alert(
      t('lectures.deleteChannelTitle'),
      t('lectures.deleteChannelConfirmMessage'),
      [
        {
          text: t('common.cancel'),
          style: 'cancel',
        },
        {
          text: t('lectures.deleteChannelAction'),
          style: 'destructive',
          onPress: async () => {
            try {
              setSavingSettings(true);
              await deleteLectureChannelWithCleanup(channelId);
              channelUnavailableRef.current = true;
              navigation?.goBack?.();
            } catch (error) {
              setManagerError(error?.message || t('common.error'));
            } finally {
              setSavingSettings(false);
            }
          },
        },
      ]
    );
  }, [channelId, isOwner, navigation, t]);

  const handleAddManager = async () => {
    const query = managerUserId.trim();
    if (!query || !isManager || addingManager) {
      return;
    }

    logLectureChannel('addManager:start', {
      channelId,
      query,
    });

    try {
      setManagerError('');
      setManagerStatus('');

      let profile = managerSuggestions.find((candidate) => {
        const candidateId = String(candidate?.$id || '').trim().toLowerCase();
        const candidateName = String(candidate?.name || candidate?.fullName || '').trim().toLowerCase();
        const lowered = query.toLowerCase();
        return candidateId === lowered || candidateName === lowered;
      }) || null;

      if (!profile) {
        try {
          profile = await getUserById(query);
        } catch {
          profile = null;
        }
      }

      if (!profile) {
        const candidates = await searchUsers(query, 8);
        const lowered = query.toLowerCase();
        const exactName = candidates.find(item => String(item?.name || '').trim().toLowerCase() === lowered);
        profile = exactName || (candidates.length === 1 ? candidates[0] : null);
      }

      if (!profile?.$id) {
        throw new Error('LECTURE_MANAGER_NOT_FOUND');
      }

      confirmAddManager(profile);
    } catch (error) {
      logLectureChannelError('addManager:error', error, { channelId });
      setManagerError(
        error?.message === 'LECTURE_MANAGER_NOT_FOUND'
          ? t('lectures.managerNotFound')
          : (error?.message || t('common.error'))
      );
    }
  };

  const handleApproveRequest = async (membershipId, status) => {
    if (!isManager) {
      return;
    }

    logLectureChannel('approveRequest:start', {
      channelId,
      membershipId,
      status,
    });

    try {
      await updateLectureMembershipStatus({ channelId, membershipId, status });
      await loadData({ showLoading: false });
      logLectureChannel('approveRequest:success', {
        channelId,
        membershipId,
        status,
      });
    } catch (error) {
      logLectureChannelError('approveRequest:error', error, { channelId, membershipId, status });
    }
  };

  const pickFile = async () => {
    try {
      logLectureChannel('pickFile:start', { channelId });
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        multiple: false,
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.length) {
        return;
      }

      const file = result.assets[0];
      validateFileUploadSize(file.size, 25 * 1024 * 1024);

      setSelectedFile({
        uri: file.uri,
        name: file.name,
        size: file.size,
        type: file.mimeType || 'application/octet-stream',
      });
      setUploadError('');

      logLectureChannel('pickFile:success', {
        channelId,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.mimeType || 'application/octet-stream',
      });
    } catch (error) {
      logLectureChannelError('pickFile:error', error, { channelId });
      setSelectedFile(null);
      setUploadError(error?.message || t('common.error'));
    }
  };

  const handleUpload = async () => {
    if (!canUpload) {
      return;
    }

    if (!newUploadTitle.trim()) {
      setUploadError(t('lectures.uploadTitleRequired'));
      return;
    }

    if (newUploadType === LECTURE_UPLOAD_TYPES.FILE && !selectedFile) {
      setUploadError(t('lectures.fileRequired'));
      return;
    }

    if (newUploadType === LECTURE_UPLOAD_TYPES.YOUTUBE && !youtubeUrl.trim()) {
      setUploadError(t('lectures.youtubeRequired'));
      return;
    }

    if (newUploadType === LECTURE_UPLOAD_TYPES.LINK && !externalUrl.trim()) {
      setUploadError(t('lectures.linkRequired'));
      return;
    }

    logLectureChannel('upload:start', {
      channelId,
      uploadType: newUploadType,
      hasTitle: !!newUploadTitle.trim(),
      hasFile: !!selectedFile,
      hasYoutubeUrl: !!youtubeUrl.trim(),
      hasExternalUrl: !!externalUrl.trim(),
    });

    try {
      setUploading(true);
      setUploadError('');

      await createLectureAsset({
        channelId,
        title: newUploadTitle,
        description: newUploadDescription,
        uploadType: newUploadType,
        youtubeUrl,
        externalUrl,
        file: selectedFile,
      });

      setNewUploadTitle('');
      setNewUploadDescription('');
      setYoutubeUrl('');
      setExternalUrl('');
      setSelectedFile(null);
      await loadData({ showLoading: false });

      logLectureChannel('upload:success', {
        channelId,
        uploadType: newUploadType,
      });
    } catch (error) {
      const message = error?.message === 'LECTURE_BUCKET_CREATE_PERMISSION_MISSING'
        ? t('lectures.bucketPermissionError')
        : (error?.message || t('common.error'));
      setUploadError(message);
      logLectureChannelError('upload:error', error, { channelId });
    } finally {
      setUploading(false);
    }
  };

  const handleTogglePin = async (asset) => {
    if (!asset?.$id || !isManager) {
      return;
    }

    logLectureChannel('togglePin:start', {
      channelId,
      assetId: asset?.$id || '',
      nextPinned: !asset?.isPinned,
    });

    try {
      await updateLectureAssetPinStatus({
        channelId,
        assetId: asset.$id,
        isPinned: !asset.isPinned,
      });
      await loadData({ showLoading: false });
      logLectureChannel('togglePin:success', {
        channelId,
        assetId: asset.$id,
        nextPinned: !asset.isPinned,
      });
    } catch (error) {
      logLectureChannelError('togglePin:error', error, { channelId, assetId: asset?.$id || '' });
    }
  };

  const openComments = async (asset) => {
    logLectureChannel('openComments:start', {
      channelId,
      assetId: asset?.$id || '',
    });

    setCommentsModalAsset(asset);
    await loadComments(asset);
  };

  const closeComments = () => {
    logLectureChannel('closeComments', {
      channelId,
      assetId: commentsModalAsset?.$id || '',
    });
    setCommentsModalAsset(null);
    setAssetComments([]);
    setNewComment('');
  };

  const submitComment = async () => {
    if (!commentsModalAsset?.$id || !newComment.trim() || !membership || membership.joinStatus !== 'approved') {
      return;
    }

    logLectureChannel('submitComment:start', {
      channelId,
      assetId: commentsModalAsset?.$id || '',
      length: newComment.trim().length,
    });

    try {
      setPostingComment(true);
      await createLectureComment({
        channelId,
        assetId: commentsModalAsset.$id,
        text: newComment,
      });
      setNewComment('');
      await loadComments(commentsModalAsset);
      logLectureChannel('submitComment:success', {
        channelId,
        assetId: commentsModalAsset.$id,
      });
    } catch (error) {
      logLectureChannelError('submitComment:error', error, { channelId, assetId: commentsModalAsset?.$id || '' });
    } finally {
      setPostingComment(false);
    }
  };

  const removeComment = async (commentId) => {
    if (!commentId || !commentsModalAsset?.$id) {
      return;
    }

    logLectureChannel('removeComment:start', {
      channelId,
      assetId: commentsModalAsset?.$id || '',
      commentId,
    });

    try {
      await deleteLectureComment({ channelId, commentId });
      await loadComments(commentsModalAsset);
      logLectureChannel('removeComment:success', {
        channelId,
        assetId: commentsModalAsset?.$id || '',
        commentId,
      });
    } catch (error) {
      logLectureChannelError('removeComment:error', error, { channelId, commentId });
    }
  };

  const canViewAssetInfo = useCallback((asset) => {
    if (!asset) {
      return false;
    }

    return isManager || asset.uploaderId === user?.$id;
  }, [isManager, user?.$id]);

  const openAssetMenu = (asset) => {
    if (!asset) {
      return;
    }

    setAssetMenuTarget(asset);
    setAssetMenuOpen(true);
  };

  const handleOrganizerSave = async ({ folders, assetFolderMap, assetOrder }) => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    const overrides = {
      assetFolders: Array.isArray(folders) ? folders : [],
      assetFolderMap: assetFolderMap || {},
      assetOrder: Array.isArray(assetOrder) ? assetOrder : [],
    };

    setSettingsDraft(prev => ({
      ...prev,
      ...overrides,
    }));

    const didSave = await handleSaveSettings(overrides);
    if (didSave) {
      setOrganizerOpen(false);
    }
  };

  return {
    actions: {
      canViewAssetInfo,
      closeComments,
      confirmAddManager,
      handleAddManager,
      handleApproveRequest,
      handleDeleteChannel,
      handleJoin,
      handleManagerInputChange,
      handleOrganizerSave,
      handleRemoveManager,
      handleSaveSettings,
      handleToggleAccess,
      handleToggleNotifications,
      handleTogglePin,
      handleUpload,
      loadData,
      onRefresh,
      openAssetMenu,
      openComments,
      pickFile,
      removeComment,
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
      submitComment,
    },
    computed: {
      assetListData,
      canUpload,
      connectedGroup,
      isManager,
      isOwner,
      linkableGroups,
      membership,
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
