import { ID, Permission, Role } from 'appwrite';
import { account, storage, config } from '../database/config';
import { MAX_FILE_UPLOAD_BYTES, validateUploadFile } from '../app/utils/fileUploadUtils';

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
    await storage.updateFile(bucketId, fileId, permissions);
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
    return storage.createFile(bucketId, fileId, file);
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

  console.log('[appwriteFileUpload] upload start', {
    bucketId,
    fileName: file.name,
    mimeType: file.type || file.mimeType || 'application/octet-stream',
    fileSize: file.size,
  });

  try {
    let uploadResult = await uploadWithSdk({ bucketId, fileId, file });

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

    const uploadedFileId = uploadResult?.$id || fileId;
    console.log('[appwriteFileUpload] upload success', {
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
      console.warn('[appwriteFileUpload] permission update skipped', {
        bucketId,
        fileId: uploadedFileId,
        message: permissionUpdateError?.message,
      });
    }

    return {
      fileId: uploadedFileId,
      viewUrl: storage.getFileView(bucketId, uploadedFileId)?.toString() || '',
      size: Number(file.size || uploadResult?.sizeOriginal || 0),
      mimeType: file.type || file.mimeType || uploadResult?.mimeType || 'application/octet-stream',
      name: file.name,
    };
  } catch (error) {
    console.error('[appwriteFileUpload] upload failed', {
      bucketId,
      fileName: file.name,
      code: error?.code,
      status: error?.status,
      message: error?.message,
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
