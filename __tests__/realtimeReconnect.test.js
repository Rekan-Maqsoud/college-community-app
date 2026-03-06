import {
  computeReconnectDelayMs,
  hasRealtimeChannels,
  isRealtimeSocketConnected,
  shouldReconnectRealtime,
  tryReconnectRealtime,
} from '../app/utils/realtimeReconnect';

describe('realtime reconnect helpers', () => {
  it('computes exponential delay with bounded jitter', () => {
    const delayAttempt0 = computeReconnectDelayMs(0, () => 0);
    const delayAttempt2 = computeReconnectDelayMs(2, () => 0);
    const delayWithMaxJitter = computeReconnectDelayMs(1, () => 1);

    expect(delayAttempt0).toBe(500);
    expect(delayAttempt2).toBe(2000);
    expect(delayWithMaxJitter).toBe(1700);
  });

  it('caps reconnect delay growth', () => {
    const delay = computeReconnectDelayMs(20, () => 0);
    expect(delay).toBe(15000);
  });

  it('detects channel and socket states correctly', () => {
    const realtime = {
      channels: new Set(['databases.db.collections.messages.documents']),
      socket: { readyState: 3 },
      connect: jest.fn(),
    };

    expect(hasRealtimeChannels(realtime)).toBe(true);
    expect(isRealtimeSocketConnected(realtime)).toBe(false);
    expect(shouldReconnectRealtime(realtime)).toBe(true);
  });

  it('does not reconnect without channels or connect function', () => {
    expect(shouldReconnectRealtime({ channels: [] })).toBe(false);
    expect(shouldReconnectRealtime({ connect: () => {}, channels: [] })).toBe(false);
    expect(shouldReconnectRealtime(null)).toBe(false);
  });

  it('tries reconnect safely and handles failures', () => {
    const successRealtime = {
      channels: ['x'],
      socket: { readyState: 3 },
      connect: jest.fn(),
    };
    const failRealtime = {
      channels: ['x'],
      socket: { readyState: 3 },
      connect: jest.fn(() => {
        throw new Error('boom');
      }),
    };

    expect(tryReconnectRealtime(successRealtime)).toBe(true);
    expect(successRealtime.connect).toHaveBeenCalledTimes(1);
    expect(tryReconnectRealtime(failRealtime)).toBe(false);
  });
});
