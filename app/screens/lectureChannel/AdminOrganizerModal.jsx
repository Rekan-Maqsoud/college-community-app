import React, { useMemo, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, TextInput, FlatList, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { spacing, fontSize, wp, moderateScale } from '../../utils/responsive';
import { borderRadius } from '../../theme/designTokens';

const buildOrder = (assets = [], currentOrder = []) => {
  const ids = (Array.isArray(assets) ? assets : []).map(item => item.$id).filter(Boolean);
  const order = Array.isArray(currentOrder) ? currentOrder.filter(Boolean) : [];
  const ordered = [...order.filter(id => ids.includes(id)), ...ids.filter(id => !order.includes(id))];
  return ordered;
};

const AdminOrganizerModal = ({
  visible,
  onClose,
  colors,
  t,
  assets = [],
  folders = [],
  assetFolderMap = {},
  assetOrder = [],
  onSave,
}) => {
  const [folderName, setFolderName] = useState('');
  const [draftFolders, setDraftFolders] = useState(Array.isArray(folders) ? folders : []);
  const [draftMap, setDraftMap] = useState({ ...(assetFolderMap || {}) });
  const [draftOrder, setDraftOrder] = useState(buildOrder(assets, assetOrder));

  React.useEffect(() => {
    if (!visible) {
      return;
    }
    setDraftFolders(Array.isArray(folders) ? folders : []);
    setDraftMap({ ...(assetFolderMap || {}) });
    setDraftOrder(buildOrder(assets, assetOrder));
    setFolderName('');
  }, [visible, folders, assetFolderMap, assetOrder, assets]);

  const orderedAssets = useMemo(() => {
    const map = new Map((Array.isArray(assets) ? assets : []).map(item => [item.$id, item]));
    return draftOrder.map(id => map.get(id)).filter(Boolean);
  }, [assets, draftOrder]);

  const moveAsset = (assetId, direction) => {
    setDraftOrder((prev) => {
      const next = [...prev];
      const index = next.indexOf(assetId);
      if (index < 0) {
        return prev;
      }

      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= next.length) {
        return prev;
      }

      const temp = next[index];
      next[index] = next[targetIndex];
      next[targetIndex] = temp;
      return next;
    });
  };

  const addFolder = () => {
    const name = String(folderName || '').trim();
    if (!name) {
      return;
    }

    const id = `folder_${Date.now()}`;
    setDraftFolders((prev) => [...prev, { id, name }]);
    setFolderName('');
  };

  const removeFolder = (folderId) => {
    if (!folderId) {
      return;
    }

    setDraftFolders(prev => prev.filter(item => item.id !== folderId));
    setDraftMap((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((assetId) => {
        if (next[assetId] === folderId) {
          delete next[assetId];
        }
      });
      return next;
    });
  };

  const cycleAssetFolder = (assetId) => {
    if (!assetId) {
      return;
    }

    const folderIds = ['', ...draftFolders.map(item => item.id)];
    const current = draftMap[assetId] || '';
    const index = folderIds.indexOf(current);
    const nextId = folderIds[(index + 1) % folderIds.length] || '';

    setDraftMap((prev) => {
      const next = { ...prev };
      if (!nextId) {
        delete next[assetId];
      } else {
        next[assetId] = nextId;
      }
      return next;
    });
  };

  const resolveFolderName = (folderId) => {
    if (!folderId) {
      return t('lectures.unassigned');
    }

    const match = draftFolders.find(item => item.id === folderId);
    return match?.name || t('lectures.unassigned');
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={[styles.backdrop, { backgroundColor: colors.overlay }]}> 
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}> 
          <View style={styles.headerRow}>
            <Text style={[styles.title, { color: colors.text }]}>{t('lectures.organizeAssets')}</Text>
            <TouchableOpacity onPress={onClose} style={[styles.iconBtn, { borderColor: colors.border }]}> 
              <Ionicons name="close" size={18} color={colors.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.newFolderRow}>
            <TextInput
              value={folderName}
              onChangeText={setFolderName}
              placeholder={t('lectures.folderNamePlaceholder')}
              placeholderTextColor={colors.textSecondary}
              style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBackground }]}
            />
            <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.primary }]} onPress={addFolder}>
              <Ionicons name="add" size={16} color="#FFFFFF" />
              <Text style={styles.addBtnText}>{t('lectures.createFolder')}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.foldersWrap}>
            <FlatList
              horizontal
              data={draftFolders}
              keyExtractor={(item) => item.id}
              showsHorizontalScrollIndicator={false}
              renderItem={({ item }) => (
                <View style={[styles.folderChip, { borderColor: colors.border, backgroundColor: colors.inputBackground }]}> 
                  <Text style={[styles.folderChipText, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
                  <TouchableOpacity onPress={() => removeFolder(item.id)}>
                    <Ionicons name="close" size={14} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
              )}
              ListEmptyComponent={
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{t('lectures.noFoldersYet')}</Text>
              }
            />
          </View>

          <FlatList
            data={orderedAssets}
            keyExtractor={(item) => item.$id}
            renderItem={({ item, index }) => {
              const folderId = draftMap[item.$id] || '';
              return (
                <View style={[styles.assetRow, { borderColor: colors.border, backgroundColor: colors.inputBackground }]}> 
                  <View style={styles.assetMeta}>
                    <Text style={[styles.assetTitle, { color: colors.text }]} numberOfLines={1}>{item.title}</Text>
                    <TouchableOpacity style={[styles.folderAssignBtn, { borderColor: colors.border }]} onPress={() => cycleAssetFolder(item.$id)}>
                      <Ionicons name="folder-open-outline" size={14} color={colors.primary} />
                      <Text style={[styles.folderAssignText, { color: colors.primary }]}>{resolveFolderName(folderId)}</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.rowActions}>
                    <TouchableOpacity disabled={index === 0} style={[styles.iconBtn, { borderColor: colors.border, opacity: index === 0 ? 0.4 : 1 }]} onPress={() => moveAsset(item.$id, 'up')}>
                      <Ionicons name="chevron-up" size={16} color={colors.text} />
                    </TouchableOpacity>
                    <TouchableOpacity disabled={index === orderedAssets.length - 1} style={[styles.iconBtn, { borderColor: colors.border, opacity: index === orderedAssets.length - 1 ? 0.4 : 1 }]} onPress={() => moveAsset(item.$id, 'down')}>
                      <Ionicons name="chevron-down" size={16} color={colors.text} />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            }}
          />

          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: colors.primary }]}
            onPress={() => onSave({ folders: draftFolders, assetFolderMap: draftMap, assetOrder: draftOrder })}
          >
            <Text style={styles.saveBtnText}>{t('lectures.saveOrganization')}</Text>
          </TouchableOpacity>
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
    maxHeight: '88%',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: fontSize(16),
    fontWeight: '800',
  },
  newFolderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize(12),
  },
  addBtn: {
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs / 2,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontSize: fontSize(11),
    fontWeight: '700',
  },
  foldersWrap: {
    minHeight: moderateScale(44),
    marginBottom: spacing.sm,
  },
  folderChip: {
    borderWidth: 1,
    borderRadius: borderRadius.round,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    marginRight: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs / 2,
    maxWidth: wp(45),
  },
  folderChipText: {
    fontSize: fontSize(11),
    fontWeight: '700',
  },
  emptyText: {
    fontSize: fontSize(11),
    fontWeight: '500',
  },
  assetRow: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    marginBottom: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  assetMeta: {
    flex: 1,
    minWidth: 0,
  },
  assetTitle: {
    fontSize: fontSize(12),
    fontWeight: '700',
    marginBottom: spacing.xs / 2,
  },
  folderAssignBtn: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: borderRadius.round,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs / 2,
  },
  folderAssignText: {
    fontSize: fontSize(10),
    fontWeight: '700',
  },
  rowActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  iconBtn: {
    width: moderateScale(30),
    height: moderateScale(30),
    borderWidth: 1,
    borderRadius: borderRadius.round,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtn: {
    marginTop: spacing.sm,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: fontSize(12),
    fontWeight: '700',
  },
});

export default AdminOrganizerModal;
