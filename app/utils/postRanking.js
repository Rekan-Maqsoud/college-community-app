const SCORING_WEIGHTS = {
  UNSEEN: 100,
  UNANSWERED_QUESTION: 80,
  NEW_POST: 50,
  ENGAGEMENT: 30,
  RECENCY: 20,
  ANSWERED_QUESTION: -10,
  OLD_POST: -20,
};

const TIME_DECAY_HOURS = {
  VERY_NEW: 2,
  NEW: 24,
  RECENT: 72,
  OLD: 168,
};

export const calculatePostScore = (post, userInteractions = {}) => {
  let score = 0;
  const now = new Date();
  const postDate = new Date(post.$createdAt);
  const hoursSincePost = (now - postDate) / (1000 * 60 * 60);

  const isUnseen = !userInteractions[post.$id]?.viewed;
  const isQuestion = post.postType === 'question';
  const isUnanswered = isQuestion && (post.replyCount === 0 || !post.hasAcceptedAnswer);

  if (isUnseen) {
    score += SCORING_WEIGHTS.UNSEEN;
  }

  if (isUnanswered) {
    score += SCORING_WEIGHTS.UNANSWERED_QUESTION;
  }

  if (hoursSincePost <= TIME_DECAY_HOURS.VERY_NEW) {
    score += SCORING_WEIGHTS.NEW_POST * 2;
  } else if (hoursSincePost <= TIME_DECAY_HOURS.NEW) {
    score += SCORING_WEIGHTS.NEW_POST;
  } else if (hoursSincePost <= TIME_DECAY_HOURS.RECENT) {
    score += SCORING_WEIGHTS.NEW_POST * 0.5;
  }

  const engagementScore = Math.min(
    ((post.likeCount || 0) * 2 + (post.replyCount || 0) * 3),
    SCORING_WEIGHTS.ENGAGEMENT
  );
  score += engagementScore;

  const recencyScore = Math.max(
    SCORING_WEIGHTS.RECENCY * (1 - hoursSincePost / TIME_DECAY_HOURS.OLD),
    0
  );
  score += recencyScore;

  if (isQuestion && post.hasAcceptedAnswer) {
    score += SCORING_WEIGHTS.ANSWERED_QUESTION;
  }

  if (hoursSincePost > TIME_DECAY_HOURS.OLD) {
    score += SCORING_WEIGHTS.OLD_POST;
  }

  if (post.isPinned) {
    score += 200;
  }

  if (post.postType === 'announcement') {
    score += 150;
  }

  return Math.max(score, 0);
};

export const rankPosts = (posts, userInteractions = {}) => {
  const scoredPosts = posts.map(post => ({
    ...post,
    _score: calculatePostScore(post, userInteractions),
  }));

  return scoredPosts.sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;

    if (b._score !== a._score) {
      return b._score - a._score;
    }

    return new Date(b.$createdAt) - new Date(a.$createdAt);
  });
};

export const shouldShowPost = (post, filters = {}) => {
  if (filters.onlyUnanswered && post.postType === 'question') {
    return post.replyCount === 0 || !post.hasAcceptedAnswer;
  }

  if (filters.onlyNew) {
    const hoursSincePost = (new Date() - new Date(post.$createdAt)) / (1000 * 60 * 60);
    return hoursSincePost <= TIME_DECAY_HOURS.NEW;
  }

  if (filters.postType && post.postType !== filters.postType) {
    return false;
  }

  return true;
};

export const groupPostsByPriority = (posts, userInteractions = {}) => {
  const ranked = rankPosts(posts, userInteractions);
  
  return {
    pinned: ranked.filter(p => p.isPinned),
    unseenUnanswered: ranked.filter(p => 
      !p.isPinned && 
      !userInteractions[p.$id]?.viewed && 
      p.postType === 'question' && 
      (p.replyCount === 0 || !p.hasAcceptedAnswer)
    ),
    unseenOther: ranked.filter(p => 
      !p.isPinned && 
      !userInteractions[p.$id]?.viewed && 
      (p.postType !== 'question' || p.hasAcceptedAnswer)
    ),
    seenUnanswered: ranked.filter(p => 
      !p.isPinned && 
      userInteractions[p.$id]?.viewed && 
      p.postType === 'question' && 
      (p.replyCount === 0 || !p.hasAcceptedAnswer)
    ),
    seenOther: ranked.filter(p => 
      !p.isPinned && 
      userInteractions[p.$id]?.viewed && 
      (p.postType !== 'question' || p.hasAcceptedAnswer)
    ),
  };
};

