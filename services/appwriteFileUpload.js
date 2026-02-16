import { ID, Permission, Role } from 'appwrite';
import { account, storage, config } from '../database/config';
import { MAX_FILE_UPLOAD_BYTES, validateUploadFile } from '../app/utils/fileUploadUtils';

const createUploadFormData = ({ file, fileId, uploaderUserId }) => {
  const formData = new FormData();
  formData.append('fileId', fileId);
  formData.append('permissions[]', Permission.read(Role.users()));
  formData.append('permissions[]', Permission.update(Role.user(uploaderUserId)));
  formData.append('permissions[]', Permission.delete(Role.user(uploaderUserId)));
  formData.append('read[]', Role.users());
  formData.append('write[]', Role.user(uploaderUserId));
  formData.append('file', {
    uri: file.uri,
    name: file.name,
    type: file.type || file.mimeType || 'application/octet-stream',
  });
  return formData;
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

  options.body = createUploadFormData({ file, fileId, uploaderUserId });
  if (options?.headers) {
    delete options.headers['content-type'];
  }

  const response = await fetch(uploadUrl.toString(), options);

  let responseData = null;
  try {
    responseData = await response.json();
  } catch {
    responseData = null;
  }

  if (!response.ok) {
    const error = new Error(responseData?.message || `UPLOAD_FAILED_${response.status}`);
    error.code = 'UPLOAD_FAILED';
    throw error;
  }

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
  } catch {}

  return {
    fileId: uploadedFileId,
    viewUrl: storage.getFileView(bucketId, uploadedFileId)?.toString() || '',
    size: Number(file.size || responseData?.sizeOriginal || 0),
    mimeType: file.type || file.mimeType || responseData?.mimeType || 'application/octet-stream',
    name: file.name,
  };
};
