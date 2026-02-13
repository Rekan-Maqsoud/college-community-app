jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  multiRemove: jest.fn(),
  getAllKeys: jest.fn(),
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import safeStorage from '../app/utils/safeStorage';

describe('safeStorage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uses AsyncStorage when available', async () => {
    AsyncStorage.getItem.mockResolvedValue('value-1');
    const value = await safeStorage.getItem('k1');
    expect(value).toBe('value-1');
    expect(AsyncStorage.getItem).toHaveBeenCalledWith('k1');
  });

  it('falls back to memory store when setItem/getItem fail', async () => {
    AsyncStorage.setItem.mockRejectedValue(new Error('storage down'));
    AsyncStorage.getItem.mockRejectedValue(new Error('storage down'));

    await safeStorage.setItem('k2', 'value-2');
    const value = await safeStorage.getItem('k2');

    expect(value).toBe('value-2');
  });

  it('removes item from fallback memory on removeItem failure', async () => {
    AsyncStorage.setItem.mockRejectedValue(new Error('storage down'));
    AsyncStorage.getItem.mockRejectedValue(new Error('storage down'));
    AsyncStorage.removeItem.mockRejectedValue(new Error('storage down'));

    await safeStorage.setItem('k3', 'value-3');
    await safeStorage.removeItem('k3');
    const value = await safeStorage.getItem('k3');

    expect(value).toBeNull();
  });

  it('returns keys from fallback memory when getAllKeys fails', async () => {
    AsyncStorage.setItem.mockRejectedValue(new Error('storage down'));
    AsyncStorage.getAllKeys.mockRejectedValue(new Error('storage down'));

    await safeStorage.setItem('k4', 'value-4');
    await safeStorage.setItem('k5', 'value-5');
    const keys = await safeStorage.getAllKeys();

    expect(keys).toEqual(expect.arrayContaining(['k4', 'k5']));
  });
});
