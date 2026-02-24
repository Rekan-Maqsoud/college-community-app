import React from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppSettings } from '../context/AppSettingsContext';
import { wp, hp, normalize, spacing } from '../utils/responsive';
import { borderRadius } from '../theme/designTokens';

const RepDetectionPopup = ({ visible, onVote, onDismiss, hasActiveElection }) => {
  const { t, theme, isDarkMode } = useAppSettings();

  console.log('[REP_DEBUG] RepDetectionPopup:render', {
    visible,
    hasActiveElection,
  });

  if (!visible) return null;

  const title = hasActiveElection
    ? t('repVoting.title')
    : t('repVoting.noRepTitle');
  const message = hasActiveElection
    ? t('repVoting.voteInstruction').replace('{seat}', '1')
    : t('repVoting.noRepMessage');
  const buttonLabel = hasActiveElection
    ? t('repVoting.startVoting')
    : t('repVoting.startVoting');

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={[styles.iconCircle, { backgroundColor: theme.primary + '20' }]}>
            <Ionicons name="people-outline" size={normalize(36)} color={theme.primary} />
          </View>

          <Text style={[styles.title, { color: theme.text }]}>
            {title}
          </Text>

          <Text style={[styles.message, { color: theme.textSecondary }]}>
            {message}
          </Text>

          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: theme.primary }]}
            onPress={() => {
              console.log('[REP_DEBUG] RepDetectionPopup:pressVote');
              onVote();
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="hand-left-outline" size={normalize(18)} color="#FFFFFF" />
            <Text style={styles.primaryButtonText}>{t('repVoting.startVoting')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.secondaryButton, { borderColor: theme.border }]}
            onPress={() => {
              console.log('[REP_DEBUG] RepDetectionPopup:pressDismiss');
              onDismiss();
            }}
            activeOpacity={0.7}
          >
            <Text style={[styles.secondaryButtonText, { color: theme.textSecondary }]}>
              {t('repVoting.maybeLater')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: wp(6),
  },
  card: {
    width: '100%',
    maxWidth: wp(88),
    borderRadius: borderRadius.xl,
    padding: wp(6),
    alignItems: 'center',
    borderWidth: 1,
  },
  iconCircle: {
    width: normalize(72),
    height: normalize(72),
    borderRadius: normalize(36),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: normalize(18),
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  message: {
    fontSize: normalize(14),
    textAlign: 'center',
    lineHeight: normalize(20),
    marginBottom: spacing.lg,
    paddingHorizontal: wp(2),
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    width: '100%',
    paddingVertical: hp(1.6),
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: normalize(15),
    fontWeight: '600',
  },
  secondaryButton: {
    width: '100%',
    paddingVertical: hp(1.2),
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: normalize(14),
    fontWeight: '500',
  },
});

export default RepDetectionPopup;
