import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  StatusBar,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppSettings } from '../../context/AppSettingsContext';
import { useUser } from '../../context/UserContext';
import { wp, hp, normalize, spacing } from '../../utils/responsive';
import { borderRadius } from '../../theme/designTokens';
import {
  requestReselection,
  hasUserRequestedReselection,
} from '../../../database/repElections';

const ReselectionRequestScreen = ({ navigation, route }) => {
  const { t, theme, isDarkMode } = useAppSettings();
  const { user } = useUser();
  const insets = useSafeAreaInsets();

  const election = route?.params?.election;
  const department = route?.params?.department || user?.department;
  const stage = route?.params?.stage || user?.stage;
  const seatNumber = route?.params?.seatNumber || election?.seatNumber || 1;

  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  const alreadyVoted = hasUserRequestedReselection(election, user?.$id);
  const reselectionCount = Array.isArray(election?.reselectionVoters) ? election.reselectionVoters.length : 0;
  const threshold = election?.reselectionThreshold || 0;
  const total = election?.totalStudents || 0;
  const progress = threshold > 0 ? Math.min(1, reselectionCount / threshold) : 0;

  const handleRequest = useCallback(async () => {
    if (!election?.$id || submitting) return;

    try {
      setSubmitting(true);
      const res = await requestReselection(election.$id);
      setResult(res);

      if (res.reselectionTriggered) {
        // New election created — navigate to voting
        navigation.replace('RepVoting', { department, stage, seatNumber });
      }
    } catch (error) {
      // Silent fail
    } finally {
      setSubmitting(false);
    }
  }, [election, submitting, department, stage, navigation]);

  const isDisabled = alreadyVoted || result?.alreadyVoted || submitting;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.xs, backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={normalize(24)} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>{t('repVoting.requestReselection')}</Text>
        <View style={{ width: normalize(24) }} />
      </View>

      <View style={styles.content}>
        {/* Icon */}
        <View style={[styles.iconCircle, { backgroundColor: theme.primary + '20' }]}>
          <Ionicons name="refresh-outline" size={normalize(40)} color={theme.primary} />
        </View>

        <Text style={[styles.title, { color: theme.text }]}>
          {t('repVoting.reselectionTitle')}
        </Text>

        <Text style={[styles.description, { color: theme.textSecondary }]}>
          {t('repVoting.reselectionDescription').replace('{threshold}', String(threshold)).replace('{total}', String(total))}
        </Text>

        {/* Progress bar */}
        <View style={[styles.progressContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.progressRow}>
            <Text style={[styles.progressLabel, { color: theme.textSecondary }]}>
              {t('repVoting.reselectionProgress')}
            </Text>
            <Text style={[styles.progressCount, { color: theme.primary }]}>
              {reselectionCount} / {threshold}
            </Text>
          </View>
          <View style={[styles.progressBarBg, { backgroundColor: theme.border }]}>
            <View style={[styles.progressBarFill, { width: `${progress * 100}%`, backgroundColor: theme.primary }]} />
          </View>
        </View>

        {/* Status */}
        {(alreadyVoted || result?.alreadyVoted) && (
          <View style={[styles.statusBox, { backgroundColor: theme.warning + '20', borderColor: theme.warning + '40' }]}>
            <Ionicons name="checkmark-circle" size={normalize(18)} color={theme.warning} />
            <Text style={[styles.statusText, { color: theme.warning }]}>
              {t('repVoting.alreadyRequestedReselection')}
            </Text>
          </View>
        )}

        {result?.reselectionTriggered && (
          <View style={[styles.statusBox, { backgroundColor: (theme.success || '#22C55E') + '20', borderColor: (theme.success || '#22C55E') + '40' }]}>
            <Ionicons name="checkmark-done-circle" size={normalize(18)} color={theme.success || '#22C55E'} />
            <Text style={[styles.statusText, { color: theme.success || '#22C55E' }]}>
              {t('repVoting.reselectionTriggered')}
            </Text>
          </View>
        )}

        {/* Action button */}
        <TouchableOpacity
          style={[
            styles.requestButton,
            {
              backgroundColor: isDisabled ? theme.border : theme.primary,
              opacity: isDisabled ? 0.6 : 1,
            },
          ]}
          onPress={handleRequest}
          disabled={isDisabled}
          activeOpacity={0.8}
        >
          {submitting ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <>
              <Ionicons name="hand-left-outline" size={normalize(18)} color="#FFFFFF" />
              <Text style={styles.requestButtonText}>
                {alreadyVoted || result?.alreadyVoted
                  ? t('repVoting.alreadyVoted')
                  : t('repVoting.requestReselectionBtn')}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: spacing.sm,
    paddingHorizontal: wp(4),
    borderBottomWidth: 1,
  },
  backBtn: {
    padding: spacing.xs,
  },
  headerTitle: {
    fontSize: normalize(17),
    fontWeight: '700',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    padding: wp(6),
    paddingTop: hp(4),
  },
  iconCircle: {
    width: normalize(80),
    height: normalize(80),
    borderRadius: normalize(40),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: normalize(20),
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  description: {
    fontSize: normalize(14),
    textAlign: 'center',
    lineHeight: normalize(20),
    marginBottom: spacing.xl,
    paddingHorizontal: wp(4),
  },
  progressContainer: {
    width: '100%',
    padding: wp(4),
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    marginBottom: spacing.lg,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  progressLabel: {
    fontSize: normalize(13),
  },
  progressCount: {
    fontSize: normalize(14),
    fontWeight: '700',
  },
  progressBarBg: {
    height: normalize(8),
    borderRadius: normalize(4),
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: normalize(4),
  },
  statusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    width: '100%',
    padding: wp(3.5),
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  statusText: {
    flex: 1,
    fontSize: normalize(13),
    fontWeight: '600',
  },
  requestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    width: '100%',
    paddingVertical: hp(1.6),
    borderRadius: borderRadius.lg,
    marginTop: spacing.md,
  },
  requestButtonText: {
    color: '#FFFFFF',
    fontSize: normalize(15),
    fontWeight: '600',
  },
});

export default ReselectionRequestScreen;
