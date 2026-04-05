export const MAJOR_CATEGORIES = {
  MEDICAL: 'medical',
  INFORMATION_TECHNOLOGY: 'informationTechnology',
  ENGINEERING: 'engineering',
  BUSINESS: 'business',
  HUMANITIES: 'humanities',
  SCIENCES: 'sciences',
  ARTS: 'arts',
  EDUCATION: 'education',
};

export const DEPARTMENT_TO_MAJOR = {
  ICTE: MAJOR_CATEGORIES.INFORMATION_TECHNOLOGY,
  ISE: MAJOR_CATEGORIES.INFORMATION_TECHNOLOGY,
  AIE: MAJOR_CATEGORIES.INFORMATION_TECHNOLOGY,
  softwareDevelopment: MAJOR_CATEGORIES.INFORMATION_TECHNOLOGY,
  networkManagement: MAJOR_CATEGORIES.INFORMATION_TECHNOLOGY,
  systemsAdministration: MAJOR_CATEGORIES.INFORMATION_TECHNOLOGY,
  webDesign: MAJOR_CATEGORIES.INFORMATION_TECHNOLOGY,
  databaseManagement: MAJOR_CATEGORIES.INFORMATION_TECHNOLOGY,
  computerEngineering: MAJOR_CATEGORIES.INFORMATION_TECHNOLOGY,
  
  nursing: MAJOR_CATEGORIES.MEDICAL,
  medicalLaboratory: MAJOR_CATEGORIES.MEDICAL,
  radiology: MAJOR_CATEGORIES.MEDICAL,
  anesthesia: MAJOR_CATEGORIES.MEDICAL,
  pharmacy: MAJOR_CATEGORIES.MEDICAL,
  dentalHealth: MAJOR_CATEGORIES.MEDICAL,
  medicine: MAJOR_CATEGORIES.MEDICAL,
  dentistry: MAJOR_CATEGORIES.MEDICAL,
  medicalTechnology: MAJOR_CATEGORIES.MEDICAL,
  publicHealth: MAJOR_CATEGORIES.MEDICAL,
  veterinary: MAJOR_CATEGORIES.MEDICAL,
  
  civil: MAJOR_CATEGORIES.ENGINEERING,
  mechanical: MAJOR_CATEGORIES.ENGINEERING,
  electrical: MAJOR_CATEGORIES.ENGINEERING,
  electronics: MAJOR_CATEGORIES.ENGINEERING,
  architecture: MAJOR_CATEGORIES.ENGINEERING,
  surveying: MAJOR_CATEGORIES.ENGINEERING,
  construction: MAJOR_CATEGORIES.ENGINEERING,
  
  accounting: MAJOR_CATEGORIES.BUSINESS,
  businessManagement: MAJOR_CATEGORIES.BUSINESS,
  finance: MAJOR_CATEGORIES.BUSINESS,
  marketing: MAJOR_CATEGORIES.BUSINESS,
  hotelManagement: MAJOR_CATEGORIES.BUSINESS,
  tourism: MAJOR_CATEGORIES.BUSINESS,
  
  arts: MAJOR_CATEGORIES.ARTS,
  languages: MAJOR_CATEGORIES.HUMANITIES,
  law: MAJOR_CATEGORIES.HUMANITIES,
  politicalScience: MAJOR_CATEGORIES.HUMANITIES,
  
  education: MAJOR_CATEGORIES.EDUCATION,
  basicEducation: MAJOR_CATEGORIES.EDUCATION,
  
  science: MAJOR_CATEGORIES.SCIENCES,
  appliedSciences: MAJOR_CATEGORIES.SCIENCES,
};

export const FEED_TYPES = {
  DEPARTMENT: 'department',
  MAJOR: 'major',
  PUBLIC: 'public',
};

export const getMajorForDepartment = (department) => {
  return DEPARTMENT_TO_MAJOR[department] || null;
};

export const getDepartmentsInSameMajor = (department) => {
  const major = getMajorForDepartment(department);
  if (!major) return [department];
  
  return Object.keys(DEPARTMENT_TO_MAJOR).filter(
    dept => DEPARTMENT_TO_MAJOR[dept] === major
  );
};
