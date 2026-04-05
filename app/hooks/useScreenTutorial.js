import { useCallback, useEffect, useMemo, useState } from 'react';
import safeStorage from '../utils/safeStorage';
import { requestGooglePlayReviewAfterGettingStarted } from '../utils/inAppReview';

const TUTORIAL_VERSION = 'v1';

const getCompletionKey = (screenKey) => {
  return `tutorial.${TUTORIAL_VERSION}.${screenKey}.completed`;
};

const useScreenTutorial = (screenKey, steps = []) => {
  const [isReady, setIsReady] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

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
      if (!screenKey || !Array.isArray(steps) || steps.length === 0) {
        if (mounted) {
          setIsReady(true);
          setIsVisible(false);
        }
        return;
      }

      try {
        const completionValue = await safeStorage.getItem(getCompletionKey(screenKey));
        if (!mounted) {
          return;
        }

        const completed = completionValue === 'true';
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
  }, [screenKey, steps]);

  const markCompleted = useCallback(async () => {
    if (!screenKey) {
      return;
    }

    try {
      await safeStorage.setItem(getCompletionKey(screenKey), 'true');
    } catch (_error) {
      // Ignore persistence errors; tutorial can still continue in-memory.
    }
  }, [screenKey]);

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
