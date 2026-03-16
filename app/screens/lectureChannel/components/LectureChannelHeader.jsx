import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { spacing } from '../../../utils/responsive';
import styles from '../LectureChannelStyles';

const LectureChannelHeader = ({
  activeDownloadsCount,
  canUpload,
  channelName,
  colors,
  insets,
  isManager,
  onOpenDownloads,
  onOpenUploadComposer,
  onOpenOrganizer,
  onOpenSettings,
  t,
}) => {
  React.useEffect(() => {
  }, [activeDownloadsCount, canUpload, channelName, isManager]);

  return (
    <View style={[styles.header, { paddingTop: insets.top + spacing.sm, borderBottomColor: colors.border }]}> 
      <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>{channelName || t('lectures.channel')}</Text>
      <View style={styles.headerActions}>
        <TouchableOpacity
          onPress={onOpenDownloads}
          style={[styles.headerMenuBtn, { borderColor: colors.border, backgroundColor: colors.card }]}>
          <Ionicons name="download-outline" size={20} color={colors.text} />
          {activeDownloadsCount > 0 && (
            <View style={[styles.downloadBadge, { backgroundColor: colors.primary }]}> 
              <Text style={styles.downloadBadgeText}>{String(activeDownloadsCount)}</Text>
            </View>
          )}
        </TouchableOpacity>

        {canUpload && (
          <TouchableOpacity
            onPress={() => {
              onOpenUploadComposer();
            }}
            style={[styles.headerMenuBtn, { borderColor: colors.border, backgroundColor: colors.card }]}>
            <Ionicons name="cloud-upload-outline" size={20} color={colors.text} />
          </TouchableOpacity>
        )}

        {isManager && (
          <TouchableOpacity
            onPress={() => {
              onOpenOrganizer();
            }}
            style={[styles.headerMenuBtn, { borderColor: colors.border, backgroundColor: colors.card }]}>
            <Ionicons name="folder-outline" size={20} color={colors.text} />
          </TouchableOpacity>
        )}

        {isManager && (
          <TouchableOpacity
            onPress={() => {
              onOpenSettings();
            }}
            style={[styles.headerMenuBtn, { borderColor: colors.border, backgroundColor: colors.card }]}>
            <Ionicons name="ellipsis-horizontal" size={22} color={colors.text} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

export default LectureChannelHeader;
