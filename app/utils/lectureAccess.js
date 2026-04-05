import { getActorIdentityIds, matchesActorIdentity, matchesAnyActorIdentity } from './actorIdentity';

const CHAT_TYPES = {
  STAGE_GROUP: 'stage_group',
  DEPARTMENT_GROUP: 'department_group',
};

const normalizeLectureIdentity = (value) => String(value || '').trim();

const parseLectureIdentityList = (value) => {
  if (Array.isArray(value)) {
    return value.map(normalizeLectureIdentity).filter(Boolean);
  }

  const raw = normalizeLectureIdentity(value);
  if (!raw) {
    return [];
  }

  if (raw.startsWith('[') && raw.endsWith(']')) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map(normalizeLectureIdentity).filter(Boolean);
      }
    } catch {
    }
  }

  return raw.split(',').map(normalizeLectureIdentity).filter(Boolean);
};

export const getLectureManagerIds = (channel) => {
  return Array.from(new Set(parseLectureIdentityList(channel?.managerIds)));
};

export const canManageLectureChannel = (channel, actor) => {
  const actorIdentityIds = Array.isArray(actor) ? actor : getActorIdentityIds(actor);
  if (!channel || !actorIdentityIds.length) {
    return false;
  }

  if (matchesActorIdentity(actorIdentityIds, channel?.ownerId)) {
    return true;
  }

  return getLectureManagerIds(channel).some(managerId => matchesActorIdentity(actorIdentityIds, managerId));
};

export const canLinkLectureGroup = (chat, actor) => {
  const actorIdentityIds = Array.isArray(actor) ? actor : getActorIdentityIds(actor);
  if (!chat?.$id || !actorIdentityIds.length) {
    return false;
  }

  if (chat.type === 'private' || chat.type === CHAT_TYPES.DEPARTMENT_GROUP) {
    return false;
  }

  const representatives = Array.isArray(chat.representatives) ? chat.representatives : [];
  const admins = Array.isArray(chat.admins) ? chat.admins : [];

  if (chat.type === CHAT_TYPES.STAGE_GROUP) {
    return matchesAnyActorIdentity(actorIdentityIds, representatives);
  }

  return matchesAnyActorIdentity(actorIdentityIds, admins) || matchesAnyActorIdentity(actorIdentityIds, representatives);
};