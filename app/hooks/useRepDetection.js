/**
 * useRepDetection Hook
 *
 * Detects whether the current user's class has a representative.
 * Gathers all reps across completed elections (max 3 seats).
 * If not, surfaces a flag so the UI can show the voting popup.
 */

import { useState, useEffect, useCallback } from 'react';
import { getActiveElection, getLatestElection, getClassRepresentatives, ELECTION_STATUS } from '../../database/repElections';
import { getMyVote } from '../../database/repVotes';
import { getClassStudents } from '../../database/users';
import { config } from '../../database/config';
import { useRealtimeSubscription } from './useRealtimeSubscription';
import safeStorage from '../utils/safeStorage';

const DISMISS_KEY = 'rep_popup_dismissed';
const MIN_CLASS_SIZE_FOR_REP_POPUP = 5;

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
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Check dismissal cache (per dept+stage, expires at next local day)
      const cacheKey = `${DISMISS_KEY}_${department}_${stage}`;
      const snoozeUntil = await safeStorage.getItem(cacheKey);
      if (snoozeUntil) {
        const until = parseInt(snoozeUntil, 10);
        if (Number.isFinite(until) && Date.now() < until) {
          setDismissed(true);
        }
      }

      // Get all current reps for this class (from completed elections)
      const reps = await getClassRepresentatives(department, stage);
      const classStudents = await getClassStudents(department, stage);
      const stageStudentCount = Array.isArray(classStudents) ? classStudents.length : 0;
      const repIds = reps.map((r) => r.userId);
      setCurrentWinners(repIds);
      setTotalReps(reps.length);

      // Never show popup for very small stages
      if (stageStudentCount < MIN_CLASS_SIZE_FOR_REP_POPUP) {
        setNeedsRep(false);
        setCurrentElection(null);
        return;
      }

      // Check if there's an active election (status=active only)
      const activeElection = await getActiveElection(department, stage);
      // Also get the latest election regardless of status for context
      const latestElection = await getLatestElection(department, stage);

      if (activeElection) {
        const myVote = await getMyVote(activeElection.$id);
        const alreadyVoted = !!myVote?.candidateId;
        // There is an active election — show popup so users can vote
        setNeedsRep(!alreadyVoted);
        setCurrentElection(activeElection);
      } else if (reps.length === 0 && !latestElection) {
        // No election ever, no reps → needs first rep
        setNeedsRep(true);
        setCurrentElection(null);
      } else if (reps.length === 0 && latestElection && latestElection.status !== ELECTION_STATUS.ACTIVE && latestElection.status !== ELECTION_STATUS.TIEBREAKER) {
        // Had elections but no current reps → needs rep
        setNeedsRep(true);
        setCurrentElection(latestElection);
      } else {
        // Has reps, no active election
        setNeedsRep(false);
        setCurrentElection(latestElection || null);
      }
    } catch (error) {
      setNeedsRep(false);
    } finally {
      setLoading(false);
    }
  }, [department, stage]);

  useEffect(() => {
    check();
  }, [check]);

  const handleElectionRealtimeChange = useCallback((payload) => {
    if (!payload || payload.department !== department || payload.stage !== stage) {
      return;
    }
    check();
  }, [check, department, stage]);

  const handleVoteRealtimeChange = useCallback((payload) => {
    if (!payload || payload.department !== department || payload.stage !== stage) {
      return;
    }
    check();
  }, [check, department, stage]);

  useRealtimeSubscription(
    config.repElectionsCollectionId,
    handleElectionRealtimeChange,
    handleElectionRealtimeChange,
    { enabled: !!department && !!stage && !!config.repElectionsCollectionId }
  );

  useRealtimeSubscription(
    config.repVotesCollectionId,
    handleVoteRealtimeChange,
    handleVoteRealtimeChange,
    { enabled: !!department && !!stage && !!config.repVotesCollectionId }
  );

  const dismiss = useCallback(async () => {
    setDismissed(true);
    setNeedsRep(false);
    if (department && stage) {
      const cacheKey = `${DISMISS_KEY}_${department}_${stage}`;
      const now = new Date();
      const nextDay = new Date(now);
      nextDay.setDate(now.getDate() + 1);
      nextDay.setHours(0, 0, 0, 0);
      await safeStorage.setItem(cacheKey, String(nextDay.getTime()));
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
