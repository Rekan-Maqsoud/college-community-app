const {
  resolveFollowTabCount,
  parseSocialLinksProfileViews,
  getSelectedMessagesLabel,
} = require('../app/utils/uiUxAuditHelpers');

describe('ui ux audit helpers', () => {
  describe('resolveFollowTabCount', () => {
    it('uses route counts while list data is still loading', () => {
      expect(resolveFollowTabCount({
        routeCount: 14,
        loadedCount: 0,
        loading: true,
        loadError: null,
      })).toBe(14);
    });

    it('prefers loaded counts once data is available', () => {
      expect(resolveFollowTabCount({
        routeCount: 14,
        loadedCount: 11,
        loading: false,
        loadError: null,
      })).toBe(11);
    });
  });

  describe('parseSocialLinksProfileViews', () => {
    it('parses social links payloads without marking a failure', () => {
      expect(parseSocialLinksProfileViews('{"links":{"github":"copilot"},"visibility":"friends"}')).toEqual({
        links: { github: 'copilot' },
        visibility: 'friends',
        parseFailed: false,
      });
    });

    it('returns a visible fallback state when profileViews JSON is invalid', () => {
      expect(parseSocialLinksProfileViews('{invalid-json')).toEqual({
        links: null,
        visibility: 'everyone',
        parseFailed: true,
      });
    });
  });

  describe('getSelectedMessagesLabel', () => {
    it('uses the single-message translation key for one selection', () => {
      const t = jest.fn((key) => key);

      expect(getSelectedMessagesLabel({ count: 1, t })).toBe('chats.selectionSingle');
      expect(t).toHaveBeenCalledWith('chats.selectionSingle', { count: 1 });
    });

    it('uses the multi-message translation key for multiple selections', () => {
      const t = jest.fn((key, options) => `${key}:${options.count}`);

      expect(getSelectedMessagesLabel({ count: 3, t })).toBe('chats.selectionMultiple:3');
      expect(t).toHaveBeenCalledWith('chats.selectionMultiple', { count: 3 });
    });
  });
});