export const detectTextDir = (text, fallbackDir = 'ltr') => {
  if (!text) return fallbackDir;

  const arabicCount = (text.match(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/g) || []).length;
  const latinCount = (text.match(/[A-Za-z]/g) || []).length;

  if (arabicCount > 0 && latinCount === 0) return 'rtl';
  if (latinCount > 0 && arabicCount === 0) return 'ltr';

  return fallbackDir;
};

export const getPostBodyDir = ({ topic, text, fallbackDir = 'ltr' }) => {
  if (!topic?.trim()) {
    return detectTextDir(text, fallbackDir);
  }

  const topicDir = detectTextDir(topic, fallbackDir);

  if (topicDir === 'rtl') {
    return 'rtl';
  }

  return detectTextDir(text, fallbackDir);
};