import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { UserProvider, useUser } from '../app/context/UserContext';
import safeStorage from '../app/utils/safeStorage';
import { getCurrentUser, getCompleteUserData, updateUserDocument } from '../database/auth';

jest.mock('../app/utils/safeStorage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  },
}));

jest.mock('../database/auth', () => ({
  getCurrentUser: jest.fn(),
  getCompleteUserData: jest.fn(),
  updateUserDocument: jest.fn(),
}));

jest.mock('../app/utils/bookmarkService', () => ({
  restoreBookmarksFromServer: jest.fn().mockResolvedValue(undefined),
}));

const flushPromises = () => new Promise((resolve) => setImmediate(resolve));

describe('UserContext academic preservation', () => {
  let latestContext;
  let storage;

  const CaptureContext = () => {
    latestContext = useUser();
    return null;
  };

  beforeEach(() => {
    latestContext = null;
    storage = {
      userData: JSON.stringify({
        $id: 'user-doc-1',
        accountId: 'account-1',
        fullName: 'Student User',
        email: 'student@example.edu',
        bio: '',
        university: '',
        college: '',
        department: '',
        stage: '',
      }),
      userDataMeta: JSON.stringify({
        fetchedAt: 0,
        accountId: 'account-1',
        userId: 'user-doc-1',
      }),
    };

    safeStorage.getItem.mockImplementation(async (key) => storage[key] ?? null);
    safeStorage.setItem.mockImplementation(async (key, value) => {
      storage[key] = value;
    });
    safeStorage.removeItem.mockImplementation(async (key) => {
      delete storage[key];
    });

    getCurrentUser.mockResolvedValue({ $id: 'account-1' });
    getCompleteUserData.mockResolvedValue({
      $id: 'user-doc-1',
      userId: 'account-1',
      email: 'student@example.edu',
      name: 'Student User',
      bio: 'Existing bio',
      gender: '',
      profilePicture: '',
      university: 'epu',
      major: 'engineering',
      department: 'computer_science',
      year: 3,
      postsCount: 0,
      followersCount: 0,
      followingCount: 0,
      emailVerification: true,
      lastAcademicUpdate: null,
      profileViews: '',
      blockedUsers: [],
      chatBlockedUsers: [],
    });

    updateUserDocument.mockResolvedValue({ $id: 'user-doc-1' });
  });

  it('preserves academic details when partial updates run against stale cached storage', async () => {
    let tree;

    await act(async () => {
      tree = renderer.create(
        <UserProvider>
          <CaptureContext />
        </UserProvider>
      );
      await flushPromises();
      await flushPromises();
    });

    expect(latestContext.user.university).toBe('epu');
    expect(latestContext.user.college).toBe('engineering');
    expect(latestContext.user.department).toBe('computer_science');
    expect(latestContext.user.stage).toBe('thirdYear');

    storage.userData = JSON.stringify({
      $id: 'user-doc-1',
      accountId: 'account-1',
      fullName: 'Student User',
      email: 'student@example.edu',
      bio: '',
      university: '',
      college: '',
      department: '',
      stage: '',
    });

    await act(async () => {
      await latestContext.updateUser({ bio: 'Updated bio' });
      await flushPromises();
    });

    expect(latestContext.user.bio).toBe('Updated bio');
    expect(latestContext.user.university).toBe('epu');
    expect(latestContext.user.college).toBe('engineering');
    expect(latestContext.user.department).toBe('computer_science');
    expect(latestContext.user.stage).toBe('thirdYear');
    expect(updateUserDocument).toHaveBeenCalledWith('account-1', { bio: 'Updated bio' });

    act(() => {
      tree.unmount();
    });
  });
});