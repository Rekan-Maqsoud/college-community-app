/**
 * Tests for representative elections and voting logic.
 *
 * Database modules are fully mocked so no real Appwrite calls are made.
 */

// ─── Mocks ──────────────────────────────────────────────────────────────────

const mockListDocuments = jest.fn();
const mockCreateDocument = jest.fn();
const mockUpdateDocument = jest.fn();
const mockGetDocument = jest.fn();
const mockDeleteDocument = jest.fn();

jest.mock('../database/config', () => ({
  databases: {
    listDocuments: (...args) => mockListDocuments(...args),
    createDocument: (...args) => mockCreateDocument(...args),
    updateDocument: (...args) => mockUpdateDocument(...args),
    getDocument: (...args) => mockGetDocument(...args),
    deleteDocument: (...args) => mockDeleteDocument(...args),
  },
  config: {
    databaseId: 'test-db',
    repElectionsCollectionId: 'rep-elections',
    repVotesCollectionId: 'rep-votes',
  },
}));

jest.mock('../database/auth', () => ({
  getCurrentUser: jest.fn(() => Promise.resolve({ $id: 'user-1' })),
}));

jest.mock('../app/utils/safeStorage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
}));

// ─── Helpers ────────────────────────────────────────────────────────────────

const makeElection = (overrides = {}) => ({
  $id: 'election-1',
  department: 'cs',
  stage: 'secondYear',
  status: 'active',
  seatNumber: 1,
  winner: null,
  totalStudents: 10,
  reselectionVoters: [],
  reselectionThreshold: 5,
  startedAt: new Date().toISOString(),
  endedAt: null,
  ...overrides,
});

// ─── Tests ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
});

