import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  StatusBar,
  Modal,
  ToastAndroid,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppSettings } from '../../context/AppSettingsContext';
import { useUser } from '../../context/UserContext';
import VoteCard from '../../components/VoteCard';
import RepBadge from '../../components/RepBadge';
import ProfilePicture from '../../components/ProfilePicture';
import { wp, hp, fontSize, normalize, spacing } from '../../utils/responsive';
import { borderRadius } from '../../theme/designTokens';
import { getClassStudents } from '../../../database/users';
import {
  getActiveElection,
  getLatestElection,
  createElection,
  finalizeElection,
  getClassRepresentatives,
  getNextSeatNumber,
  requestNextRepresentativeElection,
  handleElectionTimerExpiry,
  getElectionDuration,
  getTiebreakerCandidates,
  ELECTION_STATUS,
  MAX_REPS_PER_CLASS,
  WINNER_COOLDOWN_MS,
  TIEBREAKER_DURATION_MS,
} from '../../../database/repElections';
import { castVote, getElectionResults } from '../../../database/repVotes';

const RepVotingScreen = ({ navigation, route }) => {
  const { t, theme, isDarkMode } = useAppSettings();
  const { user } = useUser();
  const insets = useSafeAreaInsets();

  const department = route?.params?.department || user?.department;
  const stage = route?.params?.stage || user?.stage;
  const routeSeatNumber = route?.params?.seatNumber;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [voting, setVoting] = useState(false);
  const [election, setElection] = useState(null);
  const [students, setStudents] = useState([]);
  const [results, setResults] = useState({ candidates: [], totalVotes: 0, myVote: null });
  const [menuVisible, setMenuVisible] = useState(false);
  const [classReps, setClassReps] = useState([]);
  const [nextSeat, setNextSeat] = useState(null);
  const [winnerCountdownMs, setWinnerCountdownMs] = useState(0);

  const loadData = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);

      // Load students in this class
      const classStudents = await getClassStudents(department, stage);
      setStudents(classStudents);

      // Get current reps and next available seat
      const reps = await getClassRepresentatives(department, stage);
      setClassReps(reps);
      const next = await getNextSeatNumber(department, stage);
      setNextSeat(next);

      // Resolve election context:
      // 1) prefer active election (seat-specific when requested)
      // 2) fallback to latest election for status/winner display
      // 3) create a new election only when needed
      const targetSeat = routeSeatNumber || next || 1;
      let electionDoc = routeSeatNumber
        ? await getActiveElection(department, stage, routeSeatNumber)
        : await getActiveElection(department, stage);

      if (!electionDoc) {
        electionDoc = routeSeatNumber
          ? await getLatestElection(department, stage, routeSeatNumber)
          : await getLatestElection(department, stage);
      }

      if (!electionDoc) {
        electionDoc = await createElection(department, stage, classStudents.length, targetSeat);
      } else if (
        electionDoc.status !== ELECTION_STATUS.ACTIVE
        && routeSeatNumber
        && routeSeatNumber === next
      ) {
        // User explicitly opened a new seat that has no active election yet
        electionDoc = await createElection(department, stage, classStudents.length, routeSeatNumber);
      }

      setElection(electionDoc);

      // Load vote results
      if (electionDoc) {
        const voteResults = await getElectionResults(electionDoc.$id);

        // Handle timer expiry: auto-finalize or enter tiebreaker
        if (
          (electionDoc.status === ELECTION_STATUS.ACTIVE || electionDoc.status === ELECTION_STATUS.TIEBREAKER)
          && voteResults.totalVotes > 0
          && electionDoc.startedAt
        ) {
          const startedAt = new Date(electionDoc.startedAt).getTime();
          const duration = getElectionDuration(electionDoc);
          const now = Date.now();
          const elapsed = now - startedAt;
          if (elapsed >= duration) {
            const handled = await handleElectionTimerExpiry(electionDoc.$id, voteResults);
            if (handled) {
              electionDoc = handled;
              // Re-fetch results after state change
              if (handled.status === ELECTION_STATUS.TIEBREAKER) {
                const freshResults = await getElectionResults(electionDoc.$id);
                setResults(freshResults);
                setElection(electionDoc);
                return;
              }
            }
          }
        }

        setResults(voteResults);
      }
    } catch (error) {
      // Silent fail
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [department, stage, routeSeatNumber]);

  useEffect(() => {
    const isVotingPhase = election?.status === ELECTION_STATUS.ACTIVE || election?.status === ELECTION_STATUS.TIEBREAKER;
    if (!election || !isVotingPhase || !election.startedAt || results.totalVotes <= 0) {
      setWinnerCountdownMs(0);
      return undefined;
    }

    const duration = getElectionDuration(election);

    const tick = async () => {
      const startedAt = new Date(election.startedAt).getTime();
      const endAt = startedAt + duration;
      const remaining = Math.max(0, endAt - Date.now());
      setWinnerCountdownMs(remaining);

      // When timer reaches 0, handle expiry
      if (remaining === 0) {
        try {
          const freshResults = await getElectionResults(election.$id);
          const handled = await handleElectionTimerExpiry(election.$id, freshResults);
          if (handled) {
            setElection(handled);
            if (handled.status === ELECTION_STATUS.TIEBREAKER) {
              const tiebreakerResults = await getElectionResults(handled.$id);
              setResults(tiebreakerResults);
            } else {
              setResults(freshResults);
            }
          }
        } catch (err) {
          // silent
        }
      }
    };

    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [election, results.totalVotes]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleVote = useCallback(async (candidateId) => {
    if (!election || voting) return;
    const isVotingPhase = election.status === ELECTION_STATUS.ACTIVE || election.status === ELECTION_STATUS.TIEBREAKER;
    if (!isVotingPhase) return;

    // Block voting after timer expired (client-side guard)
    if (winnerCountdownMs <= 0 && results.totalVotes > 0 && election.startedAt) return;

    try {
      setVoting(true);
      await castVote(election.$id, candidateId);
      // Refresh results
      const updated = await getElectionResults(election.$id);
      setResults(updated);
    } catch (error) {
      if (error?.message === 'Voting time has expired' || error?.message === 'Election is closed') {
        showToast(t('repVoting.votingClosed'));
        loadData(false);
      } else if (error?.message === 'Can only vote for tiebreaker candidates') {
        showToast(t('repVoting.tiebreakerOnly'));
      }
    } finally {
      setVoting(false);
    }
  }, [election, voting, winnerCountdownMs, results.totalVotes]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadData(false);
  }, [loadData]);

  const showToast = useCallback((message) => {
    if (Platform.OS === 'android') {
      ToastAndroid.show(message, ToastAndroid.SHORT);
    } else {
      Alert.alert('', message);
    }
  }, []);

  const formatRemaining = (ms) => {
    const total = Math.max(0, Math.floor(ms / 1000));
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const seconds = total % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  const handleRequestNextRep = useCallback(async () => {
    if (!election?.$id || classReps.length === 0) {
      showToast(t('repVoting.electNextRepDisabled'));
      return;
    }

    try {
      const res = await requestNextRepresentativeElection(election.$id);
      if (res?.nextElectionStarted && res?.nextSeat) {
        showToast(t('repVoting.nextRepElectionStarted').replace('{seat}', String(res.nextSeat)));
        setMenuVisible(false);
        navigation.push('RepVoting', { department, stage, seatNumber: res.nextSeat });
        return;
      }
      if (res?.alreadyVoted) {
        showToast(t('repVoting.alreadyRequestedReselection'));
      } else if (res?.reason === 'max_reps_reached') {
        showToast(t('repVoting.maxRepsReached'));
      } else {
        const voters = Array.isArray(res?.election?.reselectionVoters) ? res.election.reselectionVoters.length : 0;
        const threshold = res?.election?.reselectionThreshold || 0;
        showToast(t('repVoting.nextRepRequestProgress').replace('{count}', String(voters)).replace('{threshold}', String(threshold)));
        setElection(res?.election || election);
      }
    } catch (error) {
      showToast(t('repVoting.voteFailed'));
    }
  }, [election, classReps.length, showToast, t, navigation, department, stage]);

  // Merge students with vote counts
  const allCandidatesWithInfo = students.map((student) => {
    const voteInfo = results.candidates.find((c) => c.candidateId === student.$id);
    return {
      ...student,
      voteCount: voteInfo?.voteCount || 0,
    };
  }).sort((a, b) => b.voteCount - a.voteCount);

  const isCompleted = election?.status === ELECTION_STATUS.COMPLETED;
  const isInTiebreaker = election?.status === ELECTION_STATUS.TIEBREAKER;
  const isActive = election?.status === ELECTION_STATUS.ACTIVE;
  const winner = election?.winner || null;
  const currentSeat = election?.seatNumber || routeSeatNumber || nextSeat || 1;
  const tiebreakerCandidateIds = isInTiebreaker ? getTiebreakerCandidates(election) : [];

  // During tiebreaker, only show the two tied candidates
  const candidatesWithInfo = isInTiebreaker && tiebreakerCandidateIds.length > 0
    ? allCandidatesWithInfo.filter((s) => tiebreakerCandidateIds.includes(s.$id))
    : allCandidatesWithInfo;

  const leadingId = candidatesWithInfo.length > 0 && candidatesWithInfo[0].voteCount > 0
    ? candidatesWithInfo[0].$id
    : null;

  // Voting is disabled when: completed, or timer expired during active/tiebreaker
  const timerExpiredDuringVoting = (isActive || isInTiebreaker)
    && results.totalVotes > 0
    && election?.startedAt
    && winnerCountdownMs <= 0;
  const isVotingDisabled = isCompleted || timerExpiredDuringVoting;

  // When reps exist and no active/tiebreaker election, show rep-only view (no voting)
  const hasRepNoActiveElection = classReps.length > 0 && !isActive && !isInTiebreaker;

  const canRequestReselection = !!election && isCompleted;
  const canElectNextRep = !!nextSeat && nextSeat <= MAX_REPS_PER_CLASS && classReps.length >= 1 && classReps.length < MAX_REPS_PER_CLASS;
  const nextSeatLabel = nextSeat || Math.min((currentSeat || 1) + 1, MAX_REPS_PER_CLASS);

  const renderItem = useCallback(({ item }) => {
    const isSelf = item.$id === user?.$id;
    const isTiebreakerCandidate = isInTiebreaker && tiebreakerCandidateIds.includes(item.$id);

    return (
      <VoteCard
        candidate={item}
        voteCount={item.voteCount}
        isVotedByMe={results.myVote === item.$id}
        isLeading={item.$id === leadingId}
        disabled={isVotingDisabled}
        isTiebreakerCandidate={isTiebreakerCandidate}
        onVote={(candidateId) => {
          if (isVotingDisabled) {
            showToast(t('repVoting.votingClosed'));
            return;
          }
          if (isSelf) {
            showToast(t('repVoting.cannotVoteSelf'));
            return;
          }
          handleVote(candidateId);
        }}
        colors={theme}
        t={t}
      />
    );
  }, [results.myVote, leadingId, handleVote, theme, t, user?.$id, showToast, isVotingDisabled, isInTiebreaker, tiebreakerCandidateIds]);

  const renderHeader = () => {
    // Find winner name if election is completed
    const winnerStudent = winner ? students.find(s => s.$id === winner) : null;
    const winnerName = winnerStudent?.name || winnerStudent?.fullName || '';

    return (
    <View style={styles.headerInfo}>
      {/* Election completed banner */}
      {isCompleted && winner && (
        <View style={[styles.winnerBanner, { backgroundColor: (theme.success || '#22C55E') + '15', borderColor: (theme.success || '#22C55E') + '40' }]}>
          <Ionicons name="trophy" size={fontSize(22)} color={theme.success || '#22C55E'} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.winnerTitle, { color: theme.success || '#22C55E' }]}>
              {t('repVoting.electionComplete')}
            </Text>
            {winnerName ? (
              <Text style={[styles.winnerName, { color: theme.text }]}>
                {winnerName}
              </Text>
            ) : null}
          </View>
        </View>
      )}

      {/* Tiebreaker banner */}
      {isInTiebreaker && (
        <View style={[styles.tiebreakerBanner, { backgroundColor: (theme.warning || '#F59E0B') + '15', borderColor: (theme.warning || '#F59E0B') + '40' }]}>
          <Ionicons name="flash-outline" size={fontSize(20)} color={theme.warning || '#F59E0B'} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.tiebreakerTitle, { color: theme.warning || '#F59E0B' }]}>
              {t('repVoting.tiebreakerTitle')}
            </Text>
            <Text style={[styles.tiebreakerDesc, { color: theme.textSecondary }]}>
              {t('repVoting.tiebreakerDescription')}
            </Text>
          </View>
        </View>
      )}

      {/* Active voting banner (not tiebreaker) */}
      {isActive && !isInTiebreaker && (
        <View style={[styles.activeBanner, { backgroundColor: theme.primary + '15', borderColor: theme.primary + '40' }]}>
          <Ionicons name="hand-left-outline" size={fontSize(18)} color={theme.primary} />
          <Text style={[styles.activeBannerText, { color: theme.primary }]}>
            {t('repVoting.voteInstruction').replace('{seat}', String(currentSeat))}
          </Text>
        </View>
      )}

      {!isCompleted && results.totalVotes > 0 && winnerCountdownMs > 0 && (
        <View style={[styles.cooldownBanner, { backgroundColor: theme.warning + '15', borderColor: theme.warning + '40' }]}>
          <Ionicons name="time-outline" size={fontSize(16)} color={theme.warning} />
          <Text style={[styles.cooldownText, { color: theme.warning }]}>
            {isInTiebreaker
              ? t('repVoting.tiebreakerCountdown').replace('{time}', formatRemaining(winnerCountdownMs))
              : t('repVoting.winnerCooldown').replace('{time}', formatRemaining(winnerCountdownMs))}
          </Text>
        </View>
      )}

      {/* Voting closed banner (timer expired but not yet finalized) */}
      {isVotingDisabled && !isCompleted && (
        <View style={[styles.closedBanner, { backgroundColor: (theme.error || '#EF4444') + '15', borderColor: (theme.error || '#EF4444') + '40' }]}>
          <Ionicons name="lock-closed-outline" size={fontSize(16)} color={theme.error || '#EF4444'} />
          <Text style={[styles.closedText, { color: theme.error || '#EF4444' }]}>
            {t('repVoting.votingClosed')}
          </Text>
        </View>
      )}

      <View style={styles.statsRow}>
        <View style={[styles.statBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.statNumber, { color: theme.text }]}>{students.length}</Text>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>{t('repVoting.totalStudents')}</Text>
        </View>
        <View style={[styles.statBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.statNumber, { color: theme.primary }]}>{results.totalVotes}</Text>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>{t('repVoting.totalVotes')}</Text>
        </View>
      </View>

      {classReps.length > 0 && (
        <View style={[styles.winnersBox, { backgroundColor: theme.primary + '15', borderColor: theme.primary + '40' }]}>
          <Ionicons name="trophy" size={fontSize(18)} color={theme.primary} />
          <Text style={[styles.winnersText, { color: theme.primary }]}>
            {t('repVoting.currentReps')}: {classReps.length}/{MAX_REPS_PER_CLASS}
          </Text>
        </View>
      )}

      {/* Current rep cards — shown when reps exist and no active voting */}
      {hasRepNoActiveElection && classReps.map((rep) => {
        const repStudent = students.find((s) => s.$id === rep.userId);
        if (!repStudent) return null;
        const repName = repStudent.name || repStudent.fullName || '';
        const repAvatar = repStudent.profilePicture || '';
        return (
          <TouchableOpacity
            key={rep.userId}
            style={[styles.currentRepCard, { backgroundColor: theme.card, borderColor: theme.primary + '40' }]}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('UserProfile', { userId: rep.userId })}
          >
            <ProfilePicture uri={repAvatar} name={repName} size={normalize(52)} />
            <View style={styles.currentRepInfo}>
              <Text style={[styles.currentRepName, { color: theme.text }]} numberOfLines={1}>
                {repName}
              </Text>
              <View style={styles.currentRepBadgeRow}>
                <RepBadge size="small" />
                <Text style={[styles.currentRepSeat, { color: theme.textSecondary }]}>
                  {t('repVoting.repLabel')} #{rep.seatNumber || 1}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={normalize(20)} color={theme.textSecondary} />
          </TouchableOpacity>
        );
      })}

      {hasRepNoActiveElection && (
        <Text style={[styles.noActiveVotingNote, { color: theme.textSecondary }]}>
          {t('repVoting.noActiveVoting')}
        </Text>
      )}

      {currentSeat > 1 && !hasRepNoActiveElection && (
        <View style={[styles.seatBadge, { backgroundColor: theme.warning + '20', borderColor: theme.warning + '40' }]}>
          <Ionicons name="ribbon-outline" size={fontSize(16)} color={theme.warning} />
          <Text style={[styles.seatBadgeText, { color: theme.warning }]}>
            {t('repVoting.electingSeat').replace('{seat}', String(currentSeat))}
          </Text>
        </View>
      )}

      {!hasRepNoActiveElection && (
        <Text style={[styles.listTitle, { color: theme.text }]}>
          {t('repVoting.classStudents')}
        </Text>
      )}
    </View>
  );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="people-outline" size={normalize(48)} color={theme.textSecondary} />
      <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
        {t('repVoting.noStudents')}
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background, paddingTop: insets.top }]}>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.xs, backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={normalize(24)} color={theme.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>{t('repVoting.title')}</Text>
          <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]} numberOfLines={1}>
            {t(`departments.${department}`)} • {t(`stages.${stage}`)}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => setMenuVisible(true)}
          style={styles.moreBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="ellipsis-vertical" size={normalize(20)} color={theme.text} />
        </TouchableOpacity>
      </View>

      {/* Menu Modal */}
      <Modal visible={menuVisible} transparent animationType="fade" onRequestClose={() => setMenuVisible(false)}>
        <TouchableOpacity style={styles.menuOverlay} activeOpacity={1} onPress={() => setMenuVisible(false)}>
          <View style={[styles.menuContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <TouchableOpacity
              disabled={!canRequestReselection}
              style={[styles.menuItem, !canRequestReselection && styles.menuItemDisabled]}
              onPress={() => {
                if (!canRequestReselection) return;
                setMenuVisible(false);
                navigation.navigate('ReselectionRequest', { election, department, stage, seatNumber: currentSeat });
              }}
            >
              <Ionicons
                name="refresh-outline"
                size={normalize(20)}
                color={canRequestReselection ? theme.text : theme.textSecondary}
              />
              <Text
                style={[
                  styles.menuItemText,
                  { color: canRequestReselection ? theme.text : theme.textSecondary },
                ]}
              >
                {t('repVoting.requestReselection')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              disabled={!canElectNextRep}
              style={[styles.menuItem, !canElectNextRep && styles.menuItemDisabled]}
              onPress={() => {
                if (!canElectNextRep) return;
                handleRequestNextRep();
              }}
            >
              <Ionicons
                name="person-add-outline"
                size={normalize(20)}
                color={canElectNextRep ? theme.primary : theme.textSecondary}
              />
              <Text
                style={[
                  styles.menuItemText,
                  { color: canElectNextRep ? theme.primary : theme.textSecondary },
                ]}
              >
                {classReps.length === 0
                  ? t('repVoting.electNextRep').replace('{seat}', '1')
                  : t('repVoting.requestNextRep').replace('{seat}', String(nextSeatLabel))}
              </Text>
            </TouchableOpacity>

            {/* Max reps reached label */}
            {classReps.length >= MAX_REPS_PER_CLASS && (
              <View style={styles.menuItem}>
                <Ionicons name="checkmark-done-circle" size={normalize(20)} color={theme.textSecondary} />
                <Text style={[styles.menuItemText, { color: theme.textSecondary }]}>
                  {t('repVoting.maxRepsReached')}
                </Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      <FlatList
        data={hasRepNoActiveElection ? [] : candidatesWithInfo}
        keyExtractor={(item) => item.$id}
        renderItem={renderItem}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={hasRepNoActiveElection ? null : renderEmpty}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[theme.primary]} tintColor={theme.primary} />
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: spacing.sm,
    paddingHorizontal: wp(4),
    borderBottomWidth: 1,
  },
  backBtn: {
    padding: spacing.xs,
  },
  headerCenter: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  headerTitle: {
    fontSize: normalize(17),
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: normalize(11),
    marginTop: 1,
  },
  moreBtn: {
    padding: spacing.xs,
  },
  listContent: {
    padding: wp(4),
    paddingBottom: hp(4),
  },
  headerInfo: {
    marginBottom: spacing.md,
  },
  winnerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: wp(4),
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  winnerTitle: {
    fontSize: normalize(14),
    fontWeight: '700',
  },
  winnerName: {
    fontSize: normalize(16),
    fontWeight: '600',
    marginTop: 2,
  },
  activeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: wp(3.5),
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  activeBannerText: {
    flex: 1,
    fontSize: normalize(13),
    fontWeight: '600',
    lineHeight: normalize(18),
  },
  cooldownBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: wp(3),
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  cooldownText: {
    flex: 1,
    fontSize: normalize(12),
    fontWeight: '600',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: wp(3.5),
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  infoText: {
    flex: 1,
    fontSize: normalize(13),
    lineHeight: normalize(18),
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    padding: wp(3),
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  statNumber: {
    fontSize: normalize(20),
    fontWeight: '700',
  },
  statLabel: {
    fontSize: normalize(11),
    marginTop: 2,
  },
  winnersBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: wp(3),
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  winnersText: {
    fontSize: normalize(13),
    fontWeight: '600',
  },
  listTitle: {
    fontSize: normalize(15),
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: hp(8),
    gap: spacing.sm,
  },
  emptyText: {
    fontSize: normalize(14),
    textAlign: 'center',
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: hp(12),
    paddingRight: wp(4),
  },
  menuContainer: {
    minWidth: wp(60),
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    paddingVertical: spacing.xs,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: hp(1.4),
    paddingHorizontal: wp(4),
  },
  menuItemDisabled: {
    opacity: 0.55,
  },
  menuItemText: {
    fontSize: normalize(14),
    fontWeight: '500',
  },
  seatBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: wp(3),
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  seatBadgeText: {
    fontSize: normalize(12),
    fontWeight: '600',
  },
  tiebreakerBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: wp(4),
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  tiebreakerTitle: {
    fontSize: normalize(14),
    fontWeight: '700',
  },
  tiebreakerDesc: {
    fontSize: normalize(12),
    marginTop: 2,
    lineHeight: normalize(17),
  },
  closedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: wp(3),
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  closedText: {
    flex: 1,
    fontSize: normalize(12),
    fontWeight: '600',
  },
  currentRepCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: wp(3.5),
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    marginBottom: spacing.sm,
  },
  currentRepInfo: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  currentRepName: {
    fontSize: normalize(16),
    fontWeight: '700',
  },
  currentRepBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: 3,
  },
  currentRepSeat: {
    fontSize: normalize(12),
    fontWeight: '500',
  },
  noActiveVotingNote: {
    fontSize: normalize(13),
    textAlign: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.md,
    lineHeight: normalize(18),
  },
});

export default RepVotingScreen;
