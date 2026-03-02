const listenersByTopic = new Map();

const ensureTopic = (topic) => {
  if (!listenersByTopic.has(topic)) {
    listenersByTopic.set(topic, new Set());
  }

  return listenersByTopic.get(topic);
};

export const REFRESH_TOPICS = {
  CHATS: 'chats',
  NOTIFICATIONS: 'notifications',
  FEED: 'feed',
};

export const subscribeToRefreshTopic = (topic, handler) => {
  if (!topic || typeof handler !== 'function') {
    return () => {};
  }

  const listeners = ensureTopic(topic);
  listeners.add(handler);

  return () => {
    const activeListeners = listenersByTopic.get(topic);
    if (!activeListeners) {
      return;
    }

    activeListeners.delete(handler);

    if (activeListeners.size === 0) {
      listenersByTopic.delete(topic);
    }
  };
};

export const publishRefreshEvent = (topic, payload = {}) => {
  if (!topic) {
    return;
  }

  const listeners = listenersByTopic.get(topic);
  if (!listeners || listeners.size === 0) {
    return;
  }

  listeners.forEach((handler) => {
    try {
      handler(payload);
    } catch {
      // Keep other listeners alive when one fails
    }
  });
};
