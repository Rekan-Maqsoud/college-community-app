import { useTranslation as useI18nextTranslation } from 'react-i18next';

// Simple hook that returns just the translate function
// For when you only need 't' and don't need other language features
export const useTranslation = () => {
  const { t } = useI18nextTranslation();
  return { t };
};

export default useTranslation;
