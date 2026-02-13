jest.mock('../app/utils/safeStorage', () => ({
  __esModule: true,
  default: {
    setItem: jest.fn(),
    getItem: jest.fn(),
    removeItem: jest.fn(),
    multiRemove: jest.fn(),
    getAllKeys: jest.fn(),
  },
}));

import safeStorage from '../app/utils/safeStorage';
import { cacheManager, postsCacheManager, messagesCacheManager } from '../app/utils/cacheManager';

describe('cacheManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('stores cache payload with prefix and metadata', async () => {
    await cacheManager.set('key1', { ok: true }, 1000);

    expect(safeStorage.setItem).toHaveBeenCalledWith(
      'cache_key1',
      expect.any(String)
    );
  });

  it('returns value when cache is fresh', async () => {
    const now = Date.now();
    safeStorage.getItem.mockResolvedValue(JSON.stringify({
      value: { a: 1 },
      timestamp: now,
      expiryTime: 1000,
    }));

    const value = await cacheManager.get('key2');
    expect(value).toEqual({ a: 1 });
  });

  it('invalidates expired cache and returns null', async () => {
    const old = Date.now() - 10_000;
    safeStorage.getItem.mockResolvedValue(JSON.stringify({
      value: { a: 1 },
      timestamp: old,
      expiryTime: 1000,
    }));

    const value = await cacheManager.get('key3');
    expect(value).toBeNull();
    expect(safeStorage.removeItem).toHaveBeenCalledWith('cache_key3');
  });

  it('builds stable posts cache key with filters', () => {
    const key = postsCacheManager.generateCacheKey(
      { department: 'ICTE', stage: 'stage_2', userId: 'u1', postType: 'question', answerStatus: 'unanswered' },
      20,
      40
    );

    expect(key).toContain('posts');
    expect(key).toContain('dept_ICTE');
    expect(key).toContain('stage_stage_2');
    expect(key).toContain('answer_unanswered');
    expect(key).toContain('l20_o40');
  });

  it('adds new message to existing messages cache without duplicates', async () => {
    safeStorage.getItem.mockResolvedValueOnce(JSON.stringify({
      value: [{ $id: 'm1', content: 'hello' }],
      timestamp: Date.now(),
      expiryTime: 10000,
    }));

    await messagesCacheManager.addMessageToCache('chat-1', { $id: 'm2', content: 'new' }, 100);

    expect(safeStorage.setItem).toHaveBeenCalled();
    const payload = JSON.parse(safeStorage.setItem.mock.calls[0][1]);
    expect(payload.value[0].$id).toBe('m2');
    expect(payload.value[1].$id).toBe('m1');
  });
});
