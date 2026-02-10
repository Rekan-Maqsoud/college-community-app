import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  BackHandler,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ExpoImagePicker from 'expo-image-picker';
import { useAppSettings } from '../context/AppSettingsContext';
import { useUser } from '../context/UserContext';
import { useCustomAlert } from '../hooks/useCustomAlert';
import CustomAlert from '../components/CustomAlert';
import { uploadImage } from '../../services/imgbbService';
import { createReply, getRepliesByPost, updateReply, deleteReply, markReplyAsAccepted, unmarkReplyAsAccepted } from '../../database/replies';
import { getUserDocument } from '../../database/auth';
import { incrementPostViewCount, getPost } from '../../database/posts';
import { notifyPostReply } from '../../database/notifications';
import ImageGalleryModal from './postDetails/ImageGalleryModal';
import ReplyItem from './postDetails/ReplyItem';
import ReplyInputSection from './postDetails/ReplyInputSection';
import { postDetailsStyles as styles } from './postDetails/styles';

const PostDetails = ({ navigation, route }) => {
  const { t, theme, isDarkMode } = useAppSettings();
  const { user } = useUser();
  const { alertConfig, showAlert, hideAlert } = useCustomAlert();
  const { post: initialPost, postId: routePostId, replyId: routeReplyId, onPostUpdate } = route.params || {};

  // State to hold the post - either from params or fetched
  const [post, setPost] = useState(initialPost || null);
  const [isLoadingPost, setIsLoadingPost] = useState(!initialPost && !!routePostId);
  const [replies, setReplies] = useState([]);
  const [replyText, setReplyText] = useState('');
  const [replyImages, setReplyImages] = useState([]);
  const [replyLinks, setReplyLinks] = useState([]);
  const [linkInput, setLinkInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingReplies, setIsLoadingReplies] = useState(false);
  const [editingReply, setEditingReply] = useState(null);
  const [showLinksSection, setShowLinksSection] = useState(false);
  const [galleryVisible, setGalleryVisible] = useState(false);
  const [galleryImages, setGalleryImages] = useState([]);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [currentReplyCount, setCurrentReplyCount] = useState(post?.replyCount || 0);
  const [replySortOrder, setReplySortOrder] = useState(routeReplyId ? 'newest' : 'top');

  const scrollViewRef = useRef(null);
  const replyLayoutsRef = useRef({});

  // Handle going back and updating the parent screen with new reply count
  const handleGoBack = useCallback(() => {
    // Check if reply count changed and update the parent screens
    if (currentReplyCount !== (post?.replyCount || 0)) {
      // Get the parent route to know where we came from
      const routes = navigation.getState()?.routes;
      const currentIndex = navigation.getState()?.index;
      
      if (currentIndex > 0) {
        const parentRoute = routes[currentIndex - 1];
        
        // Navigate back with params based on where we came from
        if (parentRoute?.name === 'Profile' || parentRoute?.name === 'MainTabs') {
          // For tabs, we need to pass to both Home and Profile
          navigation.navigate('MainTabs', {
            screen: 'Home',
            params: {
              updatedPostId: post?.$id,
              updatedReplyCount: currentReplyCount,
            }
          });
        } else {
          navigation.goBack();
        }
      } else {
        navigation.goBack();
      }
    } else {
      navigation.goBack();
    }
    return true;
  }, [currentReplyCount, post, navigation]);

  // Handle Android hardware back button
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', handleGoBack);
    return () => backHandler.remove();
  }, [handleGoBack]);

  // Fetch post if only postId is provided (e.g., from notifications)
  useEffect(() => {
    const fetchPost = async () => {
      if (!initialPost && routePostId) {
        setIsLoadingPost(true);
        try {
          const fetchedPost = await getPost(routePostId);
          if (fetchedPost) {
            setPost(fetchedPost);
          } else {
            showAlert(t('common.error'), t('post.postNotFound') || 'Post not found', 'error');
            navigation.goBack();
          }
        } catch (error) {
          showAlert(t('common.error'), t('post.postNotFound') || 'Post not found', 'error');
          navigation.goBack();
        } finally {
          setIsLoadingPost(false);
        }
      }
    };
    fetchPost();
  }, [routePostId, initialPost]);

  useEffect(() => {
    if (post?.$id) {
      loadReplies();
      trackView();
    }
  }, [post?.$id]);

  const trackView = async () => {
    if (!post?.$id || !user?.$id || post.userId === user.$id) return;
    try {
      await incrementPostViewCount(post.$id, user.$id);
    } catch (error) {
      // Silent fail
    }
  };

  const loadReplies = async () => {
    if (!post?.$id) return;

    setIsLoadingReplies(true);
    try {
      const fetchedReplies = await getRepliesByPost(post.$id);
      
      const repliesWithUserData = await Promise.all(
        fetchedReplies.map(async (reply) => {
          // If this is the current user's reply, use their data directly
          if (reply.userId === user?.$id) {
            return {
              ...reply,
              currentUserId: user?.$id,
              userData: {
                fullName: user.fullName,
                profilePicture: user.profilePicture,
              }
            };
          }
          
          try {
            const userDoc = await getUserDocument(reply.userId);
            return {
              ...reply,
              currentUserId: user?.$id,
              userData: {
                fullName: userDoc?.fullName || userDoc?.name || t('common.user'),
                profilePicture: userDoc?.profilePicture || null,
              }
            };
          } catch (error) {
            return {
              ...reply,
              currentUserId: user?.$id,
              userData: { fullName: t('common.user'), profilePicture: null }
            };
          }
        })
      );
      
      setReplies(repliesWithUserData);
      // Update the reply count based on actual replies
      setCurrentReplyCount(repliesWithUserData.length);
    } catch (error) {
      setReplies([]);
    } finally {
      setIsLoadingReplies(false);
    }
  };

  // Sort replies based on selected order
  const sortedReplies = React.useMemo(() => {
    if (replySortOrder === 'newest') {
      return [...replies].sort((a, b) => {
        const dateA = new Date(a.$createdAt || 0).getTime();
        const dateB = new Date(b.$createdAt || 0).getTime();
        return dateB - dateA;
      });
    }
    // 'top' = default order from API (by upCount desc)
    return replies;
  }, [replies, replySortOrder]);

  // Scroll to a specific reply when navigated with replyId
  useEffect(() => {
    if (routeReplyId && sortedReplies.length > 0 && !isLoadingReplies) {
      // Use a retry mechanism to wait for layout measurement
      let attempts = 0;
      const maxAttempts = 10;
      const tryScroll = () => {
        const targetY = replyLayoutsRef.current[routeReplyId];
        if (targetY != null && scrollViewRef.current) {
          scrollViewRef.current.scrollTo({ y: targetY - 80, animated: true });
        } else if (attempts < maxAttempts) {
          attempts += 1;
          setTimeout(tryScroll, 200);
        }
      };
      setTimeout(tryScroll, 400);
    }
  }, [routeReplyId, sortedReplies, isLoadingReplies]);

  const handleAddReply = async () => {
    if (!replyText.trim()) {
      showAlert(t('common.error'), t('post.textRequired'), 'error');
      return;
    }

    if (!post?.$id) {
      showAlert(t('common.error'), t('post.postNotFound'), 'error');
      return;
    }

    // Include any pending link that user typed but hasn't pressed space yet
    let finalLinks = [...replyLinks];
    if (linkInput.trim() && !finalLinks.includes(linkInput.trim())) {
      finalLinks.push(linkInput.trim());
    }

    setIsSubmitting(true);

    try {
      let uploadedImageUrls = [];
      let uploadedImageDeleteUrls = [];

      if (replyImages.length > 0) {
        for (const imageUri of replyImages) {
          try {
            const uploadResult = await uploadImage(imageUri);
            uploadedImageUrls.push(uploadResult.url);
            uploadedImageDeleteUrls.push(uploadResult.deleteUrl);
          } catch (uploadError) {
            // Silent fail for individual image uploads
          }
        }
      }

      if (editingReply) {
        const updateData = {
          text: replyText.trim(),
          images: uploadedImageUrls.length > 0 ? uploadedImageUrls : (editingReply.images || []),
          imageDeleteUrls: uploadedImageDeleteUrls.length > 0 ? uploadedImageDeleteUrls : (editingReply.imageDeleteUrls || []),
          links: finalLinks.length > 0 ? finalLinks : (editingReply.links || []),
          isEdited: true,
        };

        await updateReply(editingReply.$id, updateData);
        showAlert(t('common.success'), t('post.replyUpdated'), 'success');
        setEditingReply(null);
      } else {
        const replyData = {
          postId: post.$id,
          userId: user.$id,
          text: replyText.trim(),
          isAccepted: false,
          images: uploadedImageUrls,
          imageDeleteUrls: uploadedImageDeleteUrls,
          links: finalLinks,
          likeCount: 0,
          isEdited: false,
          parentReplyId: null,
          upCount: 0,
          downCount: 0,
          upvotedBy: [],
          downvotedBy: [],
        };

        await createReply(replyData);
        showAlert(t('common.success'), t('post.replyAdded'), 'success');

        // Send notification to post owner if it's not their own reply
        if (post.userId !== user.$id) {
          try {
            await notifyPostReply(
              post.userId,
              user.$id,
              user.fullName || user.name,
              user.profilePicture,
              post.$id,
              replyText.trim()
            );
          } catch (notifyError) {
            // Silent fail for notification
          }
        }
      }

      await loadReplies();
      resetForm();
    } catch (error) {
      showAlert(t('common.error'), t('post.replyError'), 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setReplyText('');
    setReplyImages([]);
    setReplyLinks([]);
    setLinkInput('');
    setShowLinksSection(false);
    setEditingReply(null);
  };

  const handleEditReply = (reply) => {
    setEditingReply(reply);
    setReplyText(reply.text);
    setReplyImages(reply.images || []);
    setReplyLinks(reply.links || []);
    if (reply.links && reply.links.length > 0) {
      setShowLinksSection(true);
    }
  };

  const handleDeleteReply = async (reply) => {
    showAlert({
      type: 'warning',
      title: t('post.deleteReply'),
      message: t('post.deleteReplyConfirm'),
      buttons: [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteReply(reply.$id, post.$id, reply.imageDeleteUrls);
              await loadReplies();
              showAlert({ type: 'success', title: t('common.success'), message: t('post.replyDeleted') });
            } catch (error) {
              showAlert({ type: 'error', title: t('common.error'), message: t('post.deleteReplyError') });
            }
          },
        },
      ],
    });
  };

  const handleAcceptReply = async (reply) => {
    try {
      if (reply.isAccepted) {
        await unmarkReplyAsAccepted(reply.$id);
      } else {
        await markReplyAsAccepted(reply.$id);
      }
      await loadReplies();
    } catch (error) {
      showAlert(t('common.error'), t('post.updateReplyError'), 'error');
    }
  };

  const handleUpvote = async (reply) => {
    if (!user?.$id) {
      showAlert(t('common.error'), t('auth.loginRequired') || 'Please log in', 'error');
      return;
    }
    
    try {
      const upvotedBy = reply.upvotedBy || [];
      const downvotedBy = reply.downvotedBy || [];
      
      if (upvotedBy.includes(user.$id)) {
        showAlert(t('common.info') || 'Info', t('post.alreadyUpvoted'), 'info');
        return;
      }
      
      const wasDownvoted = downvotedBy.includes(user.$id);
      const newUpvotedBy = [...upvotedBy, user.$id];
      const newDownvotedBy = wasDownvoted ? downvotedBy.filter(id => id !== user.$id) : downvotedBy;
      
      await updateReply(reply.$id, { 
        upCount: newUpvotedBy.length,
        downCount: newDownvotedBy.length,
        upvotedBy: newUpvotedBy,
        downvotedBy: newDownvotedBy,
      }, post.$id);
      
      if (newUpvotedBy.length >= 5 && !reply.isAccepted) {
        await markReplyAsAccepted(reply.$id);
      }
      
      await loadReplies();
    } catch (error) {
      showAlert(t('common.error'), t('post.upvoteError'), 'error');
    }
  };

  const handleDownvote = async (reply) => {
    if (!user?.$id) {
      showAlert(t('common.error'), t('auth.loginRequired') || 'Please log in', 'error');
      return;
    }
    
    try {
      const upvotedBy = reply.upvotedBy || [];
      const downvotedBy = reply.downvotedBy || [];
      
      if (downvotedBy.includes(user.$id)) {
        showAlert(t('common.error'), t('post.alreadyDownvoted'), 'error');
        return;
      }
      
      const wasUpvoted = upvotedBy.includes(user.$id);
      const newDownvotedBy = [...downvotedBy, user.$id];
      const newUpvotedBy = wasUpvoted ? upvotedBy.filter(id => id !== user.$id) : upvotedBy;
      
      await updateReply(reply.$id, { 
        upCount: newUpvotedBy.length,
        downCount: newDownvotedBy.length,
        upvotedBy: newUpvotedBy,
        downvotedBy: newDownvotedBy,
      }, post.$id);
      
      await loadReplies();
    } catch (error) {
      showAlert(t('common.error'), t('post.downvoteError'), 'error');
    }
  };

  const handlePickImages = async () => {
    if (replyImages.length >= 3) {
      showAlert(t('common.error'), t('post.maxImagesReached').replace('{max}', '3'), 'error');
      return;
    }

    showAlert({
      type: 'info',
      title: t('post.addImage'),
      message: t('post.selectImageSource'),
      buttons: [
        { text: t('post.camera'), onPress: handleTakePhoto },
        { text: t('post.gallery'), onPress: handleGalleryPick },
        { text: t('common.cancel'), style: 'cancel' },
      ],
    });
  };

  const handleGalleryPick = async () => {
    try {
      const permission = await ExpoImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        showAlert(t('common.error'), t('settings.galleryPermissionRequired') || 'Gallery permission is required', 'error');
        return;
      }

      const result = await ExpoImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        quality: 0.7,
        selectionLimit: 3 - replyImages.length,
      });

      if (!result.canceled && result.assets) {
        const newImages = result.assets.slice(0, 3 - replyImages.length).map(asset => asset.uri);
        setReplyImages([...replyImages, ...newImages]);
      }
    } catch (error) {
      showAlert(t('common.error'), t('post.imagePickError'), 'error');
    }
  };

  const handleTakePhoto = async () => {
    try {
      const permission = await ExpoImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        showAlert(t('common.error'), t('settings.cameraPermissionRequired'), 'error');
        return;
      }

      const result = await ExpoImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.7,
      });

      if (!result.canceled && result.assets) {
        setReplyImages([...replyImages, result.assets[0].uri]);
      }
    } catch (error) {
      showAlert(t('common.error'), t('post.cameraError'), 'error');
    }
  };

  const handleRemoveImage = (index) => {
    setReplyImages(replyImages.filter((_, i) => i !== index));
  };

  const handleAddLink = () => {
    const trimmedLink = linkInput.trim();
    if (trimmedLink && !replyLinks.includes(trimmedLink)) {
      setReplyLinks([...replyLinks, trimmedLink]);
      setLinkInput('');
    }
  };

  const handleRemoveLink = (index) => {
    setReplyLinks(replyLinks.filter((_, i) => i !== index));
  };

  const handleLinkInputChange = (text) => {
    if (text.includes(' ') || text.includes('\n')) {
      const parts = text.split(/[\s\n]+/).filter(Boolean);
      const newLinks = parts.filter(part => part.trim() && !replyLinks.includes(part.trim()));
      if (newLinks.length > 0) {
        setReplyLinks([...replyLinks, ...newLinks]);
      }
      setLinkInput('');
      return;
    }
    setLinkInput(text);
  };

  const openImageGallery = (images, index) => {
    setGalleryImages(images);
    setGalleryIndex(index);
    setGalleryVisible(true);
  };

  const isPostOwner = user?.$id === post?.userId;

  // Show loading state while fetching post
  if (isLoadingPost) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
        <View style={[styles.header, { backgroundColor: theme.background, borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>{t('post.replies')}</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>{t('common.loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Show error state if no post
  if (!post) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
        <View style={[styles.header, { backgroundColor: theme.background, borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>{t('post.replies')}</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.emptyContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={theme.textSecondary} />
          <Text style={[styles.emptyTitle, { color: theme.textSecondary }]}>{t('post.postNotFound') || 'Post not found'}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      
      <View style={[styles.header, { backgroundColor: theme.background, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>{t('post.replies')}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView 
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView 
          ref={scrollViewRef}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.repliesSection, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.03)' : '#F9FAFB' }]}>
            <View style={styles.repliesSectionHeader}>
              <Ionicons name="chatbubbles-outline" size={22} color={theme.text} />
              <Text style={[styles.repliesSectionTitle, { color: theme.text }]}>
                {t('post.repliesCount').replace('{count}', replies.length.toString())}
              </Text>
              {replies.length > 1 && (
                <TouchableOpacity
                  onPress={() => setReplySortOrder(prev => prev === 'top' ? 'newest' : 'top')}
                  style={{ marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 4 }}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={replySortOrder === 'newest' ? 'time-outline' : 'arrow-up-outline'}
                    size={16}
                    color={theme.primary}
                  />
                  <Text style={{ color: theme.primary, fontSize: 13 }}>
                    {replySortOrder === 'newest' ? (t('post.sortNewest') || 'Newest') : (t('post.sortTop') || 'Top')}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {isLoadingReplies ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.primary} />
                <Text style={[styles.loadingText, { color: theme.textSecondary }]}>{t('common.loading')}</Text>
              </View>
            ) : replies.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="chatbubble-outline" size={48} color={theme.textSecondary} />
                <Text style={[styles.emptyTitle, { color: theme.textSecondary }]}>{t('post.noReplies')}</Text>
                <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>{t('post.beFirstToReply')}</Text>
              </View>
            ) : (
              <View style={styles.repliesList}>
                {sortedReplies.map((reply) => (
                  <View
                    key={reply.$id}
                    onLayout={(e) => {
                      replyLayoutsRef.current[reply.$id] = e.nativeEvent.layout.y;
                    }}
                    style={routeReplyId === reply.$id ? {
                      backgroundColor: isDarkMode ? 'rgba(100,130,255,0.08)' : 'rgba(100,130,255,0.06)',
                      borderRadius: 8,
                    } : undefined}
                  >
                    <ReplyItem
                      reply={reply}
                      isOwner={reply.userId === user?.$id}
                      isPostOwner={isPostOwner}
                      showAcceptButton={post?.postType === 'question'}
                      onEdit={handleEditReply}
                      onDelete={handleDeleteReply}
                      onAccept={handleAcceptReply}
                      onUpvote={handleUpvote}
                      onDownvote={handleDownvote}
                      onImagePress={openImageGallery}
                      t={t}
                      theme={theme}
                      isDarkMode={isDarkMode}
                    />
                  </View>
                ))}
              </View>
            )}
          </View>
        </ScrollView>

        <ReplyInputSection
          editingReply={editingReply}
          replyText={replyText}
          setReplyText={setReplyText}
          replyImages={replyImages}
          replyLinks={replyLinks}
          linkInput={linkInput}
          showLinksSection={showLinksSection}
          isSubmitting={isSubmitting}
          theme={theme}
          isDarkMode={isDarkMode}
          t={t}
          onResetForm={resetForm}
          onRemoveImage={handleRemoveImage}
          onRemoveLink={handleRemoveLink}
          onLinkInputChange={handleLinkInputChange}
          onAddLink={handleAddLink}
          onPickImages={handlePickImages}
          onToggleLinksSection={() => setShowLinksSection(!showLinksSection)}
          onSubmit={handleAddReply}
          currentUserId={user?.$id}
        />
      </KeyboardAvoidingView>

      <ImageGalleryModal
        visible={galleryVisible}
        images={galleryImages}
        initialIndex={galleryIndex}
        onClose={() => setGalleryVisible(false)}
        t={t}
      />

      <CustomAlert
        visible={alertConfig.visible}
        type={alertConfig.type}
        title={alertConfig.title}
        message={alertConfig.message}
        buttons={alertConfig.buttons}
        onDismiss={hideAlert}
      />
    </SafeAreaView>
  );
};

export default PostDetails;
