import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';
import * as Updates from 'expo-updates';

let initialized = false;

const getEnvironment = () => {
  const configuredEnvironment = String(process.env.EXPO_PUBLIC_APP_ENV || '').trim();
  if (configuredEnvironment) {
    return configuredEnvironment;
  }

  return __DEV__ ? 'development' : 'production';
};

export const initCrashReporting = () => {
  if (initialized) {
    return;
  }

  const dsn = String(process.env.EXPO_PUBLIC_SENTRY_DSN || '').trim();
  if (!dsn) {
    return;
  }

  const appVersion = Constants?.expoConfig?.version || 'unknown';
  const updateId = Updates?.updateId || null;
  const channel = Updates?.channel || 'unknown';

  Sentry.init({
    dsn,
    enabled: !__DEV__ || process.env.EXPO_PUBLIC_ENABLE_SENTRY_DEV === 'true',
    environment: getEnvironment(),
    release: `college-community@${appVersion}`,
    dist: updateId || undefined,
    debug: __DEV__,
    tracesSampleRate: __DEV__ ? 1.0 : 0.2,
    profilesSampleRate: __DEV__ ? 1.0 : 0.1,
    attachStacktrace: true,
    sendDefaultPii: false,
  });

  Sentry.setTag('expo_channel', channel);
  if (updateId) {
    Sentry.setTag('expo_update_id', updateId);
  }

  initialized = true;
};

export const captureException = (error, context = {}) => {
  if (!initialized) {
    return;
  }

  Sentry.captureException(error, {
    extra: context,
  });
};

export const captureMessage = (message, level = 'info', context = {}) => {
  if (!initialized) {
    return;
  }

  Sentry.captureMessage(message, {
    level,
    extra: context,
  });
};

export const setCrashReportingUser = (user) => {
  if (!initialized) {
    return;
  }

  if (!user?.$id) {
    Sentry.setUser(null);
    return;
  }

  Sentry.setUser({
    id: user.$id,
    username: user.name || undefined,
    email: user.email || undefined,
  });
};