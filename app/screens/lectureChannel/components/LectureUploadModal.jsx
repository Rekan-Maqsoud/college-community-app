import React from 'react';
import { KeyboardAvoidingView, Modal, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GlassContainer, GlassIconButton } from '../../../components/GlassComponents';
import { LECTURE_UPLOAD_TYPES } from '../../../../database/lectures';
import styles from '../LectureChannelStyles';

const LectureUploadModal = ({
  canUpload,
  colors,
  externalUrl,
  handleUpload,
  newUploadDescription,
  newUploadTitle,
  newUploadType,
  onClose,
  pickFile,
  selectedFile,
  setExternalUrl,
  setNewUploadDescription,
  setNewUploadTitle,
  setNewUploadType,
  setYoutubeUrl,
  showUploadComposer,
  t,
  uploadError,
  uploading,
  youtubeUrl,
}) => {
  if (!canUpload) {
    return null;
  }

  return (
    <Modal visible={showUploadComposer} transparent animationType="slide" onRequestClose={onClose}>
      <View style={[styles.modalBackdrop, { backgroundColor: colors.overlay }]}> 
        <KeyboardAvoidingView
          style={styles.modalKeyboardWrap}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}>
          <GlassContainer borderRadius={24} style={styles.uploadComposerGlass} disableBackgroundOverlay>
          <View style={[styles.modalCard, styles.uploadComposerCard, { backgroundColor: 'transparent', borderColor: `${colors.primary}33` }]}> 
            <View style={styles.modalHeaderRow}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>{t('lectures.addUpload')}</Text>
              <GlassIconButton
                size={34}
                borderRadiusValue={17}
                activeOpacity={0.7}
                onPress={onClose}
                style={[styles.headerMenuBtn, { borderColor: `${colors.primary}44`, backgroundColor: 'transparent' }]}>
                <Ionicons name="close" size={20} color={colors.text} />
              </GlassIconButton>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.uploadComposerScrollContent}>
              <TextInput
                value={newUploadTitle}
                onChangeText={setNewUploadTitle}
                placeholder={t('lectures.uploadTitlePlaceholder')}
                placeholderTextColor={colors.textSecondary}
                style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBackground }]}
              />

              <TextInput
                value={newUploadDescription}
                onChangeText={setNewUploadDescription}
                placeholder={t('lectures.uploadDescriptionPlaceholder')}
                placeholderTextColor={colors.textSecondary}
                multiline
                style={[styles.input, styles.multiline, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBackground }]}
              />

              <View style={styles.typeRow}>
                {[LECTURE_UPLOAD_TYPES.FILE, LECTURE_UPLOAD_TYPES.YOUTUBE, LECTURE_UPLOAD_TYPES.LINK].map(type => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.typeChip,
                      {
                        borderColor: colors.border,
                        backgroundColor: newUploadType === type ? colors.primary : 'transparent',
                      },
                    ]}
                    onPress={() => setNewUploadType(type)}>
                    <Text style={[styles.typeChipText, { color: newUploadType === type ? '#FFFFFF' : colors.text }]}>
                      {type === LECTURE_UPLOAD_TYPES.FILE ? t('lectures.file') : type === LECTURE_UPLOAD_TYPES.YOUTUBE ? t('lectures.youtube') : t('lectures.link')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {newUploadType === LECTURE_UPLOAD_TYPES.FILE && (
                <View style={styles.fileRow}>
                  <TouchableOpacity style={[styles.smallBtn, { borderColor: colors.border }]} onPress={pickFile}>
                    <Text style={[styles.smallBtnText, { color: colors.text }]}>{t('lectures.pickFile')}</Text>
                  </TouchableOpacity>
                  <Text style={[styles.fileName, { color: colors.textSecondary }]} numberOfLines={1}>
                    {selectedFile?.name || t('lectures.noFileSelected')}
                  </Text>
                </View>
              )}

              {newUploadType === LECTURE_UPLOAD_TYPES.YOUTUBE && (
                <TextInput
                  value={youtubeUrl}
                  onChangeText={setYoutubeUrl}
                  placeholder={t('lectures.youtubePlaceholder')}
                  placeholderTextColor={colors.textSecondary}
                  style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBackground }]}
                />
              )}

              {newUploadType === LECTURE_UPLOAD_TYPES.LINK && (
                <TextInput
                  value={externalUrl}
                  onChangeText={setExternalUrl}
                  placeholder={t('lectures.linkPlaceholder')}
                  placeholderTextColor={colors.textSecondary}
                  style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBackground }]}
                />
              )}

              <TouchableOpacity
                style={[styles.uploadBtn, { backgroundColor: colors.primary, opacity: uploading ? 0.7 : 1 }]}
                onPress={handleUpload}
                disabled={uploading}>
                <Text style={styles.uploadBtnText}>{uploading ? t('lectures.uploading') : t('lectures.upload')}</Text>
              </TouchableOpacity>

              {!!uploadError && <Text style={[styles.uploadError, { color: colors.danger }]}>{uploadError}</Text>}
            </ScrollView>
          </View>
          </GlassContainer>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

export default LectureUploadModal;