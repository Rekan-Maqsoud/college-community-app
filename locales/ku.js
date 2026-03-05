import base from './ku/base';
import auth from './ku/auth';
import chats from './ku/chats';
import settings from './ku/settings';
import departments from './ku/departments';

export default {
  ...base,
  ...auth,
  ...chats,
  ...settings,
  ...departments,
};
