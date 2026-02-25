/**
 * Firebase Realtime Database - diagnostics & integration test.
 *
 * Tests that the RTDB URL is wired correctly, auth works, and
 * read/write/increment/remove operations all succeed.
 *
 * Run:  npx jest __tests__/firebaseRTDB.test.js --runInBand
 */

/* ------------------------------------------------------------------ */
/*  Mocks - we mock @react-native-firebase/* so the test runs in Node  */
/* ------------------------------------------------------------------ */

const RTDB_URL =
  'https://college-community-5800d-default-rtdb.europe-west1.firebasedatabase.app';

// In-memory RTDB store scoped per test (prefixed with 'mock' for jest.mock hoisting)
let mockStore = {};

const makeRef = (path) => {
  const fullPath = path || '/';
  return { _path: fullPath };
};

// Track which URL getDatabase was called with
let mockLastDbUrl = undefined;

const mockDbInstance = {};

// Mock the modular API from @react-native-firebase/database
jest.mock('@react-native-firebase/database', () => {
  const actual = {
    getDatabase: jest.fn((app, url) => {
      mockLastDbUrl = url;
      return mockDbInstance;
    }),
    ref: jest.fn((db, path) => makeRef(path)),
    onValue: jest.fn((ref, callback, errorCallback) => {
      const path = ref._path;
      callback({ val: () => mockStore[path] ?? null });
      return jest.fn(); // unsubscribe
    }),
    off: jest.fn(),
    set: jest.fn(async (ref, value) => {
      mockStore[ref._path] = value;
    }),
    update: jest.fn(async (ref, values) => {
      if (typeof mockStore[ref._path] !== 'object' || mockStore[ref._path] === null) {
        mockStore[ref._path] = {};
      }
      Object.assign(mockStore[ref._path], values);
    }),
    remove: jest.fn(async (ref) => {
      delete mockStore[ref._path];
    }),
    get: jest.fn(async (ref) => ({
      val: () => mockStore[ref._path] ?? null,
    })),
    runTransaction: jest.fn(async (ref, updateFn) => {
      const current = mockStore[ref._path] ?? null;
      mockStore[ref._path] = updateFn(current);
    }),
  };
  return actual;
});

// Mock modular auth API
jest.mock('@react-native-firebase/auth', () => ({
  getAuth: jest.fn(() => ({ _mock: true })),
  signInAnonymously: jest.fn(() =>
    Promise.resolve({ user: { uid: 'anon-test-user' } }),
  ),
}));

jest.mock('react-native', () => ({
  AppState: {
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
    currentState: 'active',
  },
  Platform: { OS: 'android' },
}));

/* ------------------------------------------------------------------ */
/*  Import the modules under test                                      */
/* ------------------------------------------------------------------ */

const {
  ensureFirebaseAuth,
  isFirebaseReady,
  dbRef,
  getDatabaseUrl,
} = require('../services/firebase');

const {
  writeValue,
  readOnce,
  incrementValue,
  updateValues,
  removeValue,
  acquireSlot,
  releaseSlot,
  getActiveSlotCount,
} = require('../services/firebaseConnectionManager');

/* ------------------------------------------------------------------ */
/*  Tests                                                              */
/* ------------------------------------------------------------------ */

beforeEach(() => {
  mockStore = {};
  mockLastDbUrl = undefined;
});

afterAll(() => {
  jest.restoreAllMocks();
});

describe('Firebase RTDB - configuration', () => {
  it('getDatabaseUrl() returns the europe-west1 URL', () => {
    expect(getDatabaseUrl()).toBe(RTDB_URL);
  });

  it('dbRef(path) initialises the database with the RTDB URL', () => {
    dbRef('test/path');
    expect(mockLastDbUrl).toBe(RTDB_URL);
  });
});

describe('Firebase RTDB - anonymous auth', () => {
  it('ensureFirebaseAuth() resolves to true', async () => {
    const result = await ensureFirebaseAuth();
    expect(result).toBe(true);
  });

  it('isFirebaseReady() returns true after auth', async () => {
    await ensureFirebaseAuth();
    expect(isFirebaseReady()).toBe(true);
  });
});

describe('Firebase RTDB - connection slot management', () => {
  it('acquireSlot() increments active count', () => {
    const before = getActiveSlotCount();
    const got = acquireSlot();
    expect(got).toBe(true);
    expect(getActiveSlotCount()).toBe(before + 1);
    releaseSlot(); // cleanup
  });

  it('releaseSlot() decrements active count', () => {
    acquireSlot();
    const before = getActiveSlotCount();
    releaseSlot();
    expect(getActiveSlotCount()).toBe(before - 1);
  });

  it('releaseSlot() never goes below 0', () => {
    // Release more than acquired
    for (let i = 0; i < 5; i++) releaseSlot();
    expect(getActiveSlotCount()).toBe(0);
  });
});

describe('Firebase RTDB - write / read / increment / remove', () => {
  it('writeValue() stores data at the given path', async () => {
    await writeValue('test/write', { hello: 'world' });
    expect(mockStore['test/write']).toEqual({ hello: 'world' });
  });

  it('readOnce() retrieves data at the given path', async () => {
    mockStore['test/read'] = { value: 42 };
    const result = await readOnce('test/read');
    expect(result).toEqual({ value: 42 });
  });

  it('readOnce() returns null for missing path', async () => {
    const result = await readOnce('nonexistent/path');
    expect(result).toBeNull();
  });

  it('incrementValue() atomically increments a counter', async () => {
    mockStore['counters/likes'] = 5;
    await incrementValue('counters/likes', 1);
    expect(mockStore['counters/likes']).toBe(6);
  });

  it('incrementValue() starts from 0 when path is empty', async () => {
    await incrementValue('counters/new', 3);
    expect(mockStore['counters/new']).toBe(3);
  });

  it('updateValues() merges keys without overwriting siblings', async () => {
    mockStore['posts/abc'] = { likeCount: 5, replyCount: 2, viewCount: 10 };
    await updateValues('posts/abc', { likeCount: 6 });
    expect(mockStore['posts/abc']).toEqual({
      likeCount: 6,
      replyCount: 2,
      viewCount: 10,
    });
  });

  it('removeValue() deletes data at the path', async () => {
    mockStore['chats/typing/user1'] = { name: 'Test', ts: 123 };
    await removeValue('chats/typing/user1');
    expect(mockStore['chats/typing/user1']).toBeUndefined();
  });
});

describe('Firebase RTDB - broadcast helpers', () => {
  const {
    broadcastLikeCount,
    broadcastReplyCount,
    broadcastViewCount,
    broadcastPollVotes,
  } = require('../app/hooks/useFirebaseRealtime');

  it('broadcastLikeCount() writes to posts/{id}', async () => {
    await broadcastLikeCount('post1', 42);
    expect(mockStore['posts/post1']).toMatchObject({ likeCount: 42 });
  });

  it('broadcastReplyCount() writes to posts/{id}', async () => {
    await broadcastReplyCount('post2', 7);
    expect(mockStore['posts/post2']).toMatchObject({ replyCount: 7 });
  });

  it('broadcastViewCount() writes to posts/{id}', async () => {
    await broadcastViewCount('post3', 100);
    expect(mockStore['posts/post3']).toMatchObject({ viewCount: 100 });
  });

  it('broadcastPollVotes() writes to polls/{id}', async () => {
    await broadcastPollVotes('poll1', { 0: 10, 1: 20 }, 30);
    expect(mockStore['polls/poll1']).toEqual({ votes: { 0: 10, 1: 20 }, total: 30 });
  });
});
