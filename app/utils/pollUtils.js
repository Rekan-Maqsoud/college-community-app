const POLL_OPTION_ID_PREFIX = 'opt_';

const toSafeString = (value) => String(value || '').trim();

const parseSelectionInput = (selectionInput) => {
  if (Array.isArray(selectionInput)) {
    return selectionInput.map((selection) => toSafeString(selection)).filter(Boolean);
  }

  const singleSelection = toSafeString(selectionInput);
  return singleSelection ? [singleSelection] : [];
};

const normalizeOption = (option, index) => {
  if (typeof option === 'string') {
    const optionText = toSafeString(option);
    return optionText
      ? {
          id: `${POLL_OPTION_ID_PREFIX}${index + 1}`,
          text: optionText,
        }
      : null;
  }

  if (!option || typeof option !== 'object') {
    return null;
  }

  const optionId = toSafeString(option.id) || `${POLL_OPTION_ID_PREFIX}${index + 1}`;
  const optionText = toSafeString(option.text);

  if (!optionText) {
    return null;
  }

  return {
    id: optionId,
    text: optionText,
  };
};

const normalizeVotesByUser = (votesByUser = {}, validOptionIds = []) => {
  const validOptionIdSet = new Set(validOptionIds);
  const normalizedVotes = {};

  if (!votesByUser || typeof votesByUser !== 'object') {
    return normalizedVotes;
  }

  Object.entries(votesByUser).forEach(([userId, selections]) => {
    const normalizedUserId = toSafeString(userId);
    if (!normalizedUserId) {
      return;
    }

    const selectedOptions = parseSelectionInput(selections)
      .filter((selection) => validOptionIdSet.has(selection));

    if (selectedOptions.length > 0) {
      normalizedVotes[normalizedUserId] = Array.from(new Set(selectedOptions));
    }
  });

  return normalizedVotes;
};

export const createPollPayload = ({
  question,
  options,
  allowMultiple = false,
  maxSelections = 1,
  isQuiz = false,
  correctOptionId = '',
}) => {
  const normalizedQuestion = toSafeString(question);
  const normalizedOptions = (Array.isArray(options) ? options : [])
    .map((option, index) => normalizeOption(option, index))
    .filter(Boolean);

  if (!normalizedQuestion) {
    throw new Error('Poll question is required');
  }

  if (normalizedOptions.length < 2) {
    throw new Error('Poll must have at least two options');
  }

  const optionIds = normalizedOptions.map((option) => option.id);
  const isMultiSelect = Boolean(allowMultiple) && !isQuiz;
  const normalizedMaxSelections = isMultiSelect
    ? Math.max(1, Math.min(Number(maxSelections) || 1, normalizedOptions.length))
    : 1;

  const normalizedCorrectOptionId = isQuiz && optionIds.includes(correctOptionId)
    ? correctOptionId
    : '';

  if (isQuiz && !normalizedCorrectOptionId) {
    throw new Error('Correct option is required for quiz');
  }

  return {
    question: normalizedQuestion,
    options: normalizedOptions,
    allowMultiple: isMultiSelect,
    maxSelections: normalizedMaxSelections,
    isQuiz: Boolean(isQuiz),
    correctOptionId: normalizedCorrectOptionId,
    votesByUser: {},
  };
};

export const parsePollPayload = (pollPayload) => {
  if (!pollPayload) {
    return null;
  }

  let parsed = pollPayload;
  if (typeof pollPayload === 'string') {
    try {
      parsed = JSON.parse(pollPayload);
    } catch {
      return null;
    }
  }

  if (!parsed || typeof parsed !== 'object') {
    return null;
  }

  const normalizedQuestion = toSafeString(parsed.question);
  const normalizedOptions = (Array.isArray(parsed.options) ? parsed.options : [])
    .map((option, index) => normalizeOption(option, index))
    .filter(Boolean);

  if (!normalizedQuestion || normalizedOptions.length < 2) {
    return null;
  }

  const optionIds = normalizedOptions.map((option) => option.id);
  const isQuiz = Boolean(parsed.isQuiz);
  const allowMultiple = Boolean(parsed.allowMultiple) && !isQuiz;
  const maxSelections = allowMultiple
    ? Math.max(1, Math.min(Number(parsed.maxSelections) || 1, normalizedOptions.length))
    : 1;
  const correctOptionId = isQuiz && optionIds.includes(parsed.correctOptionId)
    ? parsed.correctOptionId
    : '';
  const votesByUser = normalizeVotesByUser(parsed.votesByUser, optionIds);

  return {
    question: normalizedQuestion,
    options: normalizedOptions,
    allowMultiple,
    maxSelections,
    isQuiz,
    correctOptionId,
    votesByUser,
  };
};

export const getUserPollSelection = (pollPayload, userId) => {
  const normalizedPoll = parsePollPayload(pollPayload);
  const normalizedUserId = toSafeString(userId);

  if (!normalizedPoll || !normalizedUserId) {
    return [];
  }

  return normalizedPoll.votesByUser[normalizedUserId] || [];
};

export const getPollVoteCounts = (pollPayload) => {
  const normalizedPoll = parsePollPayload(pollPayload);

  if (!normalizedPoll) {
    return {};
  }

  const voteCounts = normalizedPoll.options.reduce((accumulator, option) => {
    accumulator[option.id] = 0;
    return accumulator;
  }, {});

  Object.values(normalizedPoll.votesByUser).forEach((selections) => {
    selections.forEach((selection) => {
      if (typeof voteCounts[selection] === 'number') {
        voteCounts[selection] += 1;
      }
    });
  });

  return voteCounts;
};

export const hasUserAnsweredPoll = (pollPayload, userId) => {
  return getUserPollSelection(pollPayload, userId).length > 0;
};

export const isUserPollAnswerCorrect = (pollPayload, userId) => {
  const normalizedPoll = parsePollPayload(pollPayload);
  if (!normalizedPoll || !normalizedPoll.isQuiz || !normalizedPoll.correctOptionId) {
    return null;
  }

  const userSelection = getUserPollSelection(normalizedPoll, userId);
  if (userSelection.length === 0) {
    return null;
  }

  if (userSelection.length !== 1) {
    return false;
  }

  return userSelection[0] === normalizedPoll.correctOptionId;
};

export const applyPollVote = (pollPayload, userId, selectionInput) => {
  const normalizedPoll = parsePollPayload(pollPayload);
  const normalizedUserId = toSafeString(userId);

  if (!normalizedPoll) {
    throw new Error('Invalid poll payload');
  }

  if (!normalizedUserId) {
    throw new Error('User ID is required');
  }

  const validOptionIds = new Set(normalizedPoll.options.map((option) => option.id));
  const selections = parseSelectionInput(selectionInput)
    .filter((selection) => validOptionIds.has(selection));

  if (selections.length === 0) {
    throw new Error('At least one option must be selected');
  }

  if (!normalizedPoll.allowMultiple && selections.length > 1) {
    throw new Error('Only one option can be selected');
  }

  if (selections.length > normalizedPoll.maxSelections) {
    throw new Error('Selection exceeds max allowed choices');
  }

  const uniqueSelections = Array.from(new Set(selections));
  const nextPoll = {
    ...normalizedPoll,
    votesByUser: {
      ...normalizedPoll.votesByUser,
      [normalizedUserId]: uniqueSelections,
    },
  };

  return nextPoll;
};

export const serializePollPayload = (pollPayload) => {
  return JSON.stringify(parsePollPayload(pollPayload));
};
