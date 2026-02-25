import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppSettings } from '../context/AppSettingsContext';
import { getUserById } from '../../database/users';
import UserCard from './UserCard';
import { fontSize, spacing, moderateScale, hp } from '../utils/responsive';
import { borderRadius } from '../theme/designTokens';

const PostLikesModal = ({ visible, onClose, likedByIds }) => {
  const { t, theme, isDarkMode } = useAppSettings();
  const insets = useSafeAreaInsets();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const uniqueIds = useMemo(() => {
    const ids = Array.isArray(likedByIds) ? likedByIds : [];
    return [...new Set(ids.filter(Boolean))];
  }, [likedByIds]);

  const idsKey = useMemo(() => uniqueIds.join('|'), [uniqueIds]);

  useEffect(() => {
    if (!visible) {
      setUsers([]);
      setLoading(false);
      setError(null);
      return;
    }

    let isActive = true;

    const loadUsers = async () => {
      if (uniqueIds.length === 0) {
        setUsers([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const results = await Promise.all(
          uniqueIds.map(async (userId) => {
            try {
              return await getUserById(userId);
            } catch (fetchError) {
              return null;
            }
          })
        );

        if (!isActive) return;

        const validUsers = results.filter(Boolean);
        setUsers(validUsers);
      } catch (loadError) {
        if (!isActive) return;
        setUsers([]);
        setError(t('post.likesLoadError'));
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    loadUsers();

    return () => {
      isActive = false;
    };
  }, [visible, idsKey, uniqueIds, t]);

  const titleText = uniqueIds.length
    ? t('post.likesTitleWithCount', { count: uniqueIds.length })
    : t('post.likesTitle');

  const renderUser = ({ item }) => (
    <UserCard
      user={item}
      compact
      style={styles.userCard}
    />
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View
          style={[
            styles.container,
            {
              backgroundColor: theme.card || theme.cardBackground || (isDarkMode ? '#1a1a2e' : '#FFFFFF'),
              borderColor: theme.border,
              paddingTop: Math.max(insets.top, spacing.sm),
            },
          ]}
        >
          <View style={[styles.header, { borderBottomColor: theme.border }]}>
            <Text style={[styles.headerTitle, { color: theme.text }]}>{titleText}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={moderateScale(22)} color={theme.text} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.stateContainer}>
              <ActivityIndicator size="large" color={theme.primary} />
              <Text style={[styles.stateText, { color: theme.textSecondary }]}>
                {t('common.loading')}
              </Text>
            </View>
          ) : error ? (
            <View style={styles.stateContainer}>
              <Ionicons name="alert-circle-outline" size={moderateScale(34)} color={theme.textSecondary} />
              <Text style={[styles.stateText, { color: theme.textSecondary }]}>{error}</Text>
            </View>
          ) : (
            <FlatList
              data={users}
              renderItem={renderUser}
              keyExtractor={(item) => item.$id}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.stateContainer}>
                  <Ionicons name="heart-outline" size={moderateScale(32)} color={theme.textSecondary} />
                  <Text style={[styles.stateText, { color: theme.textSecondary }]}>
                    {t('post.noLikes')}
                  </Text>
                </View>
              }
            />
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },
  container: {
    width: '100%',
    maxWidth: 560,
    maxHeight: hp(70),
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    paddingBottom: spacing.md,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: fontSize(16),
    fontWeight: '700',
  },
  closeButton: {
    padding: spacing.xs,
  },
  listContent: {
    paddingVertical: spacing.sm,
  },
  userCard: {
    paddingHorizontal: spacing.md,
  },
  stateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  stateText: {
    marginTop: spacing.sm,
    fontSize: fontSize(13),
    textAlign: 'center',
  },
});

export default PostLikesModal;
