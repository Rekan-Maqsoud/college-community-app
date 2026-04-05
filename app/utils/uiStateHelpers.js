export const getAsyncCollectionState = ({ isLoading = false, error = null, itemCount = 0 } = {}) => {
  if (isLoading) return 'loading';
  if (itemCount > 0) return 'content';
  if (error) return 'error';
  return 'empty';
};

export const SEARCH_DEBOUNCE_MS = 400;

const MUTE_PRESET_ENTRIES = [
  { key: 'oneHour', durationMs: 60 * 60 * 1000 },
  { key: 'eightHours', durationMs: 8 * 60 * 60 * 1000 },
  { key: 'oneDay', durationMs: 24 * 60 * 60 * 1000 },
  { key: 'oneWeek', durationMs: 7 * 24 * 60 * 60 * 1000 },
];

export const getMuteOptionState = ({
  isMuted = false,
  muteExpiresAt = null,
  now = Date.now(),
} = {}) => {
  if (!isMuted) {
    return {
      isMuted: false,
      isExpired: false,
      isForever: false,
      remainingMs: 0,
      activeOption: null,
    };
  }

  if (!muteExpiresAt) {
    return {
      isMuted: true,
      isExpired: false,
      isForever: true,
      remainingMs: null,
      activeOption: 'forever',
    };
  }

  const expiresAtMs = new Date(muteExpiresAt).getTime();
  if (!Number.isFinite(expiresAtMs) || expiresAtMs <= now) {
    return {
      isMuted: false,
      isExpired: true,
      isForever: false,
      remainingMs: 0,
      activeOption: null,
    };
  }

  const remainingMs = expiresAtMs - now;
  const activePreset = MUTE_PRESET_ENTRIES.find((preset) => remainingMs <= preset.durationMs);

  return {
    isMuted: true,
    isExpired: false,
    isForever: false,
    remainingMs,
    activeOption: activePreset?.key || 'oneWeek',
  };
};

export const getArchivedCountBadgeText = (count = 0) => {
  const normalizedCount = Math.max(0, Number(count) || 0);
  return normalizedCount > 99 ? '99+' : String(normalizedCount);
};

export const getRepVotingCountdownTone = ({ remainingMs = 0 } = {}) => {
  if (remainingMs < 60 * 1000) {
    return 'danger';
  }

  if (remainingMs < 5 * 60 * 1000) {
    return 'warning';
  }

  return 'normal';
};

export const annotateRepCandidates = ({ candidates = [], classReps = [] } = {}) => {
  const currentRepIds = new Set(
    classReps
      .map((rep) => String(rep?.userId || '').trim())
      .filter(Boolean)
  );

  return candidates.map((candidate) => {
    const candidateId = String(candidate?.$id || candidate?.userID || '').trim();

    return {
      ...candidate,
      isCurrentRep: candidateId ? currentRepIds.has(candidateId) : false,
    };
  });
};

export const hasActiveHomeFilters = ({
  sortBy,
  defaultSortBy,
  filterType = 'all',
  defaultFilterType = 'all',
  selectedStage = 'all',
  defaultStage = 'all',
  answerStatus = 'all',
  defaultAnswerStatus = 'all',
} = {}) => (
  sortBy !== defaultSortBy ||
  filterType !== defaultFilterType ||
  selectedStage !== defaultStage ||
  answerStatus !== defaultAnswerStatus
);

export const shouldScheduleRealtimeNotification = ({
  appState = '',
} = {}) => appState !== 'active';

export const getLectureJoinButtonState = ({
  joinStatus = '',
  isJoining = false,
} = {}) => {
  const isPending = joinStatus === 'pending';

  return {
    disabled: isPending || isJoining,
    isPending,
    showSpinner: isJoining,
    labelKey: isPending ? 'lectures.joinPending' : 'lectures.join',
  };
};

export const isArchiveSwipeGestureStart = ({
  dx = 0,
  dy = 0,
  isRTL = false,
  activationThreshold = 10,
} = {}) => {
  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);

  if (absDx <= absDy) {
    return false;
  }

  return isRTL ? dx > activationThreshold : dx < -activationThreshold;
};

export const clampArchiveTranslateX = ({
  dx = 0,
  isRTL = false,
  maxDistance = 110,
} = {}) => (
  isRTL
    ? Math.min(maxDistance, Math.max(0, dx))
    : Math.max(-maxDistance, Math.min(0, dx))
);

export const shouldTriggerArchive = ({
  dx = 0,
  isRTL = false,
  triggerDistance = 76,
} = {}) => (
  isRTL ? dx >= triggerDistance : dx <= -triggerDistance
);

export const getArchiveDismissOffset = ({
  isRTL = false,
  dismissDistance = 420,
} = {}) => (isRTL ? dismissDistance : -dismissDistance);

export const getArchiveActionRanges = ({
  isRTL = false,
  triggerDistance = 76,
  previewDistance = 12,
} = {}) => (
  isRTL
    ? {
        inputRange: [0, previewDistance, triggerDistance],
        opacityOutputRange: [0, 0, 1],
        scaleOutputRange: [0.92, 0.92, 1],
      }
    : {
        inputRange: [-triggerDistance, -previewDistance, 0],
        opacityOutputRange: [1, 0, 0],
        scaleOutputRange: [1, 0.92, 0.92],
      }
);