describe('repElections', () => {
  let repElections;

  beforeAll(() => {
    repElections = require('../database/repElections');
  });

  // ── Constants ─────────────────────────────────────────────────────────────

  it('exposes correct ELECTION_STATUS values', () => {
    expect(repElections.ELECTION_STATUS).toEqual({
      IDLE: 'idle',
      ACTIVE: 'active',
      COMPLETED: 'completed',
      RESELECTION_PENDING: 'reselection_pending',
      TIEBREAKER: 'tiebreaker',
    });
  });

  it('MAX_REPS_PER_CLASS is 3', () => {
    expect(repElections.MAX_REPS_PER_CLASS).toBe(3);
  });

  // ── getActiveElection ─────────────────────────────────────────────────────

  describe('getActiveElection', () => {
    it('returns the first document when found', async () => {
      const doc = makeElection();
      mockListDocuments.mockResolvedValueOnce({ documents: [doc] });

      const result = await repElections.getActiveElection('cs', 'secondYear');
      expect(result).toEqual(doc);
      expect(mockListDocuments).toHaveBeenCalledTimes(1);
    });

    it('returns null when no election exists', async () => {
      mockListDocuments.mockResolvedValueOnce({ documents: [] });

      const result = await repElections.getActiveElection('cs', 'firstYear');
      expect(result).toBeNull();
    });

    it('passes seatNumber query when provided', async () => {
      mockListDocuments.mockResolvedValueOnce({ documents: [] });

      await repElections.getActiveElection('cs', 'secondYear', 2);

      const queries = mockListDocuments.mock.calls[0][2];
      const hasSeatQuery = queries.some(
        (q) => typeof q === 'string' ? q.includes('"seatNumber"') : JSON.stringify(q).includes('seatNumber'),
      );
      expect(hasSeatQuery).toBe(true);
    });
  });

  // ── getCompletedElections ─────────────────────────────────────────────────

  describe('getCompletedElections', () => {
    it('keeps only the latest completed election per seat', async () => {
      mockListDocuments.mockResolvedValueOnce({
        documents: [
          makeElection({ $id: 'e1', seatNumber: 1, status: 'completed', winner: 'u1' }),
          makeElection({ $id: 'e2', seatNumber: 1, status: 'completed', winner: 'u2' }),
          makeElection({ $id: 'e3', seatNumber: 2, status: 'completed', winner: 'u3' }),
        ],
      });

      const result = await repElections.getCompletedElections('cs', 'secondYear');
      expect(result).toHaveLength(2);
      const ids = result.map((d) => d.$id);
      expect(ids).toContain('e1');
      expect(ids).toContain('e3');
    });
  });

  // ── getClassRepresentatives ───────────────────────────────────────────────

  describe('getClassRepresentatives', () => {
    it('returns rep userId and seatNumber from completed elections', async () => {
      mockListDocuments.mockResolvedValueOnce({
        documents: [
          makeElection({ seatNumber: 1, status: 'completed', winner: 'u1' }),
          makeElection({ seatNumber: 2, status: 'completed', winner: 'u5' }),
        ],
      });

      const reps = await repElections.getClassRepresentatives('cs', 'secondYear');
      expect(reps).toEqual([
        { userId: 'u1', seatNumber: 1 },
        { userId: 'u5', seatNumber: 2 },
      ]);
    });
  });

  // ── getNextSeatNumber ─────────────────────────────────────────────────────

  describe('getNextSeatNumber', () => {
    it('returns 1 when no seats are taken', async () => {
      mockListDocuments.mockResolvedValueOnce({ documents: [] });

      const seat = await repElections.getNextSeatNumber('cs', 'secondYear');
      expect(seat).toBe(1);
    });

    it('returns null when all 3 seats are taken', async () => {
      mockListDocuments.mockResolvedValueOnce({
        documents: [
          makeElection({ seatNumber: 1, status: 'completed', winner: 'u1' }),
          makeElection({ seatNumber: 2, status: 'completed', winner: 'u2' }),
          makeElection({ seatNumber: 3, status: 'completed', winner: 'u3' }),
        ],
      });

      const seat = await repElections.getNextSeatNumber('cs', 'secondYear');
      expect(seat).toBeNull();
    });

    it('returns the first gap in seat numbers', async () => {
      mockListDocuments.mockResolvedValueOnce({
        documents: [
          makeElection({ seatNumber: 1, status: 'completed', winner: 'u1' }),
          makeElection({ seatNumber: 3, status: 'completed', winner: 'u3' }),
        ],
      });

      const seat = await repElections.getNextSeatNumber('cs', 'secondYear');
      expect(seat).toBe(2);
    });
  });

  // ── createElection ────────────────────────────────────────────────────────

  describe('createElection', () => {
    it('returns existing active election instead of creating duplicate', async () => {
      const existing = makeElection();
      mockListDocuments.mockResolvedValueOnce({ documents: [existing] });

      const result = await repElections.createElection('cs', 'secondYear', 20, 1);
      expect(result).toEqual(existing);
      expect(mockCreateDocument).not.toHaveBeenCalled();
    });

    it('creates a new election when none is active', async () => {
      mockListDocuments.mockResolvedValueOnce({ documents: [] });
      const newDoc = makeElection({ $id: 'new-1' });
      mockCreateDocument.mockResolvedValueOnce(newDoc);

      const result = await repElections.createElection('cs', 'secondYear', 20, 1);
      expect(mockCreateDocument).toHaveBeenCalledTimes(1);
      expect(result.$id).toBe('new-1');
    });

    it('throws when seatNumber exceeds MAX_REPS_PER_CLASS', async () => {
      mockListDocuments.mockResolvedValueOnce({ documents: [] });

      await expect(
        repElections.createElection('cs', 'secondYear', 10, 4),
      ).rejects.toThrow('Maximum representatives reached');
    });

    it('sets reselectionThreshold to ceil(totalStudents/2)', async () => {
      mockListDocuments.mockResolvedValueOnce({ documents: [] });
      mockCreateDocument.mockImplementation((_db, _col, _id, data) =>
        Promise.resolve({ $id: 'e-new', ...data }),
      );

      const result = await repElections.createElection('cs', 'secondYear', 11, 1);
      expect(result.reselectionThreshold).toBe(6);
    });
  });

  // ── finalizeElection ──────────────────────────────────────────────────────

  describe('finalizeElection', () => {
    it('marks election as completed with a winner', async () => {
      mockUpdateDocument.mockResolvedValueOnce(
        makeElection({ status: 'completed', winner: 'u1' }),
      );

      const result = await repElections.finalizeElection('election-1', 'u1');
      expect(result.status).toBe('completed');
      expect(result.winner).toBe('u1');

      const updatePayload = mockUpdateDocument.mock.calls[0][3];
      expect(updatePayload.status).toBe('completed');
      expect(updatePayload.winner).toBe('u1');
      expect(updatePayload.endedAt).toBeDefined();
    });
  });

  // ── hasUserRequestedReselection ───────────────────────────────────────────

  describe('hasUserRequestedReselection', () => {
    it('returns true when user is in reselectionVoters', () => {
      const election = makeElection({ reselectionVoters: ['user-1', 'user-2'] });
      expect(repElections.hasUserRequestedReselection(election, 'user-1')).toBe(true);
    });

    it('returns false when user is not in reselectionVoters', () => {
      const election = makeElection({ reselectionVoters: ['user-2'] });
      expect(repElections.hasUserRequestedReselection(election, 'user-1')).toBe(false);
    });

    it('returns false for null/undefined inputs', () => {
      expect(repElections.hasUserRequestedReselection(null, 'user-1')).toBe(false);
      expect(repElections.hasUserRequestedReselection(makeElection(), null)).toBe(false);
    });
  });

  // ── requestReselection ────────────────────────────────────────────────────

  describe('requestReselection', () => {
    it('adds user to reselectionVoters when not already voted', async () => {
      const election = makeElection({ reselectionVoters: ['user-2'], reselectionThreshold: 5 });
      mockGetDocument.mockResolvedValueOnce(election);
      mockUpdateDocument.mockResolvedValueOnce({
        ...election,
        reselectionVoters: ['user-2', 'user-1'],
      });

      const res = await repElections.requestReselection('election-1');
      expect(res.reselectionTriggered).toBe(false);
      expect(res.alreadyVoted).toBe(false);
    });

    it('returns alreadyVoted true when user already in list', async () => {
      const election = makeElection({ reselectionVoters: ['user-1'] });
      mockGetDocument.mockResolvedValueOnce(election);

      const res = await repElections.requestReselection('election-1');
      expect(res.alreadyVoted).toBe(true);
      expect(res.reselectionTriggered).toBe(false);
    });

    it('triggers reselection when threshold reached', async () => {
      const election = makeElection({
        reselectionVoters: ['u2', 'u3', 'u4', 'u5'],
        reselectionThreshold: 5,
        totalStudents: 10,
        seatNumber: 1,
      });
      mockGetDocument.mockResolvedValueOnce(election);
      mockUpdateDocument.mockResolvedValueOnce({ ...election, status: 'reselection_pending' });
      // createElection inside requestReselection: getActiveElection + createDocument
      mockListDocuments.mockResolvedValueOnce({ documents: [] });
      mockCreateDocument.mockResolvedValueOnce(makeElection({ $id: 'new-election' }));

      const res = await repElections.requestReselection('election-1');
      expect(res.reselectionTriggered).toBe(true);
    });
  });
});

