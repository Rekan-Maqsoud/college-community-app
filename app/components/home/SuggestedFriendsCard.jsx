import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { getUserById, getUsersByDepartment } from '../../../database/users';
import { useAppSettings } from '../../context/AppSettingsContext';
import safeStorage from '../../utils/safeStorage';
import { borderRadius } from '../../theme/designTokens';
import { fontSize, moderateScale, spacing } from '../../utils/responsive';
import ProfilePicture from '../ProfilePicture';
import { CloseIcon } from '../icons/home';

const DISMISS_KEY_PREFIX = 'home_suggested_friends_dismiss_until';
const VISIBILITY_KEY_PREFIX = 'home_suggested_friends_visibility';
const DAILY_VISIBILITY_RATE = 0.55;
const MAX_SUGGESTIONS = 4;
const MAX_DEPARTMENT_USERS = 28;
const MAX_FRIENDS_TO_EXPAND = 12;
const MAX_FOF_IDS = 30;

const getDayToken = () => new Date().toDateString();

const getNextLocalDayTimestamp = () => {
  const now = new Date();
  const next = new Date(now);
  next.setDate(now.getDate() + 1);
  next.setHours(0, 0, 0, 0);
  return next.getTime();
};

const makeDailyKey = (prefix, userId) => `${prefix}_${userId}`;

const toUniqueIds = (list = []) => [...new Set((Array.isArray(list) ? list : []).filter(Boolean))];

