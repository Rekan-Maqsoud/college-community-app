import React from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '../../../components/icons/CompatIonicon';
import { GlassIconButton } from '../../../components/GlassComponents';
import { spacing } from '../../../utils/responsive';
import styles from '../LectureChannelStyles';

const LectureChannelHeader = ({
  activeDownloadsCount,
  canUpload,
  channelName,
  colors,
  insets,
  isManager,
  isOwner,
  onOpenDownloads,
  onOpenUploadComposer,
  onOpenOrganizer,
  onOpenSettings,
  pendingJoinRequestsCount,
  t,
}) => {
  React.useEffect(() => {
  }, [activeDownloadsCount, canUpload, channelName, isManager, isOwner, pendingJoinRequestsCount]);

  return (
    <View style={[styles.header, { paddingTop: insets.top + spacing.sm, borderBottomColor: colors.border }]}> 
      <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>{channelName || t('lectures.channel')}</Text>
      <View style={styles.headerActions}>
        <View style={styles.iconBadgeWrap}>
          <GlassIconButton
            size={36}
            borderRadiusValue={18}
            activeOpacity={0.7}
            onPress={onOpenDownloads}
            style={[styles.headerMenuBtn, { borderColor: `${colors.primary}44`, backgroundColor: 'transparent' }]}>
            <Ionicons name="download-outline" size={20} color={colors.text} />
          </GlassIconButton>
          {activeDownloadsCount > 0 && (
            <View style={[styles.downloadBadge, { backgroundColor: colors.primary }]}> 
              <Text style={styles.downloadBadgeText}>{String(activeDownloadsCount)}</Text>
            </View>
          )}
        </View>

        {canUpload && (
          <GlassIconButton
            size={36}
            borderRadiusValue={18}
            activeOpacity={0.7}
            onPress={() => {
              onOpenUploadComposer();
            }}
            style={[styles.headerMenuBtn, { borderColor: `${colors.primary}44`, backgroundColor: 'transparent' }]}>
            <Ionicons name="cloud-upload-outline" size={20} color={colors.text} />
          </GlassIconButton>
        )}

        {isManager && (
          <GlassIconButton
            size={36}
            borderRadiusValue={18}
            activeOpacity={0.7}
            onPress={() => {
              onOpenOrganizer();
            }}
            style={[styles.headerMenuBtn, { borderColor: `${colors.primary}44`, backgroundColor: 'transparent' }]}>
            <Ionicons name="folder-outline" size={20} color={colors.text} />
          </GlassIconButton>
        )}

        {isManager && (
          <View style={styles.iconBadgeWrap}>
            <GlassIconButton
              size={36}
              borderRadiusValue={18}
              activeOpacity={0.7}
              onPress={() => {
                onOpenSettings();
              }}
              style={[styles.headerMenuBtn, { borderColor: `${colors.primary}44`, backgroundColor: 'transparent' }]}>
              <Ionicons name="ellipsis-horizontal" size={22} color={colors.text} />
            </GlassIconButton>
            {isOwner && pendingJoinRequestsCount > 0 && (
              <View style={[styles.pendingBadge, { backgroundColor: colors.danger }]}> 
                <Text style={styles.pendingBadgeText}>{pendingJoinRequestsCount > 99 ? '99+' : String(pendingJoinRequestsCount)}</Text>
              </View>
            )}
          </View>
        )}
      </View>
    </View>
  );
};

export default LectureChannelHeader;
