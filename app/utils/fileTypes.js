const FILE_KIND = {
  PDF: 'pdf',
  WORD: 'word',
  POWERPOINT: 'powerpoint',
  EXCEL: 'excel',
  TEXT: 'text',
  ARCHIVE: 'archive',
  IMAGE: 'image',
  AUDIO: 'audio',
  VIDEO: 'video',
  FILE: 'file',
};

const EXTENSION_TO_KIND = {
  pdf: FILE_KIND.PDF,
  doc: FILE_KIND.WORD,
  docx: FILE_KIND.WORD,
  ppt: FILE_KIND.POWERPOINT,
  pptx: FILE_KIND.POWERPOINT,
  xls: FILE_KIND.EXCEL,
  xlsx: FILE_KIND.EXCEL,
  csv: FILE_KIND.EXCEL,
  txt: FILE_KIND.TEXT,
  md: FILE_KIND.TEXT,
  zip: FILE_KIND.ARCHIVE,
  rar: FILE_KIND.ARCHIVE,
  '7z': FILE_KIND.ARCHIVE,
};

const MIME_TO_KIND = {
  'application/pdf': FILE_KIND.PDF,
  'application/msword': FILE_KIND.WORD,
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': FILE_KIND.WORD,
  'application/vnd.ms-powerpoint': FILE_KIND.POWERPOINT,
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': FILE_KIND.POWERPOINT,
  'application/vnd.ms-excel': FILE_KIND.EXCEL,
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': FILE_KIND.EXCEL,
  'text/csv': FILE_KIND.EXCEL,
  'text/plain': FILE_KIND.TEXT,
  'application/zip': FILE_KIND.ARCHIVE,
  'application/x-zip-compressed': FILE_KIND.ARCHIVE,
  'application/x-rar-compressed': FILE_KIND.ARCHIVE,
  'application/x-7z-compressed': FILE_KIND.ARCHIVE,
};

const KIND_TO_ICON = {
  [FILE_KIND.PDF]: 'document-text',
  [FILE_KIND.WORD]: 'document',
  [FILE_KIND.POWERPOINT]: 'easel',
  [FILE_KIND.EXCEL]: 'grid',
  [FILE_KIND.TEXT]: 'document-text-outline',
  [FILE_KIND.ARCHIVE]: 'archive-outline',
  [FILE_KIND.IMAGE]: 'image-outline',
  [FILE_KIND.AUDIO]: 'musical-notes-outline',
  [FILE_KIND.VIDEO]: 'videocam-outline',
  [FILE_KIND.FILE]: 'document-outline',
};

export const getFileExtension = (fileName = '') => {
  const normalizedName = String(fileName || '').trim();
  const segments = normalizedName.split('.');
  if (segments.length < 2) {
    return '';
  }
  return segments.pop().toLowerCase();
};

export const getFileKind = ({ name = '', mimeType = '', type = '' } = {}) => {
  const extension = getFileExtension(name);
  const normalizedMimeType = String(mimeType || type || '').toLowerCase();

  if (EXTENSION_TO_KIND[extension]) {
    return EXTENSION_TO_KIND[extension];
  }

  if (MIME_TO_KIND[normalizedMimeType]) {
    return MIME_TO_KIND[normalizedMimeType];
  }

  if (normalizedMimeType.startsWith('image/')) {
    return FILE_KIND.IMAGE;
  }

  if (normalizedMimeType.startsWith('audio/')) {
    return FILE_KIND.AUDIO;
  }

  if (normalizedMimeType.startsWith('video/')) {
    return FILE_KIND.VIDEO;
  }

  return FILE_KIND.FILE;
};

export const getFileIconName = (kind = FILE_KIND.FILE) => {
  return KIND_TO_ICON[kind] || KIND_TO_ICON[FILE_KIND.FILE];
};

export const getFilePreviewDescriptor = (file = {}) => {
  const extension = getFileExtension(file.name || file.file_name || '');
  const kind = getFileKind(file);

  return {
    kind,
    extension,
    iconName: getFileIconName(kind),
    extensionLabel: extension ? extension.toUpperCase() : '',
  };
};

export const formatFileSize = (bytes = 0) => {
  const size = Number(bytes);
  if (!Number.isFinite(size) || size <= 0) {
    return '0 B';
  }

  const units = ['B', 'KB', 'MB', 'GB'];
  const unitIndex = Math.min(Math.floor(Math.log(size) / Math.log(1024)), units.length - 1);
  const value = size / Math.pow(1024, unitIndex);
  const rounded = value >= 10 || unitIndex === 0
    ? value.toFixed(0)
    : Number(value.toFixed(1)).toString();

  return `${rounded} ${units[unitIndex]}`;
};

export { FILE_KIND };
