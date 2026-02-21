import React from 'react';
import { Modal, View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ProfilePicture from '../../components/ProfilePicture';
import { spacing, fontSize, wp, moderateScale } from '../../utils/responsive';
import { borderRadius } from '../../theme/designTokens';

const parseStatsUserIds = (value) => {
  if (Array.isArray(value)) {
    return [...new Set(value.filter(Boolean).map(item => String(item)))] ;
  }

  const raw = String(value || '').trim();
  if (!raw) {
    return [];
  }

  if (raw.startsWith('[') && raw.endsWith(']')) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return [...new Set(parsed.filter(Boolean).map(item => String(item)))];
      }
    } catch {
      return [];
    }
  }

  return [...new Set(raw.split(',').map(item => item.trim()).filter(Boolean))];
};

const AssetStatsModal = ({ visible, onClose, colors, t, asset, userProfiles = {} }) => {
  if (!asset) {
    return null;
  }

  const viewedByIds = parseStatsUserIds(asset?.viewedBy);
  const openedByIds = parseStatsUserIds(asset?.openedBy);
  const downloadedByIds = parseStatsUserIds(asset?.downloadedBy);

  const viewedCount = Number(asset?.viewsCount ?? asset?.viewCount ?? 0);
  const openedCount = Number(asset?.opensCount ?? asset?.openCount ?? 0);
  const downloadedCount = Number(asset?.downloadsCount ?? asset?.downloadCount ?? 0);

  const card = (label, value, icon) => (
    <View style={[styles.statCard, { borderColor: colors.border, backgroundColor: colors.inputBackground }]}> 
      <Ionicons name={icon} size={18} color={colors.primary} />
      <Text style={[styles.statValue, { color: colors.text }]}>{String(value)}</Text>
      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );

  const renderUserList = (label, ids = []) => {
    if (!ids.length) {
      return null;
    }

    return (
      <View style={styles.userGroupWrap}>
        <Text style={[styles.userGroupTitle, { color: colors.textSecondary }]}>{label}</Text>
        {ids.map((userId) => {
          const profile = userProfiles[userId] || null;
          const displayName = String(profile?.name || userId);

          return (
            <View key={`${label}_${userId}`} style={styles.userRow}>
              <ProfilePicture
                uri={profile?.profilePicture}
                name={displayName}
                size={moderateScale(28)}
              />
              <Text style={[styles.userName, { color: colors.text }]} numberOfLines={1}>
                {displayName}
              </Text>
            </View>
          );
        })}
      </View>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={[styles.backdrop, { backgroundColor: colors.overlay }]}> 
        <View style={[styles.cardWrap, { backgroundColor: colors.card, borderColor: colors.border }]}> 
          <View style={styles.headerRow}>
            <View style={styles.headerMeta}>
              <Text style={[styles.title, { color: colors.text }]}>{t('lectures.assetInfoTitle')}</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]} numberOfLines={1}>{asset.title || t('lectures.file')}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { borderColor: colors.border }]}> 
              <Ionicons name="close" size={18} color={colors.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.grid}>
            {card(t('lectures.assetViewsShort'), viewedCount, 'eye-outline')}
            {card(t('lectures.assetOpensShort'), openedCount, 'open-outline')}
            {card(t('lectures.assetDownloadsShort'), downloadedCount, 'download-outline')}
          </View>

          <ScrollView>
            {renderUserList(t('lectures.seenBy'), viewedByIds)}
            {renderUserList(t('lectures.openedBy'), openedByIds)}
            {renderUserList(t('lectures.downloadedBy'), downloadedByIds)}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: wp(5),
  },
  cardWrap: {
    borderWidth: 1,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    maxHeight: '85%',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  headerMeta: {
    flex: 1,
    marginRight: spacing.sm,
  },
  title: {
    fontSize: fontSize(16),
    fontWeight: '800',
  },
  subtitle: {
    marginTop: 2,
    fontSize: fontSize(11),
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderWidth: 1,
    borderRadius: borderRadius.round,
    alignItems: 'center',
    justifyContent: 'center',
  },
  grid: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  statCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  statValue: {
    marginTop: 4,
    fontSize: fontSize(15),
    fontWeight: '800',
  },
  statLabel: {
    marginTop: 2,
    fontSize: fontSize(10),
    fontWeight: '600',
  },
  userGroupWrap: {
    marginBottom: spacing.sm,
  },
  userGroupTitle: {
    fontSize: fontSize(11),
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  userName: {
    flex: 1,
    fontSize: fontSize(11),
    fontWeight: '600',
  },
});

export default AssetStatsModal;
