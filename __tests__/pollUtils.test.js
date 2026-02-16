import {
  createPollPayload,
  parsePollPayload,
  applyPollVote,
  getUserPollSelection,
  getPollVoteCounts,
  isUserPollAnswerCorrect,
} from '../app/utils/pollUtils';

describe('pollUtils', () => {
  it('creates a valid single-choice poll payload', () => {
    const payload = createPollPayload({
      question: 'Best language?',
      options: ['JavaScript', 'Python'],
      allowMultiple: false,
      isQuiz: false,
    });

    expect(payload.question).toBe('Best language?');
    expect(payload.options).toHaveLength(2);
    expect(payload.maxSelections).toBe(1);
    expect(payload.allowMultiple).toBe(false);
  });

  it('creates quiz payload with required correct option', () => {
    const payload = createPollPayload({
      question: '2 + 2 = ?',
      options: ['3', '4', '5'],
      isQuiz: true,
      correctOptionId: 'opt_2',
    });

    expect(payload.isQuiz).toBe(true);
    expect(payload.correctOptionId).toBe('opt_2');
    expect(payload.maxSelections).toBe(1);
  });

  it('applies and replaces single-choice vote', () => {
    const base = createPollPayload({
      question: 'Pick one',
      options: ['A', 'B'],
    });

    const firstVote = applyPollVote(base, 'u1', ['opt_1']);
    const secondVote = applyPollVote(firstVote, 'u1', ['opt_2']);

    expect(getUserPollSelection(secondVote, 'u1')).toEqual(['opt_2']);
  });

  it('applies multi-choice vote respecting max selections', () => {
    const base = createPollPayload({
      question: 'Pick up to two',
      options: ['A', 'B', 'C'],
      allowMultiple: true,
      maxSelections: 2,
    });

    const voted = applyPollVote(base, 'u1', ['opt_1', 'opt_3']);
    expect(getUserPollSelection(voted, 'u1')).toEqual(['opt_1', 'opt_3']);

    expect(() => applyPollVote(base, 'u2', ['opt_1', 'opt_2', 'opt_3'])).toThrow();
  });

  it('computes vote counts correctly', () => {
    const base = createPollPayload({
      question: 'Favorite',
      options: ['A', 'B'],
    });

    const withU1 = applyPollVote(base, 'u1', ['opt_1']);
    const withU2 = applyPollVote(withU1, 'u2', ['opt_2']);
    const withU3 = applyPollVote(withU2, 'u3', ['opt_2']);

    const counts = getPollVoteCounts(withU3);
    expect(counts.opt_1).toBe(1);
    expect(counts.opt_2).toBe(2);
  });

  it('returns quiz correctness for selected answer', () => {
    const quiz = createPollPayload({
      question: 'Capital of France?',
      options: ['Berlin', 'Paris', 'Rome'],
      isQuiz: true,
      correctOptionId: 'opt_2',
    });

    const answeredWrong = applyPollVote(quiz, 'u1', ['opt_1']);
    const answeredRight = applyPollVote(quiz, 'u2', ['opt_2']);

    expect(isUserPollAnswerCorrect(answeredWrong, 'u1')).toBe(false);
    expect(isUserPollAnswerCorrect(answeredRight, 'u2')).toBe(true);
  });

  it('parses serialized payload safely', () => {
    const base = createPollPayload({
      question: 'Safe parse',
      options: ['Yes', 'No'],
    });

    const parsed = parsePollPayload(JSON.stringify(base));
    expect(parsed).not.toBeNull();
    expect(parsed.options).toHaveLength(2);
  });
});
