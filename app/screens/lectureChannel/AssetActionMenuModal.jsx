import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { spacing, fontSize, wp } from '../../utils/responsive';
import { borderRadius } from '../../theme/designTokens';

const AssetActionMenuModal = ({
  visible,
  onClose,
  colors,
  t,
  asset,
  canViewInfo,
  canPin,
  onOpen,
  onDownload,
  onDiscuss,
  onShowInfo,
  onTogglePin,
}) => {
  if (!asset) {
    return null;
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity activeOpacity={1} style={[styles.backdrop, { backgroundColor: colors.overlay }]} onPress={onClose}>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}> 
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>{asset.title || t('lectures.file')}</Text>

          <TouchableOpacity style={[styles.item, { borderTopColor: colors.border }]} onPress={onOpen}>
            <Ionicons name="open-outline" size={18} color={colors.text} />
            <Text style={[styles.itemText, { color: colors.text }]}>{t('lectures.openFile')}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.item, { borderTopColor: colors.border }]} onPress={onDownload}>
            <Ionicons name="download-outline" size={18} color={colors.text} />
            <Text style={[styles.itemText, { color: colors.text }]}>{t('lectures.download')}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.item, { borderTopColor: colors.border }]} onPress={onDiscuss}>
            <Ionicons name="chatbubble-ellipses-outline" size={18} color={colors.text} />
            <Text style={[styles.itemText, { color: colors.text }]}>{t('lectures.discussion')}</Text>
          </TouchableOpacity>

          {canViewInfo && (
            <TouchableOpacity style={[styles.item, { borderTopColor: colors.border }]} onPress={onShowInfo}>
              <Ionicons name="stats-chart-outline" size={18} color={colors.primary} />
              <Text style={[styles.itemText, { color: colors.primary }]}>{t('lectures.showStats')}</Text>
            </TouchableOpacity>
          )}

          {canPin && (
            <TouchableOpacity style={[styles.item, { borderTopColor: colors.border }]} onPress={onTogglePin}>
              <Ionicons name={asset.isPinned ? 'pin' : 'pin-outline'} size={18} color={colors.text} />
              <Text style={[styles.itemText, { color: colors.text }]}>{asset.isPinned ? t('lectures.unpin') : t('lectures.pin')}</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={[styles.item, { borderTopColor: colors.border }]} onPress={onClose}>
            <Ionicons name="close-outline" size={18} color={colors.textSecondary} />
            <Text style={[styles.itemText, { color: colors.textSecondary }]}>{t('common.cancel')}</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: wp(5),
    paddingBottom: spacing.xl,
  },
  card: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  title: {
    fontSize: fontSize(14),
    fontWeight: '800',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  item: {
    borderTopWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  itemText: {
    fontSize: fontSize(13),
    fontWeight: '600',
  },
});

export default AssetActionMenuModal;
