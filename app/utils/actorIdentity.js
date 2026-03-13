const normalizeIdentityValue = (value) => String(value || '').trim();

export const getActorIdentityIds = (actor = null) => {
  const identities = [
    actor?.accountId,
    actor?.userId,
    actor?.userID,
    actor?.$id,
  ]
    .map(normalizeIdentityValue)
    .filter(Boolean);

  return Array.from(new Set(identities));
};

export const getPrimaryActorId = (actor = null) => {
  return getActorIdentityIds(actor)[0] || '';
};

export const matchesActorIdentity = (actorOrIds, value) => {
  const actorIdentityIds = Array.isArray(actorOrIds)
    ? Array.from(new Set((actorOrIds || []).map(normalizeIdentityValue).filter(Boolean)))
    : getActorIdentityIds(actorOrIds);
  const normalizedValue = normalizeIdentityValue(value);

  return !!normalizedValue && actorIdentityIds.includes(normalizedValue);
};

export const matchesAnyActorIdentity = (actorOrIds, values = []) => {
  const actorIdentityIds = Array.isArray(actorOrIds)
    ? Array.from(new Set((actorOrIds || []).map(normalizeIdentityValue).filter(Boolean)))
    : getActorIdentityIds(actorOrIds);

  return (Array.isArray(values) ? values : [values]).some(value => matchesActorIdentity(actorIdentityIds, value));
};