const SuggestedFriendsCard = ({ user, onUserPress, forceVisible = false }) => {
  const { t, theme, isDarkMode, isRTL } = useAppSettings();
  const [isLoading, setIsLoading] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [suggestions, setSuggestions] = useState([]);

  const loadSuggestions = useCallback(async () => {
    if (!user?.$id || !user?.department) {
      setIsVisible(false);
      setSuggestions([]);
      return;
    }

    const dismissKey = makeDailyKey(DISMISS_KEY_PREFIX, user.$id);
    const visibilityKey = makeDailyKey(VISIBILITY_KEY_PREFIX, user.$id);

    try {
      setIsLoading(true);

      if (!forceVisible) {
        const dismissedUntilRaw = await safeStorage.getItem(dismissKey);
        const dismissedUntil = Number.parseInt(dismissedUntilRaw || '', 10);
        if (Number.isFinite(dismissedUntil) && Date.now() < dismissedUntil) {
          setIsVisible(false);
          setSuggestions([]);
          return;
        }

        const today = getDayToken();
        let shouldShowToday = false;
        let hasCachedDecision = false;

        const visibilityCacheRaw = await safeStorage.getItem(visibilityKey);
        if (visibilityCacheRaw) {
          try {
            const parsed = JSON.parse(visibilityCacheRaw);
            if (parsed?.day === today && typeof parsed.show === 'boolean') {
              hasCachedDecision = true;
              shouldShowToday = parsed.show;
            }
          } catch (_error) {
            shouldShowToday = false;
          }
        }

        if (!hasCachedDecision) {
          shouldShowToday = Math.random() < DAILY_VISIBILITY_RATE;
          await safeStorage.setItem(
            visibilityKey,
            JSON.stringify({
              day: today,
              show: shouldShowToday,
            })
          );
        }

        if (!shouldShowToday) {
          setIsVisible(false);
          setSuggestions([]);
          return;
        }
      }

      const me = await getUserById(user.$id);
      const myFollowing = toUniqueIds(me?.following || []);
      const myFollowers = toUniqueIds(me?.followers || []);
      const myFriends = myFollowing.filter((id) => myFollowers.includes(id));

      const blockedIds = new Set([...(user?.blockedUsers || []), ...(me?.blockedUsers || [])]);
      const directConnectionIds = new Set([...myFollowing, ...myFollowers]);
      const excludedIds = new Set([user.$id, ...blockedIds, ...directConnectionIds]);

      const [departmentUsers, friendDocs] = await Promise.all([
        getUsersByDepartment(user.department, MAX_DEPARTMENT_USERS, 0),
        Promise.all(
          myFriends.slice(0, MAX_FRIENDS_TO_EXPAND).map(async (friendId) => {
            try {
              return await getUserById(friendId);
            } catch (_error) {
              return null;
            }
          })
        ),
      ]);

      const fofIds = [];
      friendDocs.filter(Boolean).forEach((friendDoc) => {
        toUniqueIds(friendDoc?.following || []).forEach((id) => fofIds.push(id));
        toUniqueIds(friendDoc?.followers || []).forEach((id) => fofIds.push(id));
      });

      const uniqueFofIds = toUniqueIds(fofIds)
        .filter((id) => !excludedIds.has(id))
        .slice(0, MAX_FOF_IDS);

      const fofDocs = await Promise.all(
        uniqueFofIds.map(async (candidateId) => {
          try {
            return await getUserById(candidateId);
          } catch (_error) {
            return null;
          }
        })
      );

      const candidateMap = new Map();
      [...(departmentUsers || []), ...fofDocs]
        .filter(Boolean)
        .forEach((candidate) => {
          const candidateId = String(candidate?.$id || '').trim();
          if (!candidateId || excludedIds.has(candidateId)) {
            return;
          }
          candidateMap.set(candidateId, candidate);
        });

      const myFriendSet = new Set(myFriends);
      const normalizedCandidates = [...candidateMap.values()]
        .map((candidate) => {
          const candidateFollowers = toUniqueIds(candidate?.followers || []);
          const candidateFollowing = toUniqueIds(candidate?.following || []);
          const candidateConnections = new Set([...candidateFollowers, ...candidateFollowing]);

          let mutualCount = 0;
          myFriendSet.forEach((friendId) => {
            if (candidateConnections.has(friendId)) {
              mutualCount += 1;
            }
          });

          return {
            ...candidate,
            mutualCount,
            isSameDepartment: candidate.department === user.department,
          };
        })
        .filter((candidate) => !blockedIds.has(candidate.$id))
        .sort((a, b) => {
          if (a.mutualCount !== b.mutualCount) return b.mutualCount - a.mutualCount;
          if (a.isSameDepartment !== b.isSameDepartment) return Number(b.isSameDepartment) - Number(a.isSameDepartment);
          return (b.followersCount || 0) - (a.followersCount || 0);
        })
        .slice(0, MAX_SUGGESTIONS);

      setSuggestions(normalizedCandidates);
      setIsVisible(normalizedCandidates.length > 0);
    } catch (_error) {
      setSuggestions([]);
      setIsVisible(false);
    } finally {
      setIsLoading(false);
    }
  }, [forceVisible, user]);

  useEffect(() => {
    loadSuggestions();
  }, [loadSuggestions]);

  const handleDismiss = useCallback(async () => {
    if (!user?.$id) {
      setIsVisible(false);
      return;
    }

    const dismissKey = makeDailyKey(DISMISS_KEY_PREFIX, user.$id);
    await safeStorage.setItem(dismissKey, String(getNextLocalDayTimestamp()));
    setIsVisible(false);
  }, [user?.$id]);

  const cardStyle = useMemo(() => ([
    styles.card,
    {
      backgroundColor: isDarkMode ? 'rgba(28, 28, 30, 0.82)' : 'rgba(255, 255, 255, 0.92)',
      borderColor: theme.border,
      shadowColor: theme.shadow,
    },
  ]), [isDarkMode, theme.border, theme.shadow]);

  if (!isVisible && !isLoading) {
    return null;
  }

  return (
    <View style={cardStyle}>
      <View style={[styles.headerRow, isRTL && styles.headerRowRtl]}>
        <View style={styles.headerTextWrap}>
          <Text style={[styles.title, { color: theme.text }]}>{t('home.suggestedFriends.title')}</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>{t('home.suggestedFriends.subtitle')}</Text>
        </View>

        <TouchableOpacity
          onPress={handleDismiss}
          style={styles.closeButton}
          accessibilityRole="button"
          accessibilityLabel={t('common.close')}
          hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
        >
          <CloseIcon size={moderateScale(18)} color={theme.textSecondary} />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="small" color={theme.primary} />
        </View>
      ) : (
        <View style={styles.listWrap}>
          {suggestions.map((candidate) => (
            <TouchableOpacity
              key={candidate.$id}
              style={[styles.itemRow, { borderTopColor: theme.divider || theme.borderSecondary || theme.border }]}
              activeOpacity={0.8}
              onPress={() => onUserPress?.(candidate)}
            >
              <ProfilePicture
                uri={candidate.profilePicture}
                name={candidate.name || candidate.fullName || ''}
                size={moderateScale(42)}
                showBorder
                borderColor={theme.primary}
              />

              <View style={styles.itemContent}>
                <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>
                  {candidate.fullName || candidate.name}
                </Text>
                {(candidate.mutualCount || 0) > 0 && (
                  <Text style={[styles.mutual, { color: theme.textSecondary }]} numberOfLines={1}>
                    {String(t('home.suggestedFriends.mutualCount')).replace('{count}', String(candidate.mutualCount))}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 3,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xs,
  },
  headerRowRtl: {
    flexDirection: 'row-reverse',
  },
  headerTextWrap: {
    flex: 1,
  },
  title: {
    fontSize: fontSize(15),
    fontWeight: '700',
  },
  subtitle: {
    marginTop: spacing.xs * 0.4,
    fontSize: fontSize(12),
    lineHeight: fontSize(16),
  },
  closeButton: {
    width: moderateScale(32),
    height: moderateScale(32),
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.round,
  },
  loaderWrap: {
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listWrap: {
    marginTop: spacing.xs,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  itemContent: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  name: {
    fontSize: fontSize(14),
    fontWeight: '600',
  },
  mutual: {
    marginTop: spacing.xs * 0.35,
    fontSize: fontSize(12),
  },
});

export default SuggestedFriendsCard;
