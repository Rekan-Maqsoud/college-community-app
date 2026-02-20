import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  ScrollView,
  RefreshControl,
  Modal,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import YoutubePlayer from 'react-native-youtube-iframe';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppSettings } from '../context/AppSettingsContext';
import { useUser } from '../context/UserContext';
import { useTranslation } from '../hooks/useTranslation';
import {
  useLectureAssetsRealtime,
  useLectureChannelsRealtime,
  useLectureCommentsRealtime,
  useLectureMembershipsRealtime,
} from '../hooks/useRealtimeSubscription';
import {
  addLectureManager,
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
  trackLectureAssetInteraction,
} from '../../database/lectures';
import { CHAT_TYPES, getChats } from '../../database/chats';
import { getUserById, searchUsers } from '../../database/users';
import { validateFileUploadSize } from '../utils/fileUploadUtils';
import { wp, spacing, fontSize, moderateScale } from '../utils/responsive';
import { borderRadius } from '../theme/designTokens';
import { extractYouTubeVideoId } from '../utils/lectureUtils';
import AnimatedBackground from '../components/AnimatedBackground';
import { LinearGradient } from 'expo-linear-gradient';

const buildYouTubeVideoId = (url = '') => extractYouTubeVideoId(url);

const parseChannelSettings = (settingsJson) => {
  try {
    const parsed = typeof settingsJson === 'string' ? JSON.parse(settingsJson || '{}') : (settingsJson || {});
    return {
      allowComments: parsed.allowComments !== false,
      allowUploadsFromMembers: !!parsed.allowUploadsFromMembers,
      suggestToDepartment: !!parsed.suggestToDepartment,
      suggestToStage: !!parsed.suggestToStage,
      suggestedStage: String(parsed.suggestedStage || '').trim(),
      suggestedDepartment: String(parsed.suggestedDepartment || '').trim(),
    };
  } catch {
    return {
      allowComments: true,
      allowUploadsFromMembers: false,
      suggestToDepartment: false,
      suggestToStage: false,
      suggestedStage: '',
      suggestedDepartment: '',
    };
  }
};

const canLinkGroupToChannel = (chat, userId) => {
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

const formatBytesAsMb = (bytes = 0) => {
  const value = Number(bytes || 0) / (1024 * 1024);
  return value.toFixed(value >= 10 ? 0 : 1);
};

const sanitizeDownloadFileName = (value = '') => {
  const raw = String(value || '').trim();
  if (!raw) {
    return `lecture_asset_${Date.now()}`;
  }

  const cleaned = raw.replace(/[<>:"/\\|?*\x00-\x1F]/g, '_').replace(/\s+/g, ' ').trim();
  return cleaned || `lecture_asset_${Date.now()}`;
};

const getUrlFileExtension = (url = '') => {
  const normalized = String(url || '').split('?')[0].split('#')[0];
  const segment = normalized.split('/').pop() || '';
  const parts = segment.split('.');
  if (parts.length < 2) {
    return '';
  }

  return String(parts[parts.length - 1] || '').toLowerCase().trim();
};

const parseStatsUserIds = (value) => {
  if (Array.isArray(value)) {
    return [...new Set(value.filter(Boolean).map(item => String(item)))] ;
  }

  const raw = String(value || '').trim();
  if (!raw) {
    return [];
  }

  if (raw.startsWith('[') && raw.endsWith(']')) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return [...new Set(parsed.filter(Boolean).map(item => String(item)))];
      }
    } catch {
      return [];
    }
  }

  return [...new Set(raw.split(',').map(item => item.trim()).filter(Boolean))];
};

const formatStatsUserNames = (userIds = [], userNames = {}) => {
  const names = userIds.map(id => userNames[id] || id).filter(Boolean);
  if (!names.length) {
    return '';
  }

  return names.join(', ');
};

const logLectureChannel = (event, payload = {}) => {
  console.log('[LectureChannel]', event, payload);
};

const logLectureChannelError = (event, error, payload = {}) => {
  console.error('[LectureChannel]', event, {
    ...payload,
    message: error?.message || String(error),
  });
};

