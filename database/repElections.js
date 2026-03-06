/**
 * Representative Elections Database Module
 * 
 * Manages election lifecycle: create, finalize, reselection requests.
 * Each election elects exactly ONE winner for a specific seat.
 * A class can have at most 3 representatives (seat 1, 2, 3).
 * 
 * ── repElections Collection Columns ──────────────────────────────────
 * | Column               | Type     | Required | Default | Notes                                        |
 * |----------------------|----------|----------|---------|----------------------------------------------|
 * | $id                  | string   | auto     | —       | Document ID                                  |
 * | department           | string   | ✓        | —       | Department key                               |
 * | stage                | string   | ✓        | —       | Stage key (firstYear, secondYear, …)         |
 * | status               | string   | ✓        | idle    | idle | active | completed | reselection_pending |
 * | seatNumber           | integer  | ✓        | 1       | Which rep seat (1, 2, or 3)                  |
 * | winner               | string   | —        | null    | Single user ID elected as representative     |
 * | totalStudents        | integer  | —        | 0       | Snapshot of class size at election time       |
 * | reselectionVoters    | string[] | —        | []      | Users who requested reselection              |
 * | reselectionThreshold | integer  | —        | 0       | Half of totalStudents (cached)               |
 * | startedAt            | datetime | —        | null    | When election started (set on first vote)    |
 * | endedAt              | datetime | —        | null    | When election was finalized                  |
 * | $createdAt           | datetime | auto     | —       | Creation timestamp                           |
 * | $updatedAt           | datetime | auto     | —       | Last update timestamp                        |
 * ─────────────────────────────────────────────────────────────────────
 */

import { databases, config } from './config';
import { ID, Query, Permission, Role } from 'appwrite';
import { getCurrentUser } from './auth';
import { getClassStudents } from './users';
import safeStorage from '../app/utils/safeStorage';

const COLLECTION_ID = () => config.repElectionsCollectionId;
const DB_ID = () => config.databaseId;

export const ELECTION_STATUS = {
  IDLE: 'idle',
  ACTIVE: 'active',
  COMPLETED: 'completed',
  RESELECTION_PENDING: 'reselection_pending',
  TIEBREAKER: 'tiebreaker',
};

export const MAX_REPS_PER_CLASS = 3;

export const WINNER_COOLDOWN_MS = 24 * 60 * 60 * 1000;
export const TIEBREAKER_DURATION_MS = 1 * 60 * 60 * 1000;
export const RESELECTION_RESET_MS = 24 * 60 * 60 * 1000;

const getReselectionThreshold = (totalStudents) => {
  const normalizedTotal = Math.max(1, Number(totalStudents) || 0);
  return Math.max(1, Math.ceil(normalizedTotal / 2));
};

const resolveLiveClassSize = async (department, stage, fallbackTotal = 0) => {
  try {
    const classStudents = await getClassStudents(department, stage);
    if (Array.isArray(classStudents) && classStudents.length > 0) {
      return classStudents.length;
    }
  } catch (error) {
    // Fallback to cached total if lookup fails
  }

  return Math.max(1, Number(fallbackTotal) || 0);
};

const syncElectionClassStats = async (election) => {
  if (!election) return election;

  const totalStudents = await resolveLiveClassSize(
    election.department,
    election.stage,
    election.totalStudents,
  );
  const threshold = getReselectionThreshold(totalStudents);

  if (totalStudents === election.totalStudents && threshold === election.reselectionThreshold) {
    return election;
  }

  return databases.updateDocument({
    databaseId: DB_ID(),
    collectionId: COLLECTION_ID(),
    documentId: election.$id,
    data: {
      totalStudents,
      reselectionThreshold: threshold,
    },
  });
};

const resetDailyReselectionRequestsIfNeeded = async (election) => {
  if (!election) return election;

  const voters = Array.isArray(election.reselectionVoters) ? election.reselectionVoters : [];
  if (voters.length === 0) {
    return election;
  }

  const baselineDate = election.$updatedAt || election.endedAt || election.$createdAt;
  if (!baselineDate) {
    return election;
  }

  const baselineMs = new Date(baselineDate).getTime();
  if (!Number.isFinite(baselineMs)) {
    return election;
  }

  if (Date.now() - baselineMs < RESELECTION_RESET_MS) {
    return election;
  }

  return databases.updateDocument({
    databaseId: DB_ID(),
    collectionId: COLLECTION_ID(),
    documentId: election.$id,
    data: {
      reselectionVoters: [],
    },
  });
};

