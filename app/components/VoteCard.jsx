import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ProfilePicture from './ProfilePicture';
import { wp, normalize, spacing } from '../utils/responsive';
import { borderRadius } from '../theme/designTokens';

/**
 * Card showing a candidate in the voting screen with their vote count.
 */
const VoteCard = ({ candidate, voteCount, isVotedByMe, isLeading, disabled, isTiebreakerCandidate, onVote, colors, t }) => {
  const name = candidate?.name || candidate?.fullName || '';
  const avatar = candidate?.profilePicture || '';
  const department = candidate?.department || '';
  const userId = candidate?.$id || candidate?.userID || '';

  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: isVotedByMe ? colors.primary : colors.border,
          borderWidth: isVotedByMe ? 2 : 1,
          opacity: disabled ? 0.6 : 1,
        },
      ]}
      onPress={() => onVote(userId)}
      activeOpacity={disabled ? 1 : 0.7}
      disabled={disabled}
    >
      <View style={styles.left}>
        <ProfilePicture
          uri={avatar}
          name={name}
          size={normalize(44)}
        />
        <View style={styles.info}>
          <View style={styles.nameRow}>
            <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
              {name}
            </Text>
            {isLeading && voteCount > 0 && (
              <View style={[styles.leadingBadge, { backgroundColor: colors.success || '#22C55E' }]}>
                <Ionicons name="trophy" size={10} color="#FFFFFF" />
              </View>
            )}
          </View>
          {department ? (
            <Text style={[styles.subtitle, { color: colors.textSecondary }]} numberOfLines={1}>
              {t ? t(`departments.${department}`) : department}
            </Text>
          ) : null}
        </View>
      </View>

      <View style={styles.right}>
        <View style={[styles.voteCountBox, { backgroundColor: isVotedByMe ? colors.primary + '20' : colors.inputBackground }]}>
          <Ionicons
            name={isVotedByMe ? 'checkmark-circle' : 'ellipse-outline'}
            size={normalize(16)}
            color={isVotedByMe ? colors.primary : colors.textSecondary}
          />
          <Text style={[styles.voteCount, { color: isVotedByMe ? colors.primary : colors.text }]}>
            {voteCount}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: wp(3.5),
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.sm,
  },
  info: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  name: {
    fontSize: normalize(14),
    fontWeight: '600',
  },
  subtitle: {
    fontSize: normalize(11),
    marginTop: 2,
  },
  leadingBadge: {
    width: normalize(18),
    height: normalize(18),
    borderRadius: normalize(9),
    justifyContent: 'center',
    alignItems: 'center',
  },
  right: {
    marginLeft: spacing.sm,
  },
  voteCountBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
  },
  voteCount: {
    fontSize: normalize(14),
    fontWeight: '700',
  },
});

export default VoteCard;
