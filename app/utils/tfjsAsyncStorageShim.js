import safeStorage from './safeStorage';

// Compatibility shim for tfjs-react-native asyncStorageIO.
// Keeps the removed AsyncStorage package unresolved while using MMKV-backed storage.
const tfjsAsyncStorageShim = {
  async getItem(key) {
    return safeStorage.getItem(key);
  },
  async setItem(key, value) {
    await safeStorage.setItem(key, value);
  },
  async removeItem(key) {
    await safeStorage.removeItem(key);
  },
  async multiRemove(keys) {
    await safeStorage.multiRemove(keys);
  },
};

export default tfjsAsyncStorageShim;