/**
 * Get the currently active election for a specific seat.
 * Only returns elections with status === 'active'.
 */
export const getActiveElection = async (department, stage, seatNumber = null) => {
  try {
    const queries = [
      Query.equal('department', department),
      Query.equal('stage', stage),
      Query.equal('status', ELECTION_STATUS.ACTIVE),
      Query.orderDesc('$createdAt'),
      Query.limit(1),
    ];
    if (seatNumber) {
      queries.splice(3, 0, Query.equal('seatNumber', seatNumber));
    }
    const response = await databases.listDocuments({
      databaseId: DB_ID(),
      collectionId: COLLECTION_ID(),
      queries,
    });
    const activeElection = response.documents[0] || null;
    return activeElection;
  } catch (error) {
    if (error?.message?.includes('not authorized') || error?.code === 401) {
      return null;
    }
    throw error;
  }
};

/**
 * Get the most recent election for a seat regardless of status.
 * Useful for checking the latest state of an election.
 */
export const getLatestElection = async (department, stage, seatNumber = null) => {
  try {
    const queries = [
      Query.equal('department', department),
      Query.equal('stage', stage),
      Query.orderDesc('$createdAt'),
      Query.limit(1),
    ];
    if (seatNumber) {
      queries.splice(2, 0, Query.equal('seatNumber', seatNumber));
    }
    const response = await databases.listDocuments({
      databaseId: DB_ID(),
      collectionId: COLLECTION_ID(),
      queries,
    });
    const latestElection = response.documents[0] || null;
    return latestElection;
  } catch (error) {
    if (error?.message?.includes('not authorized') || error?.code === 401) {
      return null;
    }
    throw error;
  }
};

/**
 * Get all completed elections for a class (one per seat) to read current reps.
 * Returns an array of completed election docs (latest per seat).
 */
export const getCompletedElections = async (department, stage) => {
  try {
    const response = await databases.listDocuments({
      databaseId: DB_ID(),
      collectionId: COLLECTION_ID(),
      queries: [
        Query.equal('department', department),
        Query.equal('stage', stage),
        Query.equal('status', ELECTION_STATUS.COMPLETED),
        Query.orderDesc('$createdAt'),
        Query.limit(10),
      ],
    });
    // Keep only the latest completed election per seat
    const bySeat = {};
    response.documents.forEach((doc) => {
      const seat = doc.seatNumber || 1;
      if (!bySeat[seat]) bySeat[seat] = doc;
    });
    return Object.values(bySeat);
  } catch (error) {
    if (error?.message?.includes('not authorized') || error?.code === 401) {
      return [];
    }
    throw error;
  }
};

/**
 * Get all representative user IDs for a class (max 3).
 */
export const getClassRepresentatives = async (department, stage) => {
  try {
    const elections = await getCompletedElections(department, stage);
    const reps = elections
      .filter((e) => e.winner)
      .map((e) => ({ userId: e.winner, seatNumber: e.seatNumber || 1 }));
    return reps;
  } catch (error) {
    if (error?.message?.includes('not authorized') || error?.code === 401) {
      return [];
    }
    throw error;
  }
};

/**
 * Get the next available seat number for a class (1-3).
 * Returns null if all 3 seats are taken.
 */
export const getNextSeatNumber = async (department, stage) => {
  try {
    const reps = await getClassRepresentatives(department, stage);
    const takenSeats = reps.map((r) => r.seatNumber);
    for (let i = 1; i <= MAX_REPS_PER_CLASS; i++) {
      if (!takenSeats.includes(i)) return i;
    }
    return null; // All seats taken
  } catch (error) {
    if (error?.message?.includes('not authorized') || error?.code === 401) {
      return 1;
    }
    throw error;
  }
};

const STAGE_MAP = {
  1: 'firstYear',
  2: 'secondYear',
  3: 'thirdYear',
  4: 'fourthYear',
  5: 'fifthYear',
  6: 'sixthYear',
};

