import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const PostCardMenu = ({
  visible,
  onClose,
  isOwner,
  isQuestion,
  isResolved,
  onEdit,
  onDelete,
  onReport,
  onMarkResolved,
  onCopy,
  onBookmark,
  isBookmarked,
  theme,
  t,
}) => {
  const handleAction = (action) => {
    onClose();
    if (action === 'edit' && onEdit) {
      onEdit();
    }
    if (action === 'delete' && onDelete) {
      onDelete();
    }
    if (action === 'report' && onReport) {
      onReport();
    }
    if (action === 'markResolved' && onMarkResolved) {
      onMarkResolved();
    }
    if (action === 'copy' && onCopy) {
      onCopy();
    }
    if (action === 'bookmark' && onBookmark) {
      onBookmark();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity 
        style={styles.modalOverlay} 
        activeOpacity={1} 
        onPress={onClose}
      >
        <View style={[styles.menuModal, { backgroundColor: theme.card || theme.cardBackground }]}>
          {isOwner ? (
            <>
              {isQuestion && !isResolved && (
                <>
                  <TouchableOpacity 
                    style={styles.menuItem} 
                    onPress={() => handleAction('markResolved')}
                  >
                    <Ionicons name="checkmark-circle-outline" size={22} color="#10B981" />
                    <Text style={[styles.menuText, { color: '#10B981' }]}>
                      {t('post.markAsAnswered')}
                    </Text>
                  </TouchableOpacity>
                  <View style={[styles.menuDivider, { backgroundColor: theme.border }]} />
                </>
              )}
              <TouchableOpacity 
                style={styles.menuItem} 
                onPress={() => handleAction('edit')}
              >
                <Ionicons name="create-outline" size={22} color="#3B82F6" />
                <Text style={[styles.menuText, { color: '#3B82F6' }]}>
                  {t('common.edit')}
                </Text>
              </TouchableOpacity>
              <View style={[styles.menuDivider, { backgroundColor: theme.border }]} />
              <TouchableOpacity 
                style={styles.menuItem} 
                onPress={() => handleAction('delete')}
              >
                <Ionicons name="trash-outline" size={22} color="#EF4444" />
                <Text style={[styles.menuText, { color: '#EF4444' }]}>
                  {t('common.delete')}
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity 
              style={styles.menuItem} 
              onPress={() => handleAction('report')}
            >
              <Ionicons name="flag-outline" size={22} color="#F59E0B" />
              <Text style={[styles.menuText, { color: '#F59E0B' }]}>
                {t('post.report')}
              </Text>
            </TouchableOpacity>
          )}
          <View style={[styles.menuDivider, { backgroundColor: theme.border }]} />
          <TouchableOpacity 
            style={styles.menuItem} 
            onPress={() => handleAction('copy')}
          >
            <Ionicons name="copy-outline" size={22} color={theme.primary || '#007AFF'} />
            <Text style={[styles.menuText, { color: theme.primary || '#007AFF' }]}>
              {t('post.copyText') || 'Copy Text'}
            </Text>
          </TouchableOpacity>
          <View style={[styles.menuDivider, { backgroundColor: theme.border }]} />
          <TouchableOpacity 
            style={styles.menuItem} 
            onPress={() => handleAction('bookmark')}
          >
            <Ionicons 
              name={isBookmarked ? "bookmark" : "bookmark-outline"} 
              size={22} 
              color={isBookmarked ? "#F59E0B" : theme.primary || '#007AFF'} 
            />
            <Text style={[styles.menuText, { color: isBookmarked ? "#F59E0B" : theme.primary || '#007AFF' }]}>
              {isBookmarked ? (t('post.removeBookmark') || 'Remove Bookmark') : (t('post.bookmark') || 'Bookmark')}
            </Text>
          </TouchableOpacity>
          <View style={[styles.menuDivider, { backgroundColor: theme.border }]} />
          <TouchableOpacity 
            style={styles.menuItem} 
            onPress={onClose}
          >
            <Ionicons name="close-outline" size={22} color={theme.textSecondary} />
            <Text style={[styles.menuText, { color: theme.textSecondary }]}>
              {t('common.cancel')}
            </Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuModal: {
    borderRadius: 18,
    width: '85%',
    maxWidth: 320,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 22,
    gap: 14,
  },
  menuText: {
    fontSize: 17,
    fontWeight: '600',
  },
  menuDivider: {
    height: 1,
  },
});

export default PostCardMenu;