const LectureChannel = ({ route }) => {
  const channelId = route?.params?.channelId || '';
  const initialAssetId = route?.params?.assetId || '';
  const insets = useSafeAreaInsets();
  const { colors, isDarkMode } = useAppSettings();
  const { user } = useUser();
  const { t } = useTranslation();

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showUploadComposer, setShowUploadComposer] = useState(false);
  const [showSettingsStats, setShowSettingsStats] = useState(false);
  const [pendingOpenAssetId, setPendingOpenAssetId] = useState(initialAssetId);

  const [channel, setChannel] = useState(null);
  const [assets, setAssets] = useState([]);
  const [membershipSummary, setMembershipSummary] = useState(null);
  const [joinRequests, setJoinRequests] = useState([]);
  const [managers, setManagers] = useState([]);
  const [userNames, setUserNames] = useState({});
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
  const [showGroupPicker, setShowGroupPicker] = useState(false);

  const [youtubeModalVideoId, setYoutubeModalVideoId] = useState('');
  const [commentsModalAsset, setCommentsModalAsset] = useState(null);
  const [assetComments, setAssetComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [postingComment, setPostingComment] = useState(false);

  const membership = membershipSummary?.membership || null;

  const isManager = useMemo(() => {
    if (!channel || !user?.$id) {
      return false;
    }

    const managerIds = Array.isArray(managers) ? managers : [];
    return channel.ownerId === user.$id || managerIds.includes(user.$id);
  }, [channel, managers, user?.$id]);

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
    const pool = [...(Array.isArray(allGroups) ? allGroups : []), ...(Array.isArray(availableGroups) ? availableGroups : [])];
    const map = new Map(pool.filter(Boolean).map(item => [item.$id, item]));
    return linkedChatId ? (map.get(linkedChatId) || null) : null;
  }, [allGroups, availableGroups, linkedChatId]);

  const linkableGroups = useMemo(() => {
    return (Array.isArray(availableGroups) ? availableGroups : []).filter(group => group?.$id && group.$id !== linkedChatId);
  }, [availableGroups, linkedChatId]);

  const resolveUserNames = useCallback(async (ids = []) => {
    const uniqueIds = [...new Set((ids || []).filter(Boolean))];
    if (!uniqueIds.length) {
      return;
    }

    const missing = uniqueIds.filter(id => !userNames[id]);
    if (!missing.length) {
      return;
    }

    const entries = await Promise.all(
      missing.map(async (id) => {
        try {
          const profile = await getUserById(id);
          return [id, profile?.name || profile?.fullName || t('common.user')];
        } catch {
          return [id, t('common.user')];
        }
      })
    );

    setUserNames(prev => ({
      ...prev,
      ...Object.fromEntries(entries),
    }));
  }, [t, userNames]);

  const loadData = useCallback(async ({ showLoading = true } = {}) => {
    if (!channelId) {
      return;
    }

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
      logLectureChannelError('loadData:error', error, { channelId });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [channelId, resolveUserNames, user?.$id]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  useLectureAssetsRealtime(channelId, () => {
    loadData({ showLoading: false });
  }, true);

  useLectureMembershipsRealtime(channelId, () => {
    loadData({ showLoading: false });
  }, true);

  useLectureChannelsRealtime((payload) => {
    if (payload?.$id === channelId) {
      loadData({ showLoading: false });
    }
  }, true);

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

  const handleSaveSettings = async () => {
    if (!isManager || savingSettings) {
      return;
    }

    logLectureChannel('saveSettings:start', {
      channelId,
      linkedChatId,
      allowUploadsFromMembers: !!settingsDraft.allowUploadsFromMembers,
      suggestToDepartment: !!settingsDraft.suggestToDepartment,
      suggestToStage: !!settingsDraft.suggestToStage,
    });

    try {
      setSavingSettings(true);
      setManagerError('');
      setManagerStatus('');
      await updateLectureChannelSettings(channelId, {
        linkedChatId,
        settingsJson: {
          allowComments: true,
          allowUploadsFromMembers: !!settingsDraft.allowUploadsFromMembers,
          suggestToDepartment: !!settingsDraft.suggestToDepartment,
          suggestToStage: !!settingsDraft.suggestToStage,
          suggestedDepartment: settingsDraft.suggestToDepartment
            ? (settingsDraft.suggestedDepartment || user?.department || '')
            : '',
          suggestedStage: settingsDraft.suggestToStage
            ? String(settingsDraft.suggestedStage || '').trim()
            : '',
        },
      });
      await loadData({ showLoading: false });
      setShowGroupPicker(false);
      setSettingsOpen(false);
      logLectureChannel('saveSettings:success', {
        channelId,
        linkedChatId,
      });
    } catch (error) {
      logLectureChannelError('saveSettings:error', error, { channelId });
    } finally {
      setSavingSettings(false);
    }
  };

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
      setAddingManager(true);
      setManagerError('');
      setManagerStatus('');

      let profile = null;

      try {
        profile = await getUserById(query);
      } catch {
        profile = null;
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

      const targetManagerId = String(profile.$id);
      if (targetManagerId === channel?.ownerId || managers.includes(targetManagerId)) {
        setManagerStatus(t('lectures.managerAlreadyExists'));
        setManagerUserId('');
        return;
      }

      await addLectureManager(channelId, targetManagerId);
      setManagerUserId('');
      setManagerStatus(t('lectures.managerAdded'));
      await resolveUserNames([targetManagerId]);
      await loadData({ showLoading: false });
      logLectureChannel('addManager:success', {
        channelId,
        managerUserId: targetManagerId,
      });
    } catch (error) {
      logLectureChannelError('addManager:error', error, { channelId });
      setManagerError(
        error?.message === 'LECTURE_MANAGER_NOT_FOUND'
          ? t('lectures.managerNotFound')
          : (error?.message || t('common.error'))
      );
    } finally {
      setAddingManager(false);
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

  const markAssetInteraction = async (asset, action) => {
    if (!asset?.$id || !channelId) {
      return;
    }

    await trackLectureAssetInteraction({
      channelId,
      assetId: asset.$id,
      action,
      userId: user?.$id,
    });
  };

  const downloadLectureAssetFile = async (asset, { trackOpen = false } = {}) => {
    if (!asset || asset.uploadType !== LECTURE_UPLOAD_TYPES.FILE || !asset.fileUrl) {
      return;
    }

    try {
      await markAssetInteraction(asset, 'view');
      if (trackOpen) {
        await markAssetInteraction(asset, 'open');
      }

      const baseDirectory = FileSystem.cacheDirectory || FileSystem.documentDirectory;
      if (!baseDirectory) {
        throw new Error('Download directory unavailable');
      }

      const sourceName = asset.fileName || asset.title || '';
      const safeName = sanitizeDownloadFileName(sourceName);
      const nameParts = safeName.split('.');
      const hasExtension = nameParts.length > 1 && !!nameParts[nameParts.length - 1];
      const fallbackExtension = getUrlFileExtension(asset.fileUrl);
      const finalName = hasExtension || !fallbackExtension
        ? safeName
        : `${safeName}.${fallbackExtension}`;
      const localUri = `${baseDirectory}${finalName}`;

      const result = await FileSystem.downloadAsync(asset.fileUrl, localUri, {
        headers: {
          Accept: '*/*',
        },
      });

      if (!result?.uri || result.status !== 200) {
        throw new Error('Download failed');
      }

      await markAssetInteraction(asset, 'download');

      const sharingAvailable = await Sharing.isAvailableAsync();
      if (sharingAvailable) {
        await Sharing.shareAsync(result.uri, {
          mimeType: asset.mimeType || undefined,
        });
      } else {
        await Linking.openURL(result.uri);
      }

      await loadData({ showLoading: false });
    } catch (error) {
      logLectureChannelError('downloadAsset:error', error, {
        channelId,
        assetId: asset?.$id || '',
      });
    }
  };

  const openAsset = async (asset) => {
    if (!asset) {
      return;
    }

    if (asset.uploadType === LECTURE_UPLOAD_TYPES.FILE && asset.fileUrl) {
      logLectureChannel('openAsset:fileDownload', {
        channelId,
        assetId: asset.$id,
      });
      await downloadLectureAssetFile(asset, { trackOpen: true });
      return;
    }

    if (asset.uploadType === LECTURE_UPLOAD_TYPES.YOUTUBE && asset.youtubeUrl) {
      const videoId = buildYouTubeVideoId(asset.youtubeUrl);
      if (videoId) {
        await markAssetInteraction(asset, 'view');
        await markAssetInteraction(asset, 'open');
        logLectureChannel('openAsset:youtube', {
          channelId,
          assetId: asset.$id,
          videoId,
        });
        setYoutubeModalVideoId(videoId);
      } else {
        logLectureChannel('openAsset:youtubeInvalidId', {
          channelId,
          assetId: asset.$id,
          youtubeUrl: asset.youtubeUrl,
        });
      }
      return;
    }

    const target = asset.uploadType === LECTURE_UPLOAD_TYPES.LINK
      ? asset.externalUrl
      : asset.fileUrl;

    if (!target) {
      return;
    }

    try {
      await markAssetInteraction(asset, 'view');
      await markAssetInteraction(asset, 'open');
      logLectureChannel('openAsset:external', {
        channelId,
        assetId: asset?.$id || '',
        uploadType: asset.uploadType,
      });
      await Linking.openURL(target);
    } catch (error) {
      logLectureChannelError('openAsset:error', error, { channelId, assetId: asset?.$id || '' });
    }
  };

  const handleDownloadAsset = async (asset) => {
    await downloadLectureAssetFile(asset, { trackOpen: false });
  };

  React.useEffect(() => {
    const routeAssetId = route?.params?.assetId || '';
    if (routeAssetId) {
      setPendingOpenAssetId(routeAssetId);
    }
  }, [route?.params?.assetId]);

  React.useEffect(() => {
    if (!pendingOpenAssetId || !assets.length) {
      return;
    }

    const target = assets.find(item => item?.$id === pendingOpenAssetId);
    if (!target) {
      return;
    }

    openAsset(target);
    setPendingOpenAssetId('');
  }, [assets, pendingOpenAssetId]);

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

  const resolveName = (userId) => userNames[userId] || t('lectures.unknownUser');

  const renderStatCard = (label, value) => (
    <View style={[styles.statCard, { borderColor: colors.border, backgroundColor: colors.card }]}>
      <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );

  const renderAsset = ({ item }) => {
    const typeText = item.uploadType === LECTURE_UPLOAD_TYPES.YOUTUBE
      ? t('lectures.youtube')
      : item.uploadType === LECTURE_UPLOAD_TYPES.LINK
        ? t('lectures.link')
        : t('lectures.file');

    const viewedByIds = parseStatsUserIds(item?.viewedBy);
    const openedByIds = parseStatsUserIds(item?.openedBy);
    const downloadedByIds = parseStatsUserIds(item?.downloadedBy);

    const viewedCount = Number(item?.viewsCount ?? item?.viewCount ?? viewedByIds.length ?? 0);
    const openedCount = Number(item?.opensCount ?? item?.openCount ?? openedByIds.length ?? 0);
    const downloadedCount = Number(item?.downloadsCount ?? item?.downloadCount ?? downloadedByIds.length ?? 0);

    return (
      <TouchableOpacity
        onPress={() => openAsset(item)}
        style={[styles.assetCard, { borderColor: colors.border, backgroundColor: colors.card }]}>
        <View style={styles.assetHeader}>
          <Text style={[styles.assetTitle, { color: colors.text }]} numberOfLines={2}>{item.title}</Text>
          <Text style={[styles.assetType, { color: colors.primary }]}>{typeText}</Text>
        </View>

        {!!item.description && (
          <Text style={[styles.assetDescription, { color: colors.textSecondary }]} numberOfLines={2}>{item.description}</Text>
        )}

        <View style={styles.assetStatsWrap}>
          <Text style={[styles.assetStatsLabel, { color: colors.textSecondary }]}>
            {t('lectures.assetViews').replace('{count}', String(viewedCount))}
          </Text>
          <Text style={[styles.assetStatsLabel, { color: colors.textSecondary }]}>
            {t('lectures.assetOpens').replace('{count}', String(openedCount))}
          </Text>
          <Text style={[styles.assetStatsLabel, { color: colors.textSecondary }]}>
            {t('lectures.assetDownloads').replace('{count}', String(downloadedCount))}
          </Text>

          {!!viewedByIds.length && (
            <Text style={[styles.assetStatsNames, { color: colors.textSecondary }]} numberOfLines={2}>
              {t('lectures.seenBy')}: {formatStatsUserNames(viewedByIds, userNames)}
            </Text>
          )}
          {!!openedByIds.length && (
            <Text style={[styles.assetStatsNames, { color: colors.textSecondary }]} numberOfLines={2}>
              {t('lectures.openedBy')}: {formatStatsUserNames(openedByIds, userNames)}
            </Text>
          )}
          {!!downloadedByIds.length && (
            <Text style={[styles.assetStatsNames, { color: colors.textSecondary }]} numberOfLines={2}>
              {t('lectures.downloadedBy')}: {formatStatsUserNames(downloadedByIds, userNames)}
            </Text>
          )}
        </View>

        <View style={styles.assetActionsRow}>
          {!!item.isPinned && <Text style={[styles.pinnedLabel, { color: colors.primary }]}>{t('lectures.pinned')}</Text>}
          <TouchableOpacity style={[styles.pinBtn, { borderColor: colors.border }]} onPress={() => openComments(item)}>
            <Text style={[styles.pinBtnText, { color: colors.text }]}>{t('lectures.discussion')}</Text>
          </TouchableOpacity>
          {item.uploadType === LECTURE_UPLOAD_TYPES.FILE && (
            <TouchableOpacity style={[styles.pinBtn, { borderColor: colors.border }]} onPress={() => handleDownloadAsset(item)}>
              <Text style={[styles.pinBtnText, { color: colors.text }]}>{t('lectures.download')}</Text>
            </TouchableOpacity>
          )}
          {isManager && (
            <TouchableOpacity style={[styles.pinBtn, { borderColor: colors.border }]} onPress={() => handleTogglePin(item)}>
              <Text style={[styles.pinBtnText, { color: colors.text }]}>
                {item.isPinned ? t('lectures.unpin') : t('lectures.pin')}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}> 
      <AnimatedBackground particleCount={35} />
      <LinearGradient
        colors={isDarkMode ? ['#1a1a2e', '#16213e', '#0f3460'] : ['#e3f2fd', '#bbdefb', '#90caf9']}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm, borderBottomColor: colors.border }]}> 
        <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>{channel?.name || t('lectures.channel')}</Text>
        {isManager && (
          <TouchableOpacity onPress={() => setSettingsOpen(true)} style={styles.headerMenuBtn}>
            <Ionicons name="ellipsis-horizontal" size={22} color={colors.text} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}>
        {!membership || membership.joinStatus !== 'approved' ? (
          <TouchableOpacity style={[styles.joinBtn, { backgroundColor: colors.primary }]} onPress={handleJoin}>
            <Text style={styles.joinBtnText}>{membership?.joinStatus === 'pending' ? t('lectures.joinPending') : t('lectures.join')}</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.actionRow}>
            <TouchableOpacity style={[styles.smallBtn, { borderColor: colors.border }]} onPress={handleToggleNotifications}>
              <Text style={[styles.smallBtnText, { color: colors.text }]}>
                {membership.notificationsEnabled ? t('lectures.notificationsOn') : t('lectures.notificationsOff')}
              </Text>
            </TouchableOpacity>
            {isManager && channel?.channelType !== LECTURE_CHANNEL_TYPES.OFFICIAL && (
              <TouchableOpacity style={[styles.smallBtn, { borderColor: colors.border }]} onPress={handleToggleAccess}>
                <Text style={[styles.smallBtnText, { color: colors.text }]}>{t('lectures.toggleAccess')}</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {canUpload && (
          <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.card }]}> 
            <TouchableOpacity style={[styles.composeToggleBtn, { borderColor: colors.border }]} onPress={() => setShowUploadComposer(prev => !prev)}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>{t('lectures.addUpload')}</Text>
              <Ionicons name={showUploadComposer ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textSecondary} />
            </TouchableOpacity>

            {showUploadComposer && (
              <>
                <TextInput
                  value={newUploadTitle}
                  onChangeText={setNewUploadTitle}
                  placeholder={t('lectures.uploadTitlePlaceholder')}
                  placeholderTextColor={colors.textSecondary}
                  style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBackground }]}
                />

                <TextInput
                  value={newUploadDescription}
                  onChangeText={setNewUploadDescription}
                  placeholder={t('lectures.uploadDescriptionPlaceholder')}
                  placeholderTextColor={colors.textSecondary}
                  multiline
                  style={[styles.input, styles.multiline, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBackground }]}
                />

                <View style={styles.typeRow}>
                  {[LECTURE_UPLOAD_TYPES.FILE, LECTURE_UPLOAD_TYPES.YOUTUBE, LECTURE_UPLOAD_TYPES.LINK].map(type => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.typeChip,
                        {
                          borderColor: colors.border,
                          backgroundColor: newUploadType === type ? colors.primary : 'transparent',
                        },
                      ]}
                      onPress={() => setNewUploadType(type)}>
                      <Text style={[styles.typeChipText, { color: newUploadType === type ? '#FFFFFF' : colors.text }]}>
                        {type === LECTURE_UPLOAD_TYPES.FILE ? t('lectures.file') : type === LECTURE_UPLOAD_TYPES.YOUTUBE ? t('lectures.youtube') : t('lectures.link')}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {newUploadType === LECTURE_UPLOAD_TYPES.FILE && (
                  <View style={styles.fileRow}>
                    <TouchableOpacity style={[styles.smallBtn, { borderColor: colors.border }]} onPress={pickFile}>
                      <Text style={[styles.smallBtnText, { color: colors.text }]}>{t('lectures.pickFile')}</Text>
                    </TouchableOpacity>
                    <Text style={[styles.fileName, { color: colors.textSecondary }]} numberOfLines={1}>
                      {selectedFile?.name || t('lectures.noFileSelected')}
                    </Text>
                  </View>
                )}

                {newUploadType === LECTURE_UPLOAD_TYPES.YOUTUBE && (
                  <TextInput
                    value={youtubeUrl}
                    onChangeText={setYoutubeUrl}
                    placeholder={t('lectures.youtubePlaceholder')}
                    placeholderTextColor={colors.textSecondary}
                    style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBackground }]}
                  />
                )}

                {newUploadType === LECTURE_UPLOAD_TYPES.LINK && (
                  <TextInput
                    value={externalUrl}
                    onChangeText={setExternalUrl}
                    placeholder={t('lectures.linkPlaceholder')}
                    placeholderTextColor={colors.textSecondary}
                    style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBackground }]}
                  />
                )}

                <TouchableOpacity style={[styles.uploadBtn, { backgroundColor: colors.primary, opacity: uploading ? 0.7 : 1 }]} onPress={handleUpload} disabled={uploading}>
                  <Text style={styles.uploadBtnText}>{uploading ? t('lectures.uploading') : t('lectures.upload')}</Text>
                </TouchableOpacity>

                {!!uploadError && <Text style={[styles.uploadError, { color: colors.danger }]}>{uploadError}</Text>}
              </>
            )}
          </View>
        )}

        {!!membership && membership.joinStatus === 'approved' && !canUpload && (
          <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.card }]}> 
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>{t('lectures.onlyAdminsCanUpload')}</Text>
          </View>
        )}

        <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('lectures.uploads')}</Text>
        <FlatList
          data={assets}
          keyExtractor={(item) => item.$id}
          renderItem={renderAsset}
          scrollEnabled={false}
          ListEmptyComponent={!loading ? (
            <View style={styles.emptyWrap}>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{t('lectures.noUploads')}</Text>
            </View>
          ) : null}
        />
      </ScrollView>

      <Modal visible={settingsOpen} transparent animationType="slide" onRequestClose={() => setSettingsOpen(false)}>
        <View style={[styles.modalBackdrop, { backgroundColor: colors.overlay }]}> 
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}> 
            <View style={styles.modalHeaderRow}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>{t('lectures.settingsMenuTitle')}</Text>
              <TouchableOpacity onPress={() => setSettingsOpen(false)}>
                <Ionicons name="close" size={20} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <TouchableOpacity
                style={[styles.toggleRow, { borderColor: colors.border, backgroundColor: colors.inputBackground }]}
                onPress={() => setShowSettingsStats(prev => !prev)}>
                <Text style={[styles.toggleText, { color: colors.text }]}>{t('lectures.statsTitle')}</Text>
                <Ionicons name={showSettingsStats ? 'chevron-up' : 'chevron-down'} size={20} color={colors.primary} />
              </TouchableOpacity>

              {showSettingsStats && (
                <View style={styles.statsGrid}>
                  {renderStatCard(t('lectures.totalUploads'), String(stats.total))}
                  {renderStatCard(t('lectures.filesCount'), String(stats.files))}
                  {renderStatCard(t('lectures.videosCount'), String(stats.videos))}
                  {renderStatCard(t('lectures.linksCount'), String(stats.links))}
                  {renderStatCard(t('lectures.pinnedCount'), String(stats.pinned))}
                  {renderStatCard(t('lectures.totalSizeMB'), formatBytesAsMb(stats.totalBytes))}
                </View>
              )}

              <TouchableOpacity
                style={[styles.toggleRow, { borderColor: colors.border, backgroundColor: colors.inputBackground }]}
                onPress={() => setSettingsDraft(prev => ({ ...prev, allowUploadsFromMembers: !prev.allowUploadsFromMembers }))}>
                <Text style={[styles.toggleText, { color: colors.text }]}>{t('lectures.allowMemberUploads')}</Text>
                <Ionicons name={settingsDraft.allowUploadsFromMembers ? 'checkbox' : 'square-outline'} size={20} color={colors.primary} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.toggleRow, { borderColor: colors.border, backgroundColor: colors.inputBackground }]}
                onPress={() => setSettingsDraft(prev => ({ ...prev, suggestToDepartment: !prev.suggestToDepartment }))}>
                <Text style={[styles.toggleText, { color: colors.text }]}>{t('lectures.suggestToDepartment')}</Text>
                <Ionicons name={settingsDraft.suggestToDepartment ? 'checkbox' : 'square-outline'} size={20} color={colors.primary} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.toggleRow, { borderColor: colors.border, backgroundColor: colors.inputBackground }]}
                onPress={() => setSettingsDraft(prev => ({ ...prev, suggestToStage: !prev.suggestToStage }))}>
                <Text style={[styles.toggleText, { color: colors.text }]}>{t('lectures.suggestToStage')}</Text>
                <Ionicons name={settingsDraft.suggestToStage ? 'checkbox' : 'square-outline'} size={20} color={colors.primary} />
              </TouchableOpacity>

              {settingsDraft.suggestToStage && (
                <TextInput
                  value={settingsDraft.suggestedStage}
                  onChangeText={(value) => setSettingsDraft(prev => ({ ...prev, suggestedStage: value }))}
                  placeholder={t('lectures.suggestedStagePlaceholder')}
                  placeholderTextColor={colors.textSecondary}
                  style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBackground }]}
                />
              )}

              <Text style={[styles.modalSectionTitle, { color: colors.text }]}>{t('lectures.linkedGroup')}</Text>
              {connectedGroup ? (
                <View style={[styles.optionCard, { borderColor: colors.primary, backgroundColor: colors.inputBackground }]}> 
                  <View style={styles.optionMeta}>
                    <Text style={[styles.optionText, { color: colors.text }]} numberOfLines={1}>{connectedGroup.name}</Text>
                    <Text style={[styles.optionSubText, { color: colors.textSecondary }]} numberOfLines={1}>
                      {connectedGroup.type === CHAT_TYPES.STAGE_GROUP ? t('lectures.stageGroup') : t('lectures.customGroup')}
                    </Text>
                  </View>
                  <TouchableOpacity style={[styles.unlinkBtn, { borderColor: colors.border }]} onPress={() => setLinkedChatId('')}>
                    <Text style={[styles.unlinkBtnText, { color: colors.text }]}>{t('lectures.disconnectGroup')}</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <Text style={[styles.infoText, { color: colors.textSecondary }]}>{t('lectures.noConnectedGroups')}</Text>
              )}

              <TouchableOpacity
                style={[styles.smallBtn, { borderColor: colors.border, alignSelf: 'flex-start', marginTop: spacing.xs }]}
                onPress={() => setShowGroupPicker(prev => !prev)}>
                <Text style={[styles.smallBtnText, { color: colors.text }]}>{t('lectures.addGroup')}</Text>
              </TouchableOpacity>

              {showGroupPicker && linkableGroups.map(group => (
                <TouchableOpacity
                  key={group.$id}
                  style={[styles.optionCard, { borderColor: colors.border, backgroundColor: colors.inputBackground }]}
                  onPress={() => {
                    setLinkedChatId(group.$id);
                    setShowGroupPicker(false);
                  }}>
                  <View style={styles.optionMeta}>
                    <Text style={[styles.optionText, { color: colors.text }]} numberOfLines={1}>{group.name}</Text>
                    <Text style={[styles.optionSubText, { color: colors.textSecondary }]} numberOfLines={1}>
                      {group.type === CHAT_TYPES.STAGE_GROUP ? t('lectures.stageGroup') : t('lectures.customGroup')}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}

              {showGroupPicker && !linkableGroups.length && (
                <Text style={[styles.infoText, { color: colors.textSecondary }]}>{t('lectures.noEligibleGroups')}</Text>
              )}

              <Text style={[styles.modalSectionTitle, { color: colors.text }]}>{t('lectures.managers')}</Text>
              <TextInput
                value={managerUserId}
                onChangeText={setManagerUserId}
                placeholder={t('lectures.managerLookupPlaceholder')}
                placeholderTextColor={colors.textSecondary}
                style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBackground }]}
              />
              <TouchableOpacity
                style={[styles.smallBtn, { borderColor: colors.border, alignSelf: 'flex-start', opacity: addingManager ? 0.7 : 1 }]}
                onPress={handleAddManager}
                disabled={addingManager}>
                <Text style={[styles.smallBtnText, { color: colors.text }]}>
                  {addingManager ? t('lectures.addingManager') : t('lectures.addManager')}
                </Text>
              </TouchableOpacity>
              {!!managerError && <Text style={[styles.managerErrorText, { color: colors.danger }]}>{managerError}</Text>}
              {!!managerStatus && <Text style={[styles.managerStatusText, { color: colors.success }]}>{managerStatus}</Text>}

              <View style={styles.nameListWrap}>
                {managers.map((managerId) => (
                  <Text key={managerId} style={[styles.nameListText, { color: colors.textSecondary }]}>
                    • {resolveName(managerId)}
                  </Text>
                ))}
              </View>

              <Text style={[styles.modalSectionTitle, { color: colors.text }]}>{t('lectures.joinRequests')}</Text>
              {joinRequests.length > 0 ? joinRequests.map((request) => (
                <View key={request.$id} style={[styles.requestRow, { borderBottomColor: colors.border }]}> 
                  <Text style={[styles.requestUser, { color: colors.text }]} numberOfLines={1}>{resolveName(request.userId)}</Text>
                  <View style={styles.requestBtns}>
                    <TouchableOpacity style={[styles.acceptBtn, { backgroundColor: colors.success }]} onPress={() => handleApproveRequest(request.$id, 'approved')}>
                      <Text style={styles.requestBtnText}>{t('lectures.accept')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.rejectBtn, { backgroundColor: colors.danger }]} onPress={() => handleApproveRequest(request.$id, 'rejected')}>
                      <Text style={styles.requestBtnText}>{t('lectures.reject')}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )) : (
                <Text style={[styles.infoText, { color: colors.textSecondary }]}>{t('lectures.noPendingRequests')}</Text>
              )}

              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: colors.primary, opacity: savingSettings ? 0.7 : 1 }]}
                onPress={handleSaveSettings}
                disabled={savingSettings}>
                <Text style={styles.saveBtnText}>{savingSettings ? t('lectures.savingSettings') : t('lectures.saveSettings')}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={!!youtubeModalVideoId} animationType="slide" onRequestClose={() => setYoutubeModalVideoId('')}>
        <View style={[styles.youtubeModalWrap, { backgroundColor: colors.background }]}> 
          <TouchableOpacity style={styles.closeYoutubeBtn} onPress={() => setYoutubeModalVideoId('')}>
            <Ionicons name="close" size={28} color={colors.text} />
          </TouchableOpacity>
          {!!youtubeModalVideoId && (
            <YoutubePlayer
              height={300}
              play
              videoId={youtubeModalVideoId}
              onError={(error) => {
                logLectureChannel('youtubePlayer:error', {
                  channelId,
                  videoId: youtubeModalVideoId,
                  error,
                });
              }}
              onReady={() => {
                logLectureChannel('youtubePlayer:ready', {
                  channelId,
                  videoId: youtubeModalVideoId,
                });
              }}
              webViewStyle={styles.youtubeWebview}
            />
          )}
        </View>
      </Modal>

      <Modal visible={!!commentsModalAsset} animationType="slide" onRequestClose={closeComments}>
        <View style={[styles.commentsModalWrap, { backgroundColor: colors.background }]}> 
          <View style={[styles.commentsHeader, { borderBottomColor: colors.border }]}> 
            <Text style={[styles.commentsTitle, { color: colors.text }]} numberOfLines={1}>
              {commentsModalAsset?.title || t('lectures.discussion')}
            </Text>
            <TouchableOpacity onPress={closeComments}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <FlatList
            data={assetComments}
            keyExtractor={(item) => item.$id}
            contentContainerStyle={styles.commentsList}
            renderItem={({ item }) => (
              <View style={[styles.commentCard, { borderColor: colors.border, backgroundColor: colors.card }]}>
                <View style={styles.commentTopRow}>
                  <Text style={[styles.commentUser, { color: colors.text }]}>{resolveName(item.userId)}</Text>
                  {(isManager || item.userId === user?.$id) && (
                    <TouchableOpacity onPress={() => removeComment(item.$id)}>
                      <Ionicons name="trash-outline" size={16} color={colors.danger} />
                    </TouchableOpacity>
                  )}
                </View>
                <Text style={[styles.commentText, { color: colors.textSecondary }]}>{item.text}</Text>
              </View>
            )}
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{t('lectures.noComments')}</Text>
              </View>
            }
          />

          <View style={[styles.commentComposer, { borderTopColor: colors.border }]}> 
            <TextInput
              value={newComment}
              onChangeText={setNewComment}
              placeholder={t('lectures.commentPlaceholder')}
              placeholderTextColor={colors.textSecondary}
              style={[styles.commentInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBackground }]}
            />
            <TouchableOpacity style={[styles.sendCommentBtn, { backgroundColor: colors.primary }]} onPress={submitComment}>
              <Text style={styles.sendCommentText}>{postingComment ? t('lectures.posting') : t('lectures.post')}</Text>
            </TouchableOpacity>
          </View>
        </View>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  headerTitle: {
    fontSize: fontSize(20),
    fontWeight: '700',
    flex: 1,
  },
  headerMenuBtn: {
    width: moderateScale(34),
    height: moderateScale(34),
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: spacing.sm,
    paddingBottom: spacing.xxl,
  },
  sectionTitle: {
    fontSize: fontSize(14),
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  statCard: {
    width: '31.8%',
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    alignItems: 'center',
  },
  statValue: {
    fontSize: fontSize(15),
    fontWeight: '700',
  },
  statLabel: {
    marginTop: 2,
    fontSize: fontSize(10),
    textAlign: 'center',
  },
  joinBtn: {
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  joinBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: fontSize(13),
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.sm,
    flexWrap: 'wrap',
  },
  smallBtn: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  smallBtnText: {
    fontWeight: '600',
    fontSize: fontSize(12),
  },
  card: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  cardTitle: {
    fontSize: fontSize(14),
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  composeToggleBtn: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  input: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
    fontSize: fontSize(12),
  },
  multiline: {
    minHeight: moderateScale(82),
    textAlignVertical: 'top',
  },
  typeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  typeChip: {
    borderWidth: 1,
    borderRadius: borderRadius.round,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  typeChipText: {
    fontSize: fontSize(11),
    fontWeight: '700',
  },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  fileName: {
    flex: 1,
    fontSize: fontSize(11),
  },
  uploadBtn: {
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  uploadBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: fontSize(12),
  },
  uploadError: {
    marginTop: spacing.sm,
    fontSize: fontSize(11),
  },
  infoText: {
    fontSize: fontSize(12),
  },
  assetCard: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  assetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  assetTitle: {
    flex: 1,
    fontSize: fontSize(13),
    fontWeight: '700',
  },
  assetType: {
    fontSize: fontSize(10),
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  assetDescription: {
    fontSize: fontSize(12),
  },
  assetStatsWrap: {
    marginTop: spacing.sm,
  },
  assetStatsLabel: {
    fontSize: fontSize(10),
    marginBottom: 2,
  },
  assetStatsNames: {
    fontSize: fontSize(10),
    marginTop: 1,
  },
  assetActionsRow: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pinnedLabel: {
    fontSize: fontSize(11),
    fontWeight: '700',
  },
  pinBtn: {
    borderWidth: 1,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  pinBtnText: {
    fontSize: fontSize(11),
    fontWeight: '700',
  },
  emptyWrap: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: fontSize(12),
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: wp(5),
  },
  modalCard: {
    borderWidth: 1,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    maxHeight: '86%',
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  modalTitle: {
    fontSize: fontSize(16),
    fontWeight: '700',
  },
  modalSectionTitle: {
    fontSize: fontSize(13),
    fontWeight: '700',
    marginBottom: spacing.xs,
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
    flex: 1,
    marginRight: spacing.sm,
  },
  optionCard: {
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
  optionMeta: {
    flex: 1,
  },
  optionText: {
    fontSize: fontSize(12),
    fontWeight: '600',
  },
  optionSubText: {
    marginTop: 2,
    fontSize: fontSize(11),
  },
  unlinkBtn: {
    borderWidth: 1,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  unlinkBtnText: {
    fontSize: fontSize(11),
    fontWeight: '700',
  },
  managerErrorText: {
    marginTop: spacing.xs,
    fontSize: fontSize(11),
  },
  managerStatusText: {
    marginTop: spacing.xs,
    fontSize: fontSize(11),
  },
  nameListWrap: {
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  nameListText: {
    fontSize: fontSize(11),
    marginBottom: 2,
  },
  requestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    paddingVertical: spacing.xs,
  },
  requestUser: {
    flex: 1,
    marginRight: spacing.sm,
    fontSize: fontSize(12),
  },
  requestBtns: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  acceptBtn: {
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  rejectBtn: {
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  requestBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: fontSize(11),
  },
  saveBtn: {
    marginTop: spacing.md,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: fontSize(12),
    fontWeight: '700',
  },
  youtubeModalWrap: {
    flex: 1,
  },
  closeYoutubeBtn: {
    alignSelf: 'flex-end',
    padding: spacing.sm,
    marginTop: spacing.sm,
    marginRight: spacing.sm,
  },
  youtubeWebview: {
    flex: 1,
  },
  commentsModalWrap: {
    flex: 1,
  },
  commentsHeader: {
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginTop: spacing.sm,
  },
  commentsTitle: {
    flex: 1,
    fontSize: fontSize(15),
    fontWeight: '700',
    marginRight: spacing.sm,
  },
  commentsList: {
    padding: spacing.sm,
    paddingBottom: spacing.xl,
  },
  commentCard: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  commentTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  commentUser: {
    fontSize: fontSize(11),
    fontWeight: '700',
  },
  commentText: {
    fontSize: fontSize(12),
    lineHeight: fontSize(17),
  },
  commentComposer: {
    borderTopWidth: 1,
    padding: spacing.sm,
    gap: spacing.sm,
  },
  commentInput: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize(12),
  },
  sendCommentBtn: {
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  sendCommentText: {
    color: '#FFFFFF',
    fontSize: fontSize(12),
    fontWeight: '700',
  },
});

export default LectureChannel;
