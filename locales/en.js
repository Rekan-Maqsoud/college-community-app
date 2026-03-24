import base from './en/base';
import auth from './en/auth';
import chats from './en/chats';
import settings from './en/settings';
import departments from './en/departments';
import moderation from './en/moderation';

export default {
  ...base,
  ...auth,
  ...chats,
  ...settings,
  ...departments,
  ...moderation,
};
