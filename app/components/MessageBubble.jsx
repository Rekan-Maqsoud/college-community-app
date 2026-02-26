import React, { useState, useRef, memo, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  Modal, 
  Image, 
  Dimensions,
  Animated,
  PanResponder,
  Pressable,
  ActivityIndicator,
  LayoutAnimation,
  UIManager,
  Platform as RNPlatform,
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';
import { Permission, Role } from 'appwrite';
import ReanimatedModule, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withDelay,
} from 'react-native-reanimated';
import LeafletMap from './LeafletMap';
import { useAppSettings } from '../context/AppSettingsContext';
import ProfilePicture from './ProfilePicture';
import ZoomableImageModal from './ZoomableImageModal';
import { 
  fontSize, 
  spacing, 
  moderateScale,
  wp,
} from '../utils/responsive';
import { formatFileSize, getFilePreviewDescriptor } from '../utils/fileTypes';
import { config, storage } from '../../database/config';
import { getUserById } from '../../database/users';
import {
  parsePollPayload,
  getPollVoteCounts,
  getPollVotersByOption,
  getUserPollSelection,
  isUserPollAnswerCorrect,
} from '../utils/pollUtils';
import MessageStatusIndicator from './messageBubble/MessageStatusIndicator';
import styles from './messageBubble/styles';
import {
  SWIPE_THRESHOLD,
  VOICE_VISUAL_BARS,
  sharedVoiceControllers,
  normalizeWaveformSamples,
  getBubbleStyleRadius,
} from './messageBubble/constants';
import { parseMessageReactions } from './messageBubble/reactionUtils';

const ReanimatedView = ReanimatedModule?.View || View;

