import { account } from './config';
import safeStorage from '../app/utils/safeStorage';

const TUTORIAL_PREFS_KEY = 'tutorialProgress';
const LOCAL_TUTORIAL_CACHE_PREFIX = 'tutorial.progress.cache';

const buildCompletionId = (tutorialVersion, screenKey) => `${tutorialVersion}:${screenKey}`;

const getCacheKey = (accountId) => `${LOCAL_TUTORIAL_CACHE_PREFIX}.${accountId}`;

const normalizeProgressMap = (value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return Object.entries(value).reduce((accumulator, [key, flag]) => {
    if (typeof key === 'string' && key.trim().length > 0 && flag === true) {
      accumulator[key] = true;
    }
    return accumulator;
  }, {});
};

const readCachedProgress = async (accountId) => {
  if (!accountId) {
    return {};
  }

  try {
    const raw = await safeStorage.getItem(getCacheKey(accountId));
    if (!raw) {
      return {};
    }

    return normalizeProgressMap(JSON.parse(raw));
  } catch (_error) {
    return {};
  }
};

const writeCachedProgress = async (accountId, progressMap) => {
  if (!accountId) {
    return;
  }

  try {
    await safeStorage.setItem(getCacheKey(accountId), JSON.stringify(normalizeProgressMap(progressMap)));
  } catch (_error) {
    // Ignore cache write failures; server remains source of truth.
  }
};

const fetchServerProgress = async () => {
  const prefs = await account.getPrefs();
  const normalizedPrefs = prefs && typeof prefs === 'object' ? prefs : {};
  const tutorialProgress = normalizeProgressMap(normalizedPrefs[TUTORIAL_PREFS_KEY]);

  return {
    prefs: normalizedPrefs,
    tutorialProgress,
  };
};

export const hasCompletedTutorial = async ({ accountId, tutorialVersion, screenKey }) => {
  if (!tutorialVersion || !screenKey) {
    return false;
  }

  const completionId = buildCompletionId(tutorialVersion, screenKey);

  if (!accountId) {
    return false;
  }

  const cachedProgress = await readCachedProgress(accountId);

  try {
    const { prefs, tutorialProgress } = await fetchServerProgress();
    const mergedProgress = {
      ...tutorialProgress,
      ...cachedProgress,
    };

    const needsReconciliation = Object.keys(mergedProgress).some(
      (key) => mergedProgress[key] === true && tutorialProgress[key] !== true,
    );

    if (needsReconciliation) {
      try {
        await account.updatePrefs({
          ...prefs,
          [TUTORIAL_PREFS_KEY]: mergedProgress,
        });
      } catch (_error) {
        // Ignore reconciliation failures; cache still preserves local progress.
      }
    }

    await writeCachedProgress(accountId, mergedProgress);
    return mergedProgress[completionId] === true;
  } catch (_error) {
    return cachedProgress[completionId] === true;
  }
};

export const completeTutorial = async ({ accountId, tutorialVersion, screenKey }) => {
  if (!tutorialVersion || !screenKey || !accountId) {
    return;
  }

  const completionId = buildCompletionId(tutorialVersion, screenKey);
  const cachedProgress = await readCachedProgress(accountId);

  try {
    const { prefs, tutorialProgress } = await fetchServerProgress();
    const nextProgress = {
      ...tutorialProgress,
      ...cachedProgress,
      [completionId]: true,
    };

    await account.updatePrefs({
      ...prefs,
      [TUTORIAL_PREFS_KEY]: nextProgress,
    });

    await writeCachedProgress(accountId, nextProgress);
  } catch (_error) {
    const nextProgress = {
      ...cachedProgress,
      [completionId]: true,
    };
    await writeCachedProgress(accountId, nextProgress);
  }
};
