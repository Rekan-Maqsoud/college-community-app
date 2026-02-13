import {
  MAJOR_CATEGORIES,
  getMajorForDepartment,
  getDepartmentsInSameMajor,
} from '../app/constants/feedCategories';

describe('feed categories mapping', () => {
  it('maps known departments to majors', () => {
    expect(getMajorForDepartment('ICTE')).toBe(MAJOR_CATEGORIES.INFORMATION_TECHNOLOGY);
    expect(getMajorForDepartment('nursing')).toBe(MAJOR_CATEGORIES.MEDICAL);
    expect(getMajorForDepartment('civil')).toBe(MAJOR_CATEGORIES.ENGINEERING);
  });

  it('returns null for unknown department major', () => {
    expect(getMajorForDepartment('unknown_dept')).toBeNull();
  });

  it('returns same-major departments for a known department', () => {
    const departments = getDepartmentsInSameMajor('ICTE');
    expect(departments).toContain('ICTE');
    expect(departments).toContain('AIE');
    expect(departments).toContain('softwareDevelopment');
  });

  it('falls back to original department when major is unknown', () => {
    expect(getDepartmentsInSameMajor('my_custom_dept')).toEqual(['my_custom_dept']);
  });
});
