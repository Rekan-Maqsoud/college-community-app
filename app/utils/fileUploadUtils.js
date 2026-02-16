export const MAX_FILE_UPLOAD_BYTES = 25 * 1024 * 1024;

export const validateFileUploadSize = (fileSize = 0, maxSizeBytes = MAX_FILE_UPLOAD_BYTES) => {
  const size = Number(fileSize || 0);
  const max = Number(maxSizeBytes || MAX_FILE_UPLOAD_BYTES);

  if (!Number.isFinite(max) || max <= 0) {
    return true;
  }

  if (!Number.isFinite(size) || size < 0) {
    const error = new Error('FILE_SIZE_INVALID');
    error.code = 'FILE_SIZE_INVALID';
    throw error;
  }

  if (size > max) {
    const error = new Error('FILE_TOO_LARGE');
    error.code = 'FILE_TOO_LARGE';
    error.maxSizeBytes = max;
    error.fileSize = size;
    throw error;
  }

  return true;
};

export const validateUploadFile = (file = {}, maxSizeBytes = MAX_FILE_UPLOAD_BYTES) => {
  if (!file || typeof file !== 'object') {
    const error = new Error('FILE_INVALID');
    error.code = 'FILE_INVALID';
    throw error;
  }

  if (!file.uri || typeof file.uri !== 'string') {
    const error = new Error('FILE_URI_REQUIRED');
    error.code = 'FILE_URI_REQUIRED';
    throw error;
  }

  const name = String(file.name || '').trim();
  if (!name) {
    const error = new Error('FILE_NAME_REQUIRED');
    error.code = 'FILE_NAME_REQUIRED';
    throw error;
  }

  if (file.size == null) {
    const error = new Error('FILE_SIZE_REQUIRED');
    error.code = 'FILE_SIZE_REQUIRED';
    throw error;
  }

  validateFileUploadSize(file.size, maxSizeBytes);

  return true;
};