// Enable LayoutAnimation for Android (skip in New Architecture where it's a no-op)
if (
  RNPlatform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental &&
  !global.__turboModuleProxy &&
  !global.nativeFabricUIManager &&
  !global.RN$Bridgeless
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const MessageBubble = ({ 
  message, 
  isCurrentUser, 
  senderName,
  senderPhoto,
  showAvatar = true,
  isRepresentative = false,
  onCopy,
  onDelete,
  onReply,
  onForward,
  onPin,
  onUnpin,
  onBookmark,
  onUnbookmark,
  isBookmarked = false,
  onAvatarPress,
  onRetry,
  chatType,
  otherUserPhoto,
  otherUserName,
  participantCount,
  isLastSeenMessage = false,
  groupMembers = [],
  onNavigateToProfile,
  searchQuery = '',
  isCurrentSearchResult = false,
  isHighlighted = false,
  onPostPress,
  showAlert,
  selectionMode = false,
  isSelected = false,
  onToggleSelect,
  currentUserId,
  reactionDefaults = [],
  onToggleReaction,
  onEditReactions,
  onPollVote,
}) => {
  const { theme, isDarkMode, t, chatSettings } = useAppSettings();
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [actionsVisible, setActionsVisible] = useState(false);
  const [mentionPreview, setMentionPreview] = useState(null);
  const [reactionPickerVisible, setReactionPickerVisible] = useState(false);
  const [isVoicePlaying, setIsVoicePlaying] = useState(false);
  const [voiceDurationMs, setVoiceDurationMs] = useState(0);
  const [voicePositionMs, setVoicePositionMs] = useState(0);
  const [voiceLoading, setVoiceLoading] = useState(false);
  const [showPollExplanation, setShowPollExplanation] = useState(false);
  const [showPollVoters, setShowPollVoters] = useState(false);
  const [pollVoterNames, setPollVoterNames] = useState({});
  const voicePlayerRef = useRef(null);
  const voicePlayerListenerRef = useRef(null);
  const voicePlayerUrlRef = useRef('');
  const voiceLocalPlaybackUriRef = useRef('');
  const voiceLocalPlaybackRemoteUrlRef = useRef('');
  
  const translateX = useRef(new Animated.Value(0)).current;
  const swipeDirection = isCurrentUser ? -1 : 1;
  const onReplyRef = useRef(onReply);
  const swipeDirectionRef = useRef(swipeDirection);

  useEffect(() => {
    onReplyRef.current = onReply;
  }, [onReply]);

  useEffect(() => {
    swipeDirectionRef.current = swipeDirection;
  }, [swipeDirection]);

  const snapBack = useCallback(() => {
    Animated.spring(translateX, {
      toValue: 0,
      useNativeDriver: true,
      tension: 100,
      friction: 10,
    }).start();
  }, [translateX]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 10 && Math.abs(gestureState.dy) < 20;
      },
      onPanResponderMove: (_, gestureState) => {
        const dir = swipeDirectionRef.current;
        const dx = gestureState.dx * dir;
        if (dx > 0 && dx < SWIPE_THRESHOLD + 20) {
          translateX.setValue(gestureState.dx);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        const dir = swipeDirectionRef.current;
        const dx = gestureState.dx * dir;
        if (dx > SWIPE_THRESHOLD && message.type !== 'lecture_asset_banner' && onReplyRef.current) {
          onReplyRef.current();
        }
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
          tension: 100,
          friction: 10,
        }).start();
      },
      onPanResponderTerminate: () => {
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
          tension: 100,
          friction: 10,
        }).start();
      },
    })
  ).current;

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const hasImages = message.images && message.images.length > 0;
  const hasLegacyImage = message.imageUrl && message.imageUrl.trim().length > 0;
  const imageUrl = hasImages ? message.images[0] : (hasLegacyImage ? message.imageUrl : null);
  const hasImage = !!imageUrl;
  const hasReply = message.replyToId && (message.replyToContent || message.replyToSender);
  const isPinned = message.isPinned;
  const mentionsAll = message.mentionsAll;
  const isPostShare = message.type === 'post_share';
  const isLocation = message.type === 'location';
  const isGif = message.type === 'gif';
  const isVoice = message.type === 'voice';
  const isPoll = message.type === 'poll';
  const isFile = message.type === 'file';
  const isLectureAssetBanner = message.type === 'lecture_asset_banner';
  const canReply = !!onReply && !isLectureAssetBanner;
  const hasEncryptedFallbackText = !!message._isEncryptedUnavailable;
  const hasText = ((message.content && message.content.trim().length > 0 && !isVoice && !isFile) || hasEncryptedFallbackText);
  const isSticker = isGif && (() => {
    try {
      const parsed = typeof message.content === 'string' ? JSON.parse(message.content) : message.content;
      return parsed?.gif_type === 'sticker';
    } catch { return false; }
  })();

  // Pinned message highlight glow animation (react-native-reanimated)
  const highlightOpacity = useSharedValue(0);

  useEffect(() => {
    if (isHighlighted) {
      highlightOpacity.value = withSequence(
        withTiming(1, { duration: 300 }),
        withDelay(500, withTiming(0, { duration: 600 }))
      );
    } else {
      highlightOpacity.value = 0;
    }
  }, [isHighlighted]);

  const highlightAnimatedStyle = useAnimatedStyle(() => ({
    backgroundColor: isDarkMode
      ? `rgba(180, 190, 255, ${highlightOpacity.value * 0.10})`
      : `rgba(100, 130, 255, ${highlightOpacity.value * 0.08})`,
  }));

  // Parse post share metadata
  const postShareData = React.useMemo(() => {
    if (!isPostShare) return null;
    try {
      if (typeof message.content === 'string') {
        return JSON.parse(message.content);
      }
      return message.content;
    } catch (e) {
      return null;
    }
  }, [isPostShare, message.content]);

  // Parse location data
  const locationData = React.useMemo(() => {
    if (!isLocation) return null;
    try {
      const parts = (message.content || '').split(',');
      if (parts.length >= 2) {
        return { lat: parseFloat(parts[0]), long: parseFloat(parts[1]) };
      }
      return null;
    } catch (e) {
      return null;
    }
  }, [isLocation, message.content]);

  // Parse GIF/Sticker metadata
  const gifData = React.useMemo(() => {
    if (!isGif) return null;
    try {
      if (typeof message.content === 'string') {
        return JSON.parse(message.content);
      }
      return message.content;
    } catch {
      return null;
    }
  }, [isGif, message.content]);

  const voiceData = React.useMemo(() => {
    if (!isVoice) return null;
    try {
      const parsed = typeof message.content === 'string'
        ? JSON.parse(message.content)
        : message.content;
      const duration = Number(parsed?.voice_duration_ms || 0);
      return {
        url: parsed?.voice_url || '',
        fileId: parsed?.voice_file_id || '',
        duration,
        waveform: normalizeWaveformSamples(
          parsed?.voice_waveform,
          VOICE_VISUAL_BARS,
          `${parsed?.voice_file_id || ''}_${parsed?.voice_url || ''}_${duration}`
        ),
      };
    } catch {
      return null;
    }
  }, [isVoice, message.content]);

  const pollData = React.useMemo(() => {
    if (!isPoll) return null;
    return parsePollPayload(message.content);
  }, [isPoll, message.content]);

  const fileData = React.useMemo(() => {
    if (!isFile) return null;
    try {
      const parsed = typeof message.content === 'string'
        ? JSON.parse(message.content)
        : message.content;
      const descriptor = getFilePreviewDescriptor({
        name: parsed?.file_name,
        mimeType: parsed?.file_mime_type,
      });

      return {
        url: parsed?.file_url || '',
        fileId: parsed?.file_id || '',
        name: parsed?.file_name || t('chats.file'),
        size: Number(parsed?.file_size || 0),
        mimeType: parsed?.file_mime_type || '',
        caption: parsed?.file_caption || '',
        descriptor,
      };
    } catch {
      return null;
    }
  }, [isFile, message.content, t]);

  const lectureBannerData = React.useMemo(() => {
    if (!isLectureAssetBanner) return null;
    try {
      const parsed = typeof message.content === 'string'
        ? JSON.parse(message.content)
        : message.content;

      return {
        channelName: parsed?.channelName || t('lectures.channel'),
        fileName: parsed?.fileName || t('lectures.file'),
        deeplink: parsed?.deeplink || '',
        uploadType: parsed?.uploadType || '',
      };
    } catch {
      return null;
    }
  }, [isLectureAssetBanner, message.content, t]);

  const pollVoteCounts = React.useMemo(() => getPollVoteCounts(pollData), [pollData]);
  const pollUserSelections = React.useMemo(() => getUserPollSelection(pollData, currentUserId), [pollData, currentUserId]);
  const pollAnswerCorrect = React.useMemo(() => isUserPollAnswerCorrect(pollData, currentUserId), [pollData, currentUserId]);
  const pollVotersByOption = React.useMemo(() => getPollVotersByOption(pollData), [pollData]);

  useEffect(() => {
    setShowPollExplanation(false);
    setShowPollVoters(false);
  }, [message.$id, message.content]);

  useEffect(() => {
    let isMounted = true;

    const hydratePollVoterNames = async () => {
      if (!pollData?.showVoters || !showPollVoters) {
        return;
      }

      const voterIds = Array.from(new Set(Object.values(pollVotersByOption).flat()));
      const unresolvedIds = voterIds.filter((voterId) => voterId && !pollVoterNames[voterId]);

      if (unresolvedIds.length === 0) {
        return;
      }

      const resolvedEntries = await Promise.all(
        unresolvedIds.map(async (voterId) => {
          const knownMember = groupMembers.find((member) => member?.$id === voterId || member?.id === voterId);
          if (knownMember) {
            return [voterId, knownMember.name || knownMember.fullName || voterId];
          }

          try {
            const userDoc = await getUserById(voterId, true);
            return [voterId, userDoc?.name || userDoc?.fullName || voterId];
          } catch (error) {
            return [voterId, voterId];
          }
        })
      );

      if (!isMounted) {
        return;
      }

      setPollVoterNames((prevNames) => ({
        ...prevNames,
        ...Object.fromEntries(resolvedEntries),
      }));
    };

    hydratePollVoterNames();

    return () => {
      isMounted = false;
    };
  }, [groupMembers, pollData, pollVoterNames, pollVotersByOption, showPollVoters]);

  const handlePollOptionPress = async (optionId) => {
    if (!pollData || !onPollVote || !currentUserId || selectionMode) {
      return;
    }

    if (pollData.isQuiz && pollUserSelections.length > 0) {
      return;
    }

    let nextSelections = [];
    if (pollData.allowMultiple) {
      const alreadySelected = pollUserSelections.includes(optionId);
      nextSelections = alreadySelected
        ? pollUserSelections.filter((selectedId) => selectedId !== optionId)
        : [...pollUserSelections, optionId];

      if (nextSelections.length > pollData.maxSelections) {
        return;
      }

      if (nextSelections.length === 0) {
        nextSelections = [optionId];
      }
    } else {
      nextSelections = [optionId];
    }

    await onPollVote(message, nextSelections);
  };

  const disposeVoicePlayer = useCallback(() => {
    if (voicePlayerListenerRef.current?.remove) {
      voicePlayerListenerRef.current.remove();
    }
    voicePlayerListenerRef.current = null;

    if (voicePlayerRef.current?.remove) {
      try {
        voicePlayerRef.current.remove();
      } catch {}
    }
    voicePlayerRef.current = null;
    voicePlayerUrlRef.current = '';
  }, []);

  const stopVoicePlayback = useCallback(async (resetPosition = true) => {
    if (voicePlayerRef.current?.pause) {
      try {
        voicePlayerRef.current.pause();
      } catch {}
    }

    disposeVoicePlayer();
    setIsVoicePlaying(false);
    setVoiceLoading(false);
    if (resetPosition) {
      setVoicePositionMs(0);
    }
  }, [disposeVoicePlayer]);

  const clearVoicePlaybackCache = useCallback(() => {
    const localUri = voiceLocalPlaybackUriRef.current;
    voiceLocalPlaybackUriRef.current = '';
    voiceLocalPlaybackRemoteUrlRef.current = '';

    if (localUri) {
      FileSystem.deleteAsync(localUri, { idempotent: true }).catch(() => {});
    }
  }, []);

  const resolveVoicePlaybackUri = useCallback(async () => {
    if (!voiceData?.url) {
      return '';
    }

    if (
      voiceLocalPlaybackUriRef.current &&
      voiceLocalPlaybackRemoteUrlRef.current === voiceData.url
    ) {
      return voiceLocalPlaybackUriRef.current;
    }

    const baseDirectory = FileSystem.cacheDirectory || FileSystem.documentDirectory;
    if (!baseDirectory) {
      return voiceData.url;
    }

    const targetUri = `${baseDirectory}voice_playback_${message.$id || Date.now()}.m4a`;
    let downloadHeaders = {};

    try {
      const preparedUrl = new URL(voiceData.url);
      const { options } = storage.client.prepareRequest('get', preparedUrl, {}, {});
      downloadHeaders = options?.headers || {};
    } catch {}

    const blobToBase64 = (blob) => new Promise((resolve, reject) => {
      try {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result;
          if (typeof result !== 'string') {
            reject(new Error('Voice blob encoding failed'));
            return;
          }
          const commaIndex = result.indexOf(',');
          resolve(commaIndex >= 0 ? result.slice(commaIndex + 1) : result);
        };
        reader.onerror = () => reject(reader.error || new Error('Voice blob read failed'));
        reader.readAsDataURL(blob);
      } catch (error) {
        reject(error);
      }
    });

    const fetchVoice = async (url, headers) => {
      return await fetch(url, {
        method: 'GET',
        headers: headers || {},
      });
    };

    let downloadResponse = null;
    try {
      downloadResponse = await fetchVoice(voiceData.url, downloadHeaders);
    } catch {
      downloadResponse = await fetchVoice(voiceData.url, {});
    }

    if (!downloadResponse?.ok) {
      const statusCode = Number(downloadResponse?.status || 0);

      if (
        statusCode === 401 &&
        voiceData?.fileId &&
        config.voiceMessagesStorageId
      ) {
        try {
          await storage.updateFile({
            bucketId: config.voiceMessagesStorageId,
            fileId: voiceData.fileId,
            permissions: [
              Permission.read(Role.users()),
              Permission.update(Role.users()),
              Permission.delete(Role.users()),
            ],
          });

          const repairedUrl = storage.getFileView(config.voiceMessagesStorageId, voiceData.fileId)?.toString() || voiceData.url;
          downloadResponse = await fetchVoice(repairedUrl, downloadHeaders);
        } catch {}
      }
    }

    if (!downloadResponse?.ok) {
      throw new Error(`Voice download failed (${downloadResponse?.status || 'unknown'})`);
    }

    const audioBlob = await downloadResponse.blob();
    const base64Audio = await blobToBase64(audioBlob);
    await FileSystem.writeAsStringAsync(targetUri, base64Audio, {
      encoding: FileSystem.EncodingType.Base64,
    });

    voiceLocalPlaybackUriRef.current = targetUri;
    voiceLocalPlaybackRemoteUrlRef.current = voiceData.url;

    return targetUri;
  }, [message.$id, voiceData?.fileId, voiceData?.url]);

  useEffect(() => {
    if (!message?.$id) {
      return () => {};
    }

    sharedVoiceControllers.set(message.$id, stopVoicePlayback);

    return () => {
      sharedVoiceControllers.delete(message.$id);
    };
  }, [message?.$id, stopVoicePlayback]);

  useEffect(() => {
    return () => {
      disposeVoicePlayer();
      clearVoicePlaybackCache();
    };
  }, [clearVoicePlaybackCache, disposeVoicePlayer]);

  useEffect(() => {
    if (!isVoice) {
      return;
    }
    disposeVoicePlayer();
    if (voiceLocalPlaybackRemoteUrlRef.current !== (voiceData?.url || '')) {
      clearVoicePlaybackCache();
    }
    setVoiceDurationMs(voiceData?.duration || 0);
    setVoicePositionMs(0);
    setIsVoicePlaying(false);
  }, [clearVoicePlaybackCache, disposeVoicePlayer, isVoice, voiceData?.duration, voiceData?.url, message.$id]);

  const formatVoiceTime = (durationMs = 0) => {
    const totalSeconds = Math.max(0, Math.floor(durationMs / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  const handleToggleVoicePlayback = useCallback(async () => {
    if (!voiceData?.url || selectionMode) {
      return;
    }

    try {
      setVoiceLoading(true);

      const activePlayer = voicePlayerRef.current;
      const sameVoice = voicePlayerUrlRef.current === voiceData.url;

      if (activePlayer && sameVoice) {
        if (activePlayer.playing) {
          activePlayer.pause();
          setIsVoicePlaying(false);
          setVoiceLoading(false);
          return;
        }

        if (activePlayer.duration > 0 && activePlayer.currentTime >= activePlayer.duration - 0.05) {
          await activePlayer.seekTo(0);
        }

        activePlayer.play();
        setIsVoicePlaying(true);
        setVoiceLoading(false);
        return;
      }

      const stopPromises = [];
      sharedVoiceControllers.forEach((controller, messageId) => {
        if (messageId !== message.$id) {
          stopPromises.push(controller());
        }
      });
      if (stopPromises.length > 0) {
        await Promise.all(stopPromises);
      }

      if (activePlayer && !sameVoice) {
        disposeVoicePlayer();
      }

      await setAudioModeAsync({
        allowsRecording: false,
        playsInSilentMode: true,
      });

      const playableUri = await resolveVoicePlaybackUri();
      if (!playableUri) {
        throw new Error('Voice source URL is missing');
      }

      const player = createAudioPlayer(
        { uri: playableUri },
        { updateInterval: 80, downloadFirst: true }
      );

      voicePlayerRef.current = player;
      voicePlayerUrlRef.current = voiceData.url;

      voicePlayerListenerRef.current = player.addListener('playbackStatusUpdate', (status) => {
        if (!status) {
          return;
        }

        const nextPositionMs = Math.max(0, Math.floor((status.currentTime || 0) * 1000));
        const nextDurationMs = Math.max(
          Number(voiceData.duration || 0),
          Math.floor((status.duration || 0) * 1000)
        );

        setVoicePositionMs(nextPositionMs);
        setVoiceDurationMs(nextDurationMs);
        setIsVoicePlaying(Boolean(status.playing));

        if (status.didJustFinish) {
          setIsVoicePlaying(false);
          setVoicePositionMs(nextDurationMs);
        }
      });

      if (player.duration > 0 && player.currentTime >= player.duration - 0.05) {
        await player.seekTo(0);
      }

      player.play();

      setIsVoicePlaying(true);
      setVoiceDurationMs(Math.max(
        Number(voiceData.duration || 0),
        Math.floor((player.duration || 0) * 1000)
      ));
    } catch {
      stopVoicePlayback();
      setIsVoicePlaying(false);
      setVoicePositionMs(0);
      setVoiceDurationMs(voiceData?.duration || 0);
      showAlert?.({
        type: 'error',
        title: t('common.error'),
        message: t('chats.voicePlayError'),
      });
    } finally {
      setVoiceLoading(false);
    }
  }, [disposeVoicePlayer, message?.$id, resolveVoicePlaybackUri, selectionMode, showAlert, stopVoicePlayback, t, voiceData]);

  const handleLongPress = () => {
    if (selectionMode && onToggleSelect) {
      onToggleSelect(message.$id);
      return;
    }
    setActionsVisible(true);
  };

  const handlePress = () => {
    if (selectionMode && onToggleSelect) {
      onToggleSelect(message.$id);
    }
  };

  const handleAction = (action) => {
    setActionsVisible(false);
    if (action) {
      setTimeout(action, 100);
    }
  };

  const handleLectureBannerPress = () => {
    const target = lectureBannerData?.deeplink || '';
    if (!target || selectionMode) {
      return;
    }

    Linking.openURL(target).catch(() => {
      if (showAlert) {
        showAlert({
          type: 'error',
          title: t('common.error'),
          message: t('lectures.openChannelError'),
        });
      }
    });
  };

  const reactionsMap = parseMessageReactions(message.reactions);
  const reactionEntries = Object.entries(reactionsMap)
    .filter(([, users]) => Array.isArray(users) && users.length > 0);
  const hasCurrentUserReaction = currentUserId
    ? Object.values(reactionsMap).some(users => Array.isArray(users) && users.includes(currentUserId))
    : false;
  const quickReactions = reactionDefaults.length > 0
    ? reactionDefaults
    : ['👍', '❤️', '😂', '😡', '😕'];

  const handleReactionSelect = (emoji, closePicker = false) => {
    if (!emoji || !onToggleReaction) return;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    onToggleReaction(message, emoji);
    if (closePicker) {
      setReactionPickerVisible(false);
    }
  };

  const showCornerReactionAdd = !isCurrentUser && !!onToggleReaction && !selectionMode && !hasCurrentUserReaction;

  // Render message content with @everyone highlighting, link detection, and search highlighting
  const renderMessageContent = () => {
    if (!hasText) return null;
    
    const content = hasEncryptedFallbackText
      ? t('chats.encryptedMessageUnavailable')
      : message.content;
    
    // Helper to highlight search matches in text
    const highlightSearchMatches = (text, keyPrefix = '') => {
      if (!searchQuery || searchQuery.trim().length === 0) {
        return text;
      }
      
      const query = searchQuery.toLowerCase();
      const lowerText = text.toLowerCase();
      const parts = [];
      let lastIndex = 0;
      let matchIndex = lowerText.indexOf(query, lastIndex);
      
      while (matchIndex !== -1) {
        // Add text before match
        if (matchIndex > lastIndex) {
          parts.push(text.substring(lastIndex, matchIndex));
        }
        // Add highlighted match
        parts.push(
          <Text 
            key={`${keyPrefix}-match-${matchIndex}`} 
            style={[
              styles.searchHighlight, 
              { 
                backgroundColor: isCurrentSearchResult ? '#FFEB3B' : '#FFF176',
                color: '#000000',
              }
            ]}
          >
            {text.substring(matchIndex, matchIndex + query.length)}
          </Text>
        );
        lastIndex = matchIndex + query.length;
        matchIndex = lowerText.indexOf(query, lastIndex);
      }
      
      // Add remaining text
      if (lastIndex < text.length) {
        parts.push(text.substring(lastIndex));
      }
      
      return parts.length > 0 ? parts : text;
    };
    
    // URL regex pattern
    const urlPattern = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;
    // Pattern for @everyone/@all and @username (username can contain letters, numbers, spaces)
    const everyoneMentionPattern = /(@everyone|@all)/gi;
    const userMentionPattern = /@([a-zA-Z0-9\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\u0980-\u09FF\s]+?)(?=\s|$|[.,!?;:])/g;
    
    // Combined pattern for links, @everyone, and @username mentions
    const combinedPattern = new RegExp(`(${urlPattern.source}|${everyoneMentionPattern.source}|@[a-zA-Z0-9\\u0600-\\u06FF\\u0750-\\u077F\\u08A0-\\u08FF\\u0980-\\u09FF\\s]+?)(?=\\s|$|[.,!?;:])`, 'gi');
    
    const parts = content.split(combinedPattern).filter(Boolean);
    
    const handleLinkPress = (url) => {
      let finalUrl = url;
      if (url.startsWith('www.')) {
        finalUrl = 'https://' + url;
      }
      Linking.openURL(finalUrl);
    };

    // Handle user mention press - find user and show preview
    const handleMentionPress = (mentionText) => {
      // Remove @ symbol
      const username = mentionText.substring(1).trim();
      
      // Try to find the user in mentions array or group members
      let mentionedUser = null;
      
      // Check message.mentions array if available
      if (message.mentions && Array.isArray(message.mentions)) {
        // This would need user lookup, for now we'll use groupMembers
      }
      
      // Look up in groupMembers if provided
      if (groupMembers && groupMembers.length > 0) {
        mentionedUser = groupMembers.find(member => {
          const memberName = member?.name || member?.fullName || '';
          return memberName.toLowerCase() === username.toLowerCase();
        });
      }
      
      // If we found a user, show preview
      if (mentionedUser) {
        setMentionPreview({
          id: mentionedUser.$id || mentionedUser.id,
          name: mentionedUser.name || mentionedUser.fullName,
          profilePicture: mentionedUser.profilePicture,
        });
      }
    };
    
    // Reset URL pattern last index
    urlPattern.lastIndex = 0;
    everyoneMentionPattern.lastIndex = 0;
    
    const hasSpecialContent = urlPattern.test(content) || everyoneMentionPattern.test(content) || /@\w+/.test(content);
    
    // Reset again after test
    urlPattern.lastIndex = 0;
    everyoneMentionPattern.lastIndex = 0;
    
    if (hasSpecialContent) {
      return (
        <Text style={[
          styles.messageText,
          { 
            fontSize: fontSize(14),
            color: isCurrentUser ? '#FFFFFF' : theme.text 
          },
          hasImage && styles.messageTextWithImage,
        ]}>
          {parts.map((part, index) => {
            if (part.toLowerCase() === '@everyone' || part.toLowerCase() === '@all') {
              return (
                <Text key={index} style={[styles.mentionHighlight, { color: isCurrentUser ? '#93C5FD' : theme.primary }]}>
                  {highlightSearchMatches(part, `mention-${index}`)}
                </Text>
              );
            }
            // Check for user mentions (@username)
            if (part.startsWith('@') && part.length > 1 && part.toLowerCase() !== '@everyone' && part.toLowerCase() !== '@all') {
              return (
                <Text 
                  key={index} 
                  style={[styles.userMentionText, { color: isCurrentUser ? '#93C5FD' : theme.primary }]}
                  onPress={() => handleMentionPress(part)}
                >
                  {highlightSearchMatches(part, `user-${index}`)}
                </Text>
              );
            }
            // Reset before test
            urlPattern.lastIndex = 0;
            if (urlPattern.test(part)) {
              urlPattern.lastIndex = 0;
              return (
                <Text 
                  key={index} 
                  style={[styles.linkText, { color: isCurrentUser ? '#93C5FD' : theme.primary }]}
                  onPress={() => handleLinkPress(part)}
                >
                  {highlightSearchMatches(part, `link-${index}`)}
                </Text>
              );
            }
            return <Text key={index}>{highlightSearchMatches(part, `text-${index}`)}</Text>;
          })}
        </Text>
      );
    }

    return (
      <Text style={[
        styles.messageText,
        { 
          fontSize: fontSize(14),
          color: isCurrentUser ? '#FFFFFF' : theme.text 
        },
        hasImage && styles.messageTextWithImage,
      ]}>
        {highlightSearchMatches(content, 'content')}
      </Text>
    );
  };

  const actionButtons = [
    { icon: 'copy-outline', label: t('chats.copy'), action: onCopy, show: hasText && !isVoice && !isPoll && !isFile },
    { icon: 'arrow-undo-outline', label: t('chats.reply'), action: onReply, show: canReply },
    { icon: 'arrow-redo-outline', label: t('chats.forward'), action: onForward, show: true },
    { icon: isPinned ? 'pin' : 'pin-outline', label: isPinned ? t('chats.unpin') : t('chats.pin'), action: isPinned ? onUnpin : onPin, show: onPin || onUnpin },
    { icon: isBookmarked ? 'bookmark' : 'bookmark-outline', label: isBookmarked ? t('chats.unbookmark') : t('chats.bookmark'), action: isBookmarked ? onUnbookmark : onBookmark, show: onBookmark || onUnbookmark },
    { icon: 'trash-outline', label: t('common.delete'), action: onDelete, show: isCurrentUser && onDelete, danger: true },
  ].filter(btn => btn.show);

  // Render bubble content (used by both gradient and solid bubbles)
  const renderBubbleContent = () => (
    <>
      {/* Pinned indicator */}
      {isPinned && (
        <View style={styles.pinnedIndicator}>
          <Ionicons name="pin" size={moderateScale(12)} color={isCurrentUser ? 'rgba(255,255,255,0.7)' : theme.primary} />
          <Text style={[styles.pinnedText, { color: isCurrentUser ? 'rgba(255,255,255,0.7)' : theme.primary, fontSize: fontSize(9) }]}>
            {t('chats.pinnedMessages').split(' ')[0]}
          </Text>
        </View>
      )}
      
      {hasReply && (
        <View style={[
          styles.replyContainer,
          { 
            borderLeftColor: isCurrentUser ? 'rgba(255,255,255,0.5)' : theme.primary,
          }
        ]}>
          <Text style={[
            styles.replyToSender, 
            { 
              fontSize: fontSize(10), 
              color: isCurrentUser ? 'rgba(255,255,255,0.9)' : theme.primary 
            }
          ]}>
            {message.replyToSender || t('common.user')}
          </Text>
          {!!message.replyToContent && (
            <Text 
              style={[
                styles.replyToContent, 
                { 
                  fontSize: fontSize(11), 
                  color: isCurrentUser ? 'rgba(255,255,255,0.7)' : theme.textSecondary 
                }
              ]}
              numberOfLines={1}>
              {message.replyToContent}
            </Text>
          )}
        </View>
      )}

      {/* Shared Post Card */}
      {isLectureAssetBanner && lectureBannerData && (
        <TouchableOpacity
          activeOpacity={0.85}
          disabled={selectionMode || !lectureBannerData.deeplink}
          onPress={handleLectureBannerPress}
          style={[
            styles.lectureBannerCard,
            {
              backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.92)',
              borderColor: isDarkMode ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.08)',
            },
          ]}
        >
          <View style={styles.lectureBannerLeft}>
            <Ionicons name="document-text-outline" size={moderateScale(14)} color={theme.primary} />
            <View style={styles.lectureBannerTextWrap}>
              <Text style={[styles.lectureBannerTitle, { color: theme.text }]} numberOfLines={1}>
                {t('chats.lectureBannerTitle')}
              </Text>
              <Text style={[styles.lectureBannerLine, { color: theme.textSecondary }]} numberOfLines={1}>
                {t('chats.lectureBannerLine')
                  .replace('{fileName}', lectureBannerData.fileName)
                  .replace('{channelName}', lectureBannerData.channelName)}
              </Text>
            </View>
          </View>

          <View style={styles.lectureBannerRight}>
            <Text style={[styles.lectureBannerHint, { color: theme.primary }]}>{t('chats.tapToOpen')}</Text>
            <Ionicons name="chevron-forward" size={moderateScale(12)} color={theme.primary} />
          </View>
        </TouchableOpacity>
      )}

      {isPostShare && postShareData && (
        <TouchableOpacity
          activeOpacity={0.8}
          disabled={selectionMode}
          onPress={() => onPostPress && onPostPress(postShareData.postId)}
          style={[styles.postShareCard, { 
            backgroundColor: isCurrentUser ? 'rgba(255,255,255,0.12)' : (isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'),
            borderWidth: 1,
            borderColor: isCurrentUser ? 'rgba(255,255,255,0.15)' : (isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'),
          }]}>
          {postShareData.thumbnailUrl ? (
            <Image
              source={{ uri: postShareData.thumbnailUrl }}
              style={styles.postShareThumbnail}
              resizeMode="cover"
            />
          ) : null}
          <View style={styles.postShareInfo}>
            <View style={styles.postShareHeaderRow}>
              <Ionicons name="newspaper-outline" size={moderateScale(14)} color={isCurrentUser ? 'rgba(255,255,255,0.7)' : theme.primary} />
              <Text style={[styles.postShareLabel, { color: isCurrentUser ? 'rgba(255,255,255,0.7)' : theme.primary, fontSize: fontSize(10), fontWeight: '600' }]}>
                {t('post.sharedPost') || 'Shared Post'}
              </Text>
            </View>
            <Text
              style={[
                styles.postShareTitle,
                { color: isCurrentUser ? '#FFFFFF' : theme.text, fontSize: fontSize(14) },
              ]}
              numberOfLines={2}>
              {postShareData.title || t('post.sharedPost')}
            </Text>
            {postShareData.summaryText ? (
              <Text
                style={[
                  styles.postShareSummary,
                  { color: isCurrentUser ? 'rgba(255,255,255,0.7)' : theme.textSecondary, fontSize: fontSize(12) },
                ]}
                numberOfLines={2}>
                {postShareData.summaryText}
              </Text>
            ) : null}
          </View>
          <View style={styles.postShareFooter}>
            <Text style={[styles.postShareLabel, { color: isCurrentUser ? 'rgba(255,255,255,0.5)' : theme.textSecondary, fontSize: fontSize(10) }]}>
              {t('chats.tapToView')}
            </Text>
            <Ionicons name="chevron-forward" size={moderateScale(12)} color={isCurrentUser ? 'rgba(255,255,255,0.5)' : theme.textSecondary} />
          </View>
        </TouchableOpacity>
      )}

      {/* Location Bubble with Map Preview */}
      {isLocation && locationData && (
        <Pressable
          disabled={selectionMode}
          onPress={() => {
            const { lat, long } = locationData;
            const url = RNPlatform.select({
              ios: `http://maps.apple.com/?ll=${lat},${long}&q=${lat},${long}`,
              android: `geo:${lat},${long}?q=${lat},${long}`,
            });
            Linking.openURL(url).catch(() => {
              // Fallback to web if native map app is not available
              Linking.openURL(`https://www.google.com/maps?q=${lat},${long}`);
            });
          }}
          style={styles.locationCard}>
          <View style={styles.locationMapPreviewContainer}>
            <LeafletMap
              containerStyle={styles.locationMapPreview}
              interactive={false}
              zoom={16}
              markers={[{
                latitude: locationData.lat,
                longitude: locationData.long,
                title: t('chats.location'),
              }]}
              initialRegion={{
                latitude: locationData.lat,
                longitude: locationData.long,
              }}
            />
          </View>
          <View style={styles.locationInfo}>
            <Ionicons name="navigate-outline" size={moderateScale(14)} color={isCurrentUser ? 'rgba(255,255,255,0.8)' : theme.primary} />
            <Text style={[styles.locationText, { color: isCurrentUser ? '#FFFFFF' : theme.text, fontSize: fontSize(12) }]}>
              {`${locationData.lat.toFixed(4)}, ${locationData.long.toFixed(4)}`}
            </Text>
          </View>
          <Text style={[styles.locationHint, { color: isCurrentUser ? 'rgba(255,255,255,0.5)' : theme.textSecondary, fontSize: fontSize(10) }]}>
            {t('chats.tapToOpenMap')}
          </Text>
        </Pressable>
      )}

      {/* GIF Bubble */}
      {isGif && gifData && !isSticker && (
        <View style={styles.gifContainer}>
          <Image
            source={{ uri: gifData.gif_url || gifData.gif_preview_url }}
            style={[
              styles.gifImage,
              {
                width: Math.min(wp(55), moderateScale(220)),
                aspectRatio: gifData.gif_aspect_ratio || 1,
              },
            ]}
            resizeMode="cover"
          />
          <View style={styles.gifBadge}>
            <Text style={styles.gifBadgeText}>GIF</Text>
          </View>
        </View>
      )}

      {/* Sticker Bubble - transparent, no badge, smaller */}
      {isSticker && gifData && (
        <View style={styles.stickerContainer}>
          <Image
            source={{ uri: gifData.gif_url || gifData.gif_preview_url }}
            style={[
              styles.stickerImage,
              {
                width: Math.min(wp(35), moderateScale(150)),
                aspectRatio: gifData.gif_aspect_ratio || 1,
              },
            ]}
            resizeMode="contain"
          />
        </View>
      )}

      {/* Voice Bubble */}
      {isVoice && voiceData && (
        <TouchableOpacity
          activeOpacity={0.8}
          disabled={selectionMode || voiceLoading}
          onPress={handleToggleVoicePlayback}
          style={[
            styles.voiceCard,
            {
              backgroundColor: isCurrentUser
                ? 'rgba(255,255,255,0.12)'
                : (isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'),
              borderColor: isCurrentUser
                ? 'rgba(255,255,255,0.16)'
                : (isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'),
            },
          ]}
        >
          <View style={styles.voiceTopRow}>
            <View
              style={[
                styles.voicePlayButton,
                {
                  backgroundColor: isCurrentUser
                    ? 'rgba(255,255,255,0.2)'
                    : theme.primary,
                },
              ]}
            >
              {voiceLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons
                  name={isVoicePlaying ? 'pause' : 'play'}
                  size={moderateScale(16)}
                  color="#FFFFFF"
                />
              )}
            </View>

            <View style={styles.voiceMetaContainer}>
              <Text
                style={[
                  styles.voiceDuration,
                  {
                    color: isCurrentUser ? 'rgba(255,255,255,0.7)' : theme.textSecondary,
                    fontSize: fontSize(11),
                  },
                ]}
              >
                {formatVoiceTime(voicePositionMs)} / {formatVoiceTime(voiceDurationMs || voiceData.duration || 0)}
              </Text>

              <View style={styles.voiceBarsRow}>
                {(voiceData.waveform || []).map((sample, index) => {
                  const progressRatio = Math.min(
                    1,
                    Math.max(
                      0,
                      (voicePositionMs || 0) / Math.max(1, voiceDurationMs || voiceData.duration || 1)
                    )
                  );
                  const totalBars = Math.max(1, voiceData.waveform?.length || VOICE_VISUAL_BARS);
                  const activeBars = Math.floor(progressRatio * totalBars);
                  const isActive = index < activeBars;
                  const visualSample = Math.pow(Math.max(0.08, Math.min(1, sample)), 0.65);
                  const barHeight = moderateScale(2) + visualSample * moderateScale(13.5);

                  return (
                    <View
                      key={`voice-bar-${message.$id}-${index}`}
                      style={[
                        styles.voiceBar,
                        {
                          height: barHeight,
                          backgroundColor: isActive
                            ? (isCurrentUser ? '#FFFFFF' : theme.primary)
                            : (isCurrentUser ? 'rgba(255,255,255,0.24)' : 'rgba(0,0,0,0.16)'),
                        },
                      ]}
                    />
                  );
                })}
              </View>
            </View>
          </View>
        </TouchableOpacity>
      )}

      {isFile && fileData && (
        <TouchableOpacity
          activeOpacity={0.82}
          disabled={selectionMode || !fileData.url}
          onPress={() => {
            if (!fileData.url) {
              return;
            }

            Linking.openURL(fileData.url).catch(() => {
              if (showAlert) {
                showAlert({
                  type: 'error',
                  title: t('common.error'),
                  message: t('chats.fileOpenError'),
                });
              }
            });
          }}
          style={[
            styles.fileCard,
            {
              backgroundColor: isCurrentUser
                ? 'rgba(255,255,255,0.12)'
                : (isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'),
              borderColor: isCurrentUser
                ? 'rgba(255,255,255,0.16)'
                : (isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'),
            },
          ]}
        >
          <View
            style={[
              styles.fileIconWrap,
              {
                backgroundColor: isCurrentUser
                  ? 'rgba(255,255,255,0.18)'
                  : `${theme.primary}22`,
              },
            ]}
          >
            <Ionicons
              name={fileData.descriptor.iconName}
              size={moderateScale(18)}
              color={isCurrentUser ? '#FFFFFF' : theme.primary}
            />
          </View>

          <View style={styles.fileInfoWrap}>
            <Text
              numberOfLines={1}
              style={[
                styles.fileName,
                {
                  color: isCurrentUser ? '#FFFFFF' : theme.text,
                  fontSize: fontSize(13),
                },
              ]}
            >
              {fileData.name}
            </Text>
            <Text
              style={[
                styles.fileMeta,
                {
                  color: isCurrentUser ? 'rgba(255,255,255,0.72)' : theme.textSecondary,
                  fontSize: fontSize(10),
                },
              ]}
            >
              {`${fileData.descriptor.extensionLabel || t('chats.file').toUpperCase()} • ${formatFileSize(fileData.size)}`}
            </Text>
            {!!fileData.caption && (
              <Text
                numberOfLines={2}
                style={[
                  styles.fileCaption,
                  {
                    color: isCurrentUser ? 'rgba(255,255,255,0.86)' : theme.text,
                    fontSize: fontSize(12),
                  },
                ]}
              >
                {fileData.caption}
              </Text>
            )}
          </View>

          <View style={styles.fileRightWrap}>
            <Text
              style={[
                styles.fileTypeBadge,
                {
                  color: isCurrentUser ? '#FFFFFF' : theme.primary,
                  borderColor: isCurrentUser ? 'rgba(255,255,255,0.3)' : `${theme.primary}55`,
                },
              ]}
            >
              {fileData.descriptor.extensionLabel || t('chats.file').toUpperCase()}
            </Text>
            <Ionicons
              name="open-outline"
              size={moderateScale(14)}
              color={isCurrentUser ? 'rgba(255,255,255,0.78)' : theme.textSecondary}
            />
          </View>
        </TouchableOpacity>
      )}

      {isPoll && pollData && (
        <View
          style={[
            styles.pollCard,
            {
              backgroundColor: isCurrentUser
                ? 'rgba(255,255,255,0.12)'
                : (isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'),
              borderColor: isCurrentUser
                ? 'rgba(255,255,255,0.15)'
                : (isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'),
            },
          ]}
        >
          <Text style={[styles.pollQuestion, { color: isCurrentUser ? '#FFFFFF' : theme.text }]}>
            {pollData.question}
          </Text>

          {pollData.options.map((option) => {
            const voteCount = pollVoteCounts[option.id] || 0;
            const totalVotes = Object.values(pollVoteCounts).reduce((sum, count) => sum + count, 0);
            const percent = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
            const isSelected = pollUserSelections.includes(option.id);
            const isCorrectOption = pollData.isQuiz && pollData.correctOptionId === option.id;
            const showCorrectness = pollData.isQuiz && pollUserSelections.length > 0 && isSelected;
            const optionBg = showCorrectness
              ? (isCorrectOption ? 'rgba(16,185,129,0.22)' : 'rgba(239,68,68,0.2)')
              : (isSelected ? (isCurrentUser ? 'rgba(255,255,255,0.2)' : (isDarkMode ? 'rgba(102,126,234,0.24)' : 'rgba(102,126,234,0.16)')) : 'transparent');

            return (
              <TouchableOpacity
                key={`${message.$id}_${option.id}`}
                style={[styles.pollOption, { borderColor: isCurrentUser ? 'rgba(255,255,255,0.16)' : theme.border, backgroundColor: optionBg }]}
                onPress={() => handlePollOptionPress(option.id)}
                disabled={selectionMode || (pollData.isQuiz && pollUserSelections.length > 0)}
                activeOpacity={0.75}
              >
                <View style={styles.pollOptionLeft}>
                  <Ionicons
                    name={pollData.allowMultiple ? (isSelected ? 'checkbox' : 'square-outline') : (isSelected ? 'radio-button-on' : 'radio-button-off')}
                    size={15}
                    color={isSelected ? (isCurrentUser ? '#FFFFFF' : theme.primary) : (isCurrentUser ? 'rgba(255,255,255,0.7)' : theme.textSecondary)}
                  />
                  <Text style={[styles.pollOptionText, { color: isCurrentUser ? '#FFFFFF' : theme.text }]} numberOfLines={2}>
                    {option.text}
                  </Text>
                </View>
                <Text style={[styles.pollOptionPercent, { color: isCurrentUser ? 'rgba(255,255,255,0.75)' : theme.textSecondary }]}>
                  {percent}%
                </Text>

                {pollData.showVoters && pollUserSelections.length > 0 && showPollVoters && (
                  <View style={styles.pollVotersInlineWrap}>
                    <Text style={[styles.pollVotersInlineCount, { color: isCurrentUser ? 'rgba(255,255,255,0.75)' : theme.textSecondary }]}>
                      {t('post.poll.votersCount').replace('{count}', String((pollVotersByOption[option.id] || []).length))}
                    </Text>
                    {(pollVotersByOption[option.id] || []).length > 0 && (
                      <Text style={[styles.pollVotersInlineNames, { color: isCurrentUser ? 'rgba(255,255,255,0.72)' : theme.textSecondary }]} numberOfLines={2}>
                        {(pollVotersByOption[option.id] || []).map((voterId) => (
                          voterId === currentUserId
                            ? t('common.you')
                            : (pollVoterNames[voterId] || voterId)
                        )).join(' • ')}
                      </Text>
                    )}
                  </View>
                )}
              </TouchableOpacity>
            );
          })}

          <View style={styles.pollFooter}>
            <Text style={[styles.pollMetaText, { color: isCurrentUser ? 'rgba(255,255,255,0.7)' : theme.textSecondary }]}>
              {t('post.poll.totalVotes').replace('{count}', String(Object.values(pollVoteCounts).reduce((sum, count) => sum + count, 0)))}
            </Text>

            <View style={styles.pollFooterActions}>
              {pollData.showVoters && pollUserSelections.length > 0 && (
                <TouchableOpacity
                  style={styles.pollFooterIconButton}
                  onPress={() => setShowPollVoters((prev) => !prev)}
                  activeOpacity={0.75}
                >
                  <Ionicons name="people-outline" size={14} color={isCurrentUser ? 'rgba(255,255,255,0.75)' : theme.textSecondary} />
                </TouchableOpacity>
              )}

              {pollData.isQuiz && pollUserSelections.length > 0 && pollData.explanation && (
                <TouchableOpacity
                  style={styles.pollFooterIconButton}
                  onPress={() => setShowPollExplanation((prev) => !prev)}
                  activeOpacity={0.75}
                >
                  <Ionicons name="information-circle-outline" size={15} color={isCurrentUser ? 'rgba(255,255,255,0.75)' : theme.textSecondary} />
                </TouchableOpacity>
              )}

              {pollData.isQuiz && pollUserSelections.length > 0 && pollAnswerCorrect !== null && (
                <Text style={[styles.pollMetaText, { color: pollAnswerCorrect ? '#10B981' : '#EF4444' }]}>
                  {pollAnswerCorrect ? t('post.poll.correct') : t('post.poll.incorrect')}
                </Text>
              )}
            </View>
          </View>

          {pollData.isQuiz && pollUserSelections.length > 0 && pollData.explanation && showPollExplanation && (
            <View
              style={[
                styles.pollExplanationWrap,
                {
                  borderColor: isCurrentUser ? 'rgba(255,255,255,0.16)' : theme.border,
                  backgroundColor: isCurrentUser
                    ? 'rgba(255,255,255,0.1)'
                    : (isDarkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'),
                },
              ]}
            >
              <Text style={[styles.pollExplanationText, { color: isCurrentUser ? 'rgba(255,255,255,0.86)' : theme.textSecondary }]}>
                {pollData.explanation}
              </Text>
            </View>
          )}
        </View>
      )}

      {!isLectureAssetBanner && !isPostShare && !isLocation && !isGif && !isVoice && !isPoll && !isFile && hasImage && (
        <TouchableOpacity 
          onPress={() => setImageModalVisible(true)}
          disabled={selectionMode}
          activeOpacity={0.9}>
          <Image 
            source={{ uri: imageUrl }}
            style={[
              styles.messageImage,
              !hasText && styles.messageImageOnly,
            ]}
            resizeMode="cover"
          />
        </TouchableOpacity>
      )}

      {((!isLectureAssetBanner && !isPostShare && !isLocation && !isGif && !isVoice && !isPoll && !isFile) || hasEncryptedFallbackText)
        && renderMessageContent()}
      
      <View style={styles.timeStatusRow}>
        <Text style={[
          styles.timeText,
          { 
            fontSize: fontSize(9),
            color: isCurrentUser 
              ? 'rgba(255,255,255,0.6)' 
              : theme.textSecondary
          }
        ]}>
          {formatTime(message.createdAt || message.$createdAt)}
        </Text>
        
        {/* Status indicator for current user's messages */}
        {isCurrentUser && !isLectureAssetBanner && (
          <MessageStatusIndicator
            status={message._status || message.status}
            readBy={message.readBy}
            deliveredTo={message.deliveredTo}
            chatType={chatType}
            otherUserPhoto={otherUserPhoto}
            otherUserName={otherUserName}
            participantCount={participantCount}
            theme={theme}
            isDarkMode={isDarkMode}
            isLastSeenMessage={isLastSeenMessage}
          />
        )}
      </View>
      
      {/* Retry button for failed messages */}
      {message._status === 'failed' && onRetry && (
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={() => onRetry(message)}
        >
          <Ionicons name="refresh" size={moderateScale(12)} color="#EF4444" />
          <Text style={styles.retryText}>{t('common.retry') || 'Retry'}</Text>
        </TouchableOpacity>
      )}
    </>
  );

  return (
    <ReanimatedView style={[
      styles.container,
      isLectureAssetBanner
        ? styles.lectureBannerContainer
        : (isCurrentUser ? styles.currentUserContainer : styles.otherUserContainer),
      isCurrentSearchResult && styles.currentSearchResultContainer,
      highlightAnimatedStyle,
    ]}>
      {/* Selection Mode Checkbox */}
      {selectionMode && (
        <TouchableOpacity
          style={styles.selectionCheckbox}
          onPress={() => onToggleSelect && onToggleSelect(message.$id)}
          activeOpacity={0.7}>
          <Ionicons
            name={isSelected ? 'checkbox' : 'square-outline'}
            size={moderateScale(22)}
            color={isSelected ? theme.primary : theme.textSecondary}
          />
        </TouchableOpacity>
      )}

      {/* Show sender name for other users */}
      {!isCurrentUser && senderName && !isLectureAssetBanner && (
        <View style={[styles.senderNameRow, styles.senderNameWithAvatar]}>
          <Text style={[
            styles.senderName, 
            { fontSize: fontSize(11), color: theme.primary }
          ]}>
            {senderName}
          </Text>
          {isRepresentative && (
            <View style={[styles.repBadge, { backgroundColor: theme.warning }]}>
              <Ionicons name="star" size={8} color="#FFFFFF" />
              <Text style={styles.repBadgeText}>{t('chats.rep') || 'Rep'}</Text>
            </View>
          )}
        </View>
      )}
      
      <View style={[styles.messageRow, isLectureAssetBanner && styles.lectureBannerRow]}>
        {/* Show avatar for other users - always reserve space for consistent alignment */}
        {!isCurrentUser && !isLectureAssetBanner && (
          <View style={styles.avatarContainer}>
            {showAvatar ? (
              <TouchableOpacity 
                onPress={() => onAvatarPress && onAvatarPress(message.senderId)}
                activeOpacity={0.7}
              >
                <ProfilePicture 
                  uri={senderPhoto || message.senderPhoto}
                  name={senderName || message.senderName}
                  size={moderateScale(28)}
                />
              </TouchableOpacity>
            ) : (
              <View style={styles.avatarPlaceholder} />
            )}
          </View>
        )}
        
        <Animated.View 
          style={[
            { transform: [{ translateX }] },
            styles.bubbleWrapper,
            isLectureAssetBanner && styles.lectureBannerBubbleWrapper,
          ]}
          {...(canReply ? panResponder.panHandlers : {})}>
          {/* Render bubble with gradient or solid color based on chatSettings */}
          {isCurrentUser && !isLectureAssetBanner && chatSettings?.bubbleColor?.startsWith('gradient::') ? (
            <Pressable
              onLongPress={handleLongPress}
              onPress={handlePress}
              delayLongPress={300}>
              {isSticker ? (
                <View style={[styles.stickerBubble]}>
                  {renderBubbleContent()}
                </View>
              ) : (
              <LinearGradient
                colors={chatSettings.bubbleColor.replace('gradient::', '').split(',')}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[
                  styles.bubble,
                  styles.currentUserBubble,
                  getBubbleStyleRadius(chatSettings),
                  hasImage && !hasText && styles.imageBubble,
                  isPinned && styles.pinnedBubble,
                ]}>
                {renderBubbleContent()}
              </LinearGradient>
              )}
            </Pressable>
          ) : (
            <Pressable
              onLongPress={handleLongPress}
              onPress={handlePress}
              delayLongPress={300}
              style={[
                isSticker ? styles.stickerBubble : (!isLectureAssetBanner ? styles.bubble : null),
                !isSticker && (isCurrentUser ? styles.currentUserBubble : styles.otherUserBubble),
                !isSticker && isLectureAssetBanner && styles.lectureBannerBubble,
                !isSticker && getBubbleStyleRadius(chatSettings),
                !isSticker && {
                  backgroundColor: isLectureAssetBanner
                    ? 'transparent'
                    : (isCurrentUser
                    ? (chatSettings?.bubbleColor || '#667eea')
                    : (isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)')
                    )
                },
                !isSticker && hasImage && !hasText && styles.imageBubble,
                !isSticker && isPinned && styles.pinnedBubble,
              ]}>
              {renderBubbleContent()}
            </Pressable>
          )}

          {showCornerReactionAdd && !isLectureAssetBanner && (
            <TouchableOpacity
              style={styles.reactionAddCorner}
              onPress={() => setReactionPickerVisible(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={moderateScale(14)} color={theme.textSecondary} />
            </TouchableOpacity>
          )}
        </Animated.View>
      </View>

      {!isLectureAssetBanner && reactionEntries.length > 0 && (
        <View style={[
          styles.reactionsRow,
          isCurrentUser ? styles.reactionsRowRight : styles.reactionsRowLeft,
        ]}>
          {reactionEntries.map(([emoji, users]) => {
            const count = users.length;
            const reacted = currentUserId ? users.includes(currentUserId) : false;
            return (
              <TouchableOpacity
                key={`${emoji}-${count}`}
                style={[
                  styles.reactionChip,
                  reacted && { backgroundColor: isDarkMode ? 'rgba(102,126,234,0.25)' : 'rgba(102,126,234,0.18)' },
                ]}
                onPress={() => handleReactionSelect(emoji)}
                activeOpacity={0.8}
              >
                <Text style={styles.reactionEmojiChipText}>{emoji}</Text>
                <Text style={[styles.reactionCount, { color: isCurrentUser ? 'rgba(255,255,255,0.85)' : theme.textSecondary }]}>
                  {count}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Swipe indicator */}
      {canReply && (
        <View style={[
          styles.swipeIndicator,
          isCurrentUser ? styles.swipeIndicatorLeft : styles.swipeIndicatorRight,
        ]}>
          <Ionicons 
            name="arrow-undo" 
            size={moderateScale(16)} 
            color={theme.textSecondary} 
          />
        </View>
      )}

      {/* Image Modal - Zoomable */}
      <ZoomableImageModal
        visible={imageModalVisible}
        images={hasImages ? message.images : (imageUrl ? [imageUrl] : [])}
        initialIndex={0}
        onClose={() => setImageModalVisible(false)}
        showDownload={true}
        showShare={true}
      />

      {/* Actions Modal */}
      <Modal
        visible={actionsVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setActionsVisible(false)}>
        <Pressable 
          style={styles.actionsOverlay}
          onPress={() => setActionsVisible(false)}>
          <View style={[
            styles.actionsContainer,
            { backgroundColor: isDarkMode ? '#2a2a40' : '#FFFFFF' }
          ]}>
            {onToggleReaction && (
              <View style={styles.reactionQuickRow}>
                {quickReactions.map((emoji) => (
                  <TouchableOpacity
                    key={emoji}
                    style={styles.reactionQuickButton}
                    onPress={() => {
                      setActionsVisible(false);
                      handleReactionSelect(emoji);
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.reactionEmojiText}>{emoji}</Text>
                  </TouchableOpacity>
                ))}
                {onEditReactions && (
                  <TouchableOpacity
                    style={styles.reactionQuickIcon}
                    onPress={() => {
                      setActionsVisible(false);
                      setTimeout(onEditReactions, 100);
                    }}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="settings-outline" size={moderateScale(16)} color={theme.textSecondary} />
                  </TouchableOpacity>
                )}
              </View>
            )}
            {actionButtons.map((btn, index) => (
              <TouchableOpacity
                key={btn.icon}
                style={[
                  styles.actionButton,
                  index < actionButtons.length - 1 && styles.actionButtonBorder,
                  { borderBottomColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }
                ]}
                onPress={() => handleAction(btn.action)}>
                <Ionicons 
                  name={btn.icon} 
                  size={moderateScale(20)} 
                  color={btn.danger ? '#EF4444' : theme.text} 
                />
                <Text style={[
                  styles.actionLabel,
                  { 
                    fontSize: fontSize(14), 
                    color: btn.danger ? '#EF4444' : theme.text 
                  }
                ]}>
                  {btn.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>

      <Modal
        visible={reactionPickerVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setReactionPickerVisible(false)}>
        <Pressable
          style={styles.reactionPickerOverlay}
          onPress={() => setReactionPickerVisible(false)}
        >
          <Pressable
            style={[
              styles.reactionPickerContent,
              { backgroundColor: isDarkMode ? '#2a2a40' : '#FFFFFF' }
            ]}
            onPress={() => {}}
          >
            <Text style={[styles.reactionPickerTitle, { color: theme.text, fontSize: fontSize(14) }]}>
              {t('chats.addReaction')}
            </Text>

            <View style={styles.reactionPickerRow}>
              {quickReactions.map((emoji) => (
                <TouchableOpacity
                  key={`picker-${emoji}`}
                  style={styles.reactionQuickButton}
                  onPress={() => handleReactionSelect(emoji, true)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.reactionEmojiText}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>

          </Pressable>
        </Pressable>
      </Modal>

      {/* Mention Preview Modal - Compact popup showing user profile */}
      <Modal
        visible={!!mentionPreview}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setMentionPreview(null)}>
        <Pressable 
          style={styles.mentionPreviewOverlay}
          onPress={() => setMentionPreview(null)}>
          <View style={[
            styles.mentionPreviewContainer,
            { backgroundColor: isDarkMode ? '#2a2a40' : '#FFFFFF' }
          ]}>
            {mentionPreview && (
              <>
                <View style={styles.mentionPreviewHeader}>
                  {mentionPreview.profilePicture ? (
                    <Image 
                      source={{ uri: mentionPreview.profilePicture }} 
                      style={styles.mentionPreviewAvatar}
                    />
                  ) : (
                    <View style={[styles.mentionPreviewAvatarPlaceholder, { backgroundColor: theme.primary }]}>
                      <Text style={styles.mentionPreviewAvatarText}>
                        {(mentionPreview.name || '?')[0].toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <Text style={[styles.mentionPreviewName, { color: theme.text, fontSize: fontSize(16) }]}>
                    {mentionPreview.name}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.mentionPreviewButton, { backgroundColor: theme.primary }]}
                  onPress={() => {
                    setMentionPreview(null);
                    if (onNavigateToProfile && mentionPreview.id) {
                      onNavigateToProfile(mentionPreview.id);
                    } else if (onAvatarPress && mentionPreview.id) {
                      onAvatarPress(mentionPreview.id);
                    }
                  }}
                  activeOpacity={0.7}>
                  <Ionicons name="person-outline" size={moderateScale(16)} color="#FFFFFF" />
                  <Text style={[styles.mentionPreviewButtonText, { fontSize: fontSize(14) }]}>
                    {t('chats.visitProfile')}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </Pressable>
      </Modal>
    </ReanimatedView>
  );
};

export default memo(MessageBubble);
