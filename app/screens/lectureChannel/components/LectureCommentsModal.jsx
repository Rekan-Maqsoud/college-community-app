import React from 'react';
import { Modal, Text, TextInput, TouchableOpacity, View, KeyboardAvoidingView, Platform, useWindowDimensions } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import { GlassContainer } from '../../../components/GlassComponents';
import styles from '../LectureChannelStyles';

const LectureCommentsModal = ({
  assetComments,
  closeComments,
  colors,
  commentsModalAsset,
  isManager,
  newComment,
  postingComment,
  removeComment,
  resolveName,
  setNewComment,
  submitComment,
  t,
  user,
}) => {
  const { height } = useWindowDimensions();
  const maxModalHeight = Math.max(360, Math.round(height * 0.86));
  const minModalHeight = Math.max(300, Math.round(height * 0.48));

  return (
    <Modal visible={!!commentsModalAsset} transparent animationType="slide" onRequestClose={closeComments}>
      <View style={[styles.modalBackdrop, { backgroundColor: colors.overlay }]}> 
        <BlurView intensity={32} tint="dark" style={styles.modalBackdropBlur} />
        <View pointerEvents="none" style={styles.modalBackdropScrim} />
        <KeyboardAvoidingView
          style={[
            styles.commentsModalWrap,
            { maxHeight: maxModalHeight, minHeight: minModalHeight },
          ]}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <GlassContainer borderRadius={24} style={styles.commentsModalGlass} disableBackgroundOverlay>
            <View style={[styles.commentsModalSurface, { borderColor: `${colors.primary}33`, backgroundColor: 'transparent' }]}> 
              <View style={[styles.commentsHeader, { borderBottomColor: colors.border }]}> 
                <Text style={[styles.commentsTitle, { color: colors.text }]} numberOfLines={1}>
                  {commentsModalAsset?.title || t('lectures.discussion')}
                </Text>
                <TouchableOpacity onPress={closeComments}>
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>

              <FlashList
                style={styles.commentsListView}
                data={assetComments}
                keyExtractor={(item) => item.$id}
                contentContainerStyle={styles.commentsList}
                keyboardShouldPersistTaps="handled"
                estimatedItemSize={88}
                renderItem={({ item }) => (
                  (() => {
                    const actorIdentityIds = [user?.accountId, user?.userId, user?.$id]
                      .map(value => String(value || '').trim())
                      .filter(Boolean);
                    const isOwnComment = actorIdentityIds.includes(String(item.userId || '').trim());

                    return (
                  <View style={[styles.commentCard, { borderColor: colors.border, backgroundColor: colors.card }]}> 
                    <View style={styles.commentTopRow}>
                      <Text style={[styles.commentUser, { color: colors.text }]}>{resolveName(item.userId)}</Text>
                      {(isManager || isOwnComment) && (
                        <TouchableOpacity onPress={() => removeComment(item.$id)}>
                          <Ionicons name="trash-outline" size={16} color={colors.danger} />
                        </TouchableOpacity>
                      )}
                    </View>
                    <Text style={[styles.commentText, { color: colors.textSecondary }]}>{item.text}</Text>
                  </View>
                    );
                  })()
                )}
                ListEmptyComponent={
                  <View style={styles.emptyWrap}>
                    <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{t('lectures.noComments')}</Text>
                  </View>
                }
              />

              <View style={[styles.commentComposer, { borderTopColor: colors.border }]}> 
                <TextInput
                  value={newComment}
                  onChangeText={setNewComment}
                  placeholder={t('lectures.commentPlaceholder')}
                  placeholderTextColor={colors.textSecondary}
                  style={[styles.commentInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBackground }]}
                />
                <TouchableOpacity style={[styles.sendCommentBtn, { backgroundColor: colors.primary }]} onPress={submitComment}>
                  <Text style={styles.sendCommentText}>{postingComment ? t('lectures.posting') : t('lectures.post')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </GlassContainer>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

export default LectureCommentsModal;
