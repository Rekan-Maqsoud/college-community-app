import React, { useState, useEffect, useMemo, useRef, memo } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  Share,
  Linking,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { isPostBookmarked, togglePostBookmark } from '../utils/bookmarkService';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAppSettings } from '../context/AppSettingsContext';
import { useUser } from '../context/UserContext';
import { createRepost, requestPostReview, voteOnPostPoll } from '../../database/posts';
import { moderateScale, fontSize, getResponsiveSize } from '../utils/responsive';
import { POST_COLORS, POST_ICONS } from '../constants/postConstants';
import {
  parsePollPayload,
  applyPollVote,
  getPollVoteCounts,
  getUserPollSelection,
  isUserPollAnswerCorrect,
} from '../utils/pollUtils';
import PostCardImageGallery from './postCard/PostCardImageGallery';
import PostCardMenu from './postCard/PostCardMenu';
import ImageWithPlaceholder from './ImageWithPlaceholder';
import SharePostToChat from './SharePostToChat';
import CustomAlert from './CustomAlert';
import PostLikesModal from './PostLikesModal';
import useCustomAlert from '../hooks/useCustomAlert';
import { 
  postCardStyles as styles, 
  STAGE_COLORS, 
  sanitizeTag, 
  formatTimeAgo, 
  getDefaultAvatar 
} from './postCard/styles';



