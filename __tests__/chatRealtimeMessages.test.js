import {
  normalizeRealtimeMessage,
  applyRealtimeMessageUpdate,
} from '../app/utils/realtimeHelpers';

describe('normalizeRealtimeMessage', () => {
  it('normalizes payload and fills content fields', () => {
    const payload = {
      $id: 'msg-1',
      chatId: 'chat-1',
      senderId: 'user-1',
      text: 'Hello',
      $createdAt: '2026-02-07T10:00:00.000Z',
    };

    const normalized = normalizeRealtimeMessage(payload, 'chat-1');

    expect(normalized).toEqual({
      ...payload,
      content: 'Hello',
      senderId: 'user-1',
      $createdAt: '2026-02-07T10:00:00.000Z',
    });
  });

  it('returns null for wrong chat or missing ids', () => {
    const payload = { chatId: 'chat-2', senderId: 'user-1' };

    expect(normalizeRealtimeMessage(payload, 'chat-1')).toBeNull();
  });
});

describe('applyRealtimeMessageUpdate', () => {
  it('replaces optimistic message with confirmed payload', () => {
    const prevMessages = [
      {
        $id: 'temp-1',
        senderId: 'user-1',
        content: 'Hello',
        _isOptimistic: true,
      },
    ];

    const incoming = {
      $id: 'msg-1',
      senderId: 'user-1',
      content: 'Hello',
    };

    const updated = applyRealtimeMessageUpdate(prevMessages, incoming, 'user-2');

    expect(updated).toHaveLength(1);
    expect(updated[0]).toMatchObject({
      $id: 'msg-1',
      _status: 'sent',
      _isOptimistic: false,
    });
  });

  it('ignores self messages without optimistic match', () => {
    const prevMessages = [
      {
        $id: 'msg-0',
        senderId: 'user-1',
        content: 'Existing',
      },
    ];

    const incoming = {
      $id: 'msg-2',
      senderId: 'user-1',
      content: 'New',
    };

    const updated = applyRealtimeMessageUpdate(prevMessages, incoming, 'user-1');

    expect(updated).toEqual(prevMessages);
  });
});
