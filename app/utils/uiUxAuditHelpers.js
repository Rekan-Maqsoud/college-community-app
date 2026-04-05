const DEFAULT_SOCIAL_LINKS_STATE = {
  links: null,
  visibility: 'everyone',
  parseFailed: false,
};

const normalizeCountValue = (value) => {
  const nextValue = Number(value);
  if (!Number.isFinite(nextValue) || nextValue < 0) {
    return null;
  }
  return nextValue;
};

export const resolveFollowTabCount = ({ routeCount, loadedCount, loading, loadError }) => {
  const normalizedRouteCount = normalizeCountValue(routeCount);
  if (normalizedRouteCount !== null && (loading || loadError || loadedCount === 0)) {
    return normalizedRouteCount;
  }
  return loadedCount;
};

export const parseSocialLinksProfileViews = (profileViews) => {
  if (!profileViews) {
    return DEFAULT_SOCIAL_LINKS_STATE;
  }

  try {
    const parsedValue = JSON.parse(profileViews);
    return {
      links: parsedValue?.links || null,
      visibility: parsedValue?.visibility || 'everyone',
      parseFailed: false,
    };
  } catch (_error) {
    return {
      ...DEFAULT_SOCIAL_LINKS_STATE,
      parseFailed: true,
    };
  }
};

export const getSelectedMessagesLabel = ({ count, t }) => {
  const safeCount = Number.isFinite(count) ? count : 0;
  const translationKey = safeCount === 1 ? 'chats.selectionSingle' : 'chats.selectionMultiple';
  return t(translationKey, { count: safeCount });
};