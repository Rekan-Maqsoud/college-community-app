import { StyleSheet, Platform } from 'react-native';
import { moderateScale, fontSize, spacing, wp, hp } from '../../utils/responsive';
import { borderRadius } from '../../theme/designTokens';

export const postDetailsStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: moderateScale(12),
    borderBottomWidth: 1,
  },
  backButton: {
    width: moderateScale(40),
    height: moderateScale(40),
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: fontSize(17),
    fontWeight: '700',
  },
  headerSpacer: {
    width: moderateScale(40),
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.lg,
  },
  repliesSection: {
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  repliesSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  repliesSectionTitle: {
    fontSize: fontSize(17),
    fontWeight: '700',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  loadingText: {
    marginTop: moderateScale(12),
    fontSize: fontSize(14),
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyTitle: {
    fontSize: fontSize(15),
    fontWeight: '600',
    marginTop: moderateScale(12),
  },
  emptySubtitle: {
    fontSize: fontSize(13),
    marginTop: moderateScale(4),
  },
  repliesList: {
    gap: moderateScale(12),
  },
  replyThreadItem: {
    borderRadius: borderRadius.sm,
  },
  replyThreadChild: {
    paddingLeft: moderateScale(12),
    borderLeftWidth: 2,
  },
  replyChildren: {
    marginTop: moderateScale(10),
    gap: moderateScale(10),
  },
  threadToggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: moderateScale(10),
    paddingVertical: moderateScale(6),
    borderRadius: moderateScale(12),
    gap: moderateScale(6),
    marginTop: spacing.sm,
  },
  threadToggleText: {
    fontSize: fontSize(12),
    fontWeight: '600',
  },
  inputSection: {
    paddingHorizontal: spacing.md,
    paddingVertical: moderateScale(12),
    borderTopWidth: 1,
  },
  editingBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    paddingHorizontal: moderateScale(12),
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    marginBottom: moderateScale(10),
  },
  editingBannerText: {
    color: '#3B82F6',
    fontSize: fontSize(13),
    fontWeight: '600',
  },
  replyingBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: moderateScale(12),
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    marginBottom: moderateScale(10),
  },
  replyingBannerText: {
    color: '#10B981',
    fontSize: fontSize(13),
    fontWeight: '600',
  },
  replyTextInput: {
    borderRadius: moderateScale(12),
    paddingHorizontal: moderateScale(14),
    paddingVertical: moderateScale(12),
    fontSize: fontSize(14),
    minHeight: moderateScale(44),
    maxHeight: moderateScale(120),
    textAlignVertical: 'top',
  },
  imagePreviewScroll: {
    marginTop: moderateScale(10),
  },
  imagePreviewItem: {
    marginRight: moderateScale(10),
    position: 'relative',
  },
  imagePreview: {
    width: moderateScale(70),
    height: moderateScale(70),
    borderRadius: borderRadius.sm,
  },
  removeImageBtn: {
    position: 'absolute',
    top: moderateScale(-6),
    right: moderateScale(-6),
    backgroundColor: '#FFFFFF',
    borderRadius: moderateScale(11),
  },
  linksSection: {
    marginTop: moderateScale(10),
    gap: spacing.sm,
  },
  linkChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: moderateScale(12),
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    gap: moderateScale(6),
  },
  linkChipText: {
    flex: 1,
    fontSize: fontSize(13),
    color: '#3B82F6',
  },
  linkInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  linkInput: {
    flex: 1,
    borderRadius: borderRadius.sm,
    paddingHorizontal: moderateScale(12),
    paddingVertical: moderateScale(10),
    fontSize: fontSize(14),
  },
  addLinkBtn: {
    padding: moderateScale(4),
  },
  inputActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: moderateScale(12),
  },
  inputActionsLeft: {
    flexDirection: 'row',
    gap: moderateScale(12),
  },
  actionIconBtn: {
    position: 'relative',
    padding: spacing.sm,
  },
  imageBadge: {
    position: 'absolute',
    top: moderateScale(2),
    right: moderateScale(2),
    backgroundColor: '#3B82F6',
    borderRadius: moderateScale(8),
    minWidth: moderateScale(16),
    height: moderateScale(16),
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageBadgeText: {
    color: '#FFFFFF',
    fontSize: fontSize(10),
    fontWeight: '700',
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    paddingHorizontal: spacing.lg,
    paddingVertical: moderateScale(12),
    borderRadius: moderateScale(24),
    gap: spacing.sm,
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontSize: fontSize(14),
    fontWeight: '600',
  },
});
