import { useEffect, useRef, useCallback } from 'react';
import { AppState } from 'react-native';

/**
 * Adaptive polling hook that adjusts its interval based on realtime connection health.
 *
 * When the realtime websocket is healthy the polling interval is *long* (or disabled).
 * When realtime is unhealthy / disconnected, the interval shortens so the UI
 * stays reasonably fresh without hammering the backend.
 *
 * @param {Function} fetchFn       - Async function to execute on each tick.
 * @param {Object}   options
 * @param {boolean}  options.enabled           - Master switch.
 * @param {boolean}  options.realtimeHealthy   - true when websocket is delivering events.
 * @param {number}   options.healthyInterval   - ms between ticks when realtime is live (default 5 min).
 * @param {number}   options.unhealthyInterval - ms between ticks when realtime is down  (default 30 s).
 * @param {number}   options.backgroundGrace   - ms the app must be backgrounded before re-fetching on resume.
 */
const useAdaptivePolling = (
  fetchFn,
  {
    enabled = true,
    realtimeHealthy = true,
    healthyInterval = 5 * 60 * 1000,
    unhealthyInterval = 30 * 1000,
    backgroundGrace = 30 * 1000,
  } = {}
) => {
  const timerRef = useRef(null);
  const fetchRef = useRef(fetchFn);
  const lastForegroundFetchRef = useRef(Date.now());

  useEffect(() => {
    fetchRef.current = fetchFn;
  }, [fetchFn]);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Restart timer whenever health or enabled changes
  useEffect(() => {
    clearTimer();

    if (!enabled) return;

    const interval = realtimeHealthy ? healthyInterval : unhealthyInterval;

    timerRef.current = setInterval(() => {
      fetchRef.current?.();
    }, interval);

    return clearTimer;
  }, [enabled, realtimeHealthy, healthyInterval, unhealthyInterval, clearTimer]);

  // Re-fetch on foreground resume after backgroundGrace has elapsed
  useEffect(() => {
    if (!enabled) return;

    const appStateRef = { current: AppState.currentState };

    const subscription = AppState.addEventListener('change', (nextState) => {
      if (
        appStateRef.current?.match(/inactive|background/) &&
        nextState === 'active' &&
        Date.now() - lastForegroundFetchRef.current > backgroundGrace
      ) {
        lastForegroundFetchRef.current = Date.now();
        fetchRef.current?.();
      }
      appStateRef.current = nextState;
    });

    return () => subscription.remove();
  }, [enabled, backgroundGrace]);
};

export default useAdaptivePolling;
