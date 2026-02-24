/**
 * Representative Votes Database Module
 * 
 * Manages individual votes within an election.
 * 
 * ── repVotes Collection Columns ──────────────────────────────────────
 * | Column      | Type     | Required | Default | Notes                              |
 * |-------------|----------|----------|---------|------------------------------------|
 * | $id         | string   | auto     | —       | Document ID                        |
 * | electionId  | string   | ✓        | —       | Reference to repElections document |
 * | department  | string   | ✓        | —       | Department key (for queries)       |
 * | stage       | string   | ✓        | —       | Stage key (for queries)            |
 * | voterId     | string   | ✓        | —       | User who cast the vote             |
 * | candidateId | string   | ✓        | —       | User being voted for               |
 * | $createdAt  | datetime | auto     | —       | Creation timestamp                 |
 * | $updatedAt  | datetime | auto     | —       | Last update timestamp              |
 * ─────────────────────────────────────────────────────────────────────
 */

import { databases, config } from './config';
import { ID, Query, Permission, Role } from 'appwrite';
import { getCurrentUser } from './auth';
import { getClassStudents } from './users';
import { createNotification, NOTIFICATION_TYPES } from './notifications';
import {
  ELECTION_STATUS,
  isElectionTimerExpired,
  getTiebreakerCandidates,
} from './repElections';

const COLLECTION_ID = () => config.repVotesCollectionId;
const DB_ID = () => config.databaseId;

/**
 * Cast or change a vote in an election.
 * Each voter gets exactly one vote per election. If they already voted,
 * the old vote is deleted and replaced.
 *
 * Enforces:
 * - No voting after timer expires
 * - During tiebreaker, only the two tied candidates can receive votes
 */
export const castVote = async (electionId, candidateId) => {
  try {
    console.log('[REP_DEBUG] castVote:start', { electionId, candidateId });
    const currentUser = await getCurrentUser();
    if (!currentUser) throw new Error('Not authenticated');
    const voterId = currentUser.$id;

    if (voterId === candidateId) {
      throw new Error('Cannot vote for yourself');
    }

    // Fetch election to validate state
    const { getElectionById } = require('./repElections');
    const election = await getElectionById(electionId);
    console.log('[REP_DEBUG] castVote:electionLoaded', {
      electionId,
      status: election?.status,
      seatNumber: election?.seatNumber,
      department: election?.department,
      stage: election?.stage,
    });

    // Block voting on completed/archived elections
    if (election.status === ELECTION_STATUS.COMPLETED || election.status === ELECTION_STATUS.RESELECTION_PENDING) {
      throw new Error('Election is closed');
    }

    // Block voting after timer expires (active or tiebreaker)
    if ((election.status === ELECTION_STATUS.ACTIVE || election.status === ELECTION_STATUS.TIEBREAKER) && election.startedAt) {
      if (isElectionTimerExpired(election)) {
        throw new Error('Voting time has expired');
      }
    }

    // During tiebreaker, only the two tied candidates can receive votes
    if (election.status === ELECTION_STATUS.TIEBREAKER) {
      const allowedCandidates = getTiebreakerCandidates(election);
      if (allowedCandidates.length > 0 && !allowedCandidates.includes(candidateId)) {
        throw new Error('Can only vote for tiebreaker candidates');
      }
    }

    const voteCountBefore = await databases.listDocuments(DB_ID(), COLLECTION_ID(), [
      Query.equal('electionId', electionId),
      Query.limit(1),
    ]);
    const isFirstVote = (voteCountBefore.documents?.length || 0) === 0;

    // Check for existing vote by this voter in this election
    const existing = await databases.listDocuments(DB_ID(), COLLECTION_ID(), [
      Query.equal('electionId', electionId),
      Query.equal('voterId', voterId),
      Query.limit(1),
    ]);
    console.log('[REP_DEBUG] castVote:existingVote', {
      electionId,
      voterId,
      existingCount: existing.documents.length,
    });

    // Remove previous vote if exists
    if (existing.documents.length > 0) {
      await databases.deleteDocument(DB_ID(), COLLECTION_ID(), existing.documents[0].$id);
    }

    const vote = await databases.createDocument(DB_ID(), COLLECTION_ID(), ID.unique(), {
      electionId,
      department: election.department,
      stage: election.stage,
      voterId,
      candidateId,
    }, [
      Permission.read(Role.users()),
      Permission.write(Role.users()),
    ]);

    if (isFirstVote) {
      try {
        await databases.updateDocument(config.databaseId, config.repElectionsCollectionId, electionId, {
          startedAt: new Date().toISOString(),
        });
        console.log('[REP_DEBUG] castVote:firstVoteStartedElection', { electionId });

        const classStudents = await getClassStudents(election.department, election.stage);
        const notificationPromises = classStudents
          .filter((student) => student?.$id && student.$id !== voterId)
          .map((student) => createNotification({
            userId: student.$id,
            senderId: voterId,
            senderName: currentUser?.name || 'System',
            type: NOTIFICATION_TYPES.DEPARTMENT_POST,
            postPreview: 'rep_election_started',
          }));
        await Promise.all(notificationPromises);
        console.log('[REP_DEBUG] castVote:firstVoteNotificationsSent', {
          electionId,
          recipients: notificationPromises.length,
        });
      } catch (firstVoteError) {
        console.log('[REP_DEBUG] castVote:firstVoteHookError', {
          electionId,
          message: firstVoteError?.message,
        });
      }
    }

    console.log('[REP_DEBUG] castVote:created', {
      voteId: vote.$id,
      electionId,
      voterId,
      candidateId,
    });

    return vote;
  } catch (error) {
    console.log('[REP_DEBUG] castVote:error', { message: error?.message, electionId, candidateId });
    throw error;
  }
};