// =============================================================================
// VIEWER-CONTEXT AWARE RANKING (Universal — applies to students and guests)
//
// Factors (in order of importance):
//   1. isFriend        – viewer mutually follows the author (+50)
//   2. isTargetedToYou – post explicitly targets viewer's dept/college/uni (+40)
//   3. isOwnDept       – post is from viewer's own department (+20)  [students]
//   4. engagement      – log(likes) * 5 + log(replies) * 3
//   5. recency         – 20 / sqrt(hoursSinceCreation)   (newer = higher)
//   6. freshness       – 10 / sqrt(hoursSinceLastUpdate) (recent activity bump)
//
// The inverse-sqrt decay guarantees new posts always outrank old ones at
// equal engagement levels.
// =============================================================================

/**
 * Compute a viewer-specific relevance score for a post.
 * Higher score = shown first.
 *
 * @param {Object} post
 * @param {Object} context
 * @param {string[]} context.friendIds          – IDs of mutual follows
 * @param {string}   context.userDepartment     – viewer's department ('' for guests)
 * @param {string}   context.userCollege        – viewer's college ('' for guests)
 * @param {string}   context.userUniversity     – viewer's university ('' for guests)
 * @param {string[]} context.targetDepartments  – departments viewer follows (guests)
 * @returns {number}
 */
export const computePostScore = (post, context = {}) => {
  const {
    friendIds = [],
    userDepartment = '',
    userCollege = '',
    userUniversity = '',
    targetDepartments = [],
  } = context;

  if (!post || typeof post !== 'object') return 0;

  const now = Date.now();
  const createdMs = post.$createdAt ? new Date(post.$createdAt).getTime() : now;
  const updatedMs = post.$updatedAt  ? new Date(post.$updatedAt).getTime()  : createdMs;

  const hoursSinceCreate = Math.max(0.5, (now - createdMs) / 3_600_000);
  const hoursSinceUpdate = Math.max(0.5, (now - updatedMs) / 3_600_000);

  const isFriend    = friendIds.includes(post.userId) ? 1 : 0;
  const isOwnDept   = userDepartment && post.department === userDepartment ? 1 : 0;

  const postTargets = Array.isArray(post.targetDepartments) ? post.targetDepartments : [];
  const isTargeted  = postTargets.length > 0 && (
    (userDepartment && postTargets.includes(userDepartment)) ||
    (userCollege    && postTargets.includes(userCollege))    ||
    (userUniversity && postTargets.includes(userUniversity)) ||
    targetDepartments.some(td => postTargets.includes(td))
  ) ? 1 : 0;

  const likes   = Math.max(0, Number(post.likeCount)  || 0);
  const replies = Math.max(0, Number(post.replyCount) || 0);

  const recencyScore   = 20 / Math.sqrt(hoursSinceCreate);
  const freshnessScore = 10 / Math.sqrt(hoursSinceUpdate);

  return (
    isFriend  * 50 +
    isTargeted * 40 +
    isOwnDept  * 20 +
    Math.log2(1 + likes)   * 5 +
    Math.log2(1 + replies) * 3 +
    recencyScore  +
    freshnessScore
  );
};

/**
 * Sort posts by viewer-context relevance score (descending).
 * Returns a new array — does not mutate the original.
 *
 * @param {Object[]} posts
 * @param {Object}   context – same as computePostScore context
 * @returns {Object[]}
 */
export const sortPostsByScore = (posts, context = {}) => {
  if (!Array.isArray(posts) || posts.length === 0) return posts;
  return [...posts].sort(
    (a, b) => computePostScore(b, context) - computePostScore(a, context)
  );
};

/**
 * Build the ranking context object from the current UserContext user.
 *
 * @param {Object}   user       – UserContext user object
 * @param {string[]} friendIds  – IDs of mutually-following users
 * @returns {Object}
 */
export const buildRankingContext = (user, friendIds = []) => ({
  friendIds,
  userDepartment:   user?.department  || '',
  userCollege:      user?.college     || '',
  userUniversity:   user?.university  || '',
  targetDepartments: [],
});
