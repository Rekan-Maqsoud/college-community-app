import React, { useMemo } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import useLayout from '../../hooks/useLayout';
import LectureChannelView from './LectureChannelView';
import { sanitizeDownloadFileName } from './lectureChannelUtils';
import { useLectureChannelController } from './useLectureChannelController';
import { useLectureChannelAssetOperations } from './useLectureChannelAssetOperations';

const LectureChannel = ({ route, navigation }) => {
  const channelId = route?.params?.channelId || '';
  const insets = useSafeAreaInsets();
  const { contentStyle } = useLayout();

  const controller = useLectureChannelController({ channelId, navigation });

  React.useEffect(() => {
    console.log('[LectureChannelScreen]', 'render_snapshot', {
      routeParams: route?.params || {},
      channelId,
      channelName: controller.state.channel?.name || '',
      channelOwnerId: controller.state.channel?.ownerId || '',
      membershipId: controller.computed.membership?.$id || '',
      membershipUserId: controller.computed.membership?.userId || '',
      membershipJoinStatus: controller.computed.membership?.joinStatus || '',
      membershipRole: controller.computed.membership?.role || '',
      isManager: controller.computed.isManager,
      isOwner: controller.computed.isOwner,
      canUpload: controller.computed.canUpload,
      managers: controller.state.managers,
      settingsOpen: controller.state.settingsOpen,
      showUploadComposer: controller.state.showUploadComposer,
    });
  }, [channelId, controller.computed.canUpload, controller.computed.isManager, controller.computed.isOwner, controller.computed.membership, controller.state.channel, controller.state.managers, controller.state.settingsOpen, controller.state.showUploadComposer, route?.params]);

  const safeChannelFolderName = useMemo(() => {
    return sanitizeDownloadFileName(controller.state.channel?.name || channelId || 'channel');
  }, [channelId, controller.state.channel?.name]);

  const assetOps = useLectureChannelAssetOperations({
    assets: controller.state.assets,
    channel: controller.state.channel,
    channelId,
    loadData: controller.actions.loadData,
    logLectureChannel: controller.telemetry.logLectureChannel,
    logLectureChannelError: controller.telemetry.logLectureChannelError,
    route,
    safeChannelFolderName,
    t: controller.state.t,
    user: controller.state.user,
  });

  return (
    <LectureChannelView
      actionState={{
        ...controller.actions,
        canViewAssetInfo: controller.actions.canViewAssetInfo,
        handleJoin: controller.actions.handleJoin,
        handleUpload: controller.actions.handleUpload,
      }}
      assetOps={assetOps}
      computed={controller.computed}
      contentStyle={contentStyle}
      insets={insets}
      refs={controller.refs}
      state={controller.state}
    />
  );
};

export default LectureChannel;
