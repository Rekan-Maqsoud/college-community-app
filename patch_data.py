import re

new_data = """  raparinTechnicalAndVocationalInstitute: {
    key: 'raparinTechnicalAndVocationalInstitute',
    colleges: {
      departments: {
        key: 'departments',
        departments: [
          { key: 'nursing', years: 2 },
          { key: 'pharmacy', years: 2 },
          { key: 'businessAndOfficeAdministration', years: 2 },
          { key: 'informationTechnology', years: 2 },
          { key: 'hvac', years: 2 },
          { key: 'automotiveServicing', years: 2 },
          { key: 'electronicAssemblyAndProduction', years: 2 },
          { key: 'beautyCare', years: 2 },
          { key: 'dressmakingAndFashionDesign', years: 2 },
        ]
      }
    }
  },
  duhokPrivateTechnicalInstitute: {
    key: 'duhokPrivateTechnicalInstitute',
    colleges: {
      departments: {
        key: 'departments',
        departments: [
          { key: 'informationTechnology', years: 2 },
          { key: 'businessAdministration', years: 2 },
          { key: 'healthManagementInformationSystems', years: 2 },
          { key: 'bankingManagement', years: 2 },
          { key: 'pharmacy', years: 2 },
          { key: 'healthAdministration', years: 2 },
          { key: 'medicalLaboratoryTechnology', years: 2 },
          { key: 'computerAidedDesignAndManufacturing', years: 2 },
        ]
      }
    }
  },
  haibatSultanTechnicalInstitute: {
    key: 'haibatSultanTechnicalInstitute',
    colleges: {
      departments: {
        key: 'departments',
        departments: [
          { key: 'emergencyNursing', years: 2 },
          { key: 'businessInformationTechnology', years: 2 },
          { key: 'bankingAdministration', years: 2 },
          { key: 'english', years: 2 },
        ]
      }
    }
  },
  kalarPrivateTechnicalInstitute: {
    key: 'kalarPrivateTechnicalInstitute',
    colleges: {
      departments: {
        key: 'departments',
        departments: [
          { key: 'nursing', years: 2 },
          { key: 'pharmacy', years: 2 },
          { key: 'informationTechnology', years: 2 },
          { key: 'englishLanguageAndLiterature', years: 2 },
        ]
      }
    }
  },
  araratPrivateTechnicalInstitute: {
    key: 'araratPrivateTechnicalInstitute',
    colleges: {
      departments: {
        key: 'departments',
        departments: [
          { key: 'drillingEquipmentTechnology', years: 2 },
          { key: 'nursing', years: 2 },
          { key: 'englishLanguage', years: 2 },
        ]
      }
    }
  }
};"""

with open("app/data/universitiesData.js", "r") as f:
    content = f.read()

content = content.replace("};\n\nconst STAGE_KEYS = [", ",\n" + new_data + "\n\nconst STAGE_KEYS = [")

with open("app/data/universitiesData.js", "w") as f:
    f.write(content)

print("Updated universitiesData.js")
