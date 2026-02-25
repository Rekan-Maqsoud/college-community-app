/**
 * Firebase Realtime Database — diagnostics & integration test.
 *
 * Tests that the RTDB URL is wired correctly, auth works, and
 * read/write/increment/remove operations all succeed.
 *
 * Run:  npx jest __tests__/firebaseRTDB.test.js --runInBand
 */

/* ------------------------------------------------------------------ */
/*  Mocks — we mock @react-native-firebase/* so the test runs in Node */
/* ------------------------------------------------------------------ */

const RTDB_URL =
  'https://college-community-5800d-default-rtdb.europe-west1.firebasedatabase.app/';

// In-memory RTDB store scoped per test
let _store = {};

const makeRef = (path) => {
  const fullPath = path || '/';
  return {
    _path: fullPath,
    set: jest.fn(async (value) => {
      _store[fullPath] = value;
    }),
    update: jest.fn(async (values) => {
      if (typeof _store[fullPath] !== 'object' || _store[fullPath] === null) {
        _store[fullPath] = {};
      }
      Object.assign(_store[fullPath], values);
    }),
    once: jest.fn(async () => ({
      val: () => _store[fullPath] ?? null,
    })),
    on: jest.fn((event, cb) => {
      // Fire immediately with current value
      cb({ val: () => _store[fullPath] ?? null });
    }),
    off: jest.fn(),
    remove: jest.fn(async () => {
      delete _store[fullPath];
    }),
    transaction: jest.fn(async (updateFn) => {
      const current = _store[fullPath] ?? null;
      _store[fullPath] = updateFn(current);
    }),
  };
};

// Track which URL database() was called with
let _lastDbUrl = undefined;

const mockDatabase = jest.fn((url) => {
  _lastDbUrl = url;
  return {
    ref: jest.fn((path) => makeRef(path)),
  };
});
mockDatabase.ref = jest.fn((path) => makeRef(path));

jest.mock('@react-native-firebase/database', () => mockDatabase);

jest.mock('@react-native-firebase/auth', () => {
  const mockAuth = () => ({
    signInAnonymously: jest.fn(() =>
      Promise.resolve({ user: { uid: 'anon-test-user' } }),
    ),
    currentUser: { uid: 'anon-test-user' },
  });
  return mockAuth;
});

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
  getDatabase,
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
  _store = {};
  _lastDbUrl = undefined;
});

afterAll(() => {
  jest.restoreAllMocks();
});

describe('Firebase RTDB — configuration', () => {
  it('getDatabaseUrl() returns the europe-west1 URL', () => {
    expect(getDatabaseUrl()).toBe(RTDB_URL);
  });

  it('getDatabase() passes the RTDB URL to database()', () => {
    getDatabase();
    expect(_lastDbUrl).toBe(RTDB_URL);
  });

  it('dbRef(path) passes the RTDB URL to database()', () => {
    dbRef('test/path');
    expect(_lastDbUrl).toBe(RTDB_URL);
  });
});

describe('Firebase RTDB — anonymous auth', () => {
  it('ensureFirebaseAuth() resolves to true', async () => {
    const result = await ensureFirebaseAuth();
    expect(result).toBe(true);
  });

  it('isFirebaseReady() returns true after auth', async () => {
    await ensureFirebaseAuth();
    expect(isFirebaseReady()).toBe(true);
  });
});

describe('Firebase RTDB — connection slot management', () => {
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

describe('Firebase RTDB — write / read / increment / remove', () => {
  it('writeValue() stores data at the given path', async () => {
    await writeValue('test/write', { hello: 'world' });
    expect(_store['test/write']).toEqual({ hello: 'world' });
  });

  it('readOnce() retrieves data at the given path', async () => {
    _store['test/read'] = { value: 42 };
    const result = await readOnce('test/read');
    expect(result).toEqual({ value: 42 });
  });

  it('readOnce() returns null for missing path', async () => {
    const result = await readOnce('nonexistent/path');
    expect(result).toBeNull();
  });

  it('incrementValue() atomically increments a counter', async () => {
    _store['counters/likes'] = 5;
    await incrementValue('counters/likes', 1);
    expect(_store['counters/likes']).toBe(6);
  });

  it('incrementValue() starts from 0 when path is empty', async () => {
    await incrementValue('counters/new', 3);
    expect(_store['counters/new']).toBe(3);
  });

  it('updateValues() merges keys without overwriting siblings', async () => {
    _store['posts/abc'] = { likeCount: 5, replyCount: 2, viewCount: 10 };
    await updateValues('posts/abc', { likeCount: 6 });
    expect(_store['posts/abc']).toEqual({
      likeCount: 6,
      replyCount: 2,
      viewCount: 10,
    });
  });

  it('removeValue() deletes data at the path', async () => {
    _store['chats/typing/user1'] = { name: 'Test', ts: 123 };
    await removeValue('chats/typing/user1');
    expect(_store['chats/typing/user1']).toBeUndefined();
  });
});

describe('Firebase RTDB — broadcast helpers', () => {
  const {
    broadcastLikeCount,
    broadcastReplyCount,
    broadcastViewCount,
    broadcastPollVotes,
  } = require('../app/hooks/useFirebaseRealtime');

  it('broadcastLikeCount() writes to posts/{id}', async () => {
    await broadcastLikeCount('post1', 42);
    // updateValues is called which does _store merge
    expect(_store['posts/post1']).toMatchObject({ likeCount: 42 });
  });

  it('broadcastReplyCount() writes to posts/{id}', async () => {
    await broadcastReplyCount('post2', 7);
    expect(_store['posts/post2']).toMatchObject({ replyCount: 7 });
  });

  it('broadcastViewCount() writes to posts/{id}', async () => {
    await broadcastViewCount('post3', 100);
    expect(_store['posts/post3']).toMatchObject({ viewCount: 100 });
  });

  it('broadcastPollVotes() writes to polls/{id}', async () => {
    await broadcastPollVotes('poll1', { 0: 10, 1: 20 }, 30);
    expect(_store['polls/poll1']).toEqual({ votes: { 0: 10, 1: 20 }, total: 30 });
  });
});
