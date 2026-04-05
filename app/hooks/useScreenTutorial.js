import { useCallback, useEffect, useMemo, useState } from 'react';
import safeStorage from '../utils/safeStorage';
import { requestGooglePlayReviewAfterGettingStarted } from '../utils/inAppReview';
import { useUser } from '../context/UserContext';
import { isGuest } from '../utils/guestUtils';
import { completeTutorial, hasCompletedTutorial } from '../../database/tutorials';

const TUTORIAL_VERSION = 'v1';

const getGuestCompletionKey = (screenKey) => `tutorial.${TUTORIAL_VERSION}.${screenKey}.completed`;

const useScreenTutorial = (screenKey, steps = []) => {
  const { user, sessionChecked } = useUser();
  const [isReady, setIsReady] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const accountId = user?.accountId || user?.$id || null;
  const isGuestUser = isGuest(user);

  const totalSteps = steps.length;
  const currentStep = useMemo(() => {
    if (!totalSteps) {
      return null;
    }

    return steps[currentIndex] || null;
  }, [currentIndex, steps, totalSteps]);

  const activeTarget = currentStep?.target || null;

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      if (!sessionChecked) {
        return;
      }

      if (!screenKey || !Array.isArray(steps) || steps.length === 0) {
        if (mounted) {
          setIsReady(true);
          setIsVisible(false);
        }
        return;
      }

      try {
        let completed = false;
        const legacyLocalKey = getGuestCompletionKey(screenKey);

        if (!isGuestUser && accountId) {
          completed = await hasCompletedTutorial({
            accountId,
            tutorialVersion: TUTORIAL_VERSION,
            screenKey,
          });

          if (!completed) {
            const legacyCompletionValue = await safeStorage.getItem(legacyLocalKey);
            if (legacyCompletionValue === 'true') {
              completed = true;
              await completeTutorial({
                accountId,
                tutorialVersion: TUTORIAL_VERSION,
                screenKey,
              });
            }
          }
        } else {
          const completionValue = await safeStorage.getItem(legacyLocalKey);
          completed = completionValue === 'true';
        }

        if (!mounted) {
          return;
        }

        setIsVisible(!completed);
      } catch (_error) {
        if (mounted) {
          setIsVisible(true);
        }
      } finally {
        if (mounted) {
          setCurrentIndex(0);
          setIsReady(true);
        }
      }
    };

    setIsReady(false);
    load();

    return () => {
      mounted = false;
    };
  }, [accountId, isGuestUser, screenKey, sessionChecked, steps]);

  const markCompleted = useCallback(async () => {
    if (!screenKey) {
      return;
    }

    try {
      if (!isGuestUser && accountId) {
        await completeTutorial({
          accountId,
          tutorialVersion: TUTORIAL_VERSION,
          screenKey,
        });
      } else {
        await safeStorage.setItem(getGuestCompletionKey(screenKey), 'true');
      }
    } catch (_error) {
      // Ignore persistence errors; tutorial can still continue in-memory.
    }
  }, [accountId, isGuestUser, screenKey]);

  const skipTutorial = useCallback(async () => {
    setIsVisible(false);
    await markCompleted();
  }, [markCompleted]);

  const finishTutorial = useCallback(async () => {
    setIsVisible(false);
    await markCompleted();

    if (screenKey === 'home') {
      await requestGooglePlayReviewAfterGettingStarted();
    }
  }, [markCompleted, screenKey]);

  const nextStep = useCallback(async () => {
    if (!totalSteps) {
      return;
    }

    const isLast = currentIndex >= totalSteps - 1;
    if (isLast) {
      await finishTutorial();
      return;
    }

    setCurrentIndex((prev) => Math.min(prev + 1, totalSteps - 1));
  }, [currentIndex, finishTutorial, totalSteps]);

  const prevStep = useCallback(() => {
    setCurrentIndex((prev) => Math.max(prev - 1, 0));
  }, []);

  const restartTutorial = useCallback(() => {
    if (!totalSteps) {
      return;
    }

    setCurrentIndex(0);
    setIsVisible(true);
  }, [totalSteps]);

  return {
    isReady,
    isVisible: isReady && isVisible,
    totalSteps,
    currentIndex,
    currentStep,
    activeTarget,
    nextStep,
    prevStep,
    skipTutorial,
    finishTutorial,
    restartTutorial,
  };
};

export default useScreenTutorial;
