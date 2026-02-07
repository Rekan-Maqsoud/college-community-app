import { isCreateEvent, isDeleteEvent } from '../app/utils/realtimeHelpers';

describe('realtime event helpers', () => {
  it('detects create events with document ids', () => {
    const events = [
      'databases.db.collections.messages.documents.123.create',
      'databases.db.collections.messages.documents.123.update',
    ];

    expect(isCreateEvent(events)).toBe(true);
    expect(isDeleteEvent(events)).toBe(false);
  });

  it('detects delete events with document ids', () => {
    const events = ['databases.db.collections.messages.documents.456.delete'];

    expect(isDeleteEvent(events)).toBe(true);
    expect(isCreateEvent(events)).toBe(false);
  });
});
