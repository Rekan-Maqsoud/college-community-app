import safeStorage from '../app/utils/safeStorage';

const mockStorage = {
  getString: jest.fn(),
  set: jest.fn(),
  delete: jest.fn(),
  getAllKeys: jest.fn(),
};

jest.mock('react-native-mmkv', () => ({
  MMKV: jest.fn(() => mockStorage),
}));

describe('safeStorage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStorage.getString.mockReturnValue(null);
    mockStorage.set.mockImplementation(() => {});
    mockStorage.delete.mockImplementation(() => {});
    mockStorage.getAllKeys.mockReturnValue([]);
  });

  it('uses MMKV when available', async () => {
    mockStorage.getString.mockReturnValue('value-1');
    const value = await safeStorage.getItem('k1');
    expect(value).toBe('value-1');
    expect(mockStorage.getString).toHaveBeenCalledWith('k1');
  });

  it('falls back to memory store when setItem/getItem fail', async () => {
    mockStorage.set.mockImplementation(() => {
      throw new Error('storage down');
    });
    mockStorage.getString.mockImplementation(() => {
      throw new Error('storage down');
    });

    await safeStorage.setItem('k2', 'value-2');
    const value = await safeStorage.getItem('k2');

    expect(value).toBe('value-2');
  });

  it('removes item from fallback memory on removeItem failure', async () => {
    mockStorage.set.mockImplementation(() => {
      throw new Error('storage down');
    });
    mockStorage.getString.mockImplementation(() => {
      throw new Error('storage down');
    });
    mockStorage.delete.mockImplementation(() => {
      throw new Error('storage down');
    });

    await safeStorage.setItem('k3', 'value-3');
    await safeStorage.removeItem('k3');
    const value = await safeStorage.getItem('k3');

    expect(value).toBeNull();
  });

  it('returns keys from fallback memory when getAllKeys fails', async () => {
    mockStorage.set.mockImplementation(() => {
      throw new Error('storage down');
    });
    mockStorage.getAllKeys.mockImplementation(() => {
      throw new Error('storage down');
    });

    await safeStorage.setItem('k4', 'value-4');
    await safeStorage.setItem('k5', 'value-5');
    const keys = await safeStorage.getAllKeys();

    expect(keys).toEqual(expect.arrayContaining(['k4', 'k5']));
  });
});
