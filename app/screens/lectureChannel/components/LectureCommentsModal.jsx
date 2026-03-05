import React from 'react';
import { FlatList, Modal, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
  return (
    <Modal visible={!!commentsModalAsset} animationType="slide" onRequestClose={closeComments}>
      <View style={[styles.commentsModalWrap, { backgroundColor: colors.background }]}> 
        <View style={[styles.commentsHeader, { borderBottomColor: colors.border }]}> 
          <Text style={[styles.commentsTitle, { color: colors.text }]} numberOfLines={1}>
            {commentsModalAsset?.title || t('lectures.discussion')}
          </Text>
          <TouchableOpacity onPress={closeComments}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        <FlatList
          data={assetComments}
          keyExtractor={(item) => item.$id}
          contentContainerStyle={styles.commentsList}
          renderItem={({ item }) => (
            <View style={[styles.commentCard, { borderColor: colors.border, backgroundColor: colors.card }]}> 
              <View style={styles.commentTopRow}>
                <Text style={[styles.commentUser, { color: colors.text }]}>{resolveName(item.userId)}</Text>
                {(isManager || item.userId === user?.$id) && (
                  <TouchableOpacity onPress={() => removeComment(item.$id)}>
                    <Ionicons name="trash-outline" size={16} color={colors.danger} />
                  </TouchableOpacity>
                )}
              </View>
              <Text style={[styles.commentText, { color: colors.textSecondary }]}>{item.text}</Text>
            </View>
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
    </Modal>
  );
};

export default LectureCommentsModal;
