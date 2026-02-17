jest.mock('../database/config', () => {
  const mockPrepareRequest = jest.fn(() => ({ options: { headers: { 'content-type': 'multipart/form-data' } } }));
  return {
    account: {
      get: jest.fn(async () => ({ $id: 'user_1' })),
    },
    storage: {
      client: {
        prepareRequest: mockPrepareRequest,
      },
      updateFile: jest.fn(async () => ({})),
      getFileView: jest.fn(() => ({ toString: () => 'https://example.com/file' })),
    },
    config: {
      endpoint: 'https://fra.cloud.appwrite.io/v1',
    },
  };
});

import { account, storage } from '../database/config';
import { uploadFileToAppwrite } from '../services/appwriteFileUpload';

describe('uploadFileToAppwrite', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  it('uploads successfully on first attempt', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: async () => ({ $id: 'file_1', sizeOriginal: 2048 }),
    });

    const result = await uploadFileToAppwrite({
      bucketId: 'bucket1',
      file: {
        uri: 'file://a.pdf',
        name: 'a.pdf',
        size: 2048,
        type: 'application/pdf',
      },
    });

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(storage.updateFile).toHaveBeenCalledTimes(1);
    expect(result.fileId).toBe('file_1');
    expect(result.viewUrl).toBe('https://example.com/file');
  });

  it('retries once without permissions when first upload fails with permission error', async () => {
    global.fetch
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ message: 'Invalid permissions payload' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({ $id: 'file_2', sizeOriginal: 999 }),
      });

    const result = await uploadFileToAppwrite({
      bucketId: 'bucket1',
      file: {
        uri: 'file://slides.pptx',
        name: 'slides.pptx',
        size: 999,
        type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      },
    });

    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(result.fileId).toBe('file_2');
  });

  it('throws when bucket id is missing', async () => {
    await expect(uploadFileToAppwrite({
      file: {
        uri: 'file://a.pdf',
        name: 'a.pdf',
        size: 2048,
        type: 'application/pdf',
      },
    })).rejects.toMatchObject({ code: 'UPLOAD_BUCKET_REQUIRED' });

    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('throws auth error when current user is missing', async () => {
    account.get.mockResolvedValueOnce(null);

    await expect(uploadFileToAppwrite({
      bucketId: 'bucket1',
      file: {
        uri: 'file://a.pdf',
        name: 'a.pdf',
        size: 2048,
        type: 'application/pdf',
      },
    })).rejects.toMatchObject({ code: 'UPLOAD_AUTH_REQUIRED' });

    expect(global.fetch).not.toHaveBeenCalled();
  });
});
