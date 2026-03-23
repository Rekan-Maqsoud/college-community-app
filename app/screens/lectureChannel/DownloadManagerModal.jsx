import React from 'react';
import { Modal, View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GlassContainer, GlassIconButton } from '../../components/GlassComponents';
import { spacing, fontSize, moderateScale, wp } from '../../utils/responsive';
import { borderRadius } from '../../theme/designTokens';

const formatBytesAsMb = (bytes = 0) => {
  const value = Number(bytes || 0) / (1024 * 1024);
  return value.toFixed(value >= 10 ? 0 : 1);
};

const formatSavedDate = (timestamp = 0) => {
  const date = new Date(Number(timestamp || 0) * 1000 || Number(timestamp || 0));
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  try {
    return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch {
    return date.toLocaleString();
  }
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
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={[styles.backdrop, { backgroundColor: colors.overlay }]}> 
        <GlassContainer
          borderRadius={24}
          disableBackgroundOverlay
          style={[
            styles.cardGlass,
            styles.card,
            { backgroundColor: 'transparent', borderColor: `${colors.primary}33` },
          ]}
        >
          <View style={styles.headerRow}>
            <View>
              <Text style={[styles.title, { color: colors.text }]}>{t('lectures.downloadsTitle')}</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{t('lectures.downloadsSubtitle')}</Text>
            </View>
            <GlassIconButton size={30} borderRadiusValue={15} onPress={onClose} style={[styles.closeBtn, { borderColor: `${colors.primary}44` }]}> 
              <Ionicons name="close" size={18} color={colors.text} />
            </GlassIconButton>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >

          {!!activeDownloads.length && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('lectures.currentDownloads')}</Text>
              {activeDownloads.map((item) => (
                <GlassContainer
                  key={item.assetId}
                  borderRadius={14}
                  style={[styles.rowCardGlass, styles.rowCard, { borderColor: `${colors.primary}33` }]}
                >
                  <View style={styles.rowTop}>
                    <Text style={[styles.fileName, { color: colors.text }]} numberOfLines={1}>{item.fileName}</Text>
                    <Text style={[styles.percentText, { color: colors.primary }]}>{String(item.progress)}%</Text>
                  </View>
                  <View style={[styles.progressTrack, { backgroundColor: colors.border }]}> 
                    <View style={[styles.progressFill, { backgroundColor: colors.primary, width: `${item.progress}%` }]} />
                  </View>
                </GlassContainer>
              ))}
            </View>
          )}

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('lectures.savedDownloads')}</Text>
            <View style={styles.savedList}>
              {downloadedFiles.map((item) => (
                <GlassContainer
                  key={item.id}
                  borderRadius={14}
                  style={[styles.rowCardGlass, styles.rowCard, { borderColor: `${colors.primary}33` }]}
                >
                  <View style={styles.savedRowTop}>
                    <View style={[styles.fileIconWrap, { backgroundColor: 'transparent', borderColor: colors.border }]}> 
                      <Ionicons name="document-outline" size={16} color={colors.primary} />
                    </View>

                    <View style={styles.savedInfoWrap}>
                      <Text style={[styles.fileName, { color: colors.text }]} numberOfLines={2}>{item.name}</Text>

                      <View style={styles.savedMetaRow}>
                        <View style={[styles.metaPill, { borderColor: colors.border }]}> 
                          <Ionicons name="download-outline" size={12} color={colors.textSecondary} />
                          <Text style={[styles.metaText, { color: colors.textSecondary }]}>{formatBytesAsMb(item.size)} MB</Text>
                        </View>

                        {!!item.modifiedAt && (
                          <View style={[styles.metaPill, { borderColor: colors.border }]}> 
                            <Ionicons name="time-outline" size={12} color={colors.textSecondary} />
                            <Text style={[styles.metaText, { color: colors.textSecondary }]}>{formatSavedDate(item.modifiedAt)}</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>

                  <View style={styles.actionsRow}>
                    <TouchableOpacity style={[styles.actionBtn, styles.actionBtnPrimary, { borderColor: colors.border, backgroundColor: 'transparent' }]} onPress={() => onOpenFile(item.path, item.mimeType)}>
                      <Ionicons name="open-outline" size={14} color={colors.text} />
                      <Text style={[styles.actionText, { color: colors.text }]}>{t('lectures.openFile')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.actionBtn, styles.actionBtnDanger, { borderColor: colors.border }]} onPress={() => onDeleteFile(item.path)}>
                      <Ionicons name="trash-outline" size={14} color={colors.danger} />
                      <Text style={[styles.actionText, { color: colors.danger }]}>{t('common.delete')}</Text>
                    </TouchableOpacity>
                  </View>
                </GlassContainer>
              ))}
              {downloadedFiles.length === 0 && (
                <View style={styles.emptyWrap}>
                  <Ionicons name="download-outline" size={22} color={colors.textSecondary} />
                  <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{t('lectures.noSavedDownloads')}</Text>
                </View>
              )}
            </View>
          </View>
          </ScrollView>
        </GlassContainer>
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
  cardGlass: {
    borderRadius: borderRadius.xl,
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
  scrollContent: {
    paddingBottom: spacing.xs,
  },
  savedList: {
    minHeight: moderateScale(120),
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
  rowCardGlass: {
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
    lineHeight: fontSize(15),
  },
  percentText: {
    fontSize: fontSize(11),
    fontWeight: '700',
  },
  savedRowTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  fileIconWrap: {
    width: moderateScale(28),
    height: moderateScale(28),
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  savedInfoWrap: {
    flex: 1,
  },
  savedMetaRow: {
    marginTop: spacing.xs / 2,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  metaPill: {
    borderWidth: 1,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs / 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs / 2,
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
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  actionBtn: {
    borderWidth: 1,
    borderRadius: borderRadius.sm,
    flex: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xs / 2,
  },
  actionBtnPrimary: {
    minHeight: moderateScale(32),
  },
  actionBtnDanger: {
    minHeight: moderateScale(32),
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
