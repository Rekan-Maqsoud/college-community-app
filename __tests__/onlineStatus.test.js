import { isUserOnline, getLastSeenText } from '../app/utils/onlineStatus';

describe('onlineStatus utilities', () => {
  const t = (key) => {
    const map = {
      'chats.lastSeenJustNow': 'just now',
      'chats.lastSeenMinutes': '{count} minutes ago',
      'chats.lastSeenHours': '{count} hours ago',
      'chats.lastSeenDays': '{count} days ago',
      'chats.lastSeenDate': 'last seen {date}',
    };
    return map[key] || key;
  };

  it('returns false for missing lastSeen', () => {
    expect(isUserOnline(null)).toBe(false);
  });

  it('returns true when user seen recently', () => {
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString();
    expect(isUserOnline(oneMinuteAgo)).toBe(true);
  });

  it('returns null text for online user', () => {
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString();
    expect(getLastSeenText(oneMinuteAgo, t)).toBeNull();
  });

  it('formats minutes and hours last seen', () => {
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();

    expect(getLastSeenText(tenMinutesAgo, t)).toContain('10');
    expect(getLastSeenText(threeHoursAgo, t)).toContain('3');
  });
});
