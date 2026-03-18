import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Platform,
  DevSettings,
} from 'react-native';
import * as Updates from 'expo-updates';
import * as Sentry from '@sentry/react-native';
import i18n from '../../locales/i18n';
import { captureException } from '../utils/crashReporting';

const isRecoverableRuntimeError = (error) => {
  const message = String(error?.message || error || '').toLowerCase();
  return (
    message.includes('already released')
    || message.includes('shared object')
    || message.includes('audiorecorder')
    || message.includes('expo.modules.audio')
  );
};

const getErrorText = (error) => {
  const raw = String(error?.message || error || '').trim();
  if (!raw) {
    return i18n.t('common.crashBoundary.genericDetails');
  }
  return raw;
};

const getBuildToken = () => {
  const updateId = String(Updates?.updateId || '').trim();
  if (updateId) {
    return updateId.slice(0, 8);
  }

  const createdAt = String(Updates?.createdAt || '').trim();
  if (createdAt) {
    return createdAt.slice(0, 8);
  }

  return '--------';
};

const CrashFallback = ({ error, resetError }) => {
  const [isRestarting, setIsRestarting] = useState(false);
  const [restartFailed, setRestartFailed] = useState(false);
  const isRecoverable = isRecoverableRuntimeError(error);
  const buildLabel = `${i18n.t('common.crashBoundary.buildLabel')}: ${getBuildToken()}`;

  const handleRestartApp = useCallback(async () => {
    setIsRestarting(true);
    setRestartFailed(false);

    try {
      if (Updates?.isEnabled) {
        await Updates.reloadAsync();
        return;
      }

      if (Platform.OS !== 'web' && typeof DevSettings?.reload === 'function') {
        DevSettings.reload();
        return;
      }

      throw new Error('app_reload_unavailable');
    } catch (restartError) {
      captureException(restartError, {
        source: 'ErrorBoundary.handleRestartApp',
      });
      setIsRestarting(false);
      setRestartFailed(true);
    }
  }, []);

  const handleDismiss = useCallback(() => {
    try {
      if (typeof resetError === 'function') {
        resetError();
      }
    } catch (dismissError) {
      captureException(dismissError, {
        source: 'ErrorBoundary.handleDismiss',
      });
    }
  }, [resetError]);

  return (
    <View style={styles.container}>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>{buildLabel}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.title}>{i18n.t('common.crashBoundary.title')}</Text>
        <Text style={styles.subtitle}>{i18n.t('common.crashBoundary.subtitle')}</Text>
        <Text style={styles.hint}>
          {isRecoverable
            ? i18n.t('common.crashBoundary.recoverableHint')
            : i18n.t('common.crashBoundary.fatalHint')}
        </Text>

        <View style={styles.detailsBox}>
          <Text style={styles.detailsTitle}>{i18n.t('common.crashBoundary.detailsTitle')}</Text>
          <Text style={styles.detailsText}>{getErrorText(error)}</Text>
        </View>

        <Pressable
          style={[styles.primaryButton, isRestarting && styles.primaryButtonDisabled]}
          onPress={handleRestartApp}
          disabled={isRestarting}
        >
          {isRestarting ? (
            <View style={styles.restartBusyRow}>
              <ActivityIndicator size="small" color="#FFFFFF" />
              <Text style={styles.primaryButtonText}>{i18n.t('common.crashBoundary.restartingButton')}</Text>
            </View>
          ) : (
            <Text style={styles.primaryButtonText}>{i18n.t('common.crashBoundary.restartButton')}</Text>
          )}
        </Pressable>

        {isRecoverable ? (
          <Pressable
            style={styles.secondaryButton}
            onPress={handleDismiss}
            disabled={isRestarting}
          >
            <Text style={styles.secondaryButtonText}>{i18n.t('common.crashBoundary.dismissButton')}</Text>
          </Pressable>
        ) : (
          <Pressable
            style={styles.secondaryButton}
            onPress={handleDismiss}
            disabled={isRestarting}
          >
            <Text style={styles.secondaryButtonText}>{i18n.t('common.crashBoundary.dismissTryButton')}</Text>
          </Pressable>
        )}

        {restartFailed ? (
          <Text style={styles.restartFailedText}>{i18n.t('common.crashBoundary.restartFailed')}</Text>
        ) : null}
      </View>
    </View>
  );
};

const ErrorBoundary = ({ children }) => {
  const handleError = useCallback((error, componentStack) => {
    captureException(error, {
      componentStack,
      source: 'ErrorBoundary',
    });
  }, []);

  const renderFallback = useCallback(({ error, resetError }) => (
    <CrashFallback error={error} resetError={resetError} />
  ), []);

  return (
    <Sentry.ErrorBoundary
      onError={handleError}
      fallback={renderFallback}
    >
      {children}
    </Sentry.ErrorBoundary>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 28,
    backgroundColor: '#F4F6FA',
  },
  badge: {
    marginBottom: 16,
    borderRadius: 999,
    backgroundColor: '#1F293733',
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  badgeText: {
    fontSize: 12,
    color: '#334155',
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  card: {
    width: '100%',
    maxWidth: 440,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#D5DCE8',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 18,
    paddingVertical: 18,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 5,
  },
  title: {
    fontSize: 27,
    fontWeight: '800',
    lineHeight: 34,
    color: '#D62828',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#0F172A',
    marginBottom: 6,
    lineHeight: 23,
    fontWeight: '700',
  },
  hint: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
    marginBottom: 14,
  },
  detailsBox: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 14,
  },
  detailsTitle: {
    fontSize: 12,
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 6,
    fontWeight: '700',
  },
  detailsText: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 18,
  },
  primaryButton: {
    borderRadius: 12,
    backgroundColor: '#0EA5E9',
    minHeight: 46,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 14,
  },
  primaryButtonDisabled: {
    opacity: 0.85,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  restartBusyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  secondaryButton: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    paddingHorizontal: 14,
    backgroundColor: '#FFFFFF',
  },
  secondaryButtonText: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '700',
  },
  restartFailedText: {
    fontSize: 13,
    color: '#B91C1C',
    textAlign: 'center',
    lineHeight: 19,
    marginTop: 12,
  },
});

export default ErrorBoundary;
