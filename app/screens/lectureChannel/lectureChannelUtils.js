import { CHAT_TYPES } from '../../../database/chats';
import { extractYouTubeVideoId } from '../../utils/lectureUtils';

export const buildYouTubeVideoId = (url = '') => extractYouTubeVideoId(url);
export const YOUTUBE_EMBED_ORIGIN = 'https://collegecommunity.app';
export const LECTURE_DOWNLOADS_DIR = 'lecture_downloads';
export const LECTURE_DOWNLOADS_ROOT_FOLDER = 'CollegeCommunity';
export const LECTURE_DEVICE_DOWNLOADS_URI_KEY = 'lecture_device_downloads_uri';
export const LECTURE_DEVICE_APP_DOWNLOADS_URI_KEY = 'lecture_device_app_downloads_uri';

export const getYouTubeWatchUrl = (videoId = '') => {
  const safeId = String(videoId || '').trim();
  if (!safeId) {
    return '';
  }

  return `https://www.youtube.com/watch?v=${safeId}`;
};

export const getYouTubeThumbnailUrl = (snippet = null, videoId = '') => {
  const thumbs = snippet?.thumbnails || {};

  return (
    thumbs.maxres?.url
    || thumbs.standard?.url
    || thumbs.high?.url
    || thumbs.medium?.url
    || thumbs.default?.url
    || (videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : '')
  );
};

export const getLectureDeviceChannelDownloadsUriKey = (channelId = '') => {
  const safeChannelId = String(channelId || '').trim() || 'default';
  return `lecture_device_channel_downloads_uri_${safeChannelId}`;
};

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

export const parseChannelSettings = (settingsJson) => {
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

export const canLinkGroupToChannel = (chat, userId) => {
  if (!chat?.$id || !userId) {
    return false;
  }

  if (chat.type === 'private') {
    return false;
  }

  if (chat.type === CHAT_TYPES.DEPARTMENT_GROUP) {
    return false;
  }

  const representatives = Array.isArray(chat.representatives) ? chat.representatives : [];
  const admins = Array.isArray(chat.admins) ? chat.admins : [];

  if (chat.type === CHAT_TYPES.STAGE_GROUP) {
    return representatives.includes(userId);
  }

  return admins.includes(userId) || representatives.includes(userId);
};

export const formatBytesAsMb = (bytes = 0) => {
  const value = Number(bytes || 0) / (1024 * 1024);
  return value.toFixed(value >= 10 ? 0 : 1);
};

export const sanitizeDownloadFileName = (value = '') => {
  const raw = String(value || '').trim();
  if (!raw) {
    return `lecture_asset_${Date.now()}`;
  }

  const cleaned = raw.replace(/[<>:"/\\|?*\x00-\x1F]/g, '_').replace(/\s+/g, ' ').trim();
  return cleaned || `lecture_asset_${Date.now()}`;
};

export const getUrlFileExtension = (url = '') => {
  const normalized = String(url || '').split('?')[0].split('#')[0];
  const segment = normalized.split('/').pop() || '';
  const parts = segment.split('.');
  if (parts.length < 2) {
    return '';
  }

  return String(parts[parts.length - 1] || '').toLowerCase().trim();
};

export const toProgressPercent = (written = 0, total = 0) => {
  if (!total || total <= 0) {
    return 0;
  }

  const value = (Number(written || 0) / Number(total || 0)) * 100;
  return Math.max(0, Math.min(100, Math.round(value)));
};

export const isNotFoundError = (error) => {
  const code = Number(error?.code || error?.status || 0);
  if (code === 404) {
    return true;
  }

  const message = String(error?.message || '').toLowerCase();
  return message.includes('could not be found') || message.includes('document not found');
};

export const inferMimeType = (fileName = '', fallback = '') => {
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

export const parseStatsUserIds = (value) => {
  if (Array.isArray(value)) {
    return [...new Set(value.filter(Boolean).map(item => String(item)))];
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
