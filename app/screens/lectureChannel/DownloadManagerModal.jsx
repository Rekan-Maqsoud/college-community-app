import React from 'react';
import { Modal, View, Text, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { spacing, fontSize, moderateScale, wp } from '../../utils/responsive';
import { borderRadius } from '../../theme/designTokens';

const formatBytesAsMb = (bytes = 0) => {
  const value = Number(bytes || 0) / (1024 * 1024);
  return value.toFixed(value >= 10 ? 0 : 1);
};

const DownloadManagerModal = ({
  visible,
  onClose,
  colors,
  t,
  activeDownloads = [],
  downloadedFiles = [],
  onOpenFile,
  onDeleteFile,
}) => {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={[styles.backdrop, { backgroundColor: colors.overlay }]}> 
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}> 
          <View style={styles.headerRow}>
            <View>
              <Text style={[styles.title, { color: colors.text }]}>{t('lectures.downloadsTitle')}</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{t('lectures.downloadsSubtitle')}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { borderColor: colors.border }]}> 
              <Ionicons name="close" size={18} color={colors.text} />
            </TouchableOpacity>
          </View>

          {!!activeDownloads.length && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('lectures.currentDownloads')}</Text>
              {activeDownloads.map((item) => (
                <View key={item.assetId} style={[styles.rowCard, { borderColor: colors.border, backgroundColor: colors.inputBackground }]}> 
                  <View style={styles.rowTop}>
                    <Text style={[styles.fileName, { color: colors.text }]} numberOfLines={1}>{item.fileName}</Text>
                    <Text style={[styles.percentText, { color: colors.primary }]}>{String(item.progress)}%</Text>
                  </View>
                  <View style={[styles.progressTrack, { backgroundColor: colors.border }]}> 
                    <View style={[styles.progressFill, { backgroundColor: colors.primary, width: `${item.progress}%` }]} />
                  </View>
                </View>
              ))}
            </View>
          )}

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('lectures.savedDownloads')}</Text>
            <FlatList
              data={downloadedFiles}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <View style={[styles.rowCard, { borderColor: colors.border, backgroundColor: colors.inputBackground }]}> 
                  <View style={styles.rowTop}>
                    <Text style={[styles.fileName, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
                    <Text style={[styles.metaText, { color: colors.textSecondary }]}>{formatBytesAsMb(item.size)} MB</Text>
                  </View>

                  <View style={styles.actionsRow}>
                    <TouchableOpacity style={[styles.actionBtn, { borderColor: colors.border }]} onPress={() => onOpenFile(item.path, item.mimeType)}>
                      <Ionicons name="open-outline" size={14} color={colors.text} />
                      <Text style={[styles.actionText, { color: colors.text }]}>{t('lectures.openFile')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.actionBtn, { borderColor: colors.border }]} onPress={() => onDeleteFile(item.path)}>
                      <Ionicons name="trash-outline" size={14} color={colors.danger} />
                      <Text style={[styles.actionText, { color: colors.danger }]}>{t('common.delete')}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
              ListEmptyComponent={
                <View style={styles.emptyWrap}>
                  <Ionicons name="download-outline" size={22} color={colors.textSecondary} />
                  <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{t('lectures.noSavedDownloads')}</Text>
                </View>
              }
            />
          </View>
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
  card: {
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
  title: {
    fontSize: fontSize(16),
    fontWeight: '800',
  },
  subtitle: {
    marginTop: 2,
    fontSize: fontSize(11),
    fontWeight: '500',
  },
  closeBtn: {
    width: moderateScale(30),
    height: moderateScale(30),
    borderWidth: 1,
    borderRadius: borderRadius.round,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: fontSize(13),
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  rowCard: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    marginBottom: spacing.xs,
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  fileName: {
    flex: 1,
    fontSize: fontSize(12),
    fontWeight: '700',
  },
  percentText: {
    fontSize: fontSize(11),
    fontWeight: '700',
  },
  metaText: {
    fontSize: fontSize(10),
    fontWeight: '600',
  },
  progressTrack: {
    width: '100%',
    height: moderateScale(6),
    borderRadius: borderRadius.round,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.xs,
  },
  actionBtn: {
    borderWidth: 1,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs / 2,
  },
  actionText: {
    fontSize: fontSize(11),
    fontWeight: '700',
  },
  emptyWrap: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
    gap: spacing.xs,
  },
  emptyText: {
    fontSize: fontSize(12),
  },
});

export default DownloadManagerModal;
