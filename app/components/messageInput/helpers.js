export const formatVoiceDuration = (durationMs) => {
  const totalSeconds = Math.max(0, Math.floor((durationMs || 0) / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

export const serializeVoiceWaveform = (samples, targetBars) => {
  const sanitized = (Array.isArray(samples) ? samples : [])
    .map((sample) => Number(sample))
    .filter((sample) => Number.isFinite(sample))
    .map((sample) => Math.max(0.08, Math.min(1, sample)));

  if (sanitized.length === 0) {
    return Array(targetBars).fill(0.15);
  }

  return Array.from({ length: targetBars }, (_, index) => {
    const segmentStart = Math.floor((index * sanitized.length) / targetBars);
    const segmentEnd = Math.max(
      segmentStart + 1,
      Math.floor(((index + 1) * sanitized.length) / targetBars)
    );
    const segment = sanitized.slice(segmentStart, segmentEnd);
    const peak = Math.max(...segment);
    const average = segment.reduce((sum, value) => sum + value, 0) / Math.max(1, segment.length);
    const signal = Math.max(0.08, Math.min(1, (peak * 0.78) + (average * 0.22)));
    return Number(signal.toFixed(3));
  });
};

export const buildMentionSuggestions = ({
  canMentionEveryone,
  t,
  groupMembers,
  friends,
  mentionQuery,
  excludedUserIds = [],
}) => {
  const suggestions = [];
  if (canMentionEveryone) {
    suggestions.push({
      id: 'everyone',
      name: 'everyone',
      displayName: t('chats.mentionEveryone') || 'Everyone',
      isSpecial: true,
    });
  }

  const allUsers = [...groupMembers];
  friends.forEach((friend) => {
    if (!allUsers.find((user) => user.$id === friend.$id)) {
      allUsers.push(friend);
    }
  });

  const q = (mentionQuery || '').toLowerCase();
  const excludedSet = new Set(Array.isArray(excludedUserIds) ? excludedUserIds : []);
  const filtered = allUsers.filter((user) => {
    if (excludedSet.has(user.$id)) {
      return false;
    }
    const name = (user.name || user.fullName || '').toLowerCase();
    return name.includes(q);
  });

  filtered.slice(0, 3).forEach((user) => {
    suggestions.push({
      id: user.$id,
      name: user.name || user.fullName,
      displayName: user.name || user.fullName,
      profilePicture: user.profilePicture,
      isSpecial: false,
    });
  });

  return suggestions.slice(0, 4);
};
