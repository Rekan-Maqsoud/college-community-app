/**
 * useRepDetection Hook
 *
 * Detects whether the current user's class has a representative.
 * Gathers all reps across completed elections (max 3 seats).
 * If not, surfaces a flag so the UI can show the voting popup.
 */

import { useState, useEffect, useCallback } from 'react';
import { getActiveElection, getLatestElection, getClassRepresentatives, getNextSeatNumber, ensureActiveElectionsForAllClasses, ELECTION_STATUS } from '../../database/repElections';
import { getMyVote } from '../../database/repVotes';
import safeStorage from '../utils/safeStorage';

const DISMISS_KEY = 'rep_popup_dismissed';

const useRepDetection = (user) => {
  const [needsRep, setNeedsRep] = useState(false);
  const [currentElection, setCurrentElection] = useState(null);
  const [currentWinners, setCurrentWinners] = useState([]);
  const [totalReps, setTotalReps] = useState(0);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  const department = user?.department;
  const stage = user?.stage;

  const check = useCallback(async () => {
    if (!department || !stage) {
      console.log('[REP_DEBUG] useRepDetection:skipMissingContext', { department, stage });
      setLoading(false);
      return;
    }

    try {
      console.log('[REP_DEBUG] useRepDetection:checkStart', {
        userId: user?.$id,
        department,
        stage,
      });
      await ensureActiveElectionsForAllClasses();
      setLoading(true);

      // Check dismissal cache (per dept+stage, expires after 24h)
      const cacheKey = `${DISMISS_KEY}_${department}_${stage}`;
      const dismissedAt = await safeStorage.getItem(cacheKey);
      if (dismissedAt) {
        const elapsed = Date.now() - parseInt(dismissedAt, 10);
        if (elapsed < 24 * 60 * 60 * 1000) {
          setDismissed(true);
        }
      }

      // Get all current reps for this class (from completed elections)
      const reps = await getClassRepresentatives(department, stage);
      const repIds = reps.map((r) => r.userId);
      setCurrentWinners(repIds);
      setTotalReps(reps.length);

      // Check if there's an active election (status=active only)
      const activeElection = await getActiveElection(department, stage);
      // Also get the latest election regardless of status for context
      const latestElection = await getLatestElection(department, stage);

      console.log('[REP_DEBUG] useRepDetection:data', {
        repsCount: reps.length,
        activeElectionId: activeElection?.$id || null,
        activeElectionStatus: activeElection?.status || null,
        latestElectionId: latestElection?.$id || null,
        latestElectionStatus: latestElection?.status || null,
      });

      if (activeElection) {
        const myVote = await getMyVote(activeElection.$id);
        const alreadyVoted = !!myVote?.candidateId;
        // There is an active election — show popup so users can vote
        setNeedsRep(!alreadyVoted);
        setCurrentElection(activeElection);
        console.log('[REP_DEBUG] useRepDetection:needsRepActiveElection', {
          electionId: activeElection.$id,
          alreadyVoted,
        });
      } else if (reps.length === 0 && !latestElection) {
        // No election ever, no reps → needs first rep
        setNeedsRep(true);
        setCurrentElection(null);
        console.log('[REP_DEBUG] useRepDetection:needsRepNoElectionNoRep');
      } else if (reps.length === 0 && latestElection && latestElection.status !== ELECTION_STATUS.ACTIVE && latestElection.status !== ELECTION_STATUS.TIEBREAKER) {
        // Had elections but no current reps → needs rep
        setNeedsRep(true);
        setCurrentElection(latestElection);
        console.log('[REP_DEBUG] useRepDetection:needsRepNoRepLatestExists', {
          latestStatus: latestElection.status,
        });
      } else {
        // Has reps, no active election
        setNeedsRep(false);
        setCurrentElection(latestElection || null);
        console.log('[REP_DEBUG] useRepDetection:noPopupNeeded', {
          repsCount: reps.length,
          latestStatus: latestElection?.status || null,
        });
      }
    } catch (error) {
      console.log('[REP_DEBUG] useRepDetection:error', { message: error?.message });
      setNeedsRep(false);
    } finally {
      setLoading(false);
    }
  }, [department, stage]);

  useEffect(() => {
    check();
  }, [check]);

  const dismiss = useCallback(async () => {
    setDismissed(true);
    setNeedsRep(false);
    if (department && stage) {
      const cacheKey = `${DISMISS_KEY}_${department}_${stage}`;
      await safeStorage.setItem(cacheKey, String(Date.now()));
    }
  }, [department, stage]);

  const refresh = useCallback(() => {
    setDismissed(false);
    check();
  }, [check]);

  /**
   * Check if a given userId is a representative.
   */
  const isUserRepresentative = useCallback(
    (userId) => {
      if (!userId || !currentWinners.length) return false;
      return currentWinners.includes(userId);
    },
    [currentWinners],
  );

  return {
    needsRep: needsRep && !dismissed,
    hasActiveElection: currentElection?.status === ELECTION_STATUS.ACTIVE || currentElection?.status === ELECTION_STATUS.TIEBREAKER,
    currentElection,
    currentWinners,
    totalReps,
    loading,
    dismiss,
    refresh,
    isUserRepresentative,
  };
};

export default useRepDetection;
