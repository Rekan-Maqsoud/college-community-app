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
  Platform,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as IntentLauncher from 'expo-intent-launcher';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppSettings } from '../context/AppSettingsContext';
import { useUser } from '../context/UserContext';
import { useTranslation } from '../hooks/useTranslation';
import {
  useRealtimeSubscription,
  useLectureAssetsRealtime,
  useLectureChannelsRealtime,
  useLectureCommentsRealtime,
  useLectureMembershipsRealtime,
} from '../hooks/useRealtimeSubscription';
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
  trackLectureAssetInteraction,
} from '../../database/lectures';
import { CHAT_TYPES, getChats } from '../../database/chats';
import { config } from '../../database/config';
import { getUserById, searchUsers } from '../../database/users';
import { validateFileUploadSize } from '../utils/fileUploadUtils';
import { wp, spacing, fontSize, moderateScale } from '../utils/responsive';
import { borderRadius } from '../theme/designTokens';
import useLayout from '../hooks/useLayout';
import { extractYouTubeVideoId } from '../utils/lectureUtils';
import AnimatedBackground from '../components/AnimatedBackground';
import ProfilePicture from '../components/ProfilePicture';
import { userCacheManager } from '../utils/cacheManager';
import { LinearGradient } from 'expo-linear-gradient';
import DownloadManagerModal from './lectureChannel/DownloadManagerModal';
import AssetActionMenuModal from './lectureChannel/AssetActionMenuModal';
import AssetStatsModal from './lectureChannel/AssetStatsModal';
import AdminOrganizerModal from './lectureChannel/AdminOrganizerModal';
import { deleteLectureChannelWithCleanup } from '../../database/lectureCleanup';

const buildYouTubeVideoId = (url = '') => extractYouTubeVideoId(url);
const LECTURE_DOWNLOADS_DIR = 'lecture_downloads';
const LECTURE_DEVICE_DOWNLOADS_URI_KEY = 'lecture_device_downloads_uri';

const parseChannelSettings = (settingsJson) => {
  const normalizeFolders = (value) => {
    if (!Array.isArray(value)) {
      return [];
    }

    return value
      .map((item) => ({
        id: String(item?.id || '').trim(),
        name: String(item?.name || '').trim(),
      }))
      .filter(item => item.id && item.name);
  };

  const normalizeMap = (value) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return {};
    }

    return Object.fromEntries(
      Object.entries(value)
        .map(([assetId, folderId]) => [String(assetId || '').trim(), String(folderId || '').trim()])
        .filter(([assetId, folderId]) => assetId && folderId)
    );
  };

  const normalizeOrder = (value) => {
    if (!Array.isArray(value)) {
      return [];
    }

    return value.map(id => String(id || '').trim()).filter(Boolean);
  };

  try {
    const parsed = typeof settingsJson === 'string' ? JSON.parse(settingsJson || '{}') : (settingsJson || {});
    return {
      allowComments: parsed.allowComments !== false,
      allowUploadsFromMembers: !!parsed.allowUploadsFromMembers,
      suggestToDepartment: !!parsed.suggestToDepartment,
      suggestToStage: !!parsed.suggestToStage,
      suggestedStage: String(parsed.suggestedStage || '').trim(),
      suggestedDepartment: String(parsed.suggestedDepartment || '').trim(),
      assetFolders: normalizeFolders(parsed.assetFolders),
      assetFolderMap: normalizeMap(parsed.assetFolderMap),
      assetOrder: normalizeOrder(parsed.assetOrder),
    };
  } catch {
    return {
      allowComments: true,
      allowUploadsFromMembers: false,
      suggestToDepartment: false,
      suggestToStage: false,
      suggestedStage: '',
      suggestedDepartment: '',
      assetFolders: [],
      assetFolderMap: {},
      assetOrder: [],
    };
  }
};