const PostCard = ({ 
  post, 
  onUserPress,
  onLike,
  onReply,
  onEdit,
  onDelete,
  onReport,
  onRepost,
  onMarkResolved,
  onTagPress,
  showImages = true,
  isLiked = false,
  isOwner = false,
  compact = false,
}) => {
  const navigation = useNavigation();
  const { t, theme, isDarkMode } = useAppSettings();
  const { user } = useUser();
  const { alertConfig, showAlert, hideAlert } = useCustomAlert();
  const [showMenu, setShowMenu] = useState(false);
  const [imageGalleryVisible, setImageGalleryVisible] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [liked, setLiked] = useState(isLiked);
  const [likeCount, setLikeCount] = useState(post.likeCount || 0);
  const [isLiking, setIsLiking] = useState(false);
  const [resolved, setResolved] = useState(post.isResolved || false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [showShareToChat, setShowShareToChat] = useState(false);
  const [showLikesModal, setShowLikesModal] = useState(false);
  const [pollData, setPollData] = useState(parsePollPayload(post.pollData));
  const [pollSubmitting, setPollSubmitting] = useState(false);
  const likeLongPressRef = useRef(false);


  const postColor = POST_COLORS[post.postType] || '#6B7280';
  const postIcon = POST_ICONS[post.postType] || 'document-outline';
  const normalizeStageKey = (stageValue) => {
    const normalized = String(stageValue || '').trim();
    const stageAliases = {
      '1': 'stage_1',
      '2': 'stage_2',
      '3': 'stage_3',
      '4': 'stage_4',
      '5': 'stage_5',
      '6': 'stage_6',
      firstYear: 'stage_1',
      secondYear: 'stage_2',
      thirdYear: 'stage_3',
      fourthYear: 'stage_4',
      fifthYear: 'stage_5',
      sixthYear: 'stage_6',
      'First Year': 'stage_1',
      'Second Year': 'stage_2',
      'Third Year': 'stage_3',
      'Fourth Year': 'stage_4',
      'Fifth Year': 'stage_5',
      'Sixth Year': 'stage_6',
    };

    return stageAliases[normalized] || normalized || 'all';
  };

  const stageKey = normalizeStageKey(post.stage);
  const stageColor = STAGE_COLORS[stageKey] || '#6B7280';

  // Responsive footer icon sizes for small devices
  const footerIconSize = getResponsiveSize(14, 16, 18);
  const footerSmallIconSize = getResponsiveSize(12, 14, 16);
  const footerStatsIconSize = getResponsiveSize(11, 12, 13);

  const isCurrentUserPost = user && post.userId === user.$id;
  const canCurrentUserRepost = isCurrentUserPost || post.canOthersRepost !== false;
  const postOwnerName = isCurrentUserPost 
    ? user.fullName 
    : (post.userName || post.authorName || t('common.user'));
  const postOwnerAvatar = isCurrentUserPost 
    ? user.profilePicture 
    : (post.userProfilePicture || post.authorPhoto);

  useEffect(() => {
    setLiked(isLiked);
    setLikeCount(post.likeCount || 0);
  }, [isLiked, post.likeCount]);

  useEffect(() => {
    setResolved(post.isResolved || false);
  }, [post.isResolved]);

  useEffect(() => {
    setPollData(parsePollPayload(post.pollData));
  }, [post.pollData]);

  // Check if post is bookmarked on mount
  useEffect(() => {
    isPostBookmarked(post.$id).then(setIsBookmarked).catch(() => {});
  }, [post.$id]);

  const handleBookmark = async () => {
    try {
      const newState = await togglePostBookmark(post.$id, user?.$id);
      setIsBookmarked(newState);
    } catch (error) {
      // Ignore bookmark errors
    }
  };

  const handleLikePress = async () => {
    if (likeLongPressRef.current) {
      likeLongPressRef.current = false;
      return;
    }

    if (isLiking) return;
    
    setIsLiking(true);
    const previousLiked = liked;
    const previousCount = likeCount;
    
    setLiked(!liked);
    setLikeCount(liked ? likeCount - 1 : likeCount + 1);
    
    try {
      if (onLike) {
        await onLike();
      }
    } catch (error) {
      setLiked(previousLiked);
      setLikeCount(previousCount);
    } finally {
      setIsLiking(false);
    }
  };

  const handleLikeLongPress = () => {
    likeLongPressRef.current = true;
    setShowLikesModal(true);
  };

  const likedByIds = useMemo(() => {
    const baseIds = Array.isArray(post.likedBy) ? post.likedBy : [];
    const currentUserId = user?.$id;

    if (!currentUserId) return baseIds;

    if (liked && !baseIds.includes(currentUserId)) {
      return [...baseIds, currentUserId];
    }

    if (!liked && baseIds.includes(currentUserId)) {
      return baseIds.filter((id) => id !== currentUserId);
    }

    return baseIds;
  }, [post.likedBy, liked, user?.$id]);

  const handleShare = async () => {
    try {
      await Share.share({
        message: `${post.topic}\n\n${post.text || ''}`,
        title: post.topic,
      });
    } catch (error) {
      // Share cancelled
    }
  };

  const handleCopy = async () => {
    try {
      const textToCopy = `${post.topic}${post.text ? '\n\n' + post.text : ''}`;
      await Clipboard.setStringAsync(textToCopy);
    } catch (error) {
      // Copy failed
    }
  };

  const handleRepost = async () => {
    if (!user?.$id) return;

    if (onRepost) {
      onRepost();
      return;
    }

    try {
      const result = await createRepost(post.$id, user.$id, {
        userName: user.fullName || user.name,
        profilePicture: user.profilePicture || null,
        department: user.department || post.department,
        stage: user.stage || post.stage,
        postType: post.postType,
        canOthersRepost: true,
      });

      if (result?.alreadyReposted) {
        showAlert(t('common.info'), t('post.alreadyReposted') || 'You already reposted this post', 'info');
        return;
      }

      showAlert(t('common.success'), t('post.repostSuccess') || 'Post reposted successfully', 'success');
    } catch (error) {
      const message = error?.message === 'Repost is not allowed for this post'
        ? (t('post.repostNotAllowed') || 'Reposting is not allowed for this post')
        : (t('post.repostError') || 'Failed to repost');
      showAlert(t('common.error'), message, 'error');
    }
  };

  const handleVisitOriginal = () => {
    if (!post?.originalPostId) return;

    navigation.navigate('PostDetails', {
      postId: post.originalPostId,
    });
  };

  const handleRequestReview = async () => {
    if (!user?.$id || !post?.$id) return;

    try {
      await requestPostReview(post.$id, user.$id);
      showAlert(t('common.success'), t('post.reviewRequestSent'), 'success');
    } catch (error) {
      const message = error?.message === 'Review request already sent recently'
        ? t('post.reviewRequestCooldown')
        : t('post.reviewRequestError');
      showAlert(t('common.error'), message, 'error');
    }
  };

  const handleVotePollOption = async (optionId) => {
    if (!user?.$id || !post?.$id || !pollData || pollSubmitting) {
      return;
    }

    const previousPollData = pollData;
    const currentSelections = getUserPollSelection(pollData, user.$id);
    let nextSelections = [];

    if (pollData.allowMultiple) {
      const isSelected = currentSelections.includes(optionId);
      nextSelections = isSelected
        ? currentSelections.filter((selectionId) => selectionId !== optionId)
        : [...currentSelections, optionId];

      if (nextSelections.length > pollData.maxSelections) {
        return;
      }

      if (nextSelections.length === 0) {
        nextSelections = [optionId];
      }
    } else {
      nextSelections = [optionId];
    }

    try {
      const optimisticPoll = applyPollVote(pollData, user.$id, nextSelections);
      setPollData(optimisticPoll);
      setPollSubmitting(true);

      const updatedPost = await voteOnPostPoll(post.$id, user.$id, nextSelections);
      setPollData(parsePollPayload(updatedPost.pollData));
    } catch (error) {
      setPollData(previousPollData);
      showAlert(t('common.error'), t('post.poll.voteError'), 'error');
    } finally {
      setPollSubmitting(false);
    }
  };

  const renderPollBlock = () => {
    if (!pollData || compact) {
      return null;
    }

    const voteCounts = getPollVoteCounts(pollData);
    const totalVotes = Object.values(voteCounts).reduce((sum, value) => sum + value, 0);
    const mySelections = getUserPollSelection(pollData, user?.$id);
    const hasAnswered = mySelections.length > 0;
    const answerIsCorrect = isUserPollAnswerCorrect(pollData, user?.$id);

    return (
      <View style={[styles.pollContainer, { borderColor: theme.border, backgroundColor: isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }]}>
        {pollData.question && pollData.question !== post.topic && (
          <Text style={[styles.pollQuestion, { color: theme.text }]}>{pollData.question}</Text>
        )}

        {pollData.options.map((option) => {
          const optionVotes = voteCounts[option.id] || 0;
          const percentage = totalVotes > 0 ? Math.round((optionVotes / totalVotes) * 100) : 0;
          const isSelected = mySelections.includes(option.id);
          const isCorrectOption = pollData.isQuiz && pollData.correctOptionId === option.id;
          const showCorrectness = pollData.isQuiz && hasAnswered && isSelected;
          const selectionColor = showCorrectness
            ? (isCorrectOption ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.22)')
            : (isSelected ? (isDarkMode ? 'rgba(102,126,234,0.25)' : 'rgba(102,126,234,0.16)') : 'transparent');

          return (
            <TouchableOpacity
              key={option.id}
              style={[styles.pollOptionButton, { borderColor: theme.border, backgroundColor: selectionColor }]}
              activeOpacity={0.8}
              onPress={() => handleVotePollOption(option.id)}
              disabled={pollSubmitting}
            >
              <View style={styles.pollOptionRow}>
                <View style={styles.pollOptionLeft}>
                  <Ionicons
                    name={pollData.allowMultiple ? (isSelected ? 'checkbox' : 'square-outline') : (isSelected ? 'radio-button-on' : 'radio-button-off')}
                    size={16}
                    color={isSelected ? theme.primary : theme.textSecondary}
                  />
                  <Text style={[styles.pollOptionText, { color: theme.text }]}>{option.text}</Text>
                </View>
                <Text style={[styles.pollOptionPercent, { color: theme.textSecondary }]}>{percentage}%</Text>
              </View>
            </TouchableOpacity>
          );
        })}

        <View style={styles.pollFooterRow}>
          <Text style={[styles.pollMetaText, { color: theme.textSecondary }]}>
            {t('post.poll.totalVotes').replace('{count}', String(totalVotes))}
          </Text>
          {pollData.isQuiz && hasAnswered && answerIsCorrect !== null && (
            <Text style={[styles.pollMetaText, { color: answerIsCorrect ? '#10B981' : '#EF4444' }]}>
              {answerIsCorrect ? t('post.poll.correct') : t('post.poll.incorrect')}
            </Text>
          )}
        </View>
      </View>
    );
  };


  const openImageGallery = (index) => {
    setSelectedImageIndex(index);
    setImageGalleryVisible(true);
  };

  const renderImageLayout = () => {
    if (!post.images || post.images.length === 0) return null;

    const imageCount = post.images.length;

    if (imageCount === 1) {
      return (
        <TouchableOpacity onPress={() => openImageGallery(0)} activeOpacity={0.9}>
          <ImageWithPlaceholder 
            source={{ uri: post.images[0] }}
            style={styles.singleImage}
            resizeMode="cover"
          />
        </TouchableOpacity>
      );
    }

    if (imageCount === 2) {
      return (
        <View style={styles.twoImagesContainer}>
          {post.images.slice(0, 2).map((img, index) => (
            <TouchableOpacity 
              key={index} 
              style={styles.twoImageWrapper}
              onPress={() => openImageGallery(index)}
              activeOpacity={0.9}
            >
              <ImageWithPlaceholder source={{ uri: img }} style={styles.twoImage} resizeMode="cover" />
            </TouchableOpacity>
          ))}
        </View>
      );
    }

    if (imageCount === 3) {
      return (
        <View style={styles.threeImagesContainer}>
          <TouchableOpacity 
            style={styles.threeImageMain}
            onPress={() => openImageGallery(0)}
            activeOpacity={0.9}
          >
            <ImageWithPlaceholder source={{ uri: post.images[0] }} style={styles.threeMainImage} resizeMode="cover" />
          </TouchableOpacity>
          <View style={styles.threeImageSide}>
            {post.images.slice(1, 3).map((img, index) => (
              <TouchableOpacity 
                key={index + 1}
                style={styles.threeSideWrapper}
                onPress={() => openImageGallery(index + 1)}
                activeOpacity={0.9}
              >
                <ImageWithPlaceholder source={{ uri: img }} style={styles.threeSideImage} resizeMode="cover" />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      );
    }

    if (imageCount >= 4) {
      return (
        <View style={styles.gridContainer}>
          {post.images.slice(0, 4).map((img, index) => (
            <TouchableOpacity 
              key={index}
              style={styles.gridImageWrapper}
              onPress={() => openImageGallery(index)}
              activeOpacity={0.9}
            >
              <ImageWithPlaceholder source={{ uri: img }} style={styles.gridImage} resizeMode="cover" />
              {index === 3 && imageCount > 4 && (
                <View style={styles.moreImagesOverlay}>
                  <Text style={styles.moreImagesText}>+{imageCount - 4}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      );
    }

    return null;
  };

  const renderCompactOrFullImages = () => {
    if (!post.images || post.images.length === 0) return null;
    
    if (compact) {
      // Show a single small preview image in compact mode
      return (
        <TouchableOpacity onPress={() => openImageGallery(0)} activeOpacity={0.9}>
          <View style={styles.compactImageContainer}>
            <ImageWithPlaceholder 
              source={{ uri: post.images[0] }}
              style={styles.compactImage}
              resizeMode="cover"
            />
            {post.images.length > 1 && (
              <View style={styles.compactImageCount}>
                <Text style={styles.compactImageCountText}>+{post.images.length - 1}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      );
    }
    
    return renderImageLayout();
  };

  return (
    <View 
      style={[
        styles.card, 
        { 
          backgroundColor: theme.card || theme.cardBackground,
          borderColor: isOwner ? theme.primary : theme.border,
          borderWidth: isOwner ? 1.5 : 1,
        },
        compact && styles.cardCompact,
      ]}
    >
      {/* Header */}
      <View style={[styles.header, compact && styles.headerCompact]}>
        <TouchableOpacity onPress={onUserPress} activeOpacity={0.8}>
          <Image 
            source={{ uri: postOwnerAvatar || getDefaultAvatar(postOwnerName) }} 
            style={[styles.userAvatar, compact && styles.userAvatarCompact]}
          />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <View style={styles.topRow}>
            <TouchableOpacity onPress={onUserPress} style={styles.userNameContainer}>
              <Text style={[styles.userName, { color: theme.text }]} numberOfLines={1}>
                {postOwnerName}
              </Text>
            </TouchableOpacity>
            {isOwner && (
              <View style={[styles.youBadge, { backgroundColor: theme.primary }]}>
                <Text style={styles.youBadgeText}>{t('common.you') || 'You'}</Text>
              </View>
            )}
            <Text style={[styles.timeText, { color: theme.textSecondary }]}>
              {formatTimeAgo(post.$createdAt, t)}
            </Text>
            {post.isEdited === true && (
              <Text style={[styles.editedText, { color: theme.textTertiary }]}>
                ({t('post.edited')})
              </Text>
            )}
          </View>
          <View style={styles.badgesRow}>
            <View style={[styles.stageBadge, { backgroundColor: isDarkMode ? `${stageColor}15` : `${stageColor}20`, borderColor: stageColor }]}>
              <Text style={[styles.stageText, { color: stageColor }]}>
                {t(`stages.${stageKey}`) || t(`stages.${post.stage}`)}
              </Text>
            </View>
            <View style={[styles.typeBadgeInline, { backgroundColor: isDarkMode ? `${postColor}10` : `${postColor}18` }]}>
              <Ionicons name={postIcon} size={moderateScale(10)} color={postColor} />
              <Text style={[styles.typeTextInline, { color: postColor }]}>
                {t(`post.types.${post.postType}`)}
              </Text>
            </View>
            {post.isRepost === true && (
              <View style={[styles.repostBadge, { backgroundColor: isDarkMode ? `${theme.primary}15` : `${theme.primary}20` }]}>
                <Ionicons name="repeat-outline" size={moderateScale(10)} color={theme.primary} />
                <Text style={[styles.repostText, { color: theme.primary }]}>
                  {t('post.reposted') || 'Reposted'}
                </Text>
              </View>
            )}
          </View>
        </View>
        <TouchableOpacity 
          style={styles.menuButton}
          onPress={() => setShowMenu(true)}
          activeOpacity={0.6}
        >
          <Ionicons name="ellipsis-horizontal" size={moderateScale(20)} color={theme.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={[styles.content, compact && styles.contentCompact]}>
        <Text style={[styles.topic, { color: theme.text }, compact && styles.topicCompact]} numberOfLines={compact ? 1 : 2} selectable>
          {post.topic}
        </Text>
        {post.text && !compact && (
          <Text 
            style={[styles.text, { color: theme.textSecondary }]} 
            numberOfLines={isExpanded ? undefined : 3} 
            selectable
          >
            {post.text}
          </Text>
        )}

        {renderPollBlock()}

        {post.links && post.links.length > 0 && (
          <View style={styles.linksContainer}>
            {(isExpanded ? post.links : post.links.slice(0, 2)).map((link, index) => {
              const isEmail = link.includes('@') && !link.startsWith('http');
              const linkUrl = isEmail ? `mailto:${link}` : link;
              return (
                <TouchableOpacity
                  key={index}
                  onPress={() => Linking.openURL(linkUrl)}
                  activeOpacity={0.7}
                  style={styles.linkChipDisplay}
                >
                  <Ionicons 
                    name={isEmail ? 'mail-outline' : 'link-outline'} 
                    size={moderateScale(14)} 
                    color="#3B82F6" 
                  />
                  <Text style={styles.linkText} numberOfLines={1}>
                    {link}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {post.tags && post.tags.length > 0 && (
          <View style={styles.tagsContainer}>
            {(isExpanded ? post.tags : post.tags.slice(0, 4)).map((tag, index) => (
              <TouchableOpacity 
                key={index} 
                style={[styles.tag, { backgroundColor: isDarkMode ? `${theme.primary}20` : `${theme.primary}15` }]}
                onPress={() => onTagPress && onTagPress(sanitizeTag(tag))}
                activeOpacity={0.7}
              >
                <Text style={[styles.tagText, { color: theme.primary || '#3B82F6' }]}>#{sanitizeTag(tag)}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {((post.text && post.text.length > 150) || 
          (post.links && post.links.length > 2) || 
          (post.tags && post.tags.length > 4)) && !compact && (
          <TouchableOpacity 
            onPress={() => setIsExpanded(!isExpanded)}
            style={styles.seeMoreButton}
            activeOpacity={0.7}
          >
            <Text style={[styles.seeMoreText, { color: theme.primary || '#3B82F6' }]}>
              {isExpanded ? t('common.seeLess') : t('common.seeMore')}
            </Text>
          </TouchableOpacity>
        )}

        {showImages && renderCompactOrFullImages()}
      </View>

      {/* Footer */}
      <View style={[styles.footer, { borderTopColor: theme.border }, compact && styles.footerCompact]}>
        <View style={styles.footerLeft}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={handleLikePress}
            onLongPress={handleLikeLongPress}
            delayLongPress={300}
            activeOpacity={0.7}
            disabled={isLiking}
          >
            <Ionicons 
              name={liked ? "heart" : "heart-outline"} 
              size={footerIconSize} 
              color={liked ? "#EF4444" : theme.textSecondary} 
            />
            <Text style={[styles.actionText, { color: liked ? "#EF4444" : theme.textSecondary }]}>
              {likeCount}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionButton}
            onPress={onReply}
            activeOpacity={0.7}
          >
            <Ionicons name="chatbubble-outline" size={footerIconSize} color={theme.textSecondary} />
            <Text style={[styles.actionText, { color: theme.textSecondary }]}>
              {t('post.reply')} ({post.replyCount || 0})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionButton}
            onPress={handleShare}
            activeOpacity={0.7}
          >
            <Ionicons name="share-outline" size={footerIconSize} color={theme.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => setShowShareToChat(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="send-outline" size={footerSmallIconSize} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>

        <View style={styles.footerRight}>
          <View style={styles.statsItem}>
            <Ionicons name="eye-outline" size={footerStatsIconSize} color={theme.textTertiary} />
            <Text style={[styles.statsText, { color: theme.textTertiary }]}>{post.viewCount || 0}</Text>
          </View>
          {post.postType === 'question' && (
            <View style={styles.statsItem}>
              {resolved ? (
                <>
                  <Ionicons name="checkmark-circle" size={footerStatsIconSize} color="#10B981" />
                  <Text style={[styles.statsText, { color: '#10B981' }]}>
                    {t('post.resolved')}
                  </Text>
                </>
              ) : (
                <>
                  <Ionicons name="help-circle-outline" size={footerStatsIconSize} color="#F59E0B" />
                  <Text style={[styles.statsText, { color: '#F59E0B' }]}>
                    {t('post.unanswered')}
                  </Text>
                </>
              )}
            </View>
          )}
        </View>
      </View>

      {/* Menu Modal */}
      <PostCardMenu
        visible={showMenu}
        onClose={() => {
          setShowMenu(false);
        }}
        isOwner={isOwner}
        isQuestion={post.postType === 'question'}
        isResolved={resolved}
        isHidden={post.isHidden === true}
        onEdit={() => {
          if (onEdit) onEdit();
        }}
        onDelete={() => {
          if (onDelete) onDelete();
        }}
        onReport={() => {
          if (onReport) onReport();
        }}
        onRepost={handleRepost}
        canRepost={canCurrentUserRepost}
        isRepost={post.isRepost === true && !!post.originalPostId}
        onVisitOriginal={post.originalPostId ? handleVisitOriginal : null}
        onRequestReview={isOwner && post.isHidden ? handleRequestReview : null}
        onMarkResolved={() => {
          const nextResolvedState = !resolved;
          if (onMarkResolved) onMarkResolved(nextResolvedState);
          setResolved(nextResolvedState);
        }}
        onCopy={handleCopy}
        onBookmark={handleBookmark}
        isBookmarked={isBookmarked}
        theme={theme}
        t={t}
      />

      {/* Share Post to Chat Modal */}
      <SharePostToChat
        visible={showShareToChat}
        onClose={() => setShowShareToChat(false)}
        post={post}
        showAlert={showAlert}
      />

      <PostLikesModal
        visible={showLikesModal}
        onClose={() => setShowLikesModal(false)}
        likedByIds={likedByIds}
      />

      <CustomAlert
        visible={alertConfig.visible}
        type={alertConfig.type}
        title={alertConfig.title}
        message={alertConfig.message}
        buttons={alertConfig.buttons}
        onClose={hideAlert}
      />

      {/* Image Gallery - ZoomableImageModal handles its own Modal */}
      {imageGalleryVisible && (
        <PostCardImageGallery
          images={post.images || []}
          initialIndex={selectedImageIndex}
          onClose={() => setImageGalleryVisible(false)}
          t={t}
        />
      )}
    </View>
  );
};

export default memo(PostCard);
