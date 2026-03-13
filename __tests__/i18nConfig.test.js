jest.mock('expo-localization', () => ({
  getLocales: jest.fn(() => [{ languageCode: 'en' }]),
}));

describe('i18n bootstrap', () => {
  it('tracks the supported locales and RTL locales explicitly', () => {
    jest.isolateModules(() => {
      const {
        SUPPORTED_LANGUAGES,
        RTL_LANGUAGES,
        isRTLLanguage,
      } = require('../locales/i18n');

      expect(SUPPORTED_LANGUAGES).toEqual(['en', 'ar', 'ku']);
      expect(RTL_LANGUAGES).toEqual(['ar', 'ku']);
      expect(isRTLLanguage('ar')).toBe(true);
      expect(isRTLLanguage('ku')).toBe(true);
      expect(isRTLLanguage('en')).toBe(false);
    });
  });

  it('loads Arabic translations without lazy backend resolution', async () => {
    await jest.isolateModulesAsync(async () => {
      const i18n = require('../locales/i18n').default;

      await i18n.changeLanguage('ar');

      expect(i18n.t('settings.language')).toBe('اللغة');
    });
  });
});