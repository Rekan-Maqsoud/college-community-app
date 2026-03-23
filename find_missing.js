const fs = require('fs');

const loadLocale = (filePath) => {
  const content = fs.readFileSync(filePath, 'utf8');
  // Hack to evaluate the JS export without importing ES modules properly (works for simple exports)
  return eval(content.replace('export default ', 'module.exports = '));
};

const enLocales = {
  base: loadLocale('./locales/en/base.js'),
  chats: loadLocale('./locales/en/chats.js'),
  settings: loadLocale('./locales/en/settings.js'),
  auth: loadLocale('./locales/en/auth.js'),
  departments: loadLocale('./locales/en/departments.js'),
};

const kuLocales = {
  base: loadLocale('./locales/ku/base.js'),
  chats: loadLocale('./locales/ku/chats.js'),
  settings: loadLocale('./locales/ku/settings.js'),
  auth: loadLocale('./locales/ku/auth.js'),
  departments: loadLocale('./locales/ku/departments.js'),
};

const findMissing = (en, other, path = '') => {
  const missing = [];
  for (const key in en) {
    const currentPath = path ? `${path}.${key}` : key;
    if (!(key in other)) {
      missing.push(currentPath);
    } else if (typeof en[key] === 'object' && en[key] !== null) {
      if (typeof other[key] === 'object' && other[key] !== null) {
        missing.push(...findMissing(en[key], other[key], currentPath));
      }
    }
  }
  return missing;
};

console.log("Missing in Kurdish:");
for (const file in enLocales) {
  const missing = findMissing(enLocales[file], kuLocales[file]);
  if (missing.length > 0) {
    console.log(`-- ${file} --`);
    missing.forEach(m => console.log(m));
  }
}