const STAGE_KEYS = ['firstYear', 'secondYear', 'thirdYear', 'fourthYear', 'fifthYear', 'sixthYear'];

const mapYearToStage = (year) => {
  if (year === null || year === undefined) return null;
  const numeric = parseInt(year, 10);
  if (Number.isFinite(numeric) && STAGE_MAP[numeric]) {
    return STAGE_MAP[numeric];
  }
  const text = String(year).trim();
  if (STAGE_KEYS.includes(text)) {
    return text;
  }
  return null;
};

export const ensureActiveElectionForClass = async (department, stage, totalStudents = 0) => {
  try {
    if (!department || !stage) return null;
    if (String(department).trim().toLowerCase() === 'other') return null;
    const active = await getActiveElection(department, stage, 1);
    if (active) {
      return active;
    }
    const created = await createElection(department, stage, totalStudents, 1);
    return created;
  } catch (error) {
    return null;
  }
};

export const ensureActiveElectionsForAllClasses = async () => {
  const coolDownKey = 'rep_auto_seed_v2';
  try {
    const lastRun = await safeStorage.getItem(coolDownKey);
    const now = Date.now();
    if (lastRun && now - parseInt(lastRun, 10) < 6 * 60 * 60 * 1000) {
      return { processed: 0, created: 0 };
    }

    let offset = 0;
    const batchSize = 100;
    let hasMore = true;
    const classCounts = {};

    while (hasMore) {
      const batch = await databases.listDocuments({
        databaseId: DB_ID(),
        collectionId: config.usersCollectionId,
        queries: [
          Query.orderAsc('$createdAt'),
          Query.limit(batchSize),
          Query.offset(offset),
        ],
      });
      const docs = batch.documents || [];
      docs.forEach((doc) => {
        const department = doc.department;
        const stage = mapYearToStage(doc.year);
        if (!department || !stage) return;
        if (String(department).trim().toLowerCase() === 'other') return;
        const key = `${department}::${stage}`;
        classCounts[key] = (classCounts[key] || 0) + 1;
      });

      hasMore = docs.length === batchSize;
      offset += batchSize;
    }

    let processed = 0;
    let created = 0;
    for (const key of Object.keys(classCounts)) {
      const [department, stage] = key.split('::');
      processed += 1;
      const existing = await getActiveElection(department, stage, 1);
      if (!existing) {
        const createdElection = await createElection(department, stage, classCounts[key], 1);
        if (createdElection) created += 1;
      }
    }

    await safeStorage.setItem(coolDownKey, String(now));
    return { processed, created };
  } catch (error) {
    return { processed: 0, created: 0 };
  }
};

/**
 * Create a new election for a specific seat.
 * seatNumber: which rep position (1, 2, 3).
 */
export const createElection = async (department, stage, totalStudents = 0, seatNumber = 1) => {
  try {
    if (String(department || '').trim().toLowerCase() === 'other') {
      throw new Error('Representatives are not available for this class');
    }

    // Reuse existing open election (idle/active/tiebreaker) for this seat
    const latest = await getLatestElection(department, stage, seatNumber);
    if (
      latest
      && (
        latest.status === ELECTION_STATUS.IDLE
        || latest.status === ELECTION_STATUS.ACTIVE
        || latest.status === ELECTION_STATUS.TIEBREAKER
      )
    ) {
      return latest;
    }

    // Enforce max reps
    if (seatNumber > MAX_REPS_PER_CLASS) {
      throw new Error('Maximum representatives reached');
    }

    const resolvedTotalStudents = await resolveLiveClassSize(department, stage, totalStudents);
    const threshold = getReselectionThreshold(resolvedTotalStudents);

    const permissions = [
      Permission.read(Role.users()),
      Permission.update(Role.users()),
    ];

    const election = await databases.createDocument({
      databaseId: DB_ID(),
      collectionId: COLLECTION_ID(),
      documentId: ID.unique(),
      data: {
        department,
        stage,
        status: ELECTION_STATUS.IDLE,
        seatNumber,
        winner: null,
        totalStudents: resolvedTotalStudents,
        reselectionVoters: [],
        reselectionThreshold: threshold,
        startedAt: null,
        endedAt: null,
      },
      permissions,
    });
    return election;
  } catch (error) {
    throw error;
  }
};

/**
 * Finalize an election — set the single winner and mark as completed.
 */
