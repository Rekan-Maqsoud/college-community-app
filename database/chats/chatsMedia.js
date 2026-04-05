import { account, config } from '../config';
import { uploadImage } from '../../services/imgbbService';
import { uploadFileToAppwrite } from '../../services/appwriteFileUpload';
import telemetry from '../../app/utils/telemetry';

export const CHAT_TYPES = {
  STAGE_GROUP: 'stage_group',
  DEPARTMENT_GROUP: 'department_group',
};

export const uploadChatImage = async (file) => {
  try {
    if (!file || !file.uri) {
      throw new Error('Invalid file object');
    }
    const result = await uploadImage(file.uri);

    if (!result?.success || !result.url) {
      throw new Error(result?.error || 'Upload failed');
    }

    return {
      fileId: null,
      viewUrl: result.url,
      deleteUrl: result.deleteUrl || null,
    };
  } catch (error) {
    throw error;
  }
};

export const uploadChatVoiceMessage = async (file) => {
  try {
    if (!file || !file.uri) {
      throw new Error('Invalid voice file');
    }

    if (!config.voiceMessagesStorageId) {
      throw new Error('Voice storage bucket is not configured');
    }

    const fileName = file.name || `voice_${Date.now()}.m4a`;
    const mimeType = file.type || 'audio/m4a';
    const currentUser = await account.get();
    const uploaderUserId = currentUser?.$id;

    if (!uploaderUserId) {
      throw new Error('Authentication required for voice upload');
    }

    const uploadResult = await uploadFileToAppwrite({
      file: {
        uri: file.uri,
        name: fileName,
        type: mimeType,
        size: file.size,
      },
      bucketId: config.voiceMessagesStorageId,
    });

    return {
      fileId: uploadResult?.fileId || null,
      viewUrl: uploadResult?.viewUrl || '',
      mimeType: uploadResult?.mimeType || mimeType,
      size: Number(uploadResult?.size || file.size || 0),
    };
  } catch (error) {
    throw error;
  }
};

export const uploadChatFile = async (file) => {
  try {
    if (!config.storageId) {
      throw new Error('File storage bucket is not configured');
    }

    const normalizedFile = {
      uri: file?.uri,
      name: file?.name || `file_${Date.now()}`,
      type: file?.type || file?.mimeType || 'application/octet-stream',
      size: file?.size,
    };

    return await uploadFileToAppwrite({
      file: normalizedFile,
      bucketId: config.storageId,
    });
  } catch (error) {
      telemetry.recordEvent('chats_upload_chat_file_failed', {
      bucketId: config.storageId,
      fileName: file?.name,
        code: error?.code || null,
        status: error?.status || null,
        message: error?.message || '',
    });
    throw error;
  }
};
