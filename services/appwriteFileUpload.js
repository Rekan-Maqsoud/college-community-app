import { ID, Permission, Role } from 'appwrite';
import { account, storage, config } from '../database/config';
import { MAX_FILE_UPLOAD_BYTES, validateUploadFile } from '../app/utils/fileUploadUtils';

const createUploadFormData = ({ file, fileId, uploaderUserId, includePermissions = true }) => {
  const formData = new FormData();
  formData.append('fileId', fileId);

  if (includePermissions) {
    formData.append('permissions[]', Permission.read(Role.users()));
    formData.append('permissions[]', Permission.update(Role.user(uploaderUserId)));
    formData.append('permissions[]', Permission.delete(Role.user(uploaderUserId)));
    formData.append('read[]', Role.users());
    formData.append('write[]', Role.user(uploaderUserId));
  }

  formData.append('file', {
    uri: file.uri,
    name: file.name,
    type: file.type || file.mimeType || 'application/octet-stream',
  });
  return formData;
};

const normalizeUploadError = (responseData, status) => {
  const message = responseData?.message || `UPLOAD_FAILED_${status}`;
  const error = new Error(message);
  error.code = 'UPLOAD_FAILED';
  error.status = status;
  error.responseData = responseData;
  return error;
};

const shouldRetryWithoutPermissions = (responseData) => {
  const errorText = String(responseData?.message || '').toLowerCase();
  if (!errorText) {
    return false;
  }

  return (
    errorText.includes('permission') ||
    errorText.includes('permissions') ||
    errorText.includes('read') ||
    errorText.includes('write')
  );
};

const uploadWithFormData = async ({ uploadUrl, baseOptions, formData }) => {
  const options = {
    ...baseOptions,
    body: formData,
  };

  const response = await fetch(uploadUrl.toString(), options);

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

  console.log('[appwriteFileUpload] upload start', {
    bucketId,
    fileName: file.name,
    mimeType: file.type || file.mimeType || 'application/octet-stream',
    fileSize: file.size,
  });

  try {
    const responseData = await uploadWithFormData({
      uploadUrl,
      baseOptions: options,
      formData: createUploadFormData({
        file,
        fileId,
        uploaderUserId,
        includePermissions: true,
      }),
    });

    const uploadedFileId = responseData?.$id || fileId;

    try {
      await storage.updateFile({
        bucketId,
        fileId: uploadedFileId,
        permissions: [
          Permission.read(Role.users()),
          Permission.update(Role.user(uploaderUserId)),
          Permission.delete(Role.user(uploaderUserId)),
        ],
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
      size: Number(file.size || responseData?.sizeOriginal || 0),
      mimeType: file.type || file.mimeType || responseData?.mimeType || 'application/octet-stream',
      name: file.name,
    };
  } catch (error) {
    if (!shouldRetryWithoutPermissions(error?.responseData)) {
      console.error('[appwriteFileUpload] upload failed', {
        bucketId,
        fileName: file.name,
        code: error?.code,
        status: error?.status,
        message: error?.message,
      });
      throw error;
    }

    console.warn('[appwriteFileUpload] retrying upload without custom permissions', {
      bucketId,
      fileName: file.name,
      message: error?.message,
    });

    const fallbackResponseData = await uploadWithFormData({
      uploadUrl,
      baseOptions: options,
      formData: createUploadFormData({
        file,
        fileId,
        uploaderUserId,
        includePermissions: false,
      }),
    });

    const uploadedFileId = fallbackResponseData?.$id || fileId;
    console.log('[appwriteFileUpload] upload success (fallback)', {
      bucketId,
      fileId: uploadedFileId,
    });

    return {
      fileId: uploadedFileId,
      viewUrl: storage.getFileView(bucketId, uploadedFileId)?.toString() || '',
      size: Number(file.size || fallbackResponseData?.sizeOriginal || 0),
      mimeType: file.type || file.mimeType || fallbackResponseData?.mimeType || 'application/octet-stream',
      name: file.name,
    };
  }
};