const canLinkGroupToChannel = (chat, userId) => {
  if (!chat?.$id || !userId) {
    return false;
  }

  if (chat.type === 'private') {
    return false;
  }

  const participants = Array.isArray(chat.participants) ? chat.participants : [];
  return participants.includes(userId);
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

const toProgressPercent = (written = 0, total = 0) => {
  if (!total || total <= 0) {
    return 0;
  }

  const value = (Number(written || 0) / Number(total || 0)) * 100;
  return Math.max(0, Math.min(100, Math.round(value)));
};

const isNotFoundError = (error) => {
  const code = Number(error?.code || error?.status || 0);
  if (code === 404) {
    return true;
  }

  const message = String(error?.message || '').toLowerCase();
  return message.includes('could not be found') || message.includes('document not found');
};

const inferMimeType = (fileName = '', fallback = '') => {
  if (fallback) {
    return fallback;
  }

  const extension = String(fileName || '').toLowerCase().split('.').pop() || '';
  const map = {
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ppt: 'application/vnd.ms-powerpoint',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    txt: 'text/plain',
    csv: 'text/csv',
    zip: 'application/zip',
    rar: 'application/vnd.rar',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    mp4: 'video/mp4',
    mp3: 'audio/mpeg',
  };

  return map[extension] || 'application/octet-stream';
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

const logLectureChannel = () => {};
const logLectureChannelError = () => {};

const LectureChannel = ({ route, navigation }) => {
  const channelId = route?.params?.channelId || '';
  const initialAssetId = route?.params?.assetId || '';
  const insets = useSafeAreaInsets();
  const { colors, isDarkMode } = useAppSettings();
  const { user } = useUser();
  const { t } = useTranslation();
  const { contentStyle } = useLayout();

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

  const [activeYoutubeAssetId, setActiveYoutubeAssetId] = useState('');
  const [commentsModalAsset, setCommentsModalAsset] = useState(null);
  const [assetComments, setAssetComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [postingComment, setPostingComment] = useState(false);
  const [downloadsModalOpen, setDownloadsModalOpen] = useState(false);
  const [downloadedFiles, setDownloadedFiles] = useState([]);
  const [activeDownloads, setActiveDownloads] = useState({});
  const [deviceDownloadsUri, setDeviceDownloadsUri] = useState('');
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

  const activeDownloadsList = useMemo(() => Object.values(activeDownloads || {}), [activeDownloads]);

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

  const getDownloadsDirectory = useCallback(() => {
    const baseDirectory = FileSystem.documentDirectory || FileSystem.cacheDirectory;
    if (!baseDirectory) {
      return '';
    }

    return `${baseDirectory}${LECTURE_DOWNLOADS_DIR}/`;
  }, []);

  const ensureDeviceDownloadsUri = useCallback(async () => {
    if (Platform.OS !== 'android') {
      return '';
    }

    if (deviceDownloadsUri) {
      return deviceDownloadsUri;
    }

    const saf = FileSystem.StorageAccessFramework;
    if (!saf?.requestDirectoryPermissionsAsync) {
      return '';
    }

    const permissions = await saf.requestDirectoryPermissionsAsync();
    if (!permissions?.granted || !permissions?.directoryUri) {
      return '';
    }

    const nextUri = permissions.directoryUri;
    setDeviceDownloadsUri(nextUri);
    await AsyncStorage.setItem(LECTURE_DEVICE_DOWNLOADS_URI_KEY, nextUri);
    return nextUri;
  }, [deviceDownloadsUri]);

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
    const pool = [...(Array.isArray(allGroups) ? allGroups : []), ...(Array.isArray(availableGroups) ? availableGroups : [])];
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

  React.useEffect(() => {
    const loadSavedDeviceUri = async () => {
      if (Platform.OS !== 'android') {
        return;
      }

      try {
        const saved = await AsyncStorage.getItem(LECTURE_DEVICE_DOWNLOADS_URI_KEY);
        if (saved) {
          setDeviceDownloadsUri(saved);
        }
      } catch {
      }
    };

    loadSavedDeviceUri();
  }, []);

  const loadDownloadedFiles = useCallback(async () => {
    const downloadsDir = getDownloadsDirectory();
    if (!downloadsDir) {
      setDownloadedFiles([]);
      return;
    }

    try {
      await FileSystem.makeDirectoryAsync(downloadsDir, { intermediates: true });
      const names = await FileSystem.readDirectoryAsync(downloadsDir);
      const files = await Promise.all(
        (Array.isArray(names) ? names : []).map(async (name) => {
          const path = `${downloadsDir}${name}`;
          const info = await FileSystem.getInfoAsync(path, { size: true });
          return {
            id: path,
            name,
            path,
            size: Number(info?.size || 0),
            modifiedAt: Number(info?.modificationTime || 0),
            mimeType: inferMimeType(name),
          };
        })
      );

      const sorted = files
        .filter(item => !!item?.path)
        .sort((first, second) => second.modifiedAt - first.modifiedAt);
      setDownloadedFiles(sorted);
    } catch (error) {
      logLectureChannelError('downloads:list:error', error, { channelId });
      setDownloadedFiles([]);
    }
  }, [channelId, getDownloadsDirectory]);

  React.useEffect(() => {
    loadDownloadedFiles();
  }, [loadDownloadedFiles]);

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
      return;
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
    } catch (error) {
      logLectureChannelError('saveSettings:error', error, { channelId });
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

  const openLocalFile = useCallback(async (fileUri, mimeType = 'application/octet-stream') => {
    if (!fileUri) {
      return;
    }

    try {
      if (Platform.OS === 'android') {
        const openUri = fileUri.startsWith('content://')
          ? fileUri
          : await FileSystem.getContentUriAsync(fileUri);

        await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
          data: openUri,
          flags: 1 | 268435456,
          type: mimeType,
        });
        return;
      }

      await Linking.openURL(fileUri);
    } catch (error) {
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(fileUri);
        return;
      }
      throw error;
    }
  }, []);

  const exportFileToDeviceStorage = useCallback(async ({ localUri, fileName, mimeType }) => {
    if (Platform.OS !== 'android' || !localUri) {
      return '';
    }

    const saf = FileSystem.StorageAccessFramework;
    if (!saf?.createFileAsync) {
      return '';
    }

    let directoryUri = await ensureDeviceDownloadsUri();
    if (!directoryUri) {
      return '';
    }

    const targetName = `${Date.now()}_${sanitizeDownloadFileName(fileName)}`;
    const targetMimeType = inferMimeType(targetName, mimeType);

    let targetUri = '';
    try {
      targetUri = await saf.createFileAsync(directoryUri, targetName, targetMimeType);
    } catch {
      setDeviceDownloadsUri('');
      await AsyncStorage.removeItem(LECTURE_DEVICE_DOWNLOADS_URI_KEY);
      directoryUri = await ensureDeviceDownloadsUri();
      if (!directoryUri) {
        return '';
      }
      targetUri = await saf.createFileAsync(directoryUri, targetName, targetMimeType);
    }

    const base64 = await FileSystem.readAsStringAsync(localUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    await FileSystem.writeAsStringAsync(targetUri, base64, {
      encoding: FileSystem.EncodingType.Base64,
    });

    return targetUri;
  }, [ensureDeviceDownloadsUri]);

  const downloadLectureAssetFile = async (asset, { trackOpen = false } = {}) => {
    if (!asset || asset.uploadType !== LECTURE_UPLOAD_TYPES.FILE || !asset.fileUrl) {
      return;
    }

    try {
      await markAssetInteraction(asset, 'view');
      if (trackOpen) {
        await markAssetInteraction(asset, 'open');
      }

      const downloadsDir = getDownloadsDirectory();
      if (!downloadsDir) {
        throw new Error('Download directory unavailable');
      }
      await FileSystem.makeDirectoryAsync(downloadsDir, { intermediates: true });

      const sourceName = asset.fileName || asset.title || '';
      const safeName = sanitizeDownloadFileName(sourceName);
      const nameParts = safeName.split('.');
      const hasExtension = nameParts.length > 1 && !!nameParts[nameParts.length - 1];
      const fallbackExtension = getUrlFileExtension(asset.fileUrl);
      const finalName = hasExtension || !fallbackExtension
        ? safeName
        : `${safeName}.${fallbackExtension}`;
      const resolvedMimeType = inferMimeType(finalName, asset.mimeType || '');
      const localUri = `${downloadsDir}${Date.now()}_${finalName}`;

      setActiveDownloads(prev => ({
        ...prev,
        [asset.$id]: {
          assetId: asset.$id,
          fileName: finalName,
          progress: 0,
          written: 0,
          total: 0,
        },
      }));

      const downloadResumable = FileSystem.createDownloadResumable(
        asset.fileUrl,
        localUri,
        {
          headers: {
            Accept: '*/*',
          },
        },
        (progressEvent) => {
          const written = Number(progressEvent?.totalBytesWritten || 0);
          const total = Number(progressEvent?.totalBytesExpectedToWrite || 0);
          const progress = toProgressPercent(written, total);
          setActiveDownloads(prev => ({
            ...prev,
            [asset.$id]: {
              assetId: asset.$id,
              fileName: finalName,
              progress,
              written,
              total,
            },
          }));
        }
      );

      const result = await downloadResumable.downloadAsync();

      if (!result?.uri || result.status !== 200) {
        throw new Error('Download failed');
      }

      setActiveDownloads(prev => {
        const next = { ...prev };
        delete next[asset.$id];
        return next;
      });

      await markAssetInteraction(asset, 'download');

      let deviceUri = '';
      try {
        deviceUri = await exportFileToDeviceStorage({
          localUri: result.uri,
          fileName: finalName,
          mimeType: resolvedMimeType,
        });
      } catch (exportError) {
        logLectureChannelError('downloadAsset:export:error', exportError, {
          channelId,
          assetId: asset?.$id || '',
        });
      }

      await openLocalFile(deviceUri || result.uri, resolvedMimeType);
      await Promise.all([
        loadDownloadedFiles(),
        loadData({ showLoading: false }),
      ]);
    } catch (error) {
      setActiveDownloads(prev => {
        const next = { ...prev };
        delete next[asset?.$id || ''];
        return next;
      });
      logLectureChannelError('downloadAsset:error', error, {
        channelId,
        assetId: asset?.$id || '',
      });
    }
  };

  const removeDownloadedFile = async (filePath) => {
    if (!filePath) {
      return;
    }

    try {
      await FileSystem.deleteAsync(filePath, { idempotent: true });
      await loadDownloadedFiles();
    } catch (error) {
      logLectureChannelError('downloads:remove:error', error, { channelId, filePath });
    }
  };

  const openAsset = async (asset) => {
    if (!asset) {
      return;
    }

    if (asset.uploadType === LECTURE_UPLOAD_TYPES.FILE && asset.fileUrl) {
      logLectureChannel('openAsset:fileOpenRemote', {
        channelId,
        assetId: asset.$id,
      });

      try {
        await markAssetInteraction(asset, 'view');
        await markAssetInteraction(asset, 'open');
        await Linking.openURL(asset.fileUrl);
      } catch (error) {
        logLectureChannelError('openAsset:fileOpenRemote:error', error, {
          channelId,
          assetId: asset.$id,
        });
      }

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
        setActiveYoutubeAssetId((prev) => (prev === asset.$id ? '' : asset.$id));
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

  const resolveName = (userId) => userProfiles[userId]?.name || t('lectures.unknownUser');

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
    const overrides = {
      assetFolders: Array.isArray(folders) ? folders : [],
      assetFolderMap: assetFolderMap || {},
      assetOrder: Array.isArray(assetOrder) ? assetOrder : [],
    };
    setSettingsDraft(prev => ({
      ...prev,
      ...overrides,
    }));

    await handleSaveSettings(overrides);
    setOrganizerOpen(false);
  };

  const renderStatCard = (label, value) => (
    <View style={[styles.statCard, { borderColor: colors.border, backgroundColor: colors.card }]}>
      <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );

  const renderAsset = ({ item }) => {
    if (item?.type === 'folder') {
      return (
        <View style={[styles.folderHeaderRow, { borderColor: colors.border, backgroundColor: colors.inputBackground }]}> 
          <Ionicons name="folder-open-outline" size={16} color={colors.primary} />
          <Text style={[styles.folderHeaderText, { color: colors.text }]}>{item.name}</Text>
        </View>
      );
    }

    const asset = item?.asset;
    if (!asset) {
      return null;
    }

    const typeText = asset.uploadType === LECTURE_UPLOAD_TYPES.YOUTUBE
      ? t('lectures.youtube')
      : asset.uploadType === LECTURE_UPLOAD_TYPES.LINK
        ? t('lectures.link')
        : t('lectures.file');

    const accentColor = asset.uploadType === LECTURE_UPLOAD_TYPES.YOUTUBE
      ? colors.danger
      : asset.uploadType === LECTURE_UPLOAD_TYPES.LINK
        ? colors.warning
        : colors.primary;
    const previewBg = `${accentColor}1A`;
    const youtubeVideoId = asset.uploadType === LECTURE_UPLOAD_TYPES.YOUTUBE
      ? buildYouTubeVideoId(asset.youtubeUrl || '')
      : '';
    const isYoutubePlaying = activeYoutubeAssetId === asset.$id && !!youtubeVideoId;

    const fileExtension = String(asset?.fileName || asset?.title || '')
      .split('.')
      .pop()
      .toUpperCase();
    const compactExt = fileExtension && fileExtension.length <= 5 ? fileExtension : t('lectures.file');

    let previewContent = null;

    if (asset.uploadType === LECTURE_UPLOAD_TYPES.YOUTUBE) {
      previewContent = (
        <View style={[styles.previewContainer, styles.youtubePreviewContainer, { borderColor: accentColor, backgroundColor: previewBg }]}>
          {!!youtubeVideoId && (
            <Image
              source={{ uri: `https://img.youtube.com/vi/${youtubeVideoId}/hqdefault.jpg` }}
              style={styles.youtubeThumb}
              resizeMode="cover"
            />
          )}

          <View style={styles.previewOverlayRow}>
            <View style={[styles.previewBadge, { borderColor: accentColor, backgroundColor: colors.card }]}>
              <Ionicons name="logo-youtube" size={12} color={accentColor} />
              <Text style={[styles.previewBadgeText, { color: accentColor }]}>{t('lectures.previewVideo')}</Text>
            </View>

            <TouchableOpacity
              style={[styles.previewPlayButton, { borderColor: accentColor, backgroundColor: colors.card }]}
              onPress={() => openAsset(asset)}
            >
              <Ionicons
                name={isYoutubePlaying ? 'pause' : 'play'}
                size={14}
                color={accentColor}
              />
              <Text style={[styles.previewPlayText, { color: accentColor }]}>
                {isYoutubePlaying ? t('lectures.pauseVideo') : t('lectures.playVideo')}
              </Text>
            </TouchableOpacity>
          </View>

          {isYoutubePlaying && (
            <View style={[styles.youtubePlayerWrap, { borderColor: colors.border, backgroundColor: colors.background }]}>
              <TouchableOpacity
                style={[styles.youtubeExternalBtn, { borderColor: colors.border }]}
                onPress={() => {
                  const url = `https://www.youtube.com/watch?v=${youtubeVideoId}`;
                  Linking.openURL(url).catch(() => {});
                }}
              >
                <Ionicons name="open-outline" size={14} color={colors.primary} />
                <Text style={[styles.youtubeExternalText, { color: colors.primary }]}>{t('lectures.openInYoutube')}</Text>
              </TouchableOpacity>
              <Image
                source={{ uri: `https://img.youtube.com/vi/${youtubeVideoId}/hqdefault.jpg` }}
                style={styles.youtubeInlineThumb}
                resizeMode="cover"
              />
            </View>
          )}
        </View>
      );
    } else if (asset.uploadType === LECTURE_UPLOAD_TYPES.FILE) {
      previewContent = (
        <View style={[styles.previewContainer, styles.filePreviewContainer, { borderColor: accentColor, backgroundColor: previewBg }]}>
          <View style={[styles.fileExtBadge, { backgroundColor: accentColor }]}>
            <Text style={styles.fileExtText}>{compactExt}</Text>
          </View>
          <View style={styles.previewMetaColumn}>
            <Text style={[styles.previewMetaTitle, { color: colors.text }]} numberOfLines={1}>
              {asset?.fileName || asset?.title}
            </Text>
            <Text style={[styles.previewMetaSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
              {asset?.fileSize ? `${formatBytesAsMb(asset.fileSize)} MB` : t('lectures.file')}
            </Text>
          </View>
          <Ionicons name="document-text-outline" size={18} color={accentColor} />
        </View>
      );
    } else {
      let hostname = asset?.externalUrl || '';
      try {
        hostname = new URL(asset?.externalUrl || '').hostname || hostname;
      } catch {
      }

      previewContent = (
        <View style={[styles.previewContainer, styles.linkPreviewContainer, { borderColor: accentColor, backgroundColor: previewBg }]}>
          <View style={[styles.linkIconWrap, { borderColor: accentColor }]}>
            <Ionicons name="link-outline" size={16} color={accentColor} />
          </View>
          <View style={styles.previewMetaColumn}>
            <Text style={[styles.previewMetaTitle, { color: colors.text }]} numberOfLines={1}>
              {t('lectures.previewLink')}
            </Text>
            <Text style={[styles.previewMetaSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
              {hostname}
            </Text>
          </View>
          <Ionicons name="open-outline" size={16} color={accentColor} />
        </View>
      );
    }

    return (
      <TouchableOpacity
        onPress={() => openAsset(asset)}
        onLongPress={() => openAssetMenu(asset)}
        delayLongPress={260}
        style={[
          styles.assetCard,
          {
            borderColor: accentColor,
            backgroundColor: colors.card,
            minHeight: asset.uploadType === LECTURE_UPLOAD_TYPES.YOUTUBE
              ? moderateScale(210)
              : asset.uploadType === LECTURE_UPLOAD_TYPES.FILE
                ? moderateScale(134)
                : moderateScale(118),
          },
        ]}>
        <View style={styles.assetHeader}>
          <Text style={[styles.assetTitle, { color: colors.text }]} numberOfLines={2}>{asset.title}</Text>
          <Text style={[styles.assetType, { color: accentColor }]}>{typeText}</Text>
        </View>

        {previewContent}

        {!!asset.description && (
          <Text style={[styles.assetDescription, { color: colors.textSecondary }]} numberOfLines={2}>{asset.description}</Text>
        )}

        <View style={styles.assetStatsCompact}>
          <Text style={[styles.assetStatsLabel, { color: colors.textSecondary }]}>
            {t('lectures.longPressForActions')}
          </Text>
        </View>

        <View style={styles.assetActionsRow}>
          {!!asset.isPinned && <Text style={[styles.pinnedLabel, { color: colors.primary }]}>{t('lectures.pinned')}</Text>}
          <TouchableOpacity style={[styles.pinBtn, { borderColor: colors.border }]} onPress={() => openComments(asset)}>
            <Text style={[styles.pinBtnText, { color: colors.text }]}>{t('lectures.discussion')}</Text>
          </TouchableOpacity>
          {asset.uploadType === LECTURE_UPLOAD_TYPES.FILE && (
            <TouchableOpacity style={[styles.pinBtn, { borderColor: colors.border }]} onPress={() => handleDownloadAsset(asset)}>
              <Text style={[styles.pinBtnText, { color: colors.text }]}>{t('lectures.download')}</Text>
            </TouchableOpacity>
          )}
          {canViewAssetInfo(asset) && (
            <TouchableOpacity style={[styles.pinBtn, { borderColor: colors.border }]} onPress={() => {
              setAssetStatsTarget(asset);
              setAssetStatsOpen(true);
            }}>
              <Text style={[styles.pinBtnText, { color: colors.text }]}>
                {t('lectures.showStats')}
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
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={() => setDownloadsModalOpen(true)}
            style={[styles.headerMenuBtn, { borderColor: colors.border, backgroundColor: colors.card }]}
          >
            <Ionicons name="download-outline" size={20} color={colors.text} />
            {(downloadedFiles.length > 0 || activeDownloadsList.length > 0) && (
              <View style={[styles.downloadBadge, { backgroundColor: colors.primary }]}> 
                <Text style={styles.downloadBadgeText}>{String(downloadedFiles.length + activeDownloadsList.length)}</Text>
              </View>
            )}
          </TouchableOpacity>

          {isManager && (
            <TouchableOpacity
              onPress={() => setOrganizerOpen(true)}
              style={[styles.headerMenuBtn, { borderColor: colors.border, backgroundColor: colors.card }]}
            >
              <Ionicons name="folder-outline" size={20} color={colors.text} />
            </TouchableOpacity>
          )}

          {isManager && (
            <TouchableOpacity
              onPress={() => setSettingsOpen(true)}
              style={[styles.headerMenuBtn, { borderColor: colors.border, backgroundColor: colors.card }]}
            >
              <Ionicons name="ellipsis-horizontal" size={22} color={colors.text} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, contentStyle]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}>
        {!membership || membership.joinStatus !== 'approved' ? (
          <TouchableOpacity style={[styles.joinBtn, { backgroundColor: colors.primary }]} onPress={handleJoin}>
            <Text style={styles.joinBtnText}>{membership?.joinStatus === 'pending' ? t('lectures.joinPending') : t('lectures.join')}</Text>
          </TouchableOpacity>
        ) : null}

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
          data={assetListData}
          keyExtractor={(item) => item.id}
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
                onPress={() => {
                  const nextVal = !settingsDraft.allowUploadsFromMembers;
                  setSettingsDraft(prev => ({ ...prev, allowUploadsFromMembers: nextVal }));
                  clearTimeout(autoSaveTimerRef.current);
                  autoSaveTimerRef.current = setTimeout(() => handleSaveSettings({ allowUploadsFromMembers: nextVal }), 600);
                }}>
                <Text style={[styles.toggleText, { color: colors.text }]}>{t('lectures.allowMemberUploads')}</Text>
                <Ionicons name={settingsDraft.allowUploadsFromMembers ? 'checkbox' : 'square-outline'} size={20} color={colors.primary} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.toggleRow, { borderColor: colors.border, backgroundColor: colors.inputBackground }]}
                onPress={() => {
                  const nextVal = !settingsDraft.suggestToDepartment;
                  setSettingsDraft(prev => ({ ...prev, suggestToDepartment: nextVal }));
                  clearTimeout(autoSaveTimerRef.current);
                  autoSaveTimerRef.current = setTimeout(() => handleSaveSettings({ suggestToDepartment: nextVal }), 600);
                }}>
                <Text style={[styles.toggleText, { color: colors.text }]}>{t('lectures.suggestToDepartment')}</Text>
                <Ionicons name={settingsDraft.suggestToDepartment ? 'checkbox' : 'square-outline'} size={20} color={colors.primary} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.toggleRow, { borderColor: colors.border, backgroundColor: colors.inputBackground }]}
                onPress={() => {
                  const nextVal = !settingsDraft.suggestToStage;
                  setSettingsDraft(prev => ({ ...prev, suggestToStage: nextVal }));
                  clearTimeout(autoSaveTimerRef.current);
                  autoSaveTimerRef.current = setTimeout(() => handleSaveSettings({ suggestToStage: nextVal }), 600);
                }}>
                <Text style={[styles.toggleText, { color: colors.text }]}>{t('lectures.suggestToStage')}</Text>
                <Ionicons name={settingsDraft.suggestToStage ? 'checkbox' : 'square-outline'} size={20} color={colors.primary} />
              </TouchableOpacity>

              {settingsDraft.suggestToStage && (
                <>
                  <TextInput
                    value={settingsDraft.suggestedStage}
                    onChangeText={(value) => setSettingsDraft(prev => ({ ...prev, suggestedStage: value }))}
                    placeholder={t('lectures.suggestedStagePlaceholder')}
                    placeholderTextColor={colors.textSecondary}
                    style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBackground }]}
                  />

                  <View style={styles.stageSuggestionWrap}>
                    {stageSuggestions.map((stageValue) => {
                      const selected = String(settingsDraft.suggestedStage || '').trim().toLowerCase() === String(stageValue).toLowerCase();
                      return (
                        <TouchableOpacity
                          key={`stage_${stageValue}`}
                          style={[
                            styles.stageSuggestionChip,
                            {
                              borderColor: selected ? colors.primary : colors.border,
                              backgroundColor: selected ? `${colors.primary}22` : colors.inputBackground,
                            },
                          ]}
                          onPress={() => {
                            const nextStage = String(stageValue);
                            setSettingsDraft(prev => ({ ...prev, suggestedStage: nextStage }));
                            clearTimeout(autoSaveTimerRef.current);
                            autoSaveTimerRef.current = setTimeout(() => handleSaveSettings({ suggestedStage: nextStage }), 600);
                          }}
                        >
                          <Text
                            style={[
                              styles.stageSuggestionChipText,
                              { color: selected ? colors.primary : colors.textSecondary },
                            ]}
                          >
                            {String(stageValue)}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </>
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
                  <TouchableOpacity style={[styles.unlinkBtn, { borderColor: colors.border }]} onPress={() => {
                    setLinkedChatId('');
                    clearTimeout(autoSaveTimerRef.current);
                    autoSaveTimerRef.current = setTimeout(() => handleSaveSettings({ linkedChatId: '' }), 400);
                  }}>
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
                    clearTimeout(autoSaveTimerRef.current);
                    autoSaveTimerRef.current = setTimeout(() => handleSaveSettings({ linkedChatId: group.$id }), 400);
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
              <View style={styles.managerInputRow}>
                <TextInput
                  value={managerUserId}
                  onChangeText={handleManagerInputChange}
                  placeholder={t('lectures.managerLookupPlaceholder')}
                  placeholderTextColor={colors.textSecondary}
                  style={[
                    styles.input,
                    styles.managerInput,
                    {
                      color: colors.text,
                      borderColor: colors.border,
                      backgroundColor: colors.inputBackground,
                    },
                  ]}
                />

                <TouchableOpacity
                  style={[
                    styles.managerAddButton,
                    {
                      borderColor: colors.border,
                      backgroundColor: colors.inputBackground,
                      opacity: addingManager ? 0.7 : 1,
                    },
                  ]}
                  onPress={handleAddManager}
                  disabled={addingManager}
                >
                  {addingManager ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <Ionicons name="add" size={20} color={colors.primary} />
                  )}
                </TouchableOpacity>
              </View>

              {!!managerSuggestions.length && (
                <View style={styles.managerSuggestionsWrap}>
                  {managerSuggestions.map((candidate) => (
                    <TouchableOpacity
                      key={candidate.$id}
                      style={[styles.optionCard, { borderColor: colors.border, backgroundColor: colors.inputBackground }]}
                      onPress={() => confirmAddManager(candidate)}
                    >
                      <View style={styles.managerSuggestionLeft}>
                        <ProfilePicture
                          uri={candidate?.profilePicture}
                          name={candidate?.name || candidate?.fullName}
                          size={moderateScale(28)}
                        />
                        <View style={styles.optionMeta}>
                          <Text style={[styles.optionText, { color: colors.text }]} numberOfLines={1}>
                            {candidate?.name || candidate?.fullName || t('lectures.unknownUser')}
                          </Text>
                        </View>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {searchingManagerSuggestions && (
                <Text style={[styles.infoText, { color: colors.textSecondary }]}>{t('lectures.searchingManagers')}</Text>
              )}

              {!!managerError && <Text style={[styles.managerErrorText, { color: colors.danger }]}>{managerError}</Text>}
              {!!managerStatus && <Text style={[styles.managerStatusText, { color: colors.success }]}>{managerStatus}</Text>}

              <View style={styles.nameListWrap}>
                {managers.map((managerId) => (
                  <View key={managerId} style={styles.managerIdentityRow}>
                    <ProfilePicture
                      uri={userProfiles[managerId]?.profilePicture}
                      name={resolveName(managerId)}
                      size={moderateScale(24)}
                    />
                    <Text style={[styles.nameListText, { color: colors.textSecondary }]}>
                      {resolveName(managerId)}
                    </Text>
                    {isOwner && String(managerId || '').trim() !== String(channel?.ownerId || '').trim() && (
                      <TouchableOpacity
                        style={[styles.managerRemoveButton, { borderColor: colors.border }]}
                        onPress={() => handleRemoveManager(managerId)}
                      >
                        <Ionicons name="trash-outline" size={13} color={colors.danger} />
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
              </View>

              {isManager && channel?.channelType !== LECTURE_CHANNEL_TYPES.OFFICIAL && (
                <TouchableOpacity
                  style={[styles.toggleRow, { borderColor: colors.border, backgroundColor: colors.inputBackground }]}
                  onPress={handleToggleAccess}>
                  <Text style={[styles.toggleText, { color: colors.text }]}>{t('lectures.approvalRequired')}</Text>
                  <Ionicons name={channel?.accessType === LECTURE_ACCESS_TYPES.APPROVAL_REQUIRED ? 'checkbox' : 'square-outline'} size={20} color={colors.primary} />
                </TouchableOpacity>
              )}

              {!!membership && (
                <TouchableOpacity
                  style={[styles.toggleRow, { borderColor: colors.border, backgroundColor: colors.inputBackground }]}
                  onPress={handleToggleNotifications}>
                  <Text style={[styles.toggleText, { color: colors.text }]}>{membership.notificationsEnabled ? t('lectures.notificationsOn') : t('lectures.notificationsOff')}</Text>
                  <Ionicons name={membership.notificationsEnabled ? 'notifications' : 'notifications-off-outline'} size={20} color={colors.primary} />
                </TouchableOpacity>
              )}

              <Text style={[styles.modalSectionTitle, { color: colors.text }]}>{t('lectures.joinRequests')}</Text>
              {joinRequests.length > 0 ? joinRequests.map((request) => (
                <View key={request.$id} style={[styles.requestRow, { borderBottomColor: colors.border }]}> 
                  <View style={styles.requestUserInfo}>
                    <ProfilePicture
                      uri={userProfiles[request.userId]?.profilePicture}
                      name={resolveName(request.userId)}
                      size={moderateScale(32)}
                    />
                    <Text style={[styles.requestUser, { color: colors.text }]} numberOfLines={1}>{resolveName(request.userId)}</Text>
                  </View>
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

              {savingSettings && (
                <View style={styles.savingIndicator}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={[styles.savingText, { color: colors.textSecondary }]}>{t('lectures.savingSettings')}</Text>
                </View>
              )}

              {isOwner && (
                <TouchableOpacity
                  style={[styles.deleteChannelButton, { borderColor: colors.danger, opacity: savingSettings ? 0.6 : 1 }]}
                  onPress={handleDeleteChannel}
                  disabled={savingSettings}
                >
                  <Ionicons name="trash-outline" size={16} color={colors.danger} />
                  <Text style={[styles.deleteChannelButtonText, { color: colors.danger }]}>{t('lectures.deleteChannelAction')}</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <DownloadManagerModal
        visible={downloadsModalOpen}
        onClose={() => setDownloadsModalOpen(false)}
        colors={colors}
        t={t}
        activeDownloads={activeDownloadsList}
        downloadedFiles={downloadedFiles}
        onOpenFile={openLocalFile}
        onDeleteFile={removeDownloadedFile}
      />

      <AssetActionMenuModal
        visible={assetMenuOpen}
        onClose={() => setAssetMenuOpen(false)}
        colors={colors}
        t={t}
        asset={assetMenuTarget}
        canViewInfo={canViewAssetInfo(assetMenuTarget)}
        canPin={!!isManager}
        onOpen={async () => {
          const target = assetMenuTarget;
          setAssetMenuOpen(false);
          if (target) {
            await openAsset(target);
          }
        }}
        onDownload={async () => {
          const target = assetMenuTarget;
          setAssetMenuOpen(false);
          if (target) {
            await handleDownloadAsset(target);
          }
        }}
        onDiscuss={async () => {
          const target = assetMenuTarget;
          setAssetMenuOpen(false);
          if (target) {
            await openComments(target);
          }
        }}
        onShowInfo={() => {
          const target = assetMenuTarget;
          setAssetMenuOpen(false);
          setAssetStatsTarget(target);
          setAssetStatsOpen(true);
        }}
        onTogglePin={async () => {
          const target = assetMenuTarget;
          setAssetMenuOpen(false);
          if (target && isManager) {
            await handleTogglePin(target);
          }
        }}
      />

      <AssetStatsModal
        visible={assetStatsOpen}
        onClose={() => setAssetStatsOpen(false)}
        colors={colors}
        t={t}
        asset={assetStatsTarget}
        userProfiles={userProfiles}
      />

      <AdminOrganizerModal
        visible={organizerOpen}
        onClose={() => setOrganizerOpen(false)}
        colors={colors}
        t={t}
        assets={assets}
        folders={settingsDraft.assetFolders}
        assetFolderMap={settingsDraft.assetFolderMap}
        assetOrder={settingsDraft.assetOrder}
        onSave={handleOrganizerSave}
      />

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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  headerMenuBtn: {
    width: moderateScale(34),
    height: moderateScale(34),
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: borderRadius.round,
    position: 'relative',
  },
  downloadBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: moderateScale(16),
    height: moderateScale(16),
    borderRadius: moderateScale(8),
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  downloadBadgeText: {
    color: '#FFFFFF',
    fontSize: fontSize(9),
    fontWeight: '700',
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
  stageSuggestionWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  stageSuggestionChip: {
    borderWidth: 1,
    borderRadius: borderRadius.round,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  stageSuggestionChipText: {
    fontSize: fontSize(10),
    fontWeight: '700',
  },
  managerInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  managerInput: {
    flex: 1,
    marginBottom: 0,
  },
  managerAddButton: {
    width: moderateScale(42),
    height: moderateScale(42),
    borderWidth: 1,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  managerSuggestionsWrap: {
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  managerSuggestionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
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
    marginTop: spacing.xs,
  },
  previewContainer: {
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  filePreviewContainer: {
    minHeight: moderateScale(68),
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  linkPreviewContainer: {
    minHeight: moderateScale(62),
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  youtubePreviewContainer: {
    minHeight: moderateScale(96),
  },
  youtubeThumb: {
    width: '100%',
    height: moderateScale(132),
  },
  previewOverlayRow: {
    position: 'absolute',
    top: spacing.xs,
    left: spacing.xs,
    right: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  previewBadge: {
    borderWidth: 1,
    borderRadius: borderRadius.round,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  previewBadgeText: {
    fontSize: fontSize(10),
    fontWeight: '700',
  },
  previewPlayButton: {
    borderWidth: 1,
    borderRadius: borderRadius.round,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  previewPlayText: {
    fontSize: fontSize(10),
    fontWeight: '700',
  },
  youtubePlayerWrap: {
    borderTopWidth: 1,
    paddingTop: spacing.xs,
  },
  youtubeExternalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    marginBottom: spacing.xs,
  },
  youtubeExternalText: {
    fontSize: fontSize(12),
    fontWeight: '700',
  },
  youtubeInlineThumb: {
    width: '100%',
    height: moderateScale(160),
    borderRadius: borderRadius.md,
  },
  fileExtBadge: {
    minWidth: moderateScale(48),
    height: moderateScale(34),
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  fileExtText: {
    color: '#FFFFFF',
    fontSize: fontSize(10),
    fontWeight: '800',
  },
  linkIconWrap: {
    width: moderateScale(34),
    height: moderateScale(34),
    borderRadius: borderRadius.round,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewMetaColumn: {
    flex: 1,
  },
  previewMetaTitle: {
    fontSize: fontSize(11),
    fontWeight: '700',
  },
  previewMetaSubtitle: {
    marginTop: 1,
    fontSize: fontSize(10),
  },
  folderHeaderRow: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    marginBottom: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  folderHeaderText: {
    fontSize: fontSize(12),
    fontWeight: '800',
  },
  assetStatsCompact: {
    marginTop: spacing.xs,
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
  downloadsSection: {
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  downloadRow: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    marginBottom: spacing.xs,
  },
  downloadRowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  downloadFileName: {
    flex: 1,
    fontSize: fontSize(12),
    fontWeight: '700',
  },
  downloadPercent: {
    fontSize: fontSize(11),
    fontWeight: '700',
  },
  downloadMeta: {
    fontSize: fontSize(10),
    fontWeight: '600',
  },
  downloadProgressTrack: {
    width: '100%',
    height: moderateScale(6),
    borderRadius: borderRadius.round,
    overflow: 'hidden',
  },
  downloadProgressFill: {
    height: '100%',
  },
  downloadActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing.xs,
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
  managerIdentityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  managerRemoveButton: {
    marginLeft: 'auto',
    borderWidth: 1,
    borderRadius: borderRadius.round,
    width: moderateScale(26),
    height: moderateScale(26),
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameListText: {
    fontSize: fontSize(11),
    marginBottom: 0,
    flexShrink: 1,
  },
  requestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    paddingVertical: spacing.sm,
  },
  requestUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
    marginRight: spacing.sm,
  },
  requestUser: {
    flex: 1,
    fontSize: fontSize(12),
    fontWeight: '600',
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
  savingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
  },
  savingText: {
    fontSize: fontSize(12),
    fontWeight: '600',
  },
  deleteChannelButton: {
    marginTop: spacing.sm,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  deleteChannelButtonText: {
    fontSize: fontSize(12),
    fontWeight: '700',
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
