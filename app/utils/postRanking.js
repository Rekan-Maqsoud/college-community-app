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
