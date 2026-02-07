export const isCreateEvent = (events = []) => {
  if (!Array.isArray(events)) {
    return false;
  }

  return events.some(eventName => eventName.includes('.documents.') && eventName.endsWith('.create'));
};

export const isDeleteEvent = (events = []) => {
  if (!Array.isArray(events)) {
    return false;
  }

  return events.some(eventName => eventName.includes('.documents.') && eventName.endsWith('.delete'));
};

export const normalizeRealtimeMessage = (payload, chatId) => {
  if (!payload || payload.chatId !== chatId) {
    return null;
  }

  const normalized = {
    ...payload,
    $id: payload.$id,
    senderId: payload.senderId || payload.userId,
    content: payload.content || payload.text || '',
    $createdAt: payload.$createdAt || payload.createdAt,
  };

  if (!normalized.$id || !normalized.senderId) {
    return null;
  }

  return normalized;
};

export const applyRealtimeMessageUpdate = (prevMessages, incomingMessage, currentUserId) => {
  if (!Array.isArray(prevMessages) || !incomingMessage) {
    return prevMessages;
  }

  if (!incomingMessage.$id || !incomingMessage.senderId) {
    return prevMessages;
  }

  const existingIndex = prevMessages.findIndex(message => message.$id === incomingMessage.$id);
  if (existingIndex >= 0) {
    const updated = [...prevMessages];
    updated[existingIndex] = { ...updated[existingIndex], ...incomingMessage, _isOptimistic: false };
    return updated;
  }

  const optimisticIndex = prevMessages.findIndex(message => 
    message._isOptimistic &&
    message.senderId === incomingMessage.senderId &&
    message.content === incomingMessage.content
  );

  if (optimisticIndex >= 0) {
    const updated = [...prevMessages];
    updated[optimisticIndex] = { ...incomingMessage, _status: 'sent', _isOptimistic: false };
    return updated;
  }

  if (incomingMessage.senderId === currentUserId) {
    return prevMessages;
  }

  return [incomingMessage, ...prevMessages];
};
