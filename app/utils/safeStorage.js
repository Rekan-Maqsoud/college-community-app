import AsyncStorage from '@react-native-async-storage/async-storage';

const memoryStore = new Map();

const getAsyncStorage = () => {
  if (AsyncStorage && typeof AsyncStorage.getItem === 'function') {
    return AsyncStorage;
  }
  return null;
};

const safeStorage = {
  async getItem(key) {
    const storage = getAsyncStorage();
    if (storage) {
      try {
        return await storage.getItem(key);
      } catch (error) {
        return memoryStore.has(key) ? memoryStore.get(key) : null;
      }
    }
    return memoryStore.has(key) ? memoryStore.get(key) : null;
  },
  async setItem(key, value) {
    const storage = getAsyncStorage();
    if (storage) {
      try {
        return await storage.setItem(key, value);
      } catch (error) {
        memoryStore.set(key, value);
        return null;
      }
    }
    memoryStore.set(key, value);
    return null;
  },
  async removeItem(key) {
    const storage = getAsyncStorage();
    if (storage) {
      try {
        return await storage.removeItem(key);
      } catch (error) {
        memoryStore.delete(key);
        return null;
      }
    }
    memoryStore.delete(key);
    return null;
  },
  async multiRemove(keys) {
    const storage = getAsyncStorage();
    if (storage) {
      try {
        return await storage.multiRemove(keys);
      } catch (error) {
        keys.forEach((key) => memoryStore.delete(key));
        return null;
      }
    }
    keys.forEach((key) => memoryStore.delete(key));
    return null;
  },
  async getAllKeys() {
    const storage = getAsyncStorage();
    if (storage) {
      try {
        return await storage.getAllKeys();
      } catch (error) {
        return Array.from(memoryStore.keys());
      }
    }
    return Array.from(memoryStore.keys());
  },
};

export default safeStorage;
