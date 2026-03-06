import React from 'react';
import { ActivityIndicator, Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ProfilePicture from '../../../components/ProfilePicture';
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
    <View style={[styles.statCard, { borderColor: colors.border, backgroundColor: colors.card }]}> 
      <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );

  return (
    <Modal visible={settingsOpen} transparent animationType="slide" onRequestClose={() => setSettingsOpen(false)}>
      <View style={[styles.modalBackdrop, { backgroundColor: colors.overlay }]}> 
        <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}> 
          <View style={styles.modalHeaderRow}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{t('lectures.settingsMenuTitle')}</Text>
            <TouchableOpacity onPress={() => setSettingsOpen(false)}>
              <Ionicons name="close" size={20} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <TouchableOpacity
              style={[styles.toggleRow, { borderColor: colors.border, backgroundColor: colors.inputBackground }]}
              onPress={() => setShowSettingsStats(prev => !prev)}>
              <Text style={[styles.toggleText, { color: colors.text }]}>{t('lectures.statsTitle')}</Text>
              <Ionicons name={showSettingsStats ? 'chevron-up' : 'chevron-down'} size={20} color={colors.primary} />
            </TouchableOpacity>

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

            <TouchableOpacity
              style={[styles.toggleRow, { borderColor: colors.border, backgroundColor: colors.inputBackground }]}
              onPress={() => {
                const nextVal = !settingsDraft.allowUploadsFromMembers;
                setSettingsDraft(prev => ({ ...prev, allowUploadsFromMembers: nextVal }));
                clearTimeout(autoSaveTimerRef.current);
                autoSaveTimerRef.current = setTimeout(() => handleSaveSettings({ allowUploadsFromMembers: nextVal }), 600);
              }}>
              <Text style={[styles.toggleText, { color: colors.text }]}>{t('lectures.allowMemberUploads')}</Text>
              <Ionicons name={settingsDraft.allowUploadsFromMembers ? 'checkbox' : 'square-outline'} size={20} color={colors.primary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.toggleRow, { borderColor: colors.border, backgroundColor: colors.inputBackground }]}
              onPress={() => {
                const nextVal = !settingsDraft.suggestToDepartment;
                setSettingsDraft(prev => ({ ...prev, suggestToDepartment: nextVal }));
                clearTimeout(autoSaveTimerRef.current);
                autoSaveTimerRef.current = setTimeout(() => handleSaveSettings({ suggestToDepartment: nextVal }), 600);
              }}>
              <Text style={[styles.toggleText, { color: colors.text }]}>{t('lectures.suggestToDepartment')}</Text>
              <Ionicons name={settingsDraft.suggestToDepartment ? 'checkbox' : 'square-outline'} size={20} color={colors.primary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.toggleRow, { borderColor: colors.border, backgroundColor: colors.inputBackground }]}
              onPress={() => {
                const nextVal = !settingsDraft.suggestToStage;
                setSettingsDraft(prev => ({ ...prev, suggestToStage: nextVal }));
                clearTimeout(autoSaveTimerRef.current);
                autoSaveTimerRef.current = setTimeout(() => handleSaveSettings({ suggestToStage: nextVal }), 600);
              }}>
              <Text style={[styles.toggleText, { color: colors.text }]}>{t('lectures.suggestToStage')}</Text>
              <Ionicons name={settingsDraft.suggestToStage ? 'checkbox' : 'square-outline'} size={20} color={colors.primary} />
            </TouchableOpacity>

            {settingsDraft.suggestToStage && (
              <>
                <TextInput
                  value={settingsDraft.suggestedStage}
                  onChangeText={(value) => setSettingsDraft(prev => ({ ...prev, suggestedStage: value }))}
                  placeholder={t('lectures.suggestedStagePlaceholder')}
                  placeholderTextColor={colors.textSecondary}
                  style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBackground }]}
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
                        <Text style={[styles.stageSuggestionChipText, { color: selected ? colors.primary : colors.textSecondary }]}> 
                          {String(stageValue)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
            )}

            {(linkableGroups.length > 0 || !!connectedGroup) && (
              <Text style={[styles.modalSectionTitle, { color: colors.text }]}>{t('lectures.linkedGroup')}</Text>
            )}

            {connectedGroup ? (
              <View style={[styles.optionCard, { borderColor: colors.primary, backgroundColor: colors.inputBackground }]}> 
                <View style={styles.optionMeta}>
                  <Text style={[styles.optionText, { color: colors.text }]} numberOfLines={1}>{connectedGroup.name}</Text>
                  <Text style={[styles.optionSubText, { color: colors.textSecondary }]} numberOfLines={1}>
                    {connectedGroup.type === CHAT_TYPES.STAGE_GROUP ? t('lectures.stageGroup') : t('lectures.customGroup')}
                  </Text>
                </View>
                {linkableGroups.length > 0 && (
                  <TouchableOpacity style={[styles.unlinkBtn, { borderColor: colors.border }]} onPress={() => {
                    setLinkedChatId('');
                    clearTimeout(autoSaveTimerRef.current);
                    autoSaveTimerRef.current = setTimeout(() => handleSaveSettings({ linkedChatId: '' }), 400);
                  }}>
                    <Text style={[styles.unlinkBtnText, { color: colors.text }]}>{t('lectures.disconnectGroup')}</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : linkableGroups.length > 0 ? (
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>{t('lectures.noConnectedGroups')}</Text>
            ) : null}

            {linkableGroups.length > 0 && (
              <TouchableOpacity
                style={[styles.smallBtn, { borderColor: colors.border, alignSelf: 'flex-start', marginTop: spacing.xs }]}
                onPress={() => setShowGroupPicker(prev => !prev)}>
                <Text style={[styles.smallBtnText, { color: colors.text }]}>{t('lectures.addGroup')}</Text>
              </TouchableOpacity>
            )}

            {showGroupPicker && linkableGroups.map(group => (
              <TouchableOpacity
                key={group.$id}
                style={[styles.optionCard, { borderColor: colors.border, backgroundColor: colors.inputBackground }]}
                onPress={() => {
                  setLinkedChatId(group.$id);
                  setShowGroupPicker(false);
                  clearTimeout(autoSaveTimerRef.current);
                  autoSaveTimerRef.current = setTimeout(() => handleSaveSettings({ linkedChatId: group.$id }), 400);
                }}>
                <View style={styles.optionMeta}>
                  <Text style={[styles.optionText, { color: colors.text }]} numberOfLines={1}>{group.name}</Text>
                  <Text style={[styles.optionSubText, { color: colors.textSecondary }]} numberOfLines={1}>
                    {group.type === CHAT_TYPES.STAGE_GROUP ? t('lectures.stageGroup') : t('lectures.customGroup')}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}

            <Text style={[styles.modalSectionTitle, { color: colors.text }]}>{t('lectures.managers')}</Text>
            <View style={styles.managerInputRow}>
              <TextInput
                value={managerUserId}
                onChangeText={handleManagerInputChange}
                placeholder={t('lectures.managerLookupPlaceholder')}
                placeholderTextColor={colors.textSecondary}
                style={[
                  styles.input,
                  styles.managerInput,
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
                {addingManager ? <ActivityIndicator size="small" color={colors.primary} /> : <Ionicons name="add" size={20} color={colors.primary} />}
              </TouchableOpacity>
            </View>

            {!!managerSuggestions.length && (
              <View style={styles.managerSuggestionsWrap}>
                {managerSuggestions.map((candidate) => (
                  <TouchableOpacity
                    key={candidate.$id}
                    style={[styles.optionCard, { borderColor: colors.border, backgroundColor: colors.inputBackground }]}
                    onPress={() => actions.confirmAddManager(candidate)}>
                    <View style={styles.managerSuggestionLeft}>
                      <ProfilePicture
                        uri={candidate?.profilePicture}
                        name={candidate?.name || candidate?.fullName}
                        size={moderateScale(28)}
                      />
                      <View style={styles.optionMeta}>
                        <Text style={[styles.optionText, { color: colors.text }]} numberOfLines={1}>
                          {candidate?.name || candidate?.fullName || t('lectures.unknownUser')}
                        </Text>
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {searchingManagerSuggestions && <Text style={[styles.infoText, { color: colors.textSecondary }]}>{t('lectures.searchingManagers')}</Text>}
            {!!managerError && <Text style={[styles.managerErrorText, { color: colors.danger }]}>{managerError}</Text>}
            {!!managerStatus && <Text style={[styles.managerStatusText, { color: colors.success }]}>{managerStatus}</Text>}

            <View style={styles.nameListWrap}>
              {managers.map((managerId) => (
                <View key={managerId} style={styles.managerIdentityRow}>
                  <ProfilePicture uri={userProfiles[managerId]?.profilePicture} name={resolveName(managerId)} size={moderateScale(24)} />
                  <Text style={[styles.nameListText, { color: colors.textSecondary }]}>{resolveName(managerId)}</Text>
                  {isOwner && String(managerId || '').trim() !== String(channel?.ownerId || '').trim() && (
                    <TouchableOpacity style={[styles.managerRemoveButton, { borderColor: colors.border }]} onPress={() => handleRemoveManager(managerId)}>
                      <Ionicons name="trash-outline" size={13} color={colors.danger} />
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </View>

            {computed.isManager && channel?.channelType !== LECTURE_CHANNEL_TYPES.OFFICIAL && (
              <TouchableOpacity
                style={[styles.toggleRow, { borderColor: colors.border, backgroundColor: colors.inputBackground }]}
                onPress={handleToggleAccess}>
                <Text style={[styles.toggleText, { color: colors.text }]}>{t('lectures.approvalRequired')}</Text>
                <Ionicons name={channel?.accessType === LECTURE_ACCESS_TYPES.APPROVAL_REQUIRED ? 'checkbox' : 'square-outline'} size={20} color={colors.primary} />
              </TouchableOpacity>
            )}

            {!!membership && (
              <TouchableOpacity
                style={[styles.toggleRow, { borderColor: colors.border, backgroundColor: colors.inputBackground }]}
                onPress={handleToggleNotifications}>
                <Text style={[styles.toggleText, { color: colors.text }]}>{membership.notificationsEnabled ? t('lectures.notificationsOn') : t('lectures.notificationsOff')}</Text>
                <Ionicons name={membership.notificationsEnabled ? 'notifications' : 'notifications-off-outline'} size={20} color={colors.primary} />
              </TouchableOpacity>
            )}

            <Text style={[styles.modalSectionTitle, { color: colors.text }]}>{t('lectures.joinRequests')}</Text>
            {joinRequests.length > 0 ? joinRequests.map((request) => (
              <View key={request.$id} style={[styles.requestRow, { borderBottomColor: colors.border }]}> 
                <View style={styles.requestUserInfo}>
                  <ProfilePicture
                    uri={userProfiles[request.userId]?.profilePicture}
                    name={resolveName(request.userId)}
                    size={moderateScale(32)}
                  />
                  <Text style={[styles.requestUser, { color: colors.text }]} numberOfLines={1}>{resolveName(request.userId)}</Text>
                </View>
                <View style={styles.requestBtns}>
                  <TouchableOpacity style={[styles.acceptBtn, { backgroundColor: colors.success }]} onPress={() => handleApproveRequest(request.$id, 'approved')}>
                    <Text style={styles.requestBtnText}>{t('lectures.accept')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.rejectBtn, { backgroundColor: colors.danger }]} onPress={() => handleApproveRequest(request.$id, 'rejected')}>
                    <Text style={styles.requestBtnText}>{t('lectures.reject')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )) : (
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>{t('lectures.noPendingRequests')}</Text>
            )}

            {savingSettings && (
              <View style={styles.savingIndicator}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={[styles.savingText, { color: colors.textSecondary }]}>{t('lectures.savingSettings')}</Text>
              </View>
            )}

            {isOwner && (
              <TouchableOpacity
                style={[styles.deleteChannelButton, { borderColor: colors.danger, opacity: savingSettings ? 0.6 : 1 }]}
                onPress={handleDeleteChannel}
                disabled={savingSettings}>
                <Ionicons name="trash-outline" size={16} color={colors.danger} />
                <Text style={[styles.deleteChannelButtonText, { color: colors.danger }]}>{t('lectures.deleteChannelAction')}</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

export default LectureSettingsModal;
