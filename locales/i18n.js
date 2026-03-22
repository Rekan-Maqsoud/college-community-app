import { getLocales } from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './en.js';
import ar from './ar.js';
import ku from './ku.js';

console.log('[startup:i18n] module loaded');

export const SUPPORTED_LANGUAGES = ['en', 'ar', 'ku'];
export const RTL_LANGUAGES = ['ar', 'ku'];

export const isRTLLanguage = (languageCode) => RTL_LANGUAGES.includes(languageCode);

const getDeviceLocale = () => {
  try {
    const locales = getLocales();
    const languageCode = locales && locales[0] ? locales[0].languageCode : 'en';
    const resolvedLanguage = SUPPORTED_LANGUAGES.includes(languageCode) ? languageCode : 'en';
    console.log('[startup:i18n] getDeviceLocale:resolved', {
      languageCode,
      resolvedLanguage,
      localeCount: Array.isArray(locales) ? locales.length : 0,
    });
    return resolvedLanguage;
  } catch (error) {
    console.error('[startup:i18n] getDeviceLocale:error', error);
    return 'en';
  }
};

if (!i18n.isInitialized) {
  console.log('[startup:i18n] init:start');
  // eslint-disable-next-line import/no-named-as-default-member
  i18n
    .use(initReactI18next)
    .init({
      lng: getDeviceLocale(),
      fallbackLng: 'en',
      supportedLngs: SUPPORTED_LANGUAGES,
      resources: {
        en: {
          translation: en,
        },
        ar: {
          translation: ar,
        },
        ku: {
          translation: ku,
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
    });
  console.log('[startup:i18n] init:done', {
    language: i18n.language,
    isInitialized: i18n.isInitialized,
  });
} else {
  console.log('[startup:i18n] init:skipped_already_initialized', {
    language: i18n.language,
    isInitialized: i18n.isInitialized,
  });
}

export default i18n;
