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
 * | status               | string   | ✓        | active  | active | completed | reselection_pending   |
 * | seatNumber           | integer  | ✓        | 1       | Which rep seat (1, 2, or 3)                  |
 * | winner               | string   | —        | null    | Single user ID elected as representative     |
 * | totalStudents        | integer  | —        | 0       | Snapshot of class size at election time       |
 * | reselectionVoters    | string[] | —        | []      | Users who requested reselection              |
 * | reselectionThreshold | integer  | —        | 0       | Half of totalStudents (cached)               |
 * | startedAt            | datetime | —        | now     | When election started                        |
 * | endedAt              | datetime | —        | null    | When election was finalized                  |
 * | $createdAt           | datetime | auto     | —       | Creation timestamp                           |
 * | $updatedAt           | datetime | auto     | —       | Last update timestamp                        |
 * ─────────────────────────────────────────────────────────────────────
 */

import { databases, config } from './config';
import { ID, Query } from 'appwrite';
import { getCurrentUser } from './auth';

const COLLECTION_ID = () => config.repElectionsCollectionId;
const DB_ID = () => config.databaseId;

export const ELECTION_STATUS = {
  ACTIVE: 'active',
  COMPLETED: 'completed',
  RESELECTION_PENDING: 'reselection_pending',
};

export const MAX_REPS_PER_CLASS = 3;

/**
 * Get the currently active election for a specific seat.
 * If no seatNumber given, returns the most recent election.
 */
export const getActiveElection = async (department, stage, seatNumber = null) => {
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
    const response = await databases.listDocuments(DB_ID(), COLLECTION_ID(), queries);
    return response.documents[0] || null;
  } catch (error) {
    throw error;
  }
};

/**
 * Get all completed elections for a class (one per seat) to read current reps.
 * Returns an array of completed election docs (latest per seat).
 */
export const getCompletedElections = async (department, stage) => {
  try {
    const response = await databases.listDocuments(DB_ID(), COLLECTION_ID(), [
      Query.equal('department', department),
      Query.equal('stage', stage),
      Query.equal('status', ELECTION_STATUS.COMPLETED),
      Query.orderDesc('$createdAt'),
      Query.limit(10),
    ]);
    // Keep only the latest completed election per seat
    const bySeat = {};
    response.documents.forEach((doc) => {
      const seat = doc.seatNumber || 1;
      if (!bySeat[seat]) bySeat[seat] = doc;
    });
    return Object.values(bySeat);
  } catch (error) {
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
    throw error;
  }
};

/**
 * Create a new election for a specific seat.
 * seatNumber: which rep position (1, 2, 3).
 */
export const createElection = async (department, stage, totalStudents = 0, seatNumber = 1) => {
  try {
    // Check if there's already an active election for this seat
    const existing = await getActiveElection(department, stage, seatNumber);
    if (existing && existing.status === ELECTION_STATUS.ACTIVE) {
      return existing;
    }

    // Enforce max reps
    if (seatNumber > MAX_REPS_PER_CLASS) {
      throw new Error('Maximum representatives reached');
    }

    const threshold = Math.max(1, Math.ceil(totalStudents / 2));

    const election = await databases.createDocument(DB_ID(), COLLECTION_ID(), ID.unique(), {
      department,
      stage,
      status: ELECTION_STATUS.ACTIVE,
      seatNumber,
      winner: null,
      totalStudents,
      reselectionVoters: [],
      reselectionThreshold: threshold,
      startedAt: new Date().toISOString(),
      endedAt: null,
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
    const election = await databases.updateDocument(DB_ID(), COLLECTION_ID(), electionId, {
      status: ELECTION_STATUS.COMPLETED,
      winner: winnerId,
      endedAt: new Date().toISOString(),
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

    const election = await databases.getDocument(DB_ID(), COLLECTION_ID(), electionId);

    const voters = Array.isArray(election.reselectionVoters) ? election.reselectionVoters : [];
    if (voters.includes(userId)) {
      return { election, reselectionTriggered: false, alreadyVoted: true };
    }

    const updatedVoters = [...voters, userId];
    const threshold = election.reselectionThreshold || Math.ceil((election.totalStudents || 1) / 2);

    if (updatedVoters.length >= threshold) {
      // Threshold reached — archive old election and create new one
      await databases.updateDocument(DB_ID(), COLLECTION_ID(), electionId, {
        reselectionVoters: updatedVoters,
        status: ELECTION_STATUS.RESELECTION_PENDING,
        endedAt: new Date().toISOString(),
      });

      const newElection = await createElection(
        election.department,
        election.stage,
        election.totalStudents,
        election.seatNumber || 1,
      );
      return { election: newElection, reselectionTriggered: true, alreadyVoted: false };
    }

    const updated = await databases.updateDocument(DB_ID(), COLLECTION_ID(), electionId, {
      reselectionVoters: updatedVoters,
    });

    return { election: updated, reselectionTriggered: false, alreadyVoted: false };
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
    return await databases.getDocument(DB_ID(), COLLECTION_ID(), electionId);
  } catch (error) {
    throw error;
  }
};
