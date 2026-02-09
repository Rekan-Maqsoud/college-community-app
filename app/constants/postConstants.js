export const POST_TYPES = {
  QUESTION: 'question',
  DISCUSSION: 'discussion',
  NOTE: 'note',
  ANNOUNCEMENT: 'announcement',
};

export const POST_TYPE_OPTIONS = [
  { value: POST_TYPES.QUESTION, labelKey: 'post.types.question' },
  { value: POST_TYPES.DISCUSSION, labelKey: 'post.types.discussion' },
  { value: POST_TYPES.NOTE, labelKey: 'post.types.note' },
  { value: POST_TYPES.ANNOUNCEMENT, labelKey: 'post.types.announcement' },
];

export const DEPARTMENTS = [
  { value: 'computer_science', labelKey: 'departments.computer_science' },
  { value: 'software_engineering', labelKey: 'departments.software_engineering' },
  { value: 'information_technology', labelKey: 'departments.information_technology' },
  { value: 'civil_engineering', labelKey: 'departments.civil_engineering' },
  { value: 'electrical_engineering', labelKey: 'departments.electrical_engineering' },
  { value: 'mechanical_engineering', labelKey: 'departments.mechanical_engineering' },
  { value: 'medicine', labelKey: 'departments.medicine' },
  { value: 'dentistry', labelKey: 'departments.dentistry' },
  { value: 'pharmacy', labelKey: 'departments.pharmacy' },
  { value: 'nursing', labelKey: 'departments.nursing' },
  { value: 'law', labelKey: 'departments.law' },
  { value: 'business', labelKey: 'departments.business' },
  { value: 'accounting', labelKey: 'departments.accounting' },
  { value: 'economics', labelKey: 'departments.economics' },
  { value: 'english', labelKey: 'departments.english' },
  { value: 'arabic', labelKey: 'departments.arabic' },
  { value: 'kurdish', labelKey: 'departments.kurdish' },
  { value: 'mathematics', labelKey: 'departments.mathematics' },
  { value: 'physics', labelKey: 'departments.physics' },
  { value: 'chemistry', labelKey: 'departments.chemistry' },
  { value: 'biology', labelKey: 'departments.biology' },
  { value: 'architecture', labelKey: 'departments.architecture' },
  { value: 'other', labelKey: 'departments.other' },
];

export const STAGES = [
  { value: 'stage_1', labelKey: 'stages.stage_1' },
  { value: 'stage_2', labelKey: 'stages.stage_2' },
  { value: 'stage_3', labelKey: 'stages.stage_3' },
  { value: 'stage_4', labelKey: 'stages.stage_4' },
  { value: 'stage_5', labelKey: 'stages.stage_5' },
  { value: 'stage_6', labelKey: 'stages.stage_6' },
  { value: 'graduate', labelKey: 'stages.graduate' },
  { value: 'all', labelKey: 'stages.all' },
];

const EXTENDED_STAGE_KEYWORDS = ['medical', 'dental', 'law'];

export const isExtendedStageDepartment = (departmentKey) => {
  if (!departmentKey) return false;
  const normalized = departmentKey.toLowerCase();
  return EXTENDED_STAGE_KEYWORDS.some((keyword) => normalized.includes(keyword));
};

export const getStageOptionsForDepartment = (departmentKey) => {
  const allowExtendedStages = isExtendedStageDepartment(departmentKey);
  return STAGES.filter((stage) => {
    if (stage.value === 'stage_5' || stage.value === 'stage_6') {
      return allowExtendedStages;
    }
    return true;
  });
};

export const MAX_IMAGES_PER_POST = 10;
export const MAX_IMAGES_PER_REPLY = 5;

export const MAX_POST_TEXT_LENGTH = 5000;
export const MAX_REPLY_TEXT_LENGTH = 2000;
export const MAX_TOPIC_LENGTH = 200;

export const MIN_POST_TEXT_LENGTH = 10;
export const MIN_REPLY_TEXT_LENGTH = 5;
export const MIN_TOPIC_LENGTH = 5;

export const VALIDATION_RULES = {
  POST: {
    text: {
      min: MIN_POST_TEXT_LENGTH,
      max: MAX_POST_TEXT_LENGTH,
    },
    topic: {
      min: MIN_TOPIC_LENGTH,
      max: MAX_TOPIC_LENGTH,
    },
    images: {
      max: MAX_IMAGES_PER_POST,
    },
  },
  REPLY: {
    text: {
      min: MIN_REPLY_TEXT_LENGTH,
      max: MAX_REPLY_TEXT_LENGTH,
    },
    images: {
      max: MAX_IMAGES_PER_REPLY,
    },
  },
};

export const POST_ICONS = {
  [POST_TYPES.QUESTION]: 'help-circle-outline',
  [POST_TYPES.DISCUSSION]: 'chatbubbles-outline',
  [POST_TYPES.NOTE]: 'document-text-outline',
  [POST_TYPES.ANNOUNCEMENT]: 'megaphone-outline',
};

export const POST_COLORS = {
  [POST_TYPES.QUESTION]: '#3B82F6',
  [POST_TYPES.DISCUSSION]: '#8B5CF6',
  [POST_TYPES.NOTE]: '#10B981',
  [POST_TYPES.ANNOUNCEMENT]: '#F59E0B',
};
