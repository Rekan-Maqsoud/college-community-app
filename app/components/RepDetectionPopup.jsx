import React from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet } from 'react-native';
import { wp, hp, normalize, spacing } from '../utils/responsive';
import { borderRadius } from '../theme/designTokens';
import { GlassModalCard } from './GlassComponents';
import { useAppSettings } from '../context/AppSettingsContext';
import { PeopleOutlineIcon, HandLeftOutlineIcon } from './icons/chats';

const RepDetectionPopup = ({ visible, onVote, onDismiss, hasActiveElection }) => {
  const { t, theme } = useAppSettings();

  if (!visible) return null;

  const title = hasActiveElection
    ? t('repVoting.title')
    : t('repVoting.noRepTitle');
  const message = hasActiveElection
    ? t('repVoting.voteInstruction').replace('{seat}', '1')
    : t('repVoting.noRepMessage');
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={styles.backdrop}>
        <GlassModalCard style={styles.card}>
          <View style={[styles.iconCircle, { backgroundColor: theme.primary + '20' }]}>
            <PeopleOutlineIcon size={normalize(36)} color={theme.primary} />
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
              onVote();
            }}
            activeOpacity={0.8}
          >
            <HandLeftOutlineIcon size={normalize(18)} color="#FFFFFF" />
            <Text style={styles.primaryButtonText}>{t('repVoting.startVoting')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.secondaryButton, { borderColor: theme.border }]}
            onPress={() => {
              onDismiss();
            }}
            activeOpacity={0.7}
          >
            <Text style={[styles.secondaryButtonText, { color: theme.textSecondary }]}>
              {t('repVoting.maybeLater')}
            </Text>
          </TouchableOpacity>
        </GlassModalCard>
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
    borderWidth: 0,
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
