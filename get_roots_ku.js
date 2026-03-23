const fs = require('fs');
const getRootKeys = (file) => {
  const content = fs.readFileSync(file, 'utf8');
  const mod = eval(content.replace('export default ', 'module.exports = '));
  return Object.keys(mod);
};
['ku/base.js', 'ku/auth.js', 'ku/chats.js', 'ku/settings.js', 'ku/departments.js'].forEach(f => {
  console.log(f, getRootKeys('./locales/' + f));
});
