export const MAX_GROUPED_NOTIFICATION_AVATARS = 3;

export const formatNotificationBadgeCount = (count) => {
  const normalizedCount = Number(count);
  if (!Number.isFinite(normalizedCount) || normalizedCount <= 0) {
    return '';
  }

  return normalizedCount > 99 ? '99+' : String(normalizedCount);
};

export const getGroupedNotificationAvatarState = (
  notifications = [],
  maxVisibleAvatars = MAX_GROUPED_NOTIFICATION_AVATARS,
) => {
  const uniqueUsers = [];
  const seenIds = new Set();

  for (const notification of notifications) {
    const senderId = String(notification?.senderId || '').trim();
    if (!senderId || senderId === 'system' || seenIds.has(senderId)) {
      continue;
    }

    seenIds.add(senderId);
    uniqueUsers.push(notification);
  }

  const visibleUsers = uniqueUsers.slice(0, maxVisibleAvatars);
  const overflowCount = Math.max(0, uniqueUsers.length - visibleUsers.length);

  return {
    uniqueUsers,
    visibleUsers,
    overflowCount,
    hasMultipleActors: uniqueUsers.length > 1,
  };
};