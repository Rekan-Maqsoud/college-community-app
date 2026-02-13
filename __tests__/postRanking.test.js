import {
  calculatePostScore,
  rankPosts,
  shouldShowPost,
  groupPostsByPriority,
} from '../app/utils/postRanking';

const nowIso = new Date().toISOString();
const twoHoursAgoIso = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
const tenDaysAgoIso = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();

describe('postRanking utilities', () => {
  it('gives higher score to pinned and unseen unanswered question', () => {
    const post = {
      $id: 'p1',
      $createdAt: nowIso,
      postType: 'question',
      replyCount: 0,
      hasAcceptedAnswer: false,
      likeCount: 0,
      isPinned: true,
    };

    const score = calculatePostScore(post, {});
    expect(score).toBeGreaterThan(250);
  });

  it('does not return negative score for very old answered post', () => {
    const post = {
      $id: 'p2',
      $createdAt: tenDaysAgoIso,
      postType: 'question',
      replyCount: 3,
      hasAcceptedAnswer: true,
      likeCount: 0,
      isPinned: false,
    };

    expect(calculatePostScore(post, { p2: { viewed: true } })).toBeGreaterThanOrEqual(0);
  });

  it('ranks pinned post first regardless of score ties', () => {
    const posts = [
      { $id: 'a', $createdAt: nowIso, postType: 'discussion', likeCount: 1, replyCount: 1, isPinned: false },
      { $id: 'b', $createdAt: tenDaysAgoIso, postType: 'discussion', likeCount: 0, replyCount: 0, isPinned: true },
    ];

    const ranked = rankPosts(posts, {});
    expect(ranked[0].$id).toBe('b');
  });

  it('filters posts using shouldShowPost', () => {
    const unansweredQuestion = { $id: 'q1', $createdAt: nowIso, postType: 'question', replyCount: 0, hasAcceptedAnswer: false };
    const answeredQuestion = { $id: 'q2', $createdAt: nowIso, postType: 'question', replyCount: 2, hasAcceptedAnswer: true };

    expect(shouldShowPost(unansweredQuestion, { onlyUnanswered: true })).toBe(true);
    expect(shouldShowPost(answeredQuestion, { onlyUnanswered: true })).toBe(false);
    expect(shouldShowPost(answeredQuestion, { postType: 'question' })).toBe(true);
    expect(shouldShowPost(answeredQuestion, { postType: 'discussion' })).toBe(false);
  });

  it('groups posts by priority buckets', () => {
    const posts = [
      { $id: 'pinned', $createdAt: nowIso, postType: 'discussion', isPinned: true, replyCount: 0, likeCount: 0 },
      { $id: 'unseenQ', $createdAt: nowIso, postType: 'question', isPinned: false, replyCount: 0, hasAcceptedAnswer: false, likeCount: 0 },
      { $id: 'seenOther', $createdAt: twoHoursAgoIso, postType: 'discussion', isPinned: false, replyCount: 1, likeCount: 2 },
    ];

    const groups = groupPostsByPriority(posts, { seenOther: { viewed: true } });
    expect(groups.pinned.map(p => p.$id)).toContain('pinned');
    expect(groups.unseenUnanswered.map(p => p.$id)).toContain('unseenQ');
    expect(groups.seenOther.map(p => p.$id)).toContain('seenOther');
  });
});
