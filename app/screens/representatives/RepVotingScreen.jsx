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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppSettings } from '../../context/AppSettingsContext';
import { useUser } from '../../context/UserContext';
import VoteCard from '../../components/VoteCard';
import RepBadge from '../../components/RepBadge';
import { wp, hp, normalize, spacing } from '../../utils/responsive';
import { borderRadius } from '../../theme/designTokens';
import { getClassStudents } from '../../../database/users';
import {
  getActiveElection,
  createElection,
  finalizeElection,
  getClassRepresentatives,
  getNextSeatNumber,
  ELECTION_STATUS,
  MAX_REPS_PER_CLASS,
} from '../../../database/repElections';
import { castVote, getElectionResults } from '../../../database/repVotes';

const RepVotingScreen = ({ navigation, route }) => {
  const { t, theme, isDarkMode } = useAppSettings();
  const { user } = useUser();
  const insets = useSafeAreaInsets();

  const department = route?.params?.department || user?.department;
  const stage = route?.params?.stage || user?.stage;
  const seatNumber = route?.params?.seatNumber || 1;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [voting, setVoting] = useState(false);
  const [election, setElection] = useState(null);
  const [students, setStudents] = useState([]);
  const [results, setResults] = useState({ candidates: [], totalVotes: 0, myVote: null });
  const [menuVisible, setMenuVisible] = useState(false);
  const [classReps, setClassReps] = useState([]);
  const [nextSeat, setNextSeat] = useState(null);

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

      // Get or create election for this seat
      let electionDoc = await getActiveElection(department, stage, seatNumber);

      if (!electionDoc || electionDoc.status === ELECTION_STATUS.COMPLETED) {
        electionDoc = await createElection(department, stage, classStudents.length, seatNumber);
      }

      setElection(electionDoc);

      // Load vote results
      if (electionDoc) {
        const voteResults = await getElectionResults(electionDoc.$id);
        setResults(voteResults);
      }
    } catch (error) {
      // Silent fail
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [department, stage, seatNumber]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleVote = useCallback(async (candidateId) => {
    if (!election || voting) return;
    try {
      setVoting(true);
      await castVote(election.$id, candidateId);
      // Refresh results
      const updated = await getElectionResults(election.$id);
      setResults(updated);
    } catch (error) {
      // Silent fail
    } finally {
      setVoting(false);
    }
  }, [election, voting]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadData(false);
  }, [loadData]);

  // Merge students with vote counts
  const candidatesWithInfo = students.map((student) => {
    const voteInfo = results.candidates.find((c) => c.candidateId === student.$id);
    return {
      ...student,
      voteCount: voteInfo?.voteCount || 0,
    };
  }).sort((a, b) => b.voteCount - a.voteCount);

  const leadingId = candidatesWithInfo.length > 0 && candidatesWithInfo[0].voteCount > 0
    ? candidatesWithInfo[0].$id
    : null;

  const isCompleted = election?.status === ELECTION_STATUS.COMPLETED;
  const winner = election?.winner || null;
  const currentSeat = election?.seatNumber || seatNumber;

  const renderItem = useCallback(({ item }) => {
    // Don't let user vote for themselves
    const isSelf = item.$id === user?.$id;

    return (
      <VoteCard
        candidate={item}
        voteCount={item.voteCount}
        isVotedByMe={results.myVote === item.$id}
        isLeading={item.$id === leadingId}
        onVote={isSelf ? () => {} : handleVote}
        colors={theme}
        t={t}
      />
    );
  }, [results.myVote, leadingId, handleVote, theme, t, user?.$id]);

  const renderHeader = () => (
    <View style={styles.headerInfo}>
      <View style={[styles.infoBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Ionicons name="information-circle-outline" size={normalize(20)} color={theme.primary} />
        <Text style={[styles.infoText, { color: theme.textSecondary }]}>
          {isCompleted
            ? t('repVoting.electionComplete')
            : t('repVoting.voteInstruction').replace('{seat}', String(currentSeat))}
        </Text>
      </View>

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
          <Ionicons name="trophy" size={normalize(18)} color={theme.primary} />
          <Text style={[styles.winnersText, { color: theme.primary }]}>
            {t('repVoting.currentReps')}: {classReps.length}/{MAX_REPS_PER_CLASS}
          </Text>
        </View>
      )}

      {currentSeat > 1 && (
        <View style={[styles.seatBadge, { backgroundColor: theme.warning + '20', borderColor: theme.warning + '40' }]}>
          <Ionicons name="ribbon-outline" size={normalize(16)} color={theme.warning} />
          <Text style={[styles.seatBadgeText, { color: theme.warning }]}>
            {t('repVoting.electingSeat').replace('{seat}', String(currentSeat))}
          </Text>
        </View>
      )}

      <Text style={[styles.listTitle, { color: theme.text }]}>
        {t('repVoting.classStudents')}
      </Text>
    </View>
  );

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
            {/* Reselect current seat */}
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setMenuVisible(false);
                navigation.navigate('ReselectionRequest', { election, department, stage, seatNumber: currentSeat });
              }}
            >
              <Ionicons name="refresh-outline" size={normalize(20)} color={theme.text} />
              <Text style={[styles.menuItemText, { color: theme.text }]}>
                {t('repVoting.requestReselection')}
              </Text>
            </TouchableOpacity>

            {/* Elect next rep (only if fewer than 3 reps and next seat available) */}
            {nextSeat && nextSeat <= MAX_REPS_PER_CLASS && classReps.length < MAX_REPS_PER_CLASS && (
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setMenuVisible(false);
                  navigation.push('RepVoting', { department, stage, seatNumber: nextSeat });
                }}
              >
                <Ionicons name="person-add-outline" size={normalize(20)} color={theme.primary} />
                <Text style={[styles.menuItemText, { color: theme.primary }]}>
                  {t('repVoting.electNextRep').replace('{seat}', String(nextSeat))}
                </Text>
              </TouchableOpacity>
            )}

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
        data={candidatesWithInfo}
        keyExtractor={(item) => item.$id}
        renderItem={renderItem}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
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
});

export default RepVotingScreen;
