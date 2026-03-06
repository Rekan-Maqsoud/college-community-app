import React, { useCallback, useMemo, useState } from 'react';
import { Linking, Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as IntentLauncher from 'expo-intent-launcher';
import * as Sharing from 'expo-sharing';
import safeStorage from '../../utils/safeStorage';
import { config } from '../../../database/config';
import { LECTURE_UPLOAD_TYPES, trackLectureAssetInteraction } from '../../../database/lectures';
import {
  buildYouTubeVideoId,
  getLectureDeviceChannelDownloadsUriKey,
  getUrlFileExtension,
  getYouTubeThumbnailUrl,
  getYouTubeWatchUrl,
  inferMimeType,
  LECTURE_DEVICE_APP_DOWNLOADS_URI_KEY,
  LECTURE_DEVICE_DOWNLOADS_URI_KEY,
  LECTURE_DOWNLOADS_DIR,
  LECTURE_DOWNLOADS_ROOT_FOLDER,
  sanitizeDownloadFileName,
  toProgressPercent,
} from './lectureChannelUtils';

export const useLectureChannelAssetOperations = ({
  assets,
  channel,
  channelId,
  loadData,
  logLectureChannel,
  logLectureChannelError,
  route,
  safeChannelFolderName,
  t,
  user,
}) => {
  const [activeYoutubeAssetId, setActiveYoutubeAssetId] = useState('');
  const [youtubePlaybackByAssetId, setYoutubePlaybackByAssetId] = useState({});
  const [downloadsModalOpen, setDownloadsModalOpen] = useState(false);
  const [downloadedFiles, setDownloadedFiles] = useState([]);
  const [activeDownloads, setActiveDownloads] = useState({});
  const [deviceDownloadsUri, setDeviceDownloadsUri] = useState('');
  const [deviceChannelDownloadsUri, setDeviceChannelDownloadsUri] = useState('');
  const [pendingOpenAssetId, setPendingOpenAssetId] = useState(route?.params?.assetId || '');

  const youtubePlaybackRef = React.useRef({});

  React.useEffect(() => {
    youtubePlaybackRef.current = youtubePlaybackByAssetId;
  }, [youtubePlaybackByAssetId]);

  const activeDownloadsList = useMemo(() => Object.values(activeDownloads || {}), [activeDownloads]);
  const deviceChannelDownloadsUriKey = useMemo(() => getLectureDeviceChannelDownloadsUriKey(channelId), [channelId]);

  const getAppDownloadsDirectory = useCallback(() => {
    const baseDirectory = FileSystem.documentDirectory || FileSystem.cacheDirectory;
    if (!baseDirectory) {
      return '';
    }

    return `${baseDirectory}${LECTURE_DOWNLOADS_DIR}/${LECTURE_DOWNLOADS_ROOT_FOLDER}/`;
  }, []);

  const getDownloadsDirectory = useCallback(() => {
    const appDownloadsDirectory = getAppDownloadsDirectory();
    if (!appDownloadsDirectory) {
      return '';
    }

    return `${appDownloadsDirectory}${safeChannelFolderName}/`;
  }, [getAppDownloadsDirectory, safeChannelFolderName]);

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

    const initialDownloadsUri = saf.getUriForDirectoryInRoot
      ? saf.getUriForDirectoryInRoot('Download')
      : undefined;

    const permissions = await saf.requestDirectoryPermissionsAsync(initialDownloadsUri);
    if (!permissions?.granted || !permissions?.directoryUri) {
      return '';
    }

    const nextUri = permissions.directoryUri;
    setDeviceDownloadsUri(nextUri);
    await safeStorage.setItem(LECTURE_DEVICE_DOWNLOADS_URI_KEY, nextUri);
    return nextUri;
  }, [deviceDownloadsUri]);

  const ensureDeviceChannelDownloadsUri = useCallback(async () => {
    if (Platform.OS !== 'android') {
      return '';
    }

    if (deviceChannelDownloadsUri) {
      return deviceChannelDownloadsUri;
    }

    const saf = FileSystem.StorageAccessFramework;
    if (!saf?.makeDirectoryAsync) {
      return '';
    }

    const rootDirectoryUri = await ensureDeviceDownloadsUri();
    if (!rootDirectoryUri) {
      return '';
    }

    let appDirectoryUri = '';
    try {
      appDirectoryUri = await saf.makeDirectoryAsync(rootDirectoryUri, LECTURE_DOWNLOADS_ROOT_FOLDER);
      await safeStorage.setItem(LECTURE_DEVICE_APP_DOWNLOADS_URI_KEY, appDirectoryUri);
    } catch (error) {
      const savedAppDirectoryUri = await safeStorage.getItem(LECTURE_DEVICE_APP_DOWNLOADS_URI_KEY);
      if (savedAppDirectoryUri) {
        appDirectoryUri = savedAppDirectoryUri;
      } else {
        throw error;
      }
    }

    let channelDirectoryUri = '';
    try {
      channelDirectoryUri = await saf.makeDirectoryAsync(appDirectoryUri, safeChannelFolderName);
      await safeStorage.setItem(deviceChannelDownloadsUriKey, channelDirectoryUri);
    } catch (error) {
      const savedChannelDirectoryUri = await safeStorage.getItem(deviceChannelDownloadsUriKey);
      if (savedChannelDirectoryUri) {
        channelDirectoryUri = savedChannelDirectoryUri;
      } else {
        throw error;
      }
    }

    setDeviceChannelDownloadsUri(channelDirectoryUri);
    return channelDirectoryUri;
  }, [deviceChannelDownloadsUri, deviceChannelDownloadsUriKey, ensureDeviceDownloadsUri, safeChannelFolderName]);

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
  }, [channelId, getDownloadsDirectory, logLectureChannelError]);

  React.useEffect(() => {
    const loadSavedDeviceUri = async () => {
      if (Platform.OS !== 'android') {
        return;
      }

      try {
        const [savedDownloadsRootUri, savedChannelUri] = await Promise.all([
          safeStorage.getItem(LECTURE_DEVICE_DOWNLOADS_URI_KEY),
          safeStorage.getItem(deviceChannelDownloadsUriKey),
        ]);

        if (savedDownloadsRootUri) {
          setDeviceDownloadsUri(savedDownloadsRootUri);
        }
        if (savedChannelUri) {
          setDeviceChannelDownloadsUri(savedChannelUri);
        }
      } catch {
      }
    };

    loadSavedDeviceUri();
  }, [deviceChannelDownloadsUriKey]);

  React.useEffect(() => {
    loadDownloadedFiles();
  }, [loadDownloadedFiles]);

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

    let directoryUri = await ensureDeviceChannelDownloadsUri();
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
      setDeviceChannelDownloadsUri('');
      await safeStorage.removeItem(LECTURE_DEVICE_DOWNLOADS_URI_KEY);
      await safeStorage.removeItem(LECTURE_DEVICE_APP_DOWNLOADS_URI_KEY);
      await safeStorage.removeItem(deviceChannelDownloadsUriKey);
      directoryUri = await ensureDeviceChannelDownloadsUri();
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
  }, [deviceChannelDownloadsUriKey, ensureDeviceChannelDownloadsUri]);

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

  const resolveYoutubePlayback = useCallback(async (asset) => {
    const assetId = String(asset?.$id || '').trim();
    const youtubeUrl = String(asset?.youtubeUrl || '').trim();

    if (!assetId || !youtubeUrl) {
      return {
        resolved: true,
        loading: false,
        embeddable: false,
        videoId: '',
        thumbnailUrl: '',
        watchUrl: youtubeUrl,
      };
    }

    const cached = youtubePlaybackRef.current[assetId];
    if (cached?.resolved || cached?.loading) {
      return cached;
    }

    const videoId = buildYouTubeVideoId(youtubeUrl);
    const fallbackWatchUrl = getYouTubeWatchUrl(videoId) || youtubeUrl;
    const fallbackThumbnailUrl = videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : '';

    if (!videoId) {
      const invalidState = {
        resolved: true,
        loading: false,
        embeddable: false,
        videoId: '',
        thumbnailUrl: '',
        watchUrl: fallbackWatchUrl,
      };

      setYoutubePlaybackByAssetId(prev => ({
        ...prev,
        [assetId]: invalidState,
      }));

      return invalidState;
    }

    setYoutubePlaybackByAssetId(prev => ({
      ...prev,
      [assetId]: {
        ...(prev[assetId] || {}),
        resolved: false,
        loading: true,
        embeddable: false,
        videoId,
        thumbnailUrl: fallbackThumbnailUrl,
        watchUrl: fallbackWatchUrl,
      },
    }));

    try {
      const apiKey = String(config.youtubeApiKey || process.env.EXPO_PUBLIC_YOUTUBE_API_KEY || '').trim();
      if (!apiKey) {
        const missingKeyState = {
          resolved: true,
          loading: false,
          embeddable: false,
          videoId,
          thumbnailUrl: fallbackThumbnailUrl,
          watchUrl: fallbackWatchUrl,
        };

        setYoutubePlaybackByAssetId(prev => ({
          ...prev,
          [assetId]: missingKeyState,
        }));

        return missingKeyState;
      }

      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=status,snippet&id=${encodeURIComponent(videoId)}&key=${encodeURIComponent(apiKey)}`
      );

      if (!response.ok) {
        throw new Error(`YOUTUBE_STATUS_HTTP_${response.status}`);
      }

      const payload = await response.json();
      const video = Array.isArray(payload?.items) ? payload.items[0] : null;
      const embeddable = !!video?.status?.embeddable;
      const thumbnailUrl = getYouTubeThumbnailUrl(video?.snippet, videoId);

      const resolvedState = {
        resolved: true,
        loading: false,
        embeddable,
        videoId,
        thumbnailUrl,
        watchUrl: fallbackWatchUrl,
      };

      setYoutubePlaybackByAssetId(prev => ({
        ...prev,
        [assetId]: resolvedState,
      }));

      return resolvedState;
    } catch {
      const fallbackState = {
        resolved: true,
        loading: false,
        embeddable: false,
        videoId,
        thumbnailUrl: fallbackThumbnailUrl,
        watchUrl: fallbackWatchUrl,
      };

      setYoutubePlaybackByAssetId(prev => ({
        ...prev,
        [assetId]: fallbackState,
      }));

      return fallbackState;
    }
  }, []);

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
      const playback = await resolveYoutubePlayback(asset);
      const videoId = playback?.videoId || '';
      if (videoId) {
        await markAssetInteraction(asset, 'view');
        await markAssetInteraction(asset, 'open');

        logLectureChannel('openAsset:youtube', {
          channelId,
          assetId: asset.$id,
          videoId,
          embeddable: !!playback?.embeddable,
        });

        if (!playback?.embeddable) {
          setActiveYoutubeAssetId('');
          return;
        }

        setActiveYoutubeAssetId(prev => (prev === asset.$id ? '' : asset.$id));
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
      logLectureChannelError('openAsset:error', error, {
        channelId,
        assetId: asset?.$id || '',
      });
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

  return {
    activeDownloadsList,
    activeYoutubeAssetId,
    deviceChannelDownloadsUri,
    downloadedFiles,
    downloadsModalOpen,
    handleDownloadAsset,
    loadDownloadedFiles,
    openAsset,
    openLocalFile,
    removeDownloadedFile,
    resolveYoutubePlayback,
    setActiveYoutubeAssetId,
    setDeviceChannelDownloadsUri,
    setDownloadsModalOpen,
    youtubePlaybackByAssetId,
  };
};
