const flattenLeafKeys = (obj, prefix = '') => {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    return [];
  }

  return Object.entries(obj).flatMap(([key, value]) => {
    const nextPrefix = prefix ? `${prefix}.${key}` : key;

    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return flattenLeafKeys(value, nextPrefix);
    }

    return [nextPrefix];
  });
};

describe('tutorial translation parity', () => {
  it('keeps tutorial keys aligned across en, ar, and ku locales', () => {
    const enBase = require('../locales/en/base').default;
    const arBase = require('../locales/ar/base').default;
    const kuBase = require('../locales/ku/base').default;

    const enTutorial = enBase?.tutorial;
    const arTutorial = arBase?.tutorial;
    const kuTutorial = kuBase?.tutorial;

    const enKeys = flattenLeafKeys(enTutorial).sort();
    const arKeys = flattenLeafKeys(arTutorial).sort();
    const kuKeys = flattenLeafKeys(kuTutorial).sort();

    expect(enKeys.length).toBeGreaterThan(0);
    expect(arKeys).toEqual(enKeys);
    expect(kuKeys).toEqual(enKeys);

    const progressTemplates = [
      enBase?.tutorial?.common?.progress,
      arBase?.tutorial?.common?.progress,
      kuBase?.tutorial?.common?.progress,
    ];

    progressTemplates.forEach((template) => {
      expect(typeof template).toBe('string');
      expect(template).toContain('{current}');
      expect(template).toContain('{total}');
    });
  });
});
