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
import { ID, Query } from 'appwrite';
import { getCurrentUser } from './auth';

const COLLECTION_ID = () => config.repVotesCollectionId;
const DB_ID = () => config.databaseId;

/**
 * Cast or change a vote in an election.
 * Each voter gets exactly one vote per election. If they already voted,
 * the old vote is deleted and replaced.
 */
export const castVote = async (electionId, candidateId) => {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) throw new Error('Not authenticated');
    const voterId = currentUser.$id;

    if (voterId === candidateId) {
      throw new Error('Cannot vote for yourself');
    }

    // Check for existing vote by this voter in this election
    const existing = await databases.listDocuments(DB_ID(), COLLECTION_ID(), [
      Query.equal('electionId', electionId),
      Query.equal('voterId', voterId),
      Query.limit(1),
    ]);

    // Remove previous vote if exists
    if (existing.documents.length > 0) {
      await databases.deleteDocument(DB_ID(), COLLECTION_ID(), existing.documents[0].$id);
    }

    // Fetch election to get department + stage
    const { getElectionById } = require('./repElections');
    const election = await getElectionById(electionId);

    const vote = await databases.createDocument(DB_ID(), COLLECTION_ID(), ID.unique(), {
      electionId,
      department: election.department,
      stage: election.stage,
      voterId,
      candidateId,
    });

    return vote;
  } catch (error) {
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

    return {
      candidates,
      totalVotes: allVotes.length,
      myVote,
    };
  } catch (error) {
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
