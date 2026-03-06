import { getLocales } from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import resourcesToBackend from 'i18next-resources-to-backend';
import en from './en';

const supportedLanguages = ['en', 'ar', 'ku'];

const getDeviceLocale = () => {
  try {
    const locales = getLocales();
    const languageCode = locales && locales[0] ? locales[0].languageCode : 'en';
    return supportedLanguages.includes(languageCode) ? languageCode : 'en';
  } catch (error) {
    return 'en';
  }
};

if (!i18n.isInitialized) {
  i18n
    .use(initReactI18next)
    .use(
      resourcesToBackend(async (language) => {
        if (language === 'ar') {
          const module = await import('./ar');
          return module.default;
        }

        if (language === 'ku') {
          const module = await import('./ku');
          return module.default;
        }

        const module = await import('./en');
        return module.default;
      }),
    )
    .init({
      lng: getDeviceLocale(),
      fallbackLng: 'en',
      supportedLngs: supportedLanguages,
      resources: {
        en: {
          translation: en,
        },
      },
      ns: ['translation'],
      defaultNS: 'translation',
      interpolation: {
        escapeValue: false,
        prefix: '%{',
        suffix: '}',
      },
      returnNull: false,
      react: {
        useSuspense: false,
      },
      load: 'languageOnly',
      partialBundledLanguages: true,
    });
}

export default i18n;
