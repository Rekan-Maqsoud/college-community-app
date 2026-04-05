let latestRect = null;
const listeners = new Set();

export const publishTutorialMeasure = (rect) => {
  latestRect = rect;
  listeners.forEach((listener) => {
    try {
      listener(latestRect);
    } catch (_error) {
      // Ignore listener errors to keep broadcasts resilient.
    }
  });
};

export const clearTutorialMeasure = () => {
  latestRect = null;
  listeners.forEach((listener) => {
    try {
      listener(latestRect);
    } catch (_error) {
      // Ignore listener errors to keep broadcasts resilient.
    }
  });
};

export const getLatestTutorialMeasure = () => latestRect;

export const subscribeTutorialMeasure = (listener) => {
  if (typeof listener !== 'function') {
    return () => {};
  }

  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
