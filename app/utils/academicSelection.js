export const ACADEMIC_OTHER_KEY = 'other';

const normalizeAcademicValue = (value) => {
  if (value === null || value === undefined) {
    return '';
  }
  return String(value).trim().toLowerCase();
};

export const hasAcademicOtherSelection = (data = {}) => {
  const university = normalizeAcademicValue(data?.university);
  const college = normalizeAcademicValue(data?.college);
  const department = normalizeAcademicValue(data?.department);

  return (
    university === ACADEMIC_OTHER_KEY
    || college === ACADEMIC_OTHER_KEY
    || department === ACADEMIC_OTHER_KEY
  );
};
