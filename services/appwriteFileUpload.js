import { ID, Permission, Role } from 'appwrite';
import { account, storage, config } from '../database/config';
import { MAX_FILE_UPLOAD_BYTES, validateUploadFile } from '../app/utils/fileUploadUtils';
import telemetry from '../app/utils/telemetry';

const normalizeUploadError = (responseData, status) => {
  const message = responseData?.message || `UPLOAD_FAILED_${status}`;
  const error = new Error(message);
  error.code = 'UPLOAD_FAILED';
  error.status = status;
  error.responseData = responseData;
  return error;
};

const createUploadFormData = ({ file, fileId, uploaderUserId, includePermissions = true }) => {
  const formData = new FormData();
  formData.append('fileId', fileId);

  if (includePermissions) {
    formData.append('permissions[]', Permission.read(Role.users()));
    formData.append('permissions[]', Permission.update(Role.user(uploaderUserId)));
    formData.append('permissions[]', Permission.delete(Role.user(uploaderUserId)));
  }

  formData.append('file', {
    uri: file.uri,
    name: file.name,
    type: file.type || file.mimeType || 'application/octet-stream',
  });

  return formData;
};

const shouldRetryWithoutPermissions = (error) => {
  const errorText = String(error?.message || error?.responseData?.message || '').toLowerCase();
  if (!errorText) {
    return false;
  }

  if (errorText.includes("no permissions provided for action 'create'")) {
    return false;
  }

  return (
    errorText.includes('invalid permissions payload') ||
    errorText.includes('permission') ||
    errorText.includes('permissions')
  );
};

const isCreatePermissionError = (error) => {
  const message = String(error?.message || error?.responseData?.message || '').toLowerCase();
  return (
    message.includes("no permissions provided for action 'create'") ||
    (message.includes('permission') && message.includes('create'))
  );
};

const updateFilePermissions = async ({ bucketId, fileId, uploaderUserId }) => {
  if (!storage?.updateFile || !fileId) {
    return;
  }

  const permissions = [
    Permission.read(Role.users()),
    Permission.update(Role.user(uploaderUserId)),
    Permission.delete(Role.user(uploaderUserId)),
  ];

  try {
    await storage.updateFile({
      bucketId,
      fileId,
      permissions,
    });
  } catch {
    throw new Error('APPWRITE_UPDATE_FILE_FAILED');
  }
};

const uploadWithSdk = async ({ bucketId, fileId, file }) => {
  if (typeof storage?.createFile !== 'function') {
    return null;
  }

  try {
    return await storage.createFile({
      bucketId,
      fileId,
      file,
    });
  } catch {
    throw new Error('APPWRITE_CREATE_FILE_FAILED');
  }
};

const uploadWithFetch = async ({ bucketId, fileId, file, uploaderUserId, includePermissions }) => {
  const uploadUrl = new URL(`${config.endpoint}/storage/buckets/${bucketId}/files`);
  const { options } = storage.client.prepareRequest(
    'post',
    uploadUrl,
    { 'content-type': 'multipart/form-data' },
    {}
  );

  if (options?.headers) {
    delete options.headers['content-type'];
  }

  const response = await fetch(uploadUrl.toString(), {
    ...options,
    body: createUploadFormData({
      file,
      fileId,
      uploaderUserId,
      includePermissions,
    }),
  });

  let responseData = null;
  try {
    responseData = await response.json();
  } catch {
    responseData = null;
  }

  if (!response.ok) {
    throw normalizeUploadError(responseData, response.status);
  }

  return responseData;
};

export const uploadFileToAppwrite = async ({
  file,
  bucketId,
  maxSizeBytes = MAX_FILE_UPLOAD_BYTES,
} = {}) => {
  if (!bucketId) {
    const error = new Error('UPLOAD_BUCKET_REQUIRED');
    error.code = 'UPLOAD_BUCKET_REQUIRED';
    throw error;
  }

  validateUploadFile(file, maxSizeBytes);

  const currentUser = await account.get();
  const uploaderUserId = currentUser?.$id;

  if (!uploaderUserId) {
    const error = new Error('UPLOAD_AUTH_REQUIRED');
    error.code = 'UPLOAD_AUTH_REQUIRED';
    throw error;
  }

  const fileId = ID.unique();

    telemetry.recordEvent('appwrite_file_upload_start', {
    bucketId,
    fileName: file.name,
    mimeType: file.type || file.mimeType || 'application/octet-stream',
    fileSize: file.size,
  });

  try {
    let uploadResult = null;
    let sdkUploadError = null;

    try {
      uploadResult = await uploadWithSdk({ bucketId, fileId, file });
    } catch (sdkError) {
      sdkUploadError = sdkError;
        telemetry.recordEvent('appwrite_file_upload_sdk_fallback', {
        bucketId,
        fileName: file.name,
          message: sdkError?.message || '',
      });
    }

    if (!uploadResult) {
      try {
        uploadResult = await uploadWithFetch({
          bucketId,
          fileId,
          file,
          uploaderUserId,
          includePermissions: true,
        });
      } catch (fetchError) {
        if (shouldRetryWithoutPermissions(fetchError)) {
          uploadResult = await uploadWithFetch({
            bucketId,
            fileId,
            file,
            uploaderUserId,
            includePermissions: false,
          });
        } else {
          throw fetchError;
        }
      }
    }

    if (!uploadResult && sdkUploadError) {
      throw sdkUploadError;
    }

    const uploadedFileId = uploadResult?.$id || fileId;
      telemetry.recordEvent('appwrite_file_upload_success', {
      bucketId,
      fileId: uploadedFileId,
    });

    try {
      await updateFilePermissions({
        bucketId,
        fileId: uploadedFileId,
        uploaderUserId,
      });
    } catch (permissionUpdateError) {
        telemetry.recordEvent('appwrite_file_upload_permission_update_skipped', {
        bucketId,
        fileId: uploadedFileId,
          message: permissionUpdateError?.message || '',
      });
    }

    return {
      fileId: uploadedFileId,
      viewUrl: storage.getFileView({ bucketId, fileId: uploadedFileId })?.toString() || '',
      size: Number(file.size || uploadResult?.sizeOriginal || 0),
      mimeType: file.type || file.mimeType || uploadResult?.mimeType || 'application/octet-stream',
      name: file.name,
    };
  } catch (error) {
      telemetry.recordEvent('appwrite_file_upload_failed', {
      bucketId,
      fileName: file.name,
        code: error?.code || null,
        status: error?.status || null,
        message: error?.message || '',
    });

    if (isCreatePermissionError(error)) {
      const enrichedError = new Error('LECTURE_BUCKET_CREATE_PERMISSION_MISSING');
      enrichedError.code = 'LECTURE_BUCKET_CREATE_PERMISSION_MISSING';
      enrichedError.originalMessage = error?.message;
      throw enrichedError;
    }

    throw error;
  }
};
