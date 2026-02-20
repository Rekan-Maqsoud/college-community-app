import {
  extractLectureMentionUserIds,
  extractYouTubeVideoId,
  sortLectureAssetsPinnedFirst,
} from '../app/utils/lectureUtils';

describe('lectureUtils', () => {
  it('extracts unique mention user IDs from comment text', () => {
    const result = extractLectureMentionUserIds('hello @user_123 and @abcDEF99 and again @user_123');
    expect(result).toEqual(['user_123', 'abcDEF99']);
  });

  it('returns empty mention list for empty text', () => {
    expect(extractLectureMentionUserIds('')).toEqual([]);
    expect(extractLectureMentionUserIds(null)).toEqual([]);
  });

  it('extracts YouTube IDs from watch and short links', () => {
    expect(extractYouTubeVideoId('https://www.youtube.com/watch?v=abcdEFG1234')).toBe('abcdEFG1234');
    expect(extractYouTubeVideoId('https://youtu.be/xyz987_QQaA?t=10')).toBe('xyz987_QQaA');
  });

  it('returns empty YouTube ID for unsupported urls', () => {
    expect(extractYouTubeVideoId('https://example.com/video')).toBe('');
  });

  it('sorts pinned assets first and by newest date inside groups', () => {
    const sorted = sortLectureAssetsPinnedFirst([
      { $id: '1', isPinned: false, $createdAt: '2026-01-01T00:00:00.000Z' },
      { $id: '2', isPinned: true, $createdAt: '2026-01-01T00:00:00.000Z' },
      { $id: '3', isPinned: true, $createdAt: '2026-01-05T00:00:00.000Z' },
      { $id: '4', isPinned: false, $createdAt: '2026-01-06T00:00:00.000Z' },
    ]);

    expect(sorted.map(item => item.$id)).toEqual(['3', '2', '4', '1']);
  });
});
