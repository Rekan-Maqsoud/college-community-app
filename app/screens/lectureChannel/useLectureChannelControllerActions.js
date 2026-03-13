import { useCallback } from 'react';
import { Alert } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import {
  addLectureManager,
  removeLectureManager,
  createLectureAsset,
  createLectureComment,
  deleteLectureComment,
  LECTURE_CHANNEL_TYPES,
  LECTURE_ACCESS_TYPES,
  LECTURE_UPLOAD_TYPES,
  requestJoinLectureChannel,
  setLectureMembershipNotification,
  updateLectureAssetPinStatus,
  updateLectureChannelSettings,
  updateLectureMembershipStatus,
} from '../../../database/lectures';
import { getUserById, searchUsers } from '../../../database/users';
import { validateFileUploadSize } from '../../utils/fileUploadUtils';
import { deleteLectureChannelWithCleanup } from '../../../database/lectureCleanup';

export const useLectureChannelControllerActions = ({
  addingManager,
  autoSaveTimerRef,
  canUpload,
  channel,
  channelId,
  commentsModalAsset,
  confirmAddManager,
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
  setShowUploadComposer,
  setUploadError,
  setUploading,
  setYoutubeUrl,
  t,
  user,
  youtubeUrl,
  externalUrl,
  newUploadDescription,
  logLectureChannel,
  logLectureChannelError,
}) => {
  const onRefresh = () => {
    logLectureChannel('refresh:triggered', {
      channelId,
      isManager,
      isOwner,
      canUpload,
      membershipJoinStatus: membership?.joinStatus || '',
      membershipRole: membership?.role || '',
    });
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
      logLectureChannel('toggleNotifications:blocked_no_membership', { channelId });
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
  }, [managerSearchTimerRef, searchManagerSuggestions, setManagerError, setManagerStatus, setManagerUserId]);

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
  }, [addingManager, channel?.ownerId, channelId, isManager, loadData, managers, resolveUserNames, setAddingManager, setManagerError, setManagerStatus, setManagerSuggestions, setManagerUserId, t, logLectureChannel, logLectureChannelError]);

  const confirmAddManagerAction = useCallback((profile) => {
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
  }, [channel?.ownerId, channelId, isOwner, loadData, resolveName, setManagerError, setManagerStatus, t]);

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
  }, [channelId, isOwner, navigation, setManagerError, setSavingSettings, t]);

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

      confirmAddManagerAction(profile);
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
      logLectureChannel('upload:blocked_permission', {
        channelId,
        isManager,
        isOwner,
        membershipJoinStatus: membership?.joinStatus || '',
        membershipRole: membership?.role || '',
        channelOwnerId: channel?.ownerId || '',
        managers,
      });
      return;
    }

    logLectureChannel('upload:attempt', {
      channelId,
      isManager,
      isOwner,
      membershipJoinStatus: membership?.joinStatus || '',
      membershipRole: membership?.role || '',
      newUploadType,
      hasTitle: !!newUploadTitle.trim(),
      hasFile: !!selectedFile,
      hasYoutubeUrl: !!youtubeUrl.trim(),
      hasExternalUrl: !!externalUrl.trim(),
    });

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
      setShowUploadComposer(false);
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
    const canComment = isManager || (membership && membership.joinStatus === 'approved');
    if (!commentsModalAsset?.$id || !newComment.trim() || !canComment) {
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

    const actorIdentityIds = [user?.accountId, user?.userId, user?.$id]
      .map(value => String(value || '').trim())
      .filter(Boolean);

    return isManager || actorIdentityIds.includes(String(asset.uploaderId || '').trim());
  }, [isManager, user?.$id, user?.accountId, user?.userId]);

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

    const didSave = await handleSaveSettings(overrides);
    if (didSave) {
      setOrganizerOpen(false);
    }
  };

  return {
    canViewAssetInfo,
    closeComments,
    confirmAddManager: confirmAddManagerAction,
    handleAddManager,
    handleApproveRequest,
    handleDeleteChannel,
    handleJoin,
    handleManagerInputChange,
    handleOrganizerSave,
    handleRemoveManager,
    handleToggleAccess,
    handleToggleNotifications,
    handleTogglePin,
    handleUpload,
    onRefresh,
    openAssetMenu,
    openComments,
    pickFile,
    removeComment,
    submitComment,
    setAssetMenuOpen,
    setShowGroupPicker,
    setShowSettingsStats,
    setShowUploadComposer,
    setYoutubeUrl,
    setExternalUrl,
  };
};
