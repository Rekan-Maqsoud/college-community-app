import * as MMKVPackage from 'react-native-mmkv';

const memoryStore = new Map();
let mmkvInstance = null;
let mmkvInitErrorMessage = null;
let didWarnVolatileFallback = false;

const createStorageInstance = () => {
  if (typeof MMKVPackage.createMMKV === 'function') {
    return MMKVPackage.createMMKV({
      id: 'college-community-storage',
    });
  }

  if (typeof MMKVPackage.MMKV === 'function') {
    return new MMKVPackage.MMKV({
      id: 'college-community-storage',
    });
  }

  throw new Error('react-native-mmkv export is unavailable');
};

const removeFromStorage = (storage, key) => {
  if (typeof storage.remove === 'function') {
    storage.remove(key);
    return;
  }

  if (typeof storage.delete === 'function') {
    storage.delete(key);
    return;
  }

  throw new Error('MMKV instance missing remove/delete method');
};

const warnVolatileFallbackOnce = () => {
  if (didWarnVolatileFallback) {
    return;
  }
  didWarnVolatileFallback = true;
};

const getMmkvStorage = () => {
  try {
    if (!mmkvInstance) {
      mmkvInstance = createStorageInstance();
      mmkvInitErrorMessage = null;
    }

    if (
      mmkvInstance &&
      typeof mmkvInstance.getString === 'function' &&
      typeof mmkvInstance.set === 'function' &&
      (typeof mmkvInstance.remove === 'function' || typeof mmkvInstance.delete === 'function')
    ) {
      return mmkvInstance;
    }

    mmkvInitErrorMessage = 'MMKV instance missing expected methods';
    warnVolatileFallbackOnce();
  } catch (error) {
    mmkvInitErrorMessage = error?.message || String(error || 'Unknown MMKV init error');
    warnVolatileFallbackOnce();
    return null;
  }

  warnVolatileFallbackOnce();
  return null;
};

const safeStorage = {
  getItemSync(key) {
    const storage = getMmkvStorage();
    if (storage) {
      try {
        const value = storage.getString(key);
        return value ?? (memoryStore.has(key) ? memoryStore.get(key) : null);
      } catch (error) {
        return memoryStore.has(key) ? memoryStore.get(key) : null;
      }
    }
    return memoryStore.has(key) ? memoryStore.get(key) : null;
  },
  async getItem(key) {
    const storage = getMmkvStorage();
    if (storage) {
      try {
        const value = storage.getString(key);
        return value ?? (memoryStore.has(key) ? memoryStore.get(key) : null);
      } catch (error) {
        return memoryStore.has(key) ? memoryStore.get(key) : null;
      }
    }
    return memoryStore.has(key) ? memoryStore.get(key) : null;
  },
  async setItem(key, value) {
    const normalizedValue = value == null ? '' : String(value);
    const storage = getMmkvStorage();
    if (storage) {
      try {
        storage.set(key, normalizedValue);
        return null;
      } catch (error) {
        memoryStore.set(key, normalizedValue);
        return null;
      }
    }
    memoryStore.set(key, normalizedValue);
    return null;
  },
  async removeItem(key) {
    const storage = getMmkvStorage();
    if (storage) {
      try {
        removeFromStorage(storage, key);
        return null;
      } catch (error) {
        memoryStore.delete(key);
        return null;
      }
    }
    memoryStore.delete(key);
    return null;
  },
  async multiRemove(keys) {
    const storage = getMmkvStorage();
    if (storage) {
      try {
        keys.forEach((key) => removeFromStorage(storage, key));
        return null;
      } catch (error) {
        keys.forEach((key) => memoryStore.delete(key));
        return null;
      }
    }
    keys.forEach((key) => memoryStore.delete(key));
    return null;
  },
  async getAllKeys() {
    const storage = getMmkvStorage();
    if (storage) {
      try {
        if (typeof storage.getAllKeys === 'function') {
          const mmkvKeys = storage.getAllKeys();
          return Array.from(new Set([...(Array.isArray(mmkvKeys) ? mmkvKeys : []), ...Array.from(memoryStore.keys())]));
        }
        return Array.from(memoryStore.keys());
      } catch (error) {
        return Array.from(memoryStore.keys());
      }
    }
    return Array.from(memoryStore.keys());
  },
  getBackendInfo() {
    const storage = getMmkvStorage();
    if (storage) {
      return {
        backend: 'mmkv',
        volatileFallback: false,
        reason: null,
      };
    }

    return {
      backend: 'memory',
      volatileFallback: true,
      reason: mmkvInitErrorMessage,
    };
  },
};

export default safeStorage;
