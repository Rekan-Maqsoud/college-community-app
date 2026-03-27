import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import safeStorage from '../utils/safeStorage';
import { getCurrentUser, getCompleteUserData } from '../../database/auth';
import { restoreBookmarksFromServer } from '../utils/bookmarkService';

const UserContext = createContext();
const USER_DATA_CACHE_KEY = 'userData';
const USER_DATA_META_KEY = 'userDataMeta';
const USER_CACHE_FRESHNESS_MS = 90 * 1000;

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionChecked, setSessionChecked] = useState(false);

  const normalizeRole = (roleValue) => {
    if (roleValue === null || roleValue === undefined) return 'student';
    const text = String(roleValue).trim().toLowerCase();
    if (!text || text === 'null' || text === 'undefined') return 'student';
    // 'guest' is an explicitly valid role — do not default it to 'student'
    return text;
  };

  const parseProfileMetadata = (profileViews) => {
    const defaults = {
      links: null,
      visibility: 'everyone',
      academicChangesCount: 0,
    };

    if (!profileViews) return defaults;

    try {
      const parsed = JSON.parse(profileViews);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return defaults;
      }

      return {
        links: parsed.links || null,
        visibility: parsed.visibility || 'everyone',
        academicChangesCount: Number(parsed.academicChangesCount) || 0,
      };
    } catch (e) {
      return defaults;
    }
  };

  const readCachedUserData = useCallback(async () => {
    try {
      const cachedData = await safeStorage.getItem(USER_DATA_CACHE_KEY);
      return cachedData ? JSON.parse(cachedData) : null;
    } catch (error) {
      return null;
    }
  }, []);

  const readCachedUserMeta = useCallback(async () => {
    try {
      const metaData = await safeStorage.getItem(USER_DATA_META_KEY);
      return metaData ? JSON.parse(metaData) : null;
    } catch (error) {
      return null;
    }
  }, []);

  const cacheUserData = useCallback(async (userData, accountId = null) => {
    if (!userData) return;

    await safeStorage.setItem(USER_DATA_CACHE_KEY, JSON.stringify(userData));
    await safeStorage.setItem(
      USER_DATA_META_KEY,
      JSON.stringify({
        fetchedAt: Date.now(),
        accountId: accountId || userData.accountId || null,
        userId: userData.$id || null,
      })
    );
  }, []);

  const mapCompleteUserData = useCallback((completeUserData, appwriteUser) => {
    // Parse socialLinks from profileViews field (stored as JSON string)
    const socialLinksData = parseProfileMetadata(completeUserData.profileViews);

    return {
      $id: completeUserData.$id,
      accountId: appwriteUser.$id,
      userId: completeUserData.userId || appwriteUser.$id,
      email: completeUserData.email,
      fullName: completeUserData.name,
      bio: completeUserData.bio || '',
      gender: completeUserData.gender || '',
      profilePicture: completeUserData.profilePicture || '',
      university: completeUserData.university || '',
      college: completeUserData.major || '',
      department: completeUserData.department || '',
      stage: yearToStage(completeUserData.year),
      role: normalizeRole(completeUserData.role),
      postsCount: completeUserData.postsCount || 0,
      followersCount: completeUserData.followersCount || 0,
      followingCount: completeUserData.followingCount || 0,
      isEmailVerified: completeUserData.emailVerification || false,
      lastAcademicUpdate: completeUserData.lastAcademicUpdate || null,
      socialLinks: socialLinksData.links || null,
      socialLinksVisibility: socialLinksData.visibility || 'everyone',
      academicChangesCount: socialLinksData.academicChangesCount || 0,
      blockedUsers: completeUserData.blockedUsers || [],
      chatBlockedUsers: completeUserData.chatBlockedUsers || [],
    };
  }, []);

  const isCacheFreshForSession = useCallback((cached, meta, appwriteUserId) => {
    if (!cached || !meta || !meta.fetchedAt || !appwriteUserId) {
      return false;
    }

    const accountMatches =
      meta.accountId === appwriteUserId ||
      cached.accountId === appwriteUserId ||
      cached.userId === appwriteUserId;

    if (!accountMatches) {
      return false;
    }

    return Date.now() - Number(meta.fetchedAt) <= USER_CACHE_FRESHNESS_MS;
  }, []);

  const initializeUser = useCallback(async () => {
    try {
      setIsLoading(true);

      const cached = await readCachedUserData();
      const cachedMeta = await readCachedUserMeta();

      if (cached) {
        setUser(cached);
      }
      
      const appwriteUser = await getCurrentUser();
      
      if (appwriteUser) {
        if (isCacheFreshForSession(cached, cachedMeta, appwriteUser.$id)) {
          restoreBookmarksFromServer(appwriteUser.$id).catch(() => {});
          return;
        }

        const completeUserData = await getCompleteUserData();
        
        if (completeUserData) {
          const userData = mapCompleteUserData(completeUserData, appwriteUser);

          await cacheUserData(userData, appwriteUser.$id);
          setUser(userData);
          
          // Restore bookmarks from server in background (for fresh installs)
          restoreBookmarksFromServer(userData.$id).catch(() => {});
        } else {
          // completeUserData was null
        }
      } else {
        if (cached) {
          setUser(cached);
        } else {
          await safeStorage.removeItem(USER_DATA_CACHE_KEY);
          await safeStorage.removeItem(USER_DATA_META_KEY);
          setUser(null);
        }
      }
    } catch (error) {
      try {
        const cached = await readCachedUserData();
        if (cached) {
          setUser(cached);
        }
      } catch (cacheError) {
        // Cache fallback failed
      }
    } finally {
      setIsLoading(false);
      setSessionChecked(true);
    }
  }, [cacheUserData, isCacheFreshForSession, mapCompleteUserData, readCachedUserData, readCachedUserMeta]);

  useEffect(() => {
    initializeUser();
  }, [initializeUser]);

  const loadUserData = async (options = {}) => {
    try {
      const force = options.force === true;
      const cached = await readCachedUserData();
      const cachedMeta = await readCachedUserMeta();

      if (cached) {
        setUser(cached);
      }
      
      const appwriteUser = await getCurrentUser();
      
      if (appwriteUser) {
        if (!force && isCacheFreshForSession(cached, cachedMeta, appwriteUser.$id)) {
          return;
        }

        const completeUserData = await getCompleteUserData();
        
        if (completeUserData) {
          const userData = mapCompleteUserData(completeUserData, appwriteUser);

          await cacheUserData(userData, appwriteUser.$id);
          setUser(userData);
        }
      } else {
        if (cached) {
          setUser(cached);
        }
      }
    } catch (error) {
      const cached = await readCachedUserData();
      if (cached) {
        setUser(cached);
      }
    }
  };

  const stageToYear = (stage) => {
    const stageMap = {
      'firstYear': 1,
      'secondYear': 2,
      'thirdYear': 3,
      'fourthYear': 4,
      'fifthYear': 5,
      'sixthYear': 6,
      'First Year': 1,
      'Second Year': 2,
      'Third Year': 3,
      'Fourth Year': 4,
      'Fifth Year': 5,
      'Sixth Year': 6,
      'stage_1': 1,
      'stage_2': 2,
      'stage_3': 3,
      'stage_4': 4,
      'stage_5': 5,
      'stage_6': 6,
    };

    if (stage === null || stage === undefined) return null;
    const key = String(stage).trim();
    if (!key) return null;

    const mapped = stageMap[key];
    if (mapped) return mapped;

    const parsed = Number.parseInt(key.replace(/^stage_/i, ''), 10);
    return Number.isInteger(parsed) && parsed >= 1 && parsed <= 6 ? parsed : null;
  };

  const yearToStage = (year) => {
    if (year === null || year === undefined) return null;

    const stageMap = {
      stage_1: 'firstYear',
      stage_2: 'secondYear',
      stage_3: 'thirdYear',
      stage_4: 'fourthYear',
      stage_5: 'fifthYear',
      stage_6: 'sixthYear',
      firstYear: 'firstYear',
      secondYear: 'secondYear',
      thirdYear: 'thirdYear',
      fourthYear: 'fourthYear',
      fifthYear: 'fifthYear',
      sixthYear: 'sixthYear',
    };

    if (typeof year === 'string') {
      const trimmed = year.trim();
      if (stageMap[trimmed]) return stageMap[trimmed];
    }

    const yearMap = {
      1: 'firstYear',
      2: 'secondYear',
      3: 'thirdYear',
      4: 'fourthYear',
      5: 'fifthYear',
      6: 'sixthYear'
    };
    return yearMap[year] || yearMap[parseInt(year)] || null;
  };

  const updateUser = async (updates) => {
    try {
      const currentData = await safeStorage.getItem(USER_DATA_CACHE_KEY);
      const parsedData = currentData ? JSON.parse(currentData) : {};
      const freshestUserData = user && typeof user === 'object' ? user : {};
      
      const updatedData = {
        ...parsedData,
        ...freshestUserData,
        ...updates,
      };
      
      await cacheUserData(
        updatedData,
        freshestUserData?.accountId || parsedData?.accountId || updatedData?.accountId || null,
      );
      setUser(updatedData);
      
      const appwriteUser = await getCurrentUser();
      if (appwriteUser) {
        const { updateUserDocument } = require('../../database/auth');
        
        const appwriteUpdates = {};
        if (updates.fullName !== undefined) appwriteUpdates.name = updates.fullName;
        if (updates.bio !== undefined) appwriteUpdates.bio = updates.bio;
        if (updates.profilePicture !== undefined) appwriteUpdates.profilePicture = updates.profilePicture;
        if (updates.university !== undefined) appwriteUpdates.university = updates.university;
        if (updates.college !== undefined) appwriteUpdates.major = updates.college;
        if (updates.department !== undefined) appwriteUpdates.department = updates.department;
        if (updates.stage !== undefined) {
          const mappedYear = stageToYear(updates.stage);
          if (mappedYear !== null) {
            appwriteUpdates.year = mappedYear;
          }
        }
        if (updates.lastAcademicUpdate !== undefined) appwriteUpdates.lastAcademicUpdate = updates.lastAcademicUpdate;
        if (updates.gender !== undefined) appwriteUpdates.gender = updates.gender;
        
        // Store socialLinks and visibility as JSON in profileViews field
        if (updates.socialLinks !== undefined || updates.socialLinksVisibility !== undefined || updates.academicChangesCount !== undefined) {
          const socialLinksData = {
            links: updates.socialLinks !== undefined ? updates.socialLinks : updatedData.socialLinks,
            visibility: updates.socialLinksVisibility !== undefined ? updates.socialLinksVisibility : updatedData.socialLinksVisibility,
            academicChangesCount: updates.academicChangesCount !== undefined
              ? updates.academicChangesCount
              : (updatedData.academicChangesCount || 0),
          };
          appwriteUpdates.profileViews = JSON.stringify(socialLinksData);
        }
        
        await updateUserDocument(appwriteUser.$id, appwriteUpdates);
      }
      
      return true;
    } catch (error) {
      return false;
    }
  };

  const updateProfilePicture = async (imageUrl, deleteUrl = null) => {
    try {
      // Delete old profile picture if exists
          const oldDeleteUrl = await safeStorage.getItem('profilePictureDeleteUrl');
      if (oldDeleteUrl) {
        try {
          const { deleteImageFromImgbb } = require('../../services/imgbbService');
          await deleteImageFromImgbb(oldDeleteUrl);
        } catch (deleteError) {
          // Ignore delete errors, proceed with update
        }
      }
      
      // Store new delete URL if provided
      if (deleteUrl) {
            await safeStorage.setItem('profilePictureDeleteUrl', deleteUrl);
      }
      
      const appwriteUser = await getCurrentUser();
      if (appwriteUser) {
        const { updateUserDocument } = require('../../database/auth');
        await updateUserDocument(appwriteUser.$id, { profilePicture: imageUrl });
      }
      return await updateUser({ profilePicture: imageUrl });
    } catch (error) {
      return false;
    }
  };

  const clearUser = async () => {
    try {
      await safeStorage.removeItem(USER_DATA_CACHE_KEY);
      await safeStorage.removeItem(USER_DATA_META_KEY);
      setUser(null);
    } catch (error) {
      // Failed to clear user data from storage
    }
  };

  const setUserData = async (userData) => {
    try {
      await cacheUserData(userData, userData?.accountId || null);
      setUser(userData);
    } catch (error) {
      // Failed to store user data
    }
  };

  const value = {
    user,
    isLoading,
    sessionChecked,
    updateUser,
    updateProfilePicture,
    clearUser,
    refreshUser: loadUserData,
    setUserData,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};
