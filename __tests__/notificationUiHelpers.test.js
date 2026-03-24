import {
  formatNotificationBadgeCount,
  getGroupedNotificationAvatarState,
  MAX_GROUPED_NOTIFICATION_AVATARS,
} from '../app/utils/notificationUiHelpers';

describe('notificationUiHelpers', () => {
  describe('formatNotificationBadgeCount', () => {
    it('returns an empty string for zero or invalid counts', () => {
      expect(formatNotificationBadgeCount(0)).toBe('');
      expect(formatNotificationBadgeCount(null)).toBe('');
      expect(formatNotificationBadgeCount(undefined)).toBe('');
      expect(formatNotificationBadgeCount('oops')).toBe('');
    });

    it('returns the raw count below 100', () => {
      expect(formatNotificationBadgeCount(7)).toBe('7');
      expect(formatNotificationBadgeCount('42')).toBe('42');
    });

    it('caps large counts at 99+', () => {
      expect(formatNotificationBadgeCount(100)).toBe('99+');
      expect(formatNotificationBadgeCount(250)).toBe('99+');
    });
  });

  describe('getGroupedNotificationAvatarState', () => {
    it('deduplicates senders and ignores system notifications', () => {
      const notifications = [
        { $id: '1', senderId: 'user-1', senderName: 'A' },
        { $id: '2', senderId: 'user-1', senderName: 'A Again' },
        { $id: '3', senderId: 'system', senderName: 'System' },
        { $id: '4', senderId: 'user-2', senderName: 'B' },
      ];

      const result = getGroupedNotificationAvatarState(notifications);

      expect(result.uniqueUsers).toHaveLength(2);
      expect(result.visibleUsers).toHaveLength(2);
      expect(result.overflowCount).toBe(0);
      expect(result.hasMultipleActors).toBe(true);
    });

    it('limits visible avatars and reports overflow count', () => {
      const notifications = [
        { $id: '1', senderId: 'user-1', senderName: 'A' },
        { $id: '2', senderId: 'user-2', senderName: 'B' },
        { $id: '3', senderId: 'user-3', senderName: 'C' },
        { $id: '4', senderId: 'user-4', senderName: 'D' },
        { $id: '5', senderId: 'user-5', senderName: 'E' },
      ];

      const result = getGroupedNotificationAvatarState(notifications);

      expect(result.visibleUsers).toHaveLength(MAX_GROUPED_NOTIFICATION_AVATARS);
      expect(result.overflowCount).toBe(2);
      expect(result.visibleUsers.map((item) => item.senderId)).toEqual(['user-1', 'user-2', 'user-3']);
    });

    it('marks a single actor group correctly', () => {
      const result = getGroupedNotificationAvatarState([
        { $id: '1', senderId: 'user-1', senderName: 'Solo' },
      ]);

      expect(result.hasMultipleActors).toBe(false);
      expect(result.overflowCount).toBe(0);
    });
  });
});