export const finalizeElection = async (electionId, winnerId = null) => {
  try {
    const election = await databases.updateDocument({
      databaseId: DB_ID(),
      collectionId: COLLECTION_ID(),
      documentId: electionId,
      data: {
        status: ELECTION_STATUS.COMPLETED,
        winner: winnerId,
        endedAt: new Date().toISOString(),
      },
    });
    return election;
  } catch (error) {
    throw error;
  }
};

/**
 * Request reselection.  Adds current user to `reselectionVoters`.
 * If threshold reached, resets election (creates a new active one).
 * Returns { election, reselectionTriggered }.
 */
export const requestReselection = async (electionId) => {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) throw new Error('Not authenticated');
    const userId = currentUser.$id;

    const election = await databases.getDocument({
      databaseId: DB_ID(),
      collectionId: COLLECTION_ID(),
      documentId: electionId,
    });
    const syncedElection = await syncElectionClassStats(election);
    const dailyResetElection = await resetDailyReselectionRequestsIfNeeded(syncedElection);

    const voters = Array.isArray(dailyResetElection.reselectionVoters) ? dailyResetElection.reselectionVoters : [];
    if (voters.includes(userId)) {
      return { election: dailyResetElection, reselectionTriggered: false, alreadyVoted: true };
    }

    const updatedVoters = [...voters, userId];
    const threshold = dailyResetElection.reselectionThreshold || getReselectionThreshold(dailyResetElection.totalStudents);

    if (updatedVoters.length >= threshold) {
      // Threshold reached — archive old election and create new one
      await databases.updateDocument({
        databaseId: DB_ID(),
        collectionId: COLLECTION_ID(),
        documentId: electionId,
        data: {
          reselectionVoters: updatedVoters,
          status: ELECTION_STATUS.RESELECTION_PENDING,
          endedAt: new Date().toISOString(),
        },
      });

      const newElection = await createElection(
        dailyResetElection.department,
        dailyResetElection.stage,
        dailyResetElection.totalStudents,
        dailyResetElection.seatNumber || 1,
      );
      return { election: newElection, reselectionTriggered: true, alreadyVoted: false };
    }

    const updated = await databases.updateDocument({
      databaseId: DB_ID(),
      collectionId: COLLECTION_ID(),
      documentId: electionId,
      data: {
        reselectionVoters: updatedVoters,
      },
    });

    return { election: updated, reselectionTriggered: false, alreadyVoted: false };
  } catch (error) {
    throw error;
  }
};

/**
 * Request starting election for the next seat without removing existing winner.
 * Uses the current completed election's reselectionVoters array as requesters.
 * When threshold is reached, starts next seat election.
 */
export const requestNextRepresentativeElection = async (electionId) => {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) throw new Error('Not authenticated');
    const userId = currentUser.$id;

    const election = await databases.getDocument({
      databaseId: DB_ID(),
      collectionId: COLLECTION_ID(),
      documentId: electionId,
    });
    const syncedElection = await syncElectionClassStats(election);
    const dailyResetElection = await resetDailyReselectionRequestsIfNeeded(syncedElection);

    const currentSeat = dailyResetElection.seatNumber || 1;
    const nextSeat = currentSeat + 1;

    if (nextSeat > MAX_REPS_PER_CLASS) {
      return {
        election,
        nextElectionStarted: false,
        alreadyVoted: false,
        nextSeat,
        reason: 'max_reps_reached',
      };
    }

    const activeNext = await getActiveElection(dailyResetElection.department, dailyResetElection.stage, nextSeat);
    if (activeNext) {
      return {
        election: activeNext,
        nextElectionStarted: true,
        alreadyVoted: false,
        nextSeat,
      };
    }

    const voters = Array.isArray(dailyResetElection.reselectionVoters) ? dailyResetElection.reselectionVoters : [];
    if (voters.includes(userId)) {
      return {
        election: dailyResetElection,
        nextElectionStarted: false,
        alreadyVoted: true,
        nextSeat,
      };
    }

    const updatedVoters = [...voters, userId];
    const threshold = dailyResetElection.reselectionThreshold || getReselectionThreshold(dailyResetElection.totalStudents);

    if (updatedVoters.length >= threshold) {
      // Reset requester list on current election and create next seat election
      await databases.updateDocument({
        databaseId: DB_ID(),
        collectionId: COLLECTION_ID(),
        documentId: electionId,
        data: {
          reselectionVoters: [],
        },
      });

      const nextElection = await createElection(
        dailyResetElection.department,
        dailyResetElection.stage,
        dailyResetElection.totalStudents,
        nextSeat,
      );

      return {
        election: nextElection,
        nextElectionStarted: true,
        alreadyVoted: false,
        nextSeat,
      };
    }

    const updated = await databases.updateDocument({
      databaseId: DB_ID(),
      collectionId: COLLECTION_ID(),
      documentId: electionId,
      data: {
        reselectionVoters: updatedVoters,
        reselectionThreshold: threshold,
      },
    });

    return {
      election: updated,
      nextElectionStarted: false,
      alreadyVoted: false,
      nextSeat,
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Check whether the logged-in user already voted for reselection.
 */
export const hasUserRequestedReselection = (election, userId) => {
  if (!election || !userId) return false;
  const voters = Array.isArray(election.reselectionVoters) ? election.reselectionVoters : [];
  return voters.includes(userId);
};

/**
 * Get election by ID.
 */
export const getElectionById = async (electionId) => {
  try {
    return await databases.getDocument({
      databaseId: DB_ID(),
      collectionId: COLLECTION_ID(),
      documentId: electionId,
    });
  } catch (error) {
    throw error;
  }
};

/**
 * Determine the correct timer duration for an election.
 * Active elections use 24h, tiebreaker elections use 1h.
 */
export const getElectionDuration = (election) => {
  if (!election) return WINNER_COOLDOWN_MS;
  if (election.status === ELECTION_STATUS.TIEBREAKER) return TIEBREAKER_DURATION_MS;
  return WINNER_COOLDOWN_MS;
};

/**
 * Check if voting time has expired for an election.
 */
export const isElectionTimerExpired = (election) => {
  if (!election || !election.startedAt) return false;
  const startedAt = new Date(election.startedAt).getTime();
  const duration = getElectionDuration(election);
  return Date.now() >= startedAt + duration;
};

/**
 * Get the tiebreaker candidate IDs.
 * During tiebreaker status, reselectionVoters[] stores the tied candidate IDs.
 */
export const getTiebreakerCandidates = (election) => {
  if (!election || election.status !== ELECTION_STATUS.TIEBREAKER) return [];
  return Array.isArray(election.reselectionVoters) ? election.reselectionVoters : [];
};

/**
 * Handle what happens when the election timer expires.
 * - If there's a clear winner → finalize
 * - If top candidates are tied → enter tiebreaker (1h extension, only those 2 can receive votes)
 */
export const handleElectionTimerExpiry = async (electionId, results) => {
  try {
    const election = await getElectionById(electionId);
    if (!election) return null;

    if (election.status === ELECTION_STATUS.COMPLETED) return election;

    const candidates = results?.candidates || [];

    if (candidates.length === 0) {
      return finalizeElection(electionId, null);
    }

    if (election.status === ELECTION_STATUS.TIEBREAKER) {
      // Tiebreaker expired — finalize with whoever is ahead (or first if still tied)
      const winnerId = candidates[0]?.candidateId || null;
      return finalizeElection(electionId, winnerId);
    }

    // Active election expired — check for tie
    if (candidates.length >= 2 && candidates[0].voteCount === candidates[1].voteCount && candidates[0].voteCount > 0) {
      // Tie detected — extract all candidates with the top vote count
      const topVoteCount = candidates[0].voteCount;
      const tiedCandidates = candidates
        .filter((c) => c.voteCount === topVoteCount)
        .map((c) => c.candidateId)
        .slice(0, 2);

      const updated = await databases.updateDocument({
        databaseId: DB_ID(),
        collectionId: COLLECTION_ID(),
        documentId: electionId,
        data: {
          status: ELECTION_STATUS.TIEBREAKER,
          startedAt: new Date().toISOString(),
          reselectionVoters: tiedCandidates,
        },
      });
      return updated;
    }

    // Clear winner
    const winnerId = candidates[0]?.candidateId || null;
    return finalizeElection(electionId, winnerId);
  } catch (error) {
    throw error;
  }
};
