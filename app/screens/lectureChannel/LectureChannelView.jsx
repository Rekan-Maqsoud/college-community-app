import React from 'react';
import { RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AnimatedBackground from '../../components/AnimatedBackground';
import DownloadManagerModal from './DownloadManagerModal';
import AssetActionMenuModal from './AssetActionMenuModal';
import AssetStatsModal from './AssetStatsModal';
import AdminOrganizerModal from './AdminOrganizerModal';
import LectureUploadModal from './components/LectureUploadModal';
import LectureAssetsList from './components/LectureAssetsList';
import LectureSettingsModal from './components/LectureSettingsModal';
import LectureCommentsModal from './components/LectureCommentsModal';
import LectureChannelHeader from './components/LectureChannelHeader';
import styles from './LectureChannelStyles';

const LectureChannelView = ({
  actionState,
  assetOps,
  computed,
  contentStyle,
  insets,
  refs,
  state,
}) => {
  const {
    closeComments,
    handleOrganizerSave,
    handleTogglePin,
    onRefresh,
    openComments,
    openAssetMenu,
    pickFile,
    removeComment,
    resolveName,
    setAssetMenuOpen,
    setAssetStatsOpen,
    setAssetStatsTarget,
    setNewComment,
    setNewUploadDescription,
    setNewUploadTitle,
    setNewUploadType,
    setOrganizerOpen,
    setShowUploadComposer,
    setExternalUrl,
    setYoutubeUrl,
    submitComment,
  } = actionState;

  const {
    activeDownloadsList,
    downloadedFiles,
    downloadsModalOpen,
    handleDownloadAsset,
    openAsset,
    openLocalFile,
    removeDownloadedFile,
    setDownloadsModalOpen,
  } = assetOps;

  const {
    assetListData,
    canUpload,
    isManager,
    membership,
    membershipResolved,
  } = computed;

  const hasApprovedMembership = membership?.joinStatus === 'approved';
  const showJoinButton = membershipResolved && !isManager && !hasApprovedMembership;

  const {
    assetComments,
    assetMenuOpen,
    assetMenuTarget,
    assetStatsOpen,
    assetStatsTarget,
    assets,
    channel,
    colors,
    commentsModalAsset,
    externalUrl,
    isDarkMode,
    loading,
    newComment,
    newUploadDescription,
    newUploadTitle,
    newUploadType,
    organizerOpen,
    postingComment,
    refreshing,
    selectedFile,
    settingsDraft,
    showUploadComposer,
    t,
    uploadError,
    uploading,
    user,
    userProfiles,
    youtubeUrl,
  } = state;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}> 
      <AnimatedBackground particleCount={35} />
      <LinearGradient
        colors={isDarkMode ? ['#1a1a2e', '#16213e', '#0f3460'] : ['#e3f2fd', '#bbdefb', '#90caf9']}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}>
        <LectureChannelHeader
          activeDownloadsCount={downloadedFiles.length + activeDownloadsList.length}
          canUpload={canUpload}
          channelName={channel?.name}
          colors={colors}
          insets={insets}
          isManager={isManager}
          onOpenDownloads={() => setDownloadsModalOpen(true)}
          onOpenUploadComposer={() => setShowUploadComposer(true)}
          onOpenOrganizer={() => setOrganizerOpen(true)}
          onOpenSettings={() => actionState.setSettingsOpen(true)}
          t={t}
        />

        <View style={[styles.content, contentStyle, { flex: 1, paddingBottom: 0 }]}>
          <LectureAssetsList
            assetListData={assetListData}
            canViewAssetInfo={actionState.canViewAssetInfo}
            colors={colors}
            handleDownloadAsset={handleDownloadAsset}
            loading={loading}
            openAsset={openAsset}
            openAssetMenu={openAssetMenu}
            openComments={openComments}
            setAssetStatsOpen={setAssetStatsOpen}
            setAssetStatsTarget={setAssetStatsTarget}
            t={t}
            refreshing={refreshing}
            onRefresh={onRefresh}
            showJoinButton={showJoinButton}
            membership={membership}
            actionState={actionState}
            isManager={isManager}
            canUpload={canUpload}
          />
        </View>

        <LectureSettingsModal
          actions={actionState}
          autoSaveTimerRef={refs.autoSaveTimerRef}
          channel={channel}
          colors={colors}
          computed={computed}
          managerState={{
            addingManager: state.addingManager,
            connectedGroup: computed.connectedGroup,
            handleAddManager: actionState.handleAddManager,
            isOwner: computed.isOwner,
            joinRequests: state.joinRequests,
            linkableGroups: computed.linkableGroups,
            managerError: state.managerError,
            managerStatus: state.managerStatus,
            managerSuggestions: state.managerSuggestions,
            managerUserId: state.managerUserId,
            managers: state.managers,
            membership: computed.membership,
            resolveName,
            searchingManagerSuggestions: state.searchingManagerSuggestions,
            stageSuggestions: computed.stageSuggestions,
            stats: computed.stats,
          }}
          savingSettings={state.savingSettings}
          settingsDraft={settingsDraft}
          settingsOpen={state.settingsOpen}
          showGroupPicker={state.showGroupPicker}
          showSettingsStats={state.showSettingsStats}
          t={t}
          userProfiles={userProfiles}
        />

        <LectureUploadModal
          canUpload={canUpload}
          colors={colors}
          externalUrl={externalUrl}
          handleUpload={actionState.handleUpload}
          newUploadDescription={newUploadDescription}
          newUploadTitle={newUploadTitle}
          newUploadType={newUploadType}
          onClose={() => setShowUploadComposer(false)}
          pickFile={pickFile}
          selectedFile={selectedFile}
          setExternalUrl={setExternalUrl}
          setNewUploadDescription={setNewUploadDescription}
          setNewUploadTitle={setNewUploadTitle}
          setNewUploadType={setNewUploadType}
          setYoutubeUrl={setYoutubeUrl}
          showUploadComposer={showUploadComposer}
          t={t}
          uploadError={uploadError}
          uploading={uploading}
          youtubeUrl={youtubeUrl}
        />

        <DownloadManagerModal
          visible={downloadsModalOpen}
          onClose={() => setDownloadsModalOpen(false)}
          colors={colors}
          t={t}
          activeDownloads={activeDownloadsList}
          downloadedFiles={downloadedFiles}
          onOpenFile={openLocalFile}
          onDeleteFile={removeDownloadedFile}
        />

        <AssetActionMenuModal
          visible={assetMenuOpen}
          onClose={() => setAssetMenuOpen(false)}
          colors={colors}
          t={t}
          asset={assetMenuTarget}
          canViewInfo={actionState.canViewAssetInfo(assetMenuTarget)}
          canPin={!!isManager}
          onOpen={async () => {
            const target = assetMenuTarget;
            setAssetMenuOpen(false);
            if (target) {
              await openAsset(target);
            }
          }}
          onDownload={async () => {
            const target = assetMenuTarget;
            setAssetMenuOpen(false);
            if (target) {
              await handleDownloadAsset(target);
            }
          }}
          onDiscuss={async () => {
            const target = assetMenuTarget;
            setAssetMenuOpen(false);
            if (target) {
              await openComments(target);
            }
          }}
          onShowInfo={() => {
            const target = assetMenuTarget;
            setAssetMenuOpen(false);
            setAssetStatsTarget(target);
            setAssetStatsOpen(true);
          }}
          onTogglePin={async () => {
            const target = assetMenuTarget;
            setAssetMenuOpen(false);
            if (target && isManager) {
              await handleTogglePin(target);
            }
          }}
        />

        <AssetStatsModal
          visible={assetStatsOpen}
          onClose={() => setAssetStatsOpen(false)}
          colors={colors}
          t={t}
          asset={assetStatsTarget}
          userProfiles={userProfiles}
        />

        <AdminOrganizerModal
          visible={organizerOpen}
          onClose={() => setOrganizerOpen(false)}
          colors={colors}
          t={t}
          assets={assets}
          folders={settingsDraft.assetFolders}
          assetFolderMap={settingsDraft.assetFolderMap}
          assetOrder={settingsDraft.assetOrder}
          onSave={handleOrganizerSave}
        />

        <LectureCommentsModal
          assetComments={assetComments}
          closeComments={closeComments}
          colors={colors}
          commentsModalAsset={commentsModalAsset}
          isManager={isManager}
          newComment={newComment}
          postingComment={postingComment}
          removeComment={removeComment}
          resolveName={resolveName}
          setNewComment={setNewComment}
          submitComment={submitComment}
          t={t}
          user={user}
        />
      </LinearGradient>
    </View>
  );
};

export default LectureChannelView;