/**
 * Remove a vote (un-vote).
 */
export const removeVote = async (electionId) => {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) throw new Error('Not authenticated');
    const voterId = currentUser.$id;

    const existing = await databases.listDocuments(DB_ID(), COLLECTION_ID(), [
      Query.equal('electionId', electionId),
      Query.equal('voterId', voterId),
      Query.limit(1),
    ]);

    if (existing.documents.length > 0) {
      await databases.deleteDocument(DB_ID(), COLLECTION_ID(), existing.documents[0].$id);
    }

    return true;
  } catch (error) {
    throw error;
  }
};

/**
 * Get all votes for an election, aggregated by candidate.
 * Returns: { candidates: [{ candidateId, voteCount }], totalVotes, myVote }
 */
export const getElectionResults = async (electionId) => {
  try {
    console.log('[REP_DEBUG] getElectionResults:start', { electionId });
    const currentUser = await getCurrentUser();
    const userId = currentUser?.$id;

    let allVotes = [];
    let offset = 0;
    const batchSize = 100;
    let hasMore = true;

    while (hasMore) {
      const batch = await databases.listDocuments(DB_ID(), COLLECTION_ID(), [
        Query.equal('electionId', electionId),
        Query.limit(batchSize),
        Query.offset(offset),
      ]);
      allVotes = [...allVotes, ...batch.documents];
      hasMore = batch.documents.length === batchSize;
      offset += batchSize;
    }

    // Aggregate by candidate
    const candidateMap = {};
    let myVote = null;

    allVotes.forEach((vote) => {
      const cid = vote.candidateId;
      if (!candidateMap[cid]) {
        candidateMap[cid] = { candidateId: cid, voteCount: 0 };
      }
      candidateMap[cid].voteCount += 1;

      if (vote.voterId === userId) {
        myVote = cid;
      }
    });

    const candidates = Object.values(candidateMap).sort((a, b) => b.voteCount - a.voteCount);

    console.log('[REP_DEBUG] getElectionResults:result', {
      electionId,
      totalVotes: allVotes.length,
      candidatesCount: candidates.length,
      myVote,
    });

    return {
      candidates,
      totalVotes: allVotes.length,
      myVote,
    };
  } catch (error) {
    console.log('[REP_DEBUG] getElectionResults:error', { message: error?.message, electionId });
    throw error;
  }
};

/**
 * Check if the current user has already voted in an election.
 */
export const getMyVote = async (electionId) => {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return null;

    const result = await databases.listDocuments(DB_ID(), COLLECTION_ID(), [
      Query.equal('electionId', electionId),
      Query.equal('voterId', currentUser.$id),
      Query.limit(1),
    ]);

    return result.documents[0] || null;
  } catch (error) {
    throw error;
  }
};
