const fs = require('fs');
const getRootKeys = (file) => {
  const content = fs.readFileSync(file, 'utf8');
  const mod = eval(content.replace('export default ', 'module.exports = '));
  return Object.keys(mod);
};
['en/base.js', 'en/auth.js', 'en/chats.js', 'en/settings.js', 'en/departments.js'].forEach(f => {
  console.log(f, getRootKeys('./locales/' + f));
});