// ─── repVotes ───────────────────────────────────────────────────────────────

describe('repVotes', () => {
  let repVotes;

  beforeAll(() => {
    repVotes = require('../database/repVotes');
  });

  // ── castVote ──────────────────────────────────────────────────────────────

  describe('castVote', () => {
    it('creates a new vote when none exists', async () => {
      // voteCountBefore
      mockListDocuments.mockResolvedValueOnce({ documents: [] });
      // existing vote for this voter
      mockListDocuments.mockResolvedValueOnce({ documents: [] });
      mockGetDocument.mockResolvedValueOnce(makeElection());
      mockCreateDocument.mockResolvedValueOnce({
        $id: 'vote-1',
        electionId: 'election-1',
        voterId: 'user-1',
        candidateId: 'candidate-1',
      });

      const vote = await repVotes.castVote('election-1', 'candidate-1');
      expect(vote.candidateId).toBe('candidate-1');
      expect(mockCreateDocument).toHaveBeenCalledTimes(1);
    });

    it('deletes previous vote before creating new one', async () => {
      // voteCountBefore
      mockListDocuments.mockResolvedValueOnce({
        documents: [{ $id: 'vote-any' }],
      });
      // existing vote for this voter
      mockListDocuments.mockResolvedValueOnce({
        documents: [{ $id: 'old-vote' }],
      });
      mockDeleteDocument.mockResolvedValueOnce({});
      mockGetDocument.mockResolvedValueOnce(makeElection());
      mockCreateDocument.mockResolvedValueOnce({ $id: 'new-vote' });

      await repVotes.castVote('election-1', 'candidate-2');
      expect(mockDeleteDocument).toHaveBeenCalledWith('test-db', 'rep-votes', 'old-vote');
    });

    it('throws if voting for yourself', async () => {
      await expect(repVotes.castVote('election-1', 'user-1')).rejects.toThrow(
        'Cannot vote for yourself',
      );
    });
  });

  // ── removeVote ────────────────────────────────────────────────────────────

  describe('removeVote', () => {
    it('deletes existing vote document', async () => {
      mockListDocuments.mockResolvedValueOnce({
        documents: [{ $id: 'vote-to-remove' }],
      });
      mockDeleteDocument.mockResolvedValueOnce({});

      const result = await repVotes.removeVote('election-1');
      expect(result).toBe(true);
      expect(mockDeleteDocument).toHaveBeenCalledWith('test-db', 'rep-votes', 'vote-to-remove');
    });

    it('succeeds even when no vote exists', async () => {
      mockListDocuments.mockResolvedValueOnce({ documents: [] });
      const result = await repVotes.removeVote('election-1');
      expect(result).toBe(true);
    });
  });

  // ── getElectionResults ────────────────────────────────────────────────────

  describe('getElectionResults', () => {
    it('aggregates votes by candidate and sorts descending', async () => {
      mockListDocuments.mockResolvedValueOnce({
        documents: [
          { candidateId: 'c1', voterId: 'v1' },
          { candidateId: 'c2', voterId: 'v2' },
          { candidateId: 'c1', voterId: 'v3' },
          { candidateId: 'c1', voterId: 'user-1' },
        ],
      });

      const results = await repVotes.getElectionResults('election-1');
      expect(results.totalVotes).toBe(4);
      expect(results.candidates[0].candidateId).toBe('c1');
      expect(results.candidates[0].voteCount).toBe(3);
      expect(results.candidates[1].candidateId).toBe('c2');
      expect(results.candidates[1].voteCount).toBe(1);
      expect(results.myVote).toBe('c1');
    });

    it('returns empty when no votes', async () => {
      mockListDocuments.mockResolvedValueOnce({ documents: [] });

      const results = await repVotes.getElectionResults('election-1');
      expect(results.totalVotes).toBe(0);
      expect(results.candidates).toEqual([]);
      expect(results.myVote).toBeNull();
    });
  });

  // ── getMyVote ─────────────────────────────────────────────────────────────

  describe('getMyVote', () => {
    it('returns the vote document when user has voted', async () => {
      const vote = { $id: 'v1', voterId: 'user-1', candidateId: 'c1' };
      mockListDocuments.mockResolvedValueOnce({ documents: [vote] });

      const result = await repVotes.getMyVote('election-1');
      expect(result).toEqual(vote);
    });

    it('returns null when user has not voted', async () => {
      mockListDocuments.mockResolvedValueOnce({ documents: [] });

      const result = await repVotes.getMyVote('election-1');
      expect(result).toBeNull();
    });
  });
});
