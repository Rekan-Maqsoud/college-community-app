import React from 'react';
import { ActivityIndicator, Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '../../../components/icons/CompatIonicon';
import IoniconSvg from '../../../components/icons/IoniconSvg';
import ProfilePicture from '../../../components/ProfilePicture';
import { GlassContainer, GlassIconButton } from '../../../components/GlassComponents';
import { useAppSettings } from '../../../context/AppSettingsContext';
import { moderateScale, spacing } from '../../../utils/responsive';
import { CHAT_TYPES } from '../../../../database/chats';
import { LECTURE_ACCESS_TYPES, LECTURE_CHANNEL_TYPES } from '../../../../database/lectures';
import { formatBytesAsMb } from '../lectureChannelUtils';
import styles from '../LectureChannelStyles';

const LectureSettingsModal = ({
  actions,
  autoSaveTimerRef,
  channel,
  colors,
  computed,
  managerState,
  savingSettings,
  settingsDraft,
  settingsOpen,
  showGroupPicker,
  showSettingsStats,
  t,
  userProfiles,
}) => {
  const { isRTL } = useAppSettings();

  const {
    handleApproveRequest,
    handleDeleteChannel,
    handleManagerInputChange,
    handleRemoveManager,
    handleSaveSettings,
    handleToggleAccess,
    handleToggleNotifications,
    setLinkedChatId,
    setSettingsDraft,
    setSettingsOpen,
    setShowGroupPicker,
    setShowSettingsStats,
  } = actions;

  const {
    addingManager,
    handleAddManager,
    isOwner,
    joinRequests,
    managerError,
    managerStatus,
    managerSuggestions,
    managerUserId,
    managers,
    membership,
    searchingManagerSuggestions,
    stats,
    connectedGroup,
    linkableGroups,
    stageSuggestions,
    resolveName,
  } = managerState;

  const renderStatCard = (label, value) => (
    <GlassContainer borderRadius={14} style={styles.settingsGlassBlock}>
      <View style={[styles.statCard, { borderColor: `${colors.primary}33`, backgroundColor: 'transparent' }]}> 
        <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
        <Text style={[styles.statLabel, isRTL && styles.directionalText, { color: colors.textSecondary }]}>{label}</Text>
      </View>
    </GlassContainer>
  );

  return (
    <Modal visible={settingsOpen} transparent animationType="slide" onRequestClose={() => setSettingsOpen(false)}>
      <View style={[styles.modalBackdrop, { backgroundColor: colors.overlay }]}> 
        <BlurView intensity={34} tint="dark" style={styles.modalBackdropBlur} />
        <View pointerEvents="none" style={styles.modalBackdropScrim} />
        <GlassContainer borderRadius={24} style={styles.settingsModalGlass} disableBackgroundOverlay>
        <View style={[styles.modalCard, { backgroundColor: 'transparent', borderColor: `${colors.primary}33` }]}> 
          <View style={[styles.modalHeaderRow, isRTL && styles.rowReverse]}>
            <Text style={[styles.modalTitle, isRTL && styles.directionalText, { color: colors.text }]}>{t('lectures.settingsMenuTitle')}</Text>
            <GlassIconButton
              size={32}
              borderRadiusValue={16}
              activeOpacity={0.7}
              onPress={() => setSettingsOpen(false)}>
              <IoniconSvg name="close" size={20} color={colors.text} />
            </GlassIconButton>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <GlassContainer borderRadius={14} style={styles.settingsGlassBlock}>
              <TouchableOpacity
                style={[styles.toggleRow, isRTL && styles.rowReverse, { borderColor: `${colors.primary}33`, backgroundColor: 'transparent' }]}
                onPress={() => setShowSettingsStats(prev => !prev)}>
                <Text style={[styles.toggleText, isRTL && styles.toggleTextRtl, isRTL && styles.directionalText, { color: colors.text }]}>{t('lectures.statsTitle')}</Text>
                <Ionicons name={showSettingsStats ? 'chevron-up' : 'chevron-down'} size={20} color={colors.primary} />
              </TouchableOpacity>
            </GlassContainer>

            {showSettingsStats && (
              <View style={styles.statsGrid}>
                {renderStatCard(t('lectures.totalUploads'), String(stats.total))}
                {renderStatCard(t('lectures.filesCount'), String(stats.files))}
                {renderStatCard(t('lectures.videosCount'), String(stats.videos))}
                {renderStatCard(t('lectures.linksCount'), String(stats.links))}
                {renderStatCard(t('lectures.pinnedCount'), String(stats.pinned))}
                {renderStatCard(t('lectures.totalSizeMB'), formatBytesAsMb(stats.totalBytes))}
              </View>
            )}

            <GlassContainer borderRadius={14} style={styles.settingsGlassBlock}>
              <TouchableOpacity
                style={[styles.toggleRow, isRTL && styles.rowReverse, { borderColor: `${colors.primary}33`, backgroundColor: 'transparent' }]}
                onPress={() => {
                  const nextVal = !settingsDraft.allowUploadsFromMembers;
                  setSettingsDraft(prev => ({ ...prev, allowUploadsFromMembers: nextVal }));
                  clearTimeout(autoSaveTimerRef.current);
                  autoSaveTimerRef.current = setTimeout(() => handleSaveSettings({ allowUploadsFromMembers: nextVal }), 600);
                }}>
                <Text style={[styles.toggleText, isRTL && styles.toggleTextRtl, isRTL && styles.directionalText, { color: colors.text }]}>{t('lectures.allowMemberUploads')}</Text>
                <IoniconSvg name={settingsDraft.allowUploadsFromMembers ? 'checkbox' : 'square-outline'} size={20} color={colors.primary} />
              </TouchableOpacity>
            </GlassContainer>

            <GlassContainer borderRadius={14} style={styles.settingsGlassBlock}>
              <TouchableOpacity
                style={[styles.toggleRow, isRTL && styles.rowReverse, { borderColor: `${colors.primary}33`, backgroundColor: 'transparent' }]}
                onPress={() => {
                  const nextVal = !settingsDraft.suggestToDepartment;
                  setSettingsDraft(prev => ({ ...prev, suggestToDepartment: nextVal }));
                  clearTimeout(autoSaveTimerRef.current);
                  autoSaveTimerRef.current = setTimeout(() => handleSaveSettings({ suggestToDepartment: nextVal }), 600);
                }}>
                <Text style={[styles.toggleText, isRTL && styles.toggleTextRtl, isRTL && styles.directionalText, { color: colors.text }]}>{t('lectures.suggestToDepartment')}</Text>
                <IoniconSvg name={settingsDraft.suggestToDepartment ? 'checkbox' : 'square-outline'} size={20} color={colors.primary} />
              </TouchableOpacity>
            </GlassContainer>

            <GlassContainer borderRadius={14} style={styles.settingsGlassBlock}>
              <TouchableOpacity
                style={[styles.toggleRow, isRTL && styles.rowReverse, { borderColor: `${colors.primary}33`, backgroundColor: 'transparent' }]}
                onPress={() => {
                  const nextVal = !settingsDraft.suggestToStage;
                  setSettingsDraft(prev => ({ ...prev, suggestToStage: nextVal }));
                  clearTimeout(autoSaveTimerRef.current);
                  autoSaveTimerRef.current = setTimeout(() => handleSaveSettings({ suggestToStage: nextVal }), 600);
                }}>
                <Text style={[styles.toggleText, isRTL && styles.toggleTextRtl, isRTL && styles.directionalText, { color: colors.text }]}>{t('lectures.suggestToStage')}</Text>
                <IoniconSvg name={settingsDraft.suggestToStage ? 'checkbox' : 'square-outline'} size={20} color={colors.primary} />
              </TouchableOpacity>
            </GlassContainer>

            {settingsDraft.suggestToStage && (
              <>
                <TextInput
                  value={settingsDraft.suggestedStage}
                  onChangeText={(value) => setSettingsDraft(prev => ({ ...prev, suggestedStage: value }))}
                  placeholder={t('lectures.suggestedStagePlaceholder')}
                  placeholderTextColor={colors.textSecondary}
                  style={[styles.input, isRTL && styles.directionalInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBackground }]}
                />

                <View style={styles.stageSuggestionWrap}>
                  {stageSuggestions.map((stageValue) => {
                    const selected = String(settingsDraft.suggestedStage || '').trim().toLowerCase() === String(stageValue).toLowerCase();
                    return (
                      <TouchableOpacity
                        key={`stage_${stageValue}`}
                        style={[
                          styles.stageSuggestionChip,
                          {
                            borderColor: selected ? colors.primary : colors.border,
                            backgroundColor: selected ? `${colors.primary}22` : colors.inputBackground,
                          },
                        ]}
                        onPress={() => {
                          const nextStage = String(stageValue);
                          setSettingsDraft(prev => ({ ...prev, suggestedStage: nextStage }));
                          clearTimeout(autoSaveTimerRef.current);
                          autoSaveTimerRef.current = setTimeout(() => handleSaveSettings({ suggestedStage: nextStage }), 600);
                        }}>
                        <Text style={[styles.stageSuggestionChipText, isRTL && styles.directionalText, { color: selected ? colors.primary : colors.textSecondary }]}> 
                          {String(stageValue)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
            )}

            {(linkableGroups.length > 0 || !!connectedGroup) && (
              <Text style={[styles.modalSectionTitle, isRTL && styles.directionalText, { color: colors.text }]}>{t('lectures.linkedGroup')}</Text>
            )}

            {connectedGroup ? (
              <GlassContainer borderRadius={14} style={styles.settingsGlassBlock}>
              <View style={[styles.optionCard, isRTL && styles.rowReverse, { borderColor: `${colors.primary}66`, backgroundColor: 'transparent' }]}> 
                <View style={styles.optionMeta}>
                  <Text style={[styles.optionText, isRTL && styles.directionalText, { color: colors.text }]} numberOfLines={1}>{connectedGroup.name}</Text>
                  <Text style={[styles.optionSubText, isRTL && styles.directionalText, { color: colors.textSecondary }]} numberOfLines={1}>
                    {connectedGroup.type === CHAT_TYPES.STAGE_GROUP ? t('lectures.stageGroup') : t('lectures.customGroup')}
                  </Text>
                </View>
                {linkableGroups.length > 0 && (
                  <TouchableOpacity style={[styles.unlinkBtn, { borderColor: colors.border }]} onPress={() => {
                    setLinkedChatId('');
                    clearTimeout(autoSaveTimerRef.current);
                    autoSaveTimerRef.current = setTimeout(() => handleSaveSettings({ linkedChatId: '' }), 400);
                  }}>
                    <Text style={[styles.unlinkBtnText, isRTL && styles.directionalText, { color: colors.text }]}>{t('lectures.disconnectGroup')}</Text>
                  </TouchableOpacity>
                )}
              </View>
              </GlassContainer>
            ) : linkableGroups.length > 0 ? (
              <Text style={[styles.infoText, isRTL && styles.directionalText, { color: colors.textSecondary }]}>{t('lectures.noConnectedGroups')}</Text>
            ) : null}

            {linkableGroups.length > 0 && (
              <TouchableOpacity
                style={[styles.smallBtn, { borderColor: colors.border, alignSelf: isRTL ? 'flex-end' : 'flex-start', marginTop: spacing.xs }]}
                onPress={() => setShowGroupPicker(prev => !prev)}>
                <Text style={[styles.smallBtnText, isRTL && styles.directionalText, { color: colors.text }]}>{t('lectures.addGroup')}</Text>
              </TouchableOpacity>
            )}

            {showGroupPicker && linkableGroups.map(group => (
              <GlassContainer key={group.$id} borderRadius={14} style={styles.settingsGlassBlock}>
                <TouchableOpacity
                  style={[styles.optionCard, isRTL && styles.rowReverse, { borderColor: `${colors.primary}33`, backgroundColor: 'transparent' }]}
                  onPress={() => {
                    setLinkedChatId(group.$id);
                    setShowGroupPicker(false);
                    clearTimeout(autoSaveTimerRef.current);
                    autoSaveTimerRef.current = setTimeout(() => handleSaveSettings({ linkedChatId: group.$id }), 400);
                  }}>
                  <View style={styles.optionMeta}>
                    <Text style={[styles.optionText, isRTL && styles.directionalText, { color: colors.text }]} numberOfLines={1}>{group.name}</Text>
                    <Text style={[styles.optionSubText, isRTL && styles.directionalText, { color: colors.textSecondary }]} numberOfLines={1}>
                      {group.type === CHAT_TYPES.STAGE_GROUP ? t('lectures.stageGroup') : t('lectures.customGroup')}
                    </Text>
                  </View>
                </TouchableOpacity>
              </GlassContainer>
            ))}

            <Text style={[styles.modalSectionTitle, isRTL && styles.directionalText, { color: colors.text }]}>{t('lectures.managers')}</Text>
            <View style={[styles.managerInputRow, isRTL && styles.rowReverse]}>
              <TextInput
                value={managerUserId}
                onChangeText={handleManagerInputChange}
                placeholder={t('lectures.managerLookupPlaceholder')}
                placeholderTextColor={colors.textSecondary}
                style={[
                  styles.input,
                  styles.managerInput,
                  isRTL && styles.directionalInput,
                  {
                    color: colors.text,
                    borderColor: colors.border,
                    backgroundColor: colors.inputBackground,
                  },
                ]}
              />

              <TouchableOpacity
                style={[
                  styles.managerAddButton,
                  {
                    borderColor: colors.border,
                    backgroundColor: colors.inputBackground,
                    opacity: addingManager ? 0.7 : 1,
                  },
                ]}
                onPress={handleAddManager}
                disabled={addingManager}>
                {addingManager ? <ActivityIndicator size="small" color={colors.primary} /> : <IoniconSvg name="add" size={20} color={colors.primary} />}
              </TouchableOpacity>
            </View>

            {!!managerSuggestions.length && (
              <View style={styles.managerSuggestionsWrap}>
                {managerSuggestions.map((candidate) => (
                  <GlassContainer key={candidate.$id} borderRadius={14} style={styles.settingsGlassBlock}>
                    <TouchableOpacity
                      style={[styles.optionCard, isRTL && styles.rowReverse, { borderColor: `${colors.primary}33`, backgroundColor: 'transparent' }]}
                      onPress={() => actions.confirmAddManager(candidate)}>
                      <View style={[styles.managerSuggestionLeft, isRTL && styles.rowReverse]}>
                        <ProfilePicture
                          uri={candidate?.profilePicture}
                          name={candidate?.name || candidate?.fullName}
                          size={moderateScale(28)}
                        />
                        <View style={styles.optionMeta}>
                          <Text style={[styles.optionText, isRTL && styles.directionalText, { color: colors.text }]} numberOfLines={1}>
                            {candidate?.name || candidate?.fullName || t('lectures.unknownUser')}
                          </Text>
                        </View>
                      </View>
                      <IoniconSvg name={isRTL ? 'chevron-back' : 'chevron-forward'} size={16} color={colors.textSecondary} />
                    </TouchableOpacity>
                  </GlassContainer>
                ))}
              </View>
            )}

            {searchingManagerSuggestions && <Text style={[styles.infoText, isRTL && styles.directionalText, { color: colors.textSecondary }]}>{t('lectures.searchingManagers')}</Text>}
            {!!managerError && <Text style={[styles.managerErrorText, isRTL && styles.directionalText, { color: colors.danger }]}>{managerError}</Text>}
            {!!managerStatus && <Text style={[styles.managerStatusText, isRTL && styles.directionalText, { color: colors.success }]}>{managerStatus}</Text>}

            <View style={styles.nameListWrap}>
              {managers.map((managerId) => (
                <View key={managerId} style={[styles.managerIdentityRow, isRTL && styles.rowReverse]}>
                  <ProfilePicture uri={userProfiles[managerId]?.profilePicture} name={resolveName(managerId)} size={moderateScale(24)} />
                  <Text style={[styles.nameListText, isRTL && styles.directionalText, { color: colors.textSecondary }]}>{resolveName(managerId)}</Text>
                  {isOwner && String(managerId || '').trim() !== String(channel?.ownerId || '').trim() && (
                    <TouchableOpacity style={[styles.managerRemoveButton, isRTL && styles.managerRemoveButtonRtl, { borderColor: colors.border }]} onPress={() => handleRemoveManager(managerId)}>
                      <IoniconSvg name="trash-outline" size={13} color={colors.danger} />
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </View>

            {computed.isManager && channel?.channelType !== LECTURE_CHANNEL_TYPES.OFFICIAL && (
              <GlassContainer borderRadius={14} style={styles.settingsGlassBlock}>
                <TouchableOpacity
                  style={[styles.toggleRow, isRTL && styles.rowReverse, { borderColor: `${colors.primary}33`, backgroundColor: 'transparent' }]}
                  onPress={handleToggleAccess}>
                  <Text style={[styles.toggleText, isRTL && styles.toggleTextRtl, isRTL && styles.directionalText, { color: colors.text }]}>{t('lectures.approvalRequired')}</Text>
                  <IoniconSvg name={channel?.accessType === LECTURE_ACCESS_TYPES.APPROVAL_REQUIRED ? 'checkbox' : 'square-outline'} size={20} color={colors.primary} />
                </TouchableOpacity>
              </GlassContainer>
            )}

            {!!membership && (
              <GlassContainer borderRadius={14} style={styles.settingsGlassBlock}>
                <TouchableOpacity
                  style={[styles.toggleRow, isRTL && styles.rowReverse, { borderColor: `${colors.primary}33`, backgroundColor: 'transparent' }]}
                  onPress={handleToggleNotifications}>
                  <Text style={[styles.toggleText, isRTL && styles.toggleTextRtl, isRTL && styles.directionalText, { color: colors.text }]}>{membership.notificationsEnabled ? t('lectures.notificationsOn') : t('lectures.notificationsOff')}</Text>
                  {membership.notificationsEnabled ? (
                    <Ionicons name="notifications" size={20} color={colors.primary} />
                  ) : (
                    <IoniconSvg name="notifications-off-outline" size={20} color={colors.primary} />
                  )}
                </TouchableOpacity>
              </GlassContainer>
            )}

            <Text style={[styles.modalSectionTitle, isRTL && styles.directionalText, { color: colors.text }]}>{t('lectures.joinRequests')}</Text>
            {joinRequests.length > 0 ? joinRequests.map((request) => (
              <GlassContainer key={request.$id} borderRadius={14} style={styles.settingsGlassBlock}>
                <View style={[styles.requestRow, isRTL && styles.rowReverse, { borderBottomColor: `${colors.primary}33` }]}> 
                  <View style={[styles.requestUserInfo, isRTL && styles.rowReverse, isRTL && styles.requestUserInfoRtl]}>
                    <ProfilePicture
                      uri={userProfiles[request.userId]?.profilePicture}
                      name={resolveName(request.userId)}
                      size={moderateScale(32)}
                    />
                    <Text style={[styles.requestUser, isRTL && styles.directionalText, { color: colors.text }]} numberOfLines={1}>{resolveName(request.userId)}</Text>
                  </View>
                  <View style={[styles.requestBtns, isRTL && styles.rowReverse]}>
                    <TouchableOpacity style={[styles.acceptBtn, { backgroundColor: colors.success }]} onPress={() => handleApproveRequest(request.$id, 'approved')}>
                      <Text style={styles.requestBtnText}>{t('lectures.accept')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.rejectBtn, { backgroundColor: colors.danger }]} onPress={() => handleApproveRequest(request.$id, 'rejected')}>
                      <Text style={styles.requestBtnText}>{t('lectures.reject')}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </GlassContainer>
            )) : (
              <Text style={[styles.infoText, isRTL && styles.directionalText, { color: colors.textSecondary }]}>{t('lectures.noPendingRequests')}</Text>
            )}

            {savingSettings && (
              <View style={styles.savingIndicator}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={[styles.savingText, isRTL && styles.directionalText, { color: colors.textSecondary }]}>{t('lectures.savingSettings')}</Text>
              </View>
            )}

            {isOwner && (
              <TouchableOpacity
                style={[styles.deleteChannelButton, { borderColor: colors.danger, opacity: savingSettings ? 0.6 : 1 }]}
                onPress={handleDeleteChannel}
                disabled={savingSettings}>
                <IoniconSvg name="trash-outline" size={16} color={colors.danger} />
                <Text style={[styles.deleteChannelButtonText, isRTL && styles.directionalText, { color: colors.danger }]}>{t('lectures.deleteChannelAction')}</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>
        </GlassContainer>
      </View>
    </Modal>
  );
};

export default LectureSettingsModal;
