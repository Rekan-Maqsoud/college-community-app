import { MMKV } from 'react-native-mmkv';

const memoryStore = new Map();
let mmkvInstance = null;

const getMmkvStorage = () => {
  try {
    if (!mmkvInstance) {
      mmkvInstance = new MMKV({
        id: 'college-community-storage',
      });
    }

    if (
      mmkvInstance &&
      typeof mmkvInstance.getString === 'function' &&
      typeof mmkvInstance.set === 'function'
    ) {
      return mmkvInstance;
    }
  } catch (error) {
    return null;
  }

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
        storage.delete(key);
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
        keys.forEach((key) => storage.delete(key));
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
};

export default safeStorage;
