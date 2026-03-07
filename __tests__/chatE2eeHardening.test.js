const { encodeBase64 } = require('tweetnacl-util');

const loadSharedModule = ({
  quickCryptoRandomBytes = (size) => Buffer.alloc(size, 7),
  naclRandomBytes = (size) => new Uint8Array(size).fill(5),
  getUserByIdImpl = async () => null,
  storedPublicKey = null,
  storedPrivateKey = null,
} = {}) => {
  jest.resetModules();

  const secureStore = {
    getItemAsync: jest.fn(async (key) => {
      if (key.includes('e2ee_public_key_')) {
        return storedPublicKey;
      }

      if (key.includes('e2ee_private_key_')) {
        return storedPrivateKey;
      }

      return null;
    }),
    setItemAsync: jest.fn().mockResolvedValue(undefined),
    deleteItemAsync: jest.fn().mockResolvedValue(undefined),
  };

  const users = {
    getUserById: jest.fn(getUserByIdImpl),
    updateUserPublicKey: jest.fn().mockResolvedValue(undefined),
  };

  const mockBox = jest.fn(() => new Uint8Array([9, 9, 9]));
  mockBox.keyPair = {
    fromSecretKey: jest.fn((secretKey) => ({
      publicKey: new Uint8Array(32).fill(11),
      secretKey,
    })),
  };
  mockBox.open = jest.fn(() => new Uint8Array(32).fill(13));
  mockBox.secretKeyLength = 32;
  mockBox.publicKeyLength = 32;
  mockBox.nonceLength = 24;

  const mockSecretbox = jest.fn(() => new Uint8Array([1, 2, 3]));
  mockSecretbox.open = jest.fn(() => new Uint8Array([116, 101, 115, 116]));
  mockSecretbox.keyLength = 32;
  mockSecretbox.nonceLength = 24;

  jest.doMock('appwrite', () => ({
    Permission: {
      read: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    Role: {
      users: jest.fn(() => 'users'),
    },
  }));

  jest.doMock('../database/config', () => ({
    account: { get: jest.fn() },
    databases: {
      updateDocument: jest.fn().mockResolvedValue({}),
      getDocument: jest.fn().mockResolvedValue({}),
    },
    config: {
      databaseId: 'test-db',
      chatsCollectionId: 'chats',
    },
  }));

  jest.doMock('expo-secure-store', () => secureStore);
  jest.doMock('../database/users', () => users);
  jest.doMock('react-native-quick-crypto', () => {
    if (quickCryptoRandomBytes === null) {
      return {};
    }

    return {
      randomBytes: jest.fn(quickCryptoRandomBytes),
    };
  });
  jest.doMock('tweetnacl', () => ({
    box: mockBox,
    secretbox: mockSecretbox,
    randomBytes: jest.fn(naclRandomBytes),
  }));

  const shared = require('../database/chats/chatsShared');

  return {
    shared,
    secureStore,
    users,
    mockBox,
    mockSecretbox,
  };
};

describe('chat E2EE hardening', () => {
  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('regenerates the keypair when SecureStore contains malformed key material', async () => {
    const invalidPublicKey = encodeBase64(new Uint8Array(5).fill(1));
    const invalidPrivateKey = encodeBase64(new Uint8Array(7).fill(2));
    const { shared, secureStore, mockBox } = loadSharedModule({
      storedPublicKey: invalidPublicKey,
      storedPrivateKey: invalidPrivateKey,
    });

    const keypair = await shared.getOrCreateUserKeypair('user-1');

    expect(mockBox.keyPair.fromSecretKey).toHaveBeenCalledTimes(1);
    expect(secureStore.deleteItemAsync).toHaveBeenCalledWith('e2ee_public_key_user-1');
    expect(secureStore.deleteItemAsync).toHaveBeenCalledWith('e2ee_private_key_user-1');
    expect(secureStore.setItemAsync).toHaveBeenCalledTimes(2);
    expect(keypair.publicKey).toBeInstanceOf(Uint8Array);
    expect(keypair.publicKey).toHaveLength(32);
    expect(keypair.secretKey).toBeInstanceOf(Uint8Array);
    expect(keypair.secretKey).toHaveLength(32);
  });

  it('ignores malformed participant public keys and falls back to the user document key', async () => {
    const invalidStoredKey = encodeBase64(new Uint8Array(3).fill(4));
    const validUserKey = encodeBase64(new Uint8Array(32).fill(8));
    const { shared, users } = loadSharedModule({
      getUserByIdImpl: async () => ({ publicKey: validUserKey }),
    });

    const participantPublicKey = await shared.getParticipantPublicKey({
      e2ee: {
        publicKeys: {
          'user-2': invalidStoredKey,
        },
      },
    }, 'user-2');

    expect(users.getUserById).toHaveBeenCalledWith('user-2', true);
    expect(participantPublicKey).toBe(validUserKey);
  });

  it('throws instead of downgrading to plaintext when no secure random source is available', () => {
    const originalCryptoDescriptor = Object.getOwnPropertyDescriptor(global, 'crypto');
    Object.defineProperty(global, 'crypto', {
      value: undefined,
      configurable: true,
      writable: true,
    });

    try {
      const { shared, mockSecretbox } = loadSharedModule({
        quickCryptoRandomBytes: null,
        naclRandomBytes: () => null,
      });

      expect(() => shared.encryptContent('hello', new Uint8Array(32).fill(1))).toThrow('Secure random generator unavailable');
      expect(mockSecretbox).not.toHaveBeenCalled();
    } finally {
      if (originalCryptoDescriptor) {
        Object.defineProperty(global, 'crypto', originalCryptoDescriptor);
      } else {
        delete global.crypto;
      }
    }
  });
});