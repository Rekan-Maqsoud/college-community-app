/**
 * useRepDetection Hook
 *
 * Detects whether the current user's class has a representative.
 * Gathers all reps across completed elections (max 3 seats).
 * If not, surfaces a flag so the UI can show the voting popup.
 */

import { useState, useEffect, useCallback } from 'react';
import { getActiveElection, getClassRepresentatives, getNextSeatNumber, ELECTION_STATUS } from '../../database/repElections';
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
      setLoading(false);
      return;
    }

    try {
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

      // Check if there's an active election for seat 1
      const election = await getActiveElection(department, stage);

      if (!election && reps.length === 0) {
        // No election ever, no reps → needs first rep
        setNeedsRep(true);
        setCurrentElection(null);
      } else if (election && election.status === ELECTION_STATUS.ACTIVE) {
        // There is an active election
        setNeedsRep(false);
        setCurrentElection(election);
      } else if (reps.length > 0) {
        // Has reps, no active election
        setNeedsRep(false);
        setCurrentElection(election || null);
      } else {
        setNeedsRep(true);
        setCurrentElection(election || null);
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
    hasActiveElection: currentElection?.status === ELECTION_STATUS.ACTIVE,
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
