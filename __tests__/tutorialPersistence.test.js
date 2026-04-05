const mockGetPrefs = jest.fn();
const mockUpdatePrefs = jest.fn();
const mockGetItem = jest.fn();
const mockSetItem = jest.fn();

jest.mock('../database/config', () => ({
  account: {
    getPrefs: (...args) => mockGetPrefs(...args),
    updatePrefs: (...args) => mockUpdatePrefs(...args),
  },
}));

jest.mock('../app/utils/safeStorage', () => ({
  __esModule: true,
  default: {
    getItem: (...args) => mockGetItem(...args),
    setItem: (...args) => mockSetItem(...args),
  },
}));

describe('database/tutorials persistence', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('reads completion from server prefs and updates local cache', async () => {
    mockGetPrefs.mockResolvedValue({
      language: 'en',
      tutorialProgress: {
        'v1:profile': true,
      },
    });

    const { hasCompletedTutorial } = require('../database/tutorials');

    const completed = await hasCompletedTutorial({
      accountId: 'user-1',
      tutorialVersion: 'v1',
      screenKey: 'profile',
    });

    expect(completed).toBe(true);
    expect(mockSetItem).toHaveBeenCalledWith(
      'tutorial.progress.cache.user-1',
      JSON.stringify({ 'v1:profile': true })
    );
  });

  it('falls back to account-scoped cache when server read fails', async () => {
    mockGetPrefs.mockRejectedValue(new Error('offline'));
    mockGetItem.mockResolvedValue(JSON.stringify({ 'v1:profile': true }));

    const { hasCompletedTutorial } = require('../database/tutorials');

    const completed = await hasCompletedTutorial({
      accountId: 'user-2',
      tutorialVersion: 'v1',
      screenKey: 'profile',
    });

    expect(completed).toBe(true);
    expect(mockGetItem).toHaveBeenCalledWith('tutorial.progress.cache.user-2');
  });

  it('preserves cached completion when server progress is stale', async () => {
    mockGetItem.mockResolvedValue(JSON.stringify({ 'v1:profile': true }));
    mockGetPrefs.mockResolvedValue({
      language: 'en',
      tutorialProgress: {},
    });
    mockUpdatePrefs.mockResolvedValue({});

    const { hasCompletedTutorial } = require('../database/tutorials');

    const completed = await hasCompletedTutorial({
      accountId: 'user-2b',
      tutorialVersion: 'v1',
      screenKey: 'profile',
    });

    expect(completed).toBe(true);
    expect(mockSetItem).toHaveBeenCalledWith(
      'tutorial.progress.cache.user-2b',
      JSON.stringify({ 'v1:profile': true })
    );
    expect(mockUpdatePrefs).toHaveBeenCalledWith({
      language: 'en',
      tutorialProgress: {
        'v1:profile': true,
      },
    });
  });

  it('merges completion into server prefs and preserves existing keys', async () => {
    mockGetItem.mockResolvedValue(null);
    mockGetPrefs.mockResolvedValue({
      language: 'ar',
      tutorialProgress: {
        'v1:home': true,
      },
    });
    mockUpdatePrefs.mockResolvedValue({});

    const { completeTutorial } = require('../database/tutorials');

    await completeTutorial({
      accountId: 'user-3',
      tutorialVersion: 'v1',
      screenKey: 'settings',
    });

    expect(mockUpdatePrefs).toHaveBeenCalledWith({
      language: 'ar',
      tutorialProgress: {
        'v1:home': true,
        'v1:settings': true,
      },
    });

    expect(mockSetItem).toHaveBeenCalledWith(
      'tutorial.progress.cache.user-3',
      JSON.stringify({ 'v1:home': true, 'v1:settings': true })
    );
  });

  it('stores completion in local cache when server write fails', async () => {
    mockGetPrefs.mockRejectedValue(new Error('server unavailable'));
    mockGetItem.mockResolvedValue(JSON.stringify({ 'v1:home': true }));

    const { completeTutorial } = require('../database/tutorials');

    await completeTutorial({
      accountId: 'user-4',
      tutorialVersion: 'v1',
      screenKey: 'notifications',
    });

    expect(mockSetItem).toHaveBeenCalledWith(
      'tutorial.progress.cache.user-4',
      JSON.stringify({ 'v1:home': true, 'v1:notifications': true })
    );
  });
});
