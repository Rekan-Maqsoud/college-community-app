import { StyleSheet, Platform } from 'react-native';
import { 
  wp, 
  hp, 
  spacing, 
  moderateScale,
} from '../../utils/responsive';
import { borderRadius } from '../../theme/designTokens';

export const chatRoomStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  backgroundOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginTop: Platform.OS === 'ios' ? hp(1) : 0,
    gap: spacing.sm,
  },
  warningText: {
    flex: 1,
    fontWeight: '500',
  },
  messagesList: {
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: wp(5),
  },
  emptyCard: {
    padding: spacing.xl,
    alignItems: 'center',
    width: '100%',
    maxWidth: moderateScale(400),
  },
  emptyText: {
    fontWeight: '600',
    textAlign: 'center',
  },
  emptySubtext: {
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingTop: spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? spacing.xl + 20 : spacing.xl,
  },
  modalTitle: {
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  muteOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.md,
    borderBottomWidth: 1,
  },
  muteOptionText: {
    fontWeight: '500',
  },
  cancelButton: {
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  cancelButtonText: {
    fontWeight: '500',
  },
  pinnedModalContent: {
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingTop: spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? spacing.xl + 20 : spacing.xl,
    maxHeight: '70%',
  },
  pinnedModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  pinnedList: {
    paddingHorizontal: spacing.md,
  },
  emptyPinned: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  emptyPinnedText: {
    marginTop: spacing.md,
  },
  pinnedMessageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
  },
  pinnedMessageContent: {
    flex: 1,
  },
  pinnedSenderName: {
    fontWeight: '600',
    marginBottom: 2,
  },
  pinnedMessageText: {
    fontWeight: '400',
  },
  // Search bar styles
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    gap: spacing.xs,
  },
  searchInput: {
    flex: 1,
    paddingVertical: Platform.OS === 'ios' ? spacing.xs : 0,
  },
  searchNav: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: spacing.sm,
    gap: spacing.xs,
  },
  searchCount: {
    minWidth: moderateScale(45),
    textAlign: 'center',
  },
  searchNavBtn: {
    padding: spacing.xs,
  },
  searchNavBtnDisabled: {
    opacity: 0.4,
  },
  searchCloseBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  searchCloseText: {
    fontWeight: '600',
  },
  // Selection mode toolbar styles
  selectionToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  selectionToolbarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  selectionToolbarText: {
    fontWeight: '500',
  },
  selectionToolbarActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
});
