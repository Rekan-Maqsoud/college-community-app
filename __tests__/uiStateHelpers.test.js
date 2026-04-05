import {
  SEARCH_DEBOUNCE_MS,
  annotateRepCandidates,
  clampArchiveTranslateX,
  getArchiveActionRanges,
  getArchiveDismissOffset,
  getArchivedCountBadgeText,
  getAsyncCollectionState,
  getLectureJoinButtonState,
  getMuteOptionState,
  getRepVotingCountdownTone,
  hasActiveHomeFilters,
  isArchiveSwipeGestureStart,
  shouldShowHomeFeedSelector,
  shouldScheduleRealtimeNotification,
  shouldTriggerArchive,
} from '../app/utils/uiStateHelpers';

describe('uiStateHelpers', () => {
  describe('getAsyncCollectionState', () => {
    it('prioritizes loading over all other states', () => {
      expect(getAsyncCollectionState({ isLoading: true, error: 'boom', itemCount: 0 })).toBe('loading');
    });

    it('returns content when items are available even if an error exists', () => {
      expect(getAsyncCollectionState({ isLoading: false, error: 'boom', itemCount: 2 })).toBe('content');
    });

    it('returns error when empty and failed', () => {
      expect(getAsyncCollectionState({ isLoading: false, error: 'boom', itemCount: 0 })).toBe('error');
    });

    it('returns empty when not loading and no data exists', () => {
      expect(getAsyncCollectionState({ isLoading: false, error: null, itemCount: 0 })).toBe('empty');
    });
  });

  describe('hasActiveHomeFilters', () => {
    const defaultState = {
      sortBy: 'newest',
      defaultSortBy: 'newest',
      filterType: 'all',
      defaultFilterType: 'all',
      selectedStage: 'all',
      defaultStage: 'all',
      answerStatus: 'all',
      defaultAnswerStatus: 'all',
    };

    it('returns false when all filters are at their defaults', () => {
      expect(hasActiveHomeFilters(defaultState)).toBe(false);
    });

    it('returns true when sort changes', () => {
      expect(hasActiveHomeFilters({ ...defaultState, sortBy: 'popular' })).toBe(true);
    });

    it('returns true when a feed filter changes', () => {
      expect(hasActiveHomeFilters({ ...defaultState, filterType: 'question' })).toBe(true);
      expect(hasActiveHomeFilters({ ...defaultState, selectedStage: 'stage_2' })).toBe(true);
      expect(hasActiveHomeFilters({ ...defaultState, answerStatus: 'answered' })).toBe(true);
    });
  });

  describe('shouldShowHomeFeedSelector', () => {
    it('shows the selector for student/non-guest users', () => {
      expect(shouldShowHomeFeedSelector({ isGuestUser: false })).toBe(true);
    });

    it('hides the selector for guest users', () => {
      expect(shouldShowHomeFeedSelector({ isGuestUser: true })).toBe(false);
    });

    it('fails closed when visibility input is missing', () => {
      expect(shouldShowHomeFeedSelector()).toBe(false);
    });
  });

  describe('shouldScheduleRealtimeNotification', () => {
    it('does not schedule local notifications while the app is active', () => {
      expect(shouldScheduleRealtimeNotification({ appState: 'active' })).toBe(false);
    });

    it('allows local notifications when the app is inactive or backgrounded', () => {
      expect(shouldScheduleRealtimeNotification({ appState: 'inactive' })).toBe(true);
      expect(shouldScheduleRealtimeNotification({ appState: 'background' })).toBe(true);
    });
  });

  describe('getLectureJoinButtonState', () => {
    it('shows a spinner and disables the button while a join request is in flight', () => {
      expect(getLectureJoinButtonState({ joinStatus: '', isJoining: true })).toEqual({
        disabled: true,
        isPending: false,
        showSpinner: true,
        labelKey: 'lectures.join',
      });
    });

    it('keeps the pending state disabled without a spinner', () => {
      expect(getLectureJoinButtonState({ joinStatus: 'pending', isJoining: false })).toEqual({
        disabled: true,
        isPending: true,
        showSpinner: false,
        labelKey: 'lectures.joinPending',
      });
    });
  });

  describe('mute option state helpers', () => {
    it('returns an inactive state when the chat is not muted', () => {
      expect(getMuteOptionState({ isMuted: false })).toEqual({
        isMuted: false,
        isExpired: false,
        isForever: false,
        remainingMs: 0,
        activeOption: null,
      });
    });

    it('marks permanent mutes as forever and highlights the forever option', () => {
      expect(getMuteOptionState({ isMuted: true, muteExpiresAt: null })).toEqual({
        isMuted: true,
        isExpired: false,
        isForever: true,
        remainingMs: null,
        activeOption: 'forever',
      });
    });

    it('maps active timed mutes to the nearest matching preset bucket', () => {
      const now = Date.UTC(2026, 2, 24, 10, 0, 0);
      const oneDayLater = new Date(now + (23 * 60 * 60 * 1000)).toISOString();

      expect(getMuteOptionState({
        isMuted: true,
        muteExpiresAt: oneDayLater,
        now,
      })).toMatchObject({
        isMuted: true,
        isForever: false,
        isExpired: false,
        activeOption: 'oneDay',
      });
    });

    it('treats expired mute windows as inactive', () => {
      const now = Date.UTC(2026, 2, 24, 10, 0, 0);
      const expired = new Date(now - 1000).toISOString();

      expect(getMuteOptionState({
        isMuted: true,
        muteExpiresAt: expired,
        now,
      })).toEqual({
        isMuted: false,
        isExpired: true,
        isForever: false,
        remainingMs: 0,
        activeOption: null,
      });
    });
  });

  describe('archived count helpers', () => {
    it('formats archived counts with a 99+ cap', () => {
      expect(getArchivedCountBadgeText(0)).toBe('0');
      expect(getArchivedCountBadgeText(7)).toBe('7');
      expect(getArchivedCountBadgeText(120)).toBe('99+');
    });
  });

  describe('rep voting helpers', () => {
    it('marks countdown urgency as warning and danger near the deadline', () => {
      expect(getRepVotingCountdownTone({ remainingMs: 10 * 60 * 1000 })).toBe('normal');
      expect(getRepVotingCountdownTone({ remainingMs: 4 * 60 * 1000 })).toBe('warning');
      expect(getRepVotingCountdownTone({ remainingMs: 30 * 1000 })).toBe('danger');
    });

    it('annotates candidates who already hold a representative seat', () => {
      expect(annotateRepCandidates({
        candidates: [
          { $id: 'student-1', name: 'A' },
          { $id: 'student-2', name: 'B' },
        ],
        classReps: [
          { userId: 'student-2', seatNumber: 1 },
        ],
      })).toEqual([
        { $id: 'student-1', name: 'A', isCurrentRep: false },
        { $id: 'student-2', name: 'B', isCurrentRep: true },
      ]);
    });
  });

  describe('search helpers', () => {
    it('uses the faster debounce window for search input', () => {
      expect(SEARCH_DEBOUNCE_MS).toBe(400);
    });
  });

  describe('archive swipe helpers', () => {
    it('starts archive gestures in the correct direction for each layout', () => {
      expect(isArchiveSwipeGestureStart({ dx: -18, dy: 2, isRTL: false })).toBe(true);
      expect(isArchiveSwipeGestureStart({ dx: 18, dy: 2, isRTL: true })).toBe(true);
      expect(isArchiveSwipeGestureStart({ dx: 18, dy: 24, isRTL: true })).toBe(false);
      expect(isArchiveSwipeGestureStart({ dx: -18, dy: 2, isRTL: true })).toBe(false);
    });

    it('clamps swipe translation within the active archive direction', () => {
      expect(clampArchiveTranslateX({ dx: -999, isRTL: false, maxDistance: 110 })).toBe(-110);
      expect(clampArchiveTranslateX({ dx: 40, isRTL: false, maxDistance: 110 })).toBe(0);
      expect(clampArchiveTranslateX({ dx: 999, isRTL: true, maxDistance: 110 })).toBe(110);
      expect(clampArchiveTranslateX({ dx: -40, isRTL: true, maxDistance: 110 })).toBe(0);
    });

    it('triggers archive and dismiss offsets in mirrored directions', () => {
      expect(shouldTriggerArchive({ dx: -76, isRTL: false, triggerDistance: 76 })).toBe(true);
      expect(shouldTriggerArchive({ dx: 76, isRTL: true, triggerDistance: 76 })).toBe(true);
      expect(getArchiveDismissOffset({ isRTL: false, dismissDistance: 420 })).toBe(-420);
      expect(getArchiveDismissOffset({ isRTL: true, dismissDistance: 420 })).toBe(420);
    });

    it('returns mirrored interpolation ranges for archive action affordances', () => {
      expect(getArchiveActionRanges({ isRTL: false, triggerDistance: 76, previewDistance: 12 })).toEqual({
        inputRange: [-76, -12, 0],
        opacityOutputRange: [1, 0, 0],
        scaleOutputRange: [1, 0.92, 0.92],
      });
      expect(getArchiveActionRanges({ isRTL: true, triggerDistance: 76, previewDistance: 12 })).toEqual({
        inputRange: [0, 12, 76],
        opacityOutputRange: [0, 0, 1],
        scaleOutputRange: [0.92, 0.92, 1],
      });
    });
  });
});