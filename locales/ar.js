import base from './ar/base';
import auth from './ar/auth';
import chats from './ar/chats';
import settings from './ar/settings';
import departments from './ar/departments';

export default {
  ...base,
  ...auth,
  ...chats,
  ...settings,
  ...departments,
};
