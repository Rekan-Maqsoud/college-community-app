export const extractLectureMentionUserIds = (text = '') => {
  const source = String(text || '');
  if (!source) {
    return [];
  }

  const matches = source.match(/@([a-zA-Z0-9_-]{6,64})/g) || [];
  const ids = matches
    .map(match => match.replace('@', '').trim())
    .filter(Boolean);

  return [...new Set(ids)];
};

export const extractYouTubeVideoId = (url = '') => {
  const raw = String(url || '').trim();
  if (!raw) {
    return '';
  }

  const shortMatch = raw.match(/youtu\.be\/([^?&/]+)/i);
  if (shortMatch?.[1]) {
    return shortMatch[1];
  }

  const watchMatch = raw.match(/[?&]v=([^?&/]+)/i);
  if (watchMatch?.[1]) {
    return watchMatch[1];
  }

  const embedMatch = raw.match(/embed\/([^?&/]+)/i);
  if (embedMatch?.[1]) {
    return embedMatch[1];
  }

  return '';
};

export const sortLectureAssetsPinnedFirst = (assets = []) => {
  const list = Array.isArray(assets) ? [...assets] : [];

  return list.sort((first, second) => {
    const firstPinned = first?.isPinned ? 1 : 0;
    const secondPinned = second?.isPinned ? 1 : 0;

    if (firstPinned !== secondPinned) {
      return secondPinned - firstPinned;
    }

    const firstDate = new Date(first?.$createdAt || 0).getTime();
    const secondDate = new Date(second?.$createdAt || 0).getTime();
    return secondDate - firstDate;
  });
};
