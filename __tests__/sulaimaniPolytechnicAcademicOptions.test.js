import {
  getCollegesForUniversity,
  getDepartmentsForCollege,
  getStagesForDepartment,
} from '../app/data/universitiesData';
import enBase from '../locales/en/base';
import arBase from '../locales/ar/base';
import kuBase from '../locales/ku/base';
import enDepartments from '../locales/en/departments';
import arDepartments from '../locales/ar/departments';
import kuDepartments from '../locales/ku/departments';

describe('sulaimani polytechnic academic options', () => {
  const universityKey = 'sulaimaniPolytechnic';
  const collegeKey = 'technicalCollegeOfInformatic';

  it('includes the technical college of informatics', () => {
    expect(getCollegesForUniversity(universityKey)).toContain(collegeKey);
  });

  it('includes all official TCI departments', () => {
    expect(getDepartmentsForCollege(universityKey, collegeKey)).toEqual([
      'informationTechnology',
      'networkTechnology',
      'databaseTechnology',
    ]);
  });

  it('uses 4-year stages for all TCI departments', () => {
    ['informationTechnology', 'networkTechnology', 'databaseTechnology'].forEach((departmentKey) => {
      expect(getStagesForDepartment(universityKey, collegeKey, departmentKey)).toEqual([
        'firstYear',
        'secondYear',
        'thirdYear',
        'fourthYear',
      ]);
    });
  });

  it('keeps college labels available in all supported languages', () => {
    [enBase, arBase, kuBase].forEach((localeBase) => {
      expect(localeBase?.colleges?.[collegeKey]).toBeTruthy();
    });
  });

  it('keeps TCI department labels available in all supported languages', () => {
    const departmentKeys = ['informationTechnology', 'networkTechnology', 'databaseTechnology'];

    [enDepartments, arDepartments, kuDepartments].forEach((localeDepartments) => {
      departmentKeys.forEach((departmentKey) => {
        expect(localeDepartments?.departments?.[departmentKey]).toBeTruthy();
      });
    });
  });
});
