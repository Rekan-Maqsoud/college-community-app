import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  PanResponder,
  StyleSheet,
  Platform,
  Image,
  ActivityIndicator,
  Text,
  Modal,
  Pressable,
  Animated,
  Keyboard,
  Linking,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
  RecordingPresets,
} from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';
import LeafletMap from './LeafletMap';
import GiphyPickerModal from './GiphyPickerModal';
import { useAppSettings } from '../context/AppSettingsContext';
import {
  fontSize,
  spacing,
  moderateScale,
  wp,
} from '../utils/responsive';
import { borderRadius } from '../theme/designTokens';
import { pickAndCompressImages, takePictureAndCompress } from '../utils/imageCompression';
import { uploadChatImage, uploadChatVoiceMessage } from '../../database/chats';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';

const MAX_INPUT_LINES = 5;
const LINE_HEIGHT = moderateScale(20);
const MAX_INPUT_HEIGHT = LINE_HEIGHT * MAX_INPUT_LINES;
const GIF_SEND_COOLDOWN_MS = 300;
const VOICE_LOCK_THRESHOLD = moderateScale(70);
const VOICE_CANCEL_THRESHOLD = moderateScale(90);
const VOICE_LOCK_HORIZONTAL_TOLERANCE = moderateScale(58);
const VOICE_PRESS_RETENTION = moderateScale(120);
const MIN_VOICE_DURATION_MS = 500;
const VOICE_WAVE_BARS = 16;
const VOICE_WAVE_PAYLOAD_BARS = 24;
const VOICE_WAVE_HISTORY_LIMIT = 600;

const MessageInput = ({
  onSend,
  disabled = false,
  placeholder,
  replyingTo,
  onCancelReply,
  showMentionButton = false,
  canMentionEveryone = false,
  groupMembers = [],
  friends = [],
  showAlert,
}) => {
  const { theme, isDarkMode, t } = useAppSettings();
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();
  const [message, setMessage] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [pendingLocation, setPendingLocation] = useState(null);
  const [showLocationPreview, setShowLocationPreview] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [showGiphyPicker, setShowGiphyPicker] = useState(false);
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionStartIndex, setMentionStartIndex] = useState(-1);
  const [isRecording, setIsRecording] = useState(false);
  const [isRecordingLocked, setIsRecordingLocked] = useState(false);
  const [recordingDurationMs, setRecordingDurationMs] = useState(0);
  const [recordingWaveform, setRecordingWaveform] = useState(Array(VOICE_WAVE_BARS).fill(0.15));
  const [recordingSlideOffsetX, setRecordingSlideOffsetX] = useState(0);
  const [isLockTargetActive, setIsLockTargetActive] = useState(false);
  const lastGifSentAtRef = useRef(0);
  const recordingDurationIntervalRef = useRef(null);
  const recordingStartYRef = useRef(0);
  const recordingStartXRef = useRef(0);
  const recordingDeltaYRef = useRef(0);
  const recordingDeltaXRef = useRef(0);
  const recordingGestureCancelledRef = useRef(false);
  const recordingStartedAtRef = useRef(0);
  const recordingWaveformRef = useRef(Array(VOICE_WAVE_BARS).fill(0.15));
  const recordingWaveformHistoryRef = useRef([]);
  const isRecordingRef = useRef(false);
  const isRecordingLockedRef = useRef(false);
  const disabledRef = useRef(disabled);
  const uploadingRef = useRef(uploading);
  const isPanGestureActiveRef = useRef(false);
  const inputRef = useRef(null);
  const actionSheetAnim = useRef(new Animated.Value(0)).current;
  const audioRecorder = useAudioRecorder({
    ...RecordingPresets.HIGH_QUALITY,
    isMeteringEnabled: true,
  });
  const recorderState = useAudioRecorderState(audioRecorder, 120);

  // Animate action sheet
  useEffect(() => {
    Animated.spring(actionSheetAnim, {
      toValue: showActionSheet ? 1 : 0,
      tension: 65,
      friction: 11,
      useNativeDriver: true,
    }).start();
  }, [showActionSheet]);

  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  useEffect(() => {
    isRecordingLockedRef.current = isRecordingLocked;
  }, [isRecordingLocked]);

  useEffect(() => {
    recordingWaveformRef.current = recordingWaveform;
  }, [recordingWaveform]);

  useEffect(() => {
    disabledRef.current = disabled;
  }, [disabled]);

  useEffect(() => {
    uploadingRef.current = uploading;
  }, [uploading]);

  useEffect(() => {
    return () => {
      if (recordingDurationIntervalRef.current) {
        clearInterval(recordingDurationIntervalRef.current);
      }
      audioRecorder.stop().catch(() => {});
    };
  }, [audioRecorder]);

  const formatVoiceDuration = (durationMs) => {
    const totalSeconds = Math.max(0, Math.floor((durationMs || 0) / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  const clearRecordingTicker = () => {
    if (recordingDurationIntervalRef.current) {
      clearInterval(recordingDurationIntervalRef.current);
      recordingDurationIntervalRef.current = null;
    }
  };

  const startRecordingTicker = () => {
    clearRecordingTicker();
    recordingDurationIntervalRef.current = setInterval(() => {
      if (!isRecordingRef.current || !recordingStartedAtRef.current) {
        return;
      }
      const elapsed = Date.now() - recordingStartedAtRef.current;
      setRecordingDurationMs((prev) => Math.max(prev, elapsed));
    }, 250);
  };

  const appendWaveSample = (level) => {
    const normalized = Math.max(0.08, Math.min(1, level));

    recordingWaveformHistoryRef.current.push(normalized);
    if (recordingWaveformHistoryRef.current.length > VOICE_WAVE_HISTORY_LIMIT) {
      recordingWaveformHistoryRef.current = recordingWaveformHistoryRef.current.slice(-VOICE_WAVE_HISTORY_LIMIT);
    }

    setRecordingWaveform((prev) => {
      const next = prev.slice(-VOICE_WAVE_BARS + 1);
      next.push(normalized);
      return next;
    });
  };

  const serializeVoiceWaveform = (samples, targetBars = VOICE_WAVE_PAYLOAD_BARS) => {
    const sanitized = (Array.isArray(samples) ? samples : [])
      .map((sample) => Number(sample))
      .filter((sample) => Number.isFinite(sample))
      .map((sample) => Math.max(0.08, Math.min(1, sample)));

    if (sanitized.length === 0) {
      return Array(targetBars).fill(0.15);
    }

    return Array.from({ length: targetBars }, (_, index) => {
      const segmentStart = Math.floor((index * sanitized.length) / targetBars);
      const segmentEnd = Math.max(
        segmentStart + 1,
        Math.floor(((index + 1) * sanitized.length) / targetBars)
      );
      const segment = sanitized.slice(segmentStart, segmentEnd);
      const peak = Math.max(...segment);
      const average = segment.reduce((sum, value) => sum + value, 0) / Math.max(1, segment.length);
      const signal = Math.max(0.08, Math.min(1, (peak * 0.78) + (average * 0.22)));
      return Number(signal.toFixed(3));
    });
  };

  const resetRecordingState = () => {
    clearRecordingTicker();
    setIsRecording(false);
    setIsRecordingLocked(false);
    setRecordingDurationMs(0);
    setRecordingWaveform(Array(VOICE_WAVE_BARS).fill(0.15));
    setRecordingSlideOffsetX(0);
    setIsLockTargetActive(false);
    recordingDeltaYRef.current = 0;
    recordingDeltaXRef.current = 0;
    recordingGestureCancelledRef.current = false;
    recordingStartedAtRef.current = 0;
    recordingWaveformHistoryRef.current = [];
    isPanGestureActiveRef.current = false;
    isRecordingRef.current = false;
    isRecordingLockedRef.current = false;
  };

  const isWithinLockTarget = (deltaY, deltaX) => {
    if (deltaY < VOICE_LOCK_THRESHOLD) {
      return false;
    }
    return Math.abs(deltaX) <= VOICE_LOCK_HORIZONTAL_TOLERANCE;
  };

  const applyGestureDeltas = (deltaY, deltaX) => {
    recordingDeltaYRef.current = deltaY;
    recordingDeltaXRef.current = deltaX;

    if (deltaX < 0) {
      setRecordingSlideOffsetX(Math.max(deltaX, -VOICE_CANCEL_THRESHOLD));
    } else {
      setRecordingSlideOffsetX(0);
    }

    const lockHovering = isWithinLockTarget(deltaY, deltaX);
    setIsLockTargetActive(lockHovering);
    return lockHovering;
  };

  const lockCurrentRecording = () => {
    setIsRecordingLocked(true);
    isRecordingLockedRef.current = true;
    setRecordingSlideOffsetX(0);
    setIsLockTargetActive(false);
  };

  useEffect(() => {
    if (!isRecording) {
      return;
    }

    const recorderDuration = Number(recorderState?.durationMillis || 0);
    if (recorderDuration > 0) {
      setRecordingDurationMs((prev) => Math.max(prev, recorderDuration));
    }

    const metering = Number(recorderState?.metering);
    if (Number.isFinite(metering)) {
      const clampedDb = Math.max(-80, Math.min(0, metering));
      const amplitude = Math.pow(10, clampedDb / 20);
      const level = Math.max(0.08, Math.min(1, Math.pow(amplitude, 0.55)));
      appendWaveSample(level);
    } else {
      const previous = recordingWaveformHistoryRef.current[recordingWaveformHistoryRef.current.length - 1] || 0.12;
      appendWaveSample(Math.max(0.08, previous * 0.985));
    }
  }, [isRecording, recorderState?.durationMillis, recorderState?.metering]);

  const startVoiceRecording = async () => {
    if (disabled || uploading || isRecordingRef.current || message.trim() || selectedImage) {
      return;
    }

    try {
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) {
        if (!permission.canAskAgain) {
          showPermissionDeniedAlert('microphone');
        } else {
          triggerAlert(t('common.error'), t('chats.microphonePermissionDenied'));
        }
        return;
      }

      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
        shouldRouteThroughEarpiece: false,
      });

      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();

      recordingStartedAtRef.current = Date.now();
      recordingWaveformHistoryRef.current = [];
      setRecordingDurationMs(0);
      setRecordingWaveform(Array(VOICE_WAVE_BARS).fill(0.15));
      setIsRecording(true);
      setIsRecordingLocked(false);
      setIsLockTargetActive(false);
      startRecordingTicker();
    } catch (error) {
      resetRecordingState();
      triggerAlert(t('common.error'), t('chats.voiceRecordingFailed'));
    }
  };

  const stopVoiceRecording = async ({ shouldSend }) => {
    if (!audioRecorder) {
      resetRecordingState();
      return;
    }

    try {
      clearRecordingTicker();
      const statusBeforeStop = audioRecorder.getStatus();
      if (statusBeforeStop?.isRecording) {
        await audioRecorder.stop();
      }
      const finalStatus = audioRecorder.getStatus();

      const durationMillis = Math.max(
        Number(finalStatus?.durationMillis || 0),
        Number(recordingDurationMs || 0),
        recordingStartedAtRef.current ? (Date.now() - recordingStartedAtRef.current) : 0
      );
      const recordingUri = audioRecorder.uri || finalStatus?.url || null;
      const waveformForPayload = serializeVoiceWaveform(
        recordingWaveformHistoryRef.current,
        VOICE_WAVE_PAYLOAD_BARS
      );
      resetRecordingState();

      if (!shouldSend || !recordingUri) {
        if (recordingUri) {
          FileSystem.deleteAsync(recordingUri, { idempotent: true }).catch(() => {});
        }
        return;
      }

      if (durationMillis < MIN_VOICE_DURATION_MS) {
        triggerAlert(t('common.error'), t('chats.voiceTooShort'));
        FileSystem.deleteAsync(recordingUri, { idempotent: true }).catch(() => {});
        return;
      }

      if (!onSend) {
        return;
      }

      setUploading(true);
      const info = await FileSystem.getInfoAsync(recordingUri, { size: true });
      const uploadedVoice = await uploadChatVoiceMessage({
        uri: recordingUri,
        name: `voice_${Date.now()}.m4a`,
        type: 'audio/m4a',
        size: info?.size || 0,
      });

      await onSend('', null, 'voice', {
        voice_url: uploadedVoice.viewUrl,
        voice_file_id: uploadedVoice.fileId,
        voice_duration_ms: durationMillis,
        voice_mime_type: uploadedVoice.mimeType || 'audio/m4a',
        voice_size: uploadedVoice.size || info?.size || 0,
        voice_waveform: waveformForPayload,
      });

      FileSystem.deleteAsync(recordingUri, { idempotent: true }).catch(() => {});
    } catch (error) {
      triggerAlert(t('common.error'), t('chats.voiceSendError'));
    } finally {
      setUploading(false);
      setAudioModeAsync({
        allowsRecording: false,
        playsInSilentMode: true,
      }).catch(() => {});
    }
  };

  const voicePanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onStartShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponder: () => isRecordingRef.current,
      onMoveShouldSetPanResponderCapture: () => isRecordingRef.current,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        isPanGestureActiveRef.current = true;
      },
      onPanResponderMove: (event) => {
        if (!isRecordingRef.current || isRecordingLockedRef.current) {
          return;
        }

        const currentY = event?.nativeEvent?.pageY || 0;
        const currentX = event?.nativeEvent?.pageX || 0;
        const deltaY = recordingStartYRef.current - currentY;
        const deltaX = currentX - recordingStartXRef.current;

        applyGestureDeltas(deltaY, deltaX);

        if (deltaX <= -VOICE_CANCEL_THRESHOLD) {
          recordingGestureCancelledRef.current = true;
          stopVoiceRecording({ shouldSend: false });
        }
      },
      onPanResponderRelease: () => {
        isPanGestureActiveRef.current = false;
        if (!isRecordingRef.current) {
          return;
        }
        if (recordingGestureCancelledRef.current) {
          return;
        }

        if (recordingDeltaXRef.current <= -VOICE_CANCEL_THRESHOLD) {
          stopVoiceRecording({ shouldSend: false });
          return;
        }

        if (isWithinLockTarget(recordingDeltaYRef.current, recordingDeltaXRef.current)) {
          lockCurrentRecording();
          return;
        }

        if (!isRecordingLockedRef.current) {
          stopVoiceRecording({ shouldSend: true });
        } else {
          setRecordingSlideOffsetX(0);
        }
      },
      onPanResponderTerminate: () => {
        isPanGestureActiveRef.current = false;
        if (!isRecordingRef.current) {
          return;
        }
        stopVoiceRecording({ shouldSend: false });
      },
    })
  ).current;

  // --- Mention logic ---
  const getMentionSuggestions = () => {
    const suggestions = [];
    if (canMentionEveryone) {
      suggestions.push({
        id: 'everyone',
        name: 'everyone',
        displayName: t('chats.mentionEveryone') || 'Everyone',
        isSpecial: true,
      });
    }
    const allUsers = [...groupMembers];
    friends.forEach((friend) => {
      if (!allUsers.find((u) => u.$id === friend.$id)) {
        allUsers.push(friend);
      }
    });
    const q = mentionQuery.toLowerCase();
    const filtered = allUsers.filter((user) => {
      const name = (user.name || user.fullName || '').toLowerCase();
      return name.includes(q);
    });
    filtered.slice(0, 3).forEach((user) => {
      suggestions.push({
        id: user.$id,
        name: user.name || user.fullName,
        displayName: user.name || user.fullName,
        profilePicture: user.profilePicture,
        isSpecial: false,
      });
    });
    return suggestions.slice(0, 4);
  };

  const handleTextChange = (text) => {
    setMessage(text);
    const lastAtIndex = text.lastIndexOf('@');
    if (lastAtIndex !== -1) {
      const textAfterAt = text.slice(lastAtIndex + 1);
      if (!textAfterAt.includes(' ') && textAfterAt.length <= 20) {
        setMentionStartIndex(lastAtIndex);
        setMentionQuery(textAfterAt);
        setShowMentionSuggestions(true);
        return;
      }
    }
    setShowMentionSuggestions(false);
    setMentionQuery('');
    setMentionStartIndex(-1);
  };

  const handleSelectMention = (suggestion) => {
    const beforeMention = message.slice(0, mentionStartIndex);
    const afterMention = message.slice(mentionStartIndex + mentionQuery.length + 1);
    const mentionText = suggestion.isSpecial ? '@everyone' : `@${suggestion.name}`;
    setMessage(beforeMention + mentionText + ' ' + afterMention);
    setShowMentionSuggestions(false);
    setMentionQuery('');
    setMentionStartIndex(-1);
  };

  const triggerAlert = (title, msg, type = 'error', buttons = []) => {
    if (showAlert) {
      showAlert({ type, title, message: msg, buttons });
    }
  };

  // --- Action handlers ---
  const closeActionSheet = () => setShowActionSheet(false);

  // Smart permission helper: shows alert with "Open Settings" button when permanently denied
  const showPermissionDeniedAlert = (permissionType) => {
    const titles = {
      gallery: t('errors.galleryPermissionDenied') || 'Gallery Access Required',
      camera: t('errors.cameraPermissionDenied') || 'Camera Access Required',
      location: t('chats.locationPermissionDenied') || 'Location Access Required',
      microphone: t('chats.microphonePermissionDeniedTitle'),
    };
    const descriptions = {
      gallery: t('permissions.galleryDesc') || 'Please allow gallery access in your device settings to share photos.',
      camera: t('permissions.cameraDesc') || 'Please allow camera access in your device settings to take photos.',
      location: t('permissions.locationDesc') || 'Please allow location access in your device settings to share your location.',
      microphone: t('permissions.microphoneDesc'),
    };

    triggerAlert(
      titles[permissionType],
      descriptions[permissionType],
      'warning',
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('notifications.openSettings') || 'Open Settings',
          onPress: () => Linking.openSettings(),
        },
      ]
    );
  };

  const handlePickImage = async () => {
    if (disabled || uploading) return;
    closeActionSheet();
    try {
      // Pre-check permission to handle permanently-denied case
      const { status, canAskAgain } = await ImagePicker.getMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        const req = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!req.granted) {
          if (!req.canAskAgain) {
            showPermissionDeniedAlert('gallery');
          } else {
            triggerAlert(t('common.error'), t('errors.galleryPermissionDenied') || 'Gallery permission is required');
          }
          return;
        }
      }

      const result = await pickAndCompressImages({
        allowsMultipleSelection: false,
        maxImages: 1,
        quality: 'medium',
      });
      if (result && result.length > 0) {
        setSelectedImage(result[0]);
      }
    } catch (error) {
      if (error.translationKey === 'errors.galleryPermissionDenied') {
        showPermissionDeniedAlert('gallery');
      } else {
        triggerAlert(t('common.error'), error.message || t('chats.imagePickError'));
      }
    }
  };

  const handleTakePicture = async () => {
    if (disabled || uploading) return;
    closeActionSheet();
    try {
      // Pre-check permission to handle permanently-denied case
      const { status, canAskAgain } = await ImagePicker.getCameraPermissionsAsync();
      if (status !== 'granted') {
        const req = await ImagePicker.requestCameraPermissionsAsync();
        if (!req.granted) {
          if (!req.canAskAgain) {
            showPermissionDeniedAlert('camera');
          } else {
            triggerAlert(t('common.error'), t('errors.cameraPermissionDenied') || 'Camera permission is required');
          }
          return;
        }
      }

      const result = await takePictureAndCompress({ quality: 'medium' });
      if (result) {
        setSelectedImage(result);
      }
    } catch (error) {
      if (error.translationKey === 'errors.cameraPermissionDenied') {
        showPermissionDeniedAlert('camera');
      } else {
        triggerAlert(t('common.error'), error.message || t('chats.cameraError'));
      }
    }
  };

  const handleSendLocation = async () => {
    closeActionSheet();
    setLocationLoading(true);
    try {
      const { status, canAskAgain } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted') {
        const req = await Location.requestForegroundPermissionsAsync();
        if (req.status !== 'granted') {
          if (!req.canAskAgain) {
            showPermissionDeniedAlert('location');
          } else {
            triggerAlert(t('common.error'), t('chats.locationPermissionDenied'));
          }
          return;
        }
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const { latitude, longitude } = location.coords;
      setPendingLocation({ lat: latitude, long: longitude });
      setShowLocationPreview(true);
    } catch {
      triggerAlert(t('common.error'), t('errors.locationFailed'));
    } finally {
      setLocationLoading(false);
    }
  };

  const handleConfirmLocation = async () => {
    if (pendingLocation && onSend) {
      await onSend(`${pendingLocation.lat},${pendingLocation.long}`, null, 'location');
    }
    setShowLocationPreview(false);
    setPendingLocation(null);
  };

  const handleCancelLocation = () => {
    setShowLocationPreview(false);
    setPendingLocation(null);
  };

  const handleSendFile = () => {
    closeActionSheet();
    triggerAlert(t('chats.sendFile') || 'File', t('chats.comingSoon') || 'Coming soon', 'info');
  };

  const handleOpenGiphy = () => {
    closeActionSheet();
    Keyboard.dismiss();
    setTimeout(() => setShowGiphyPicker(true), 200);
  };

  const handleGifSelected = async (gifData) => {
    if (!onSend) return false;
    const now = Date.now();
    if (now - lastGifSentAtRef.current < GIF_SEND_COOLDOWN_MS) {
      return false;
    }

    lastGifSentAtRef.current = now;

    try {
      const metadata = {
        gif_url: gifData.url,
        gif_preview_url: gifData.previewUrl,
        gif_width: gifData.width,
        gif_height: gifData.height,
        gif_aspect_ratio: gifData.aspectRatio,
        gif_id: gifData.id,
        gif_title: gifData.title || '',
        gif_source: gifData.source || 'giphy',
        gif_type: gifData.type || 'gif',
      };
      await onSend(null, null, 'gif', metadata);
      return true;
    } catch {
      triggerAlert(t('common.error'), t('chats.sendError'));
      return false;
    }
  };

  const handleTagUser = () => {
    closeActionSheet();
    setMessage((prev) => prev + '@');
    setMentionStartIndex(message.length);
    setMentionQuery('');
    setShowMentionSuggestions(true);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
  };

  const uploadImage = async (imageAsset) => {
    try {
      if (!imageAsset?.uri) {
        throw new Error(t('errors.imageUploadFailed'));
      }
      const result = await uploadChatImage({
        uri: imageAsset.uri,
        name: imageAsset.fileName || `chat_image_${Date.now()}.jpg`,
        type: imageAsset.mimeType || 'image/jpeg',
      });
      return result?.viewUrl || null;
    } catch {
      throw new Error(t('errors.imageUploadFailed'));
    }
  };

  const handleSend = async () => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage && !selectedImage) return;
    if (!onSend) return;

    const messageToSend = trimmedMessage;
    const imageToSend = selectedImage;
    setMessage('');
    if (inputRef.current) inputRef.current.focus();

    try {
      let imageUrl = null;
      if (imageToSend) {
        setUploading(true);
        setSelectedImage(null);
        imageUrl = await uploadImage(imageToSend);
      }
      await onSend(messageToSend, imageUrl);
    } catch (error) {
      setMessage(messageToSend);
      triggerAlert(t('common.error'), error.message || t('chats.sendError'));
    } finally {
      setUploading(false);
    }
  };

  // --- Action sheet items ---
  const actionItems = [
    {
      key: 'gallery',
      icon: 'images',
      color: '#8B5CF6',
      label: t('chats.gallery') || 'Gallery',
      onPress: handlePickImage,
    },
    {
      key: 'camera',
      icon: 'camera',
      color: '#10B981',
      label: t('chats.camera') || 'Camera',
      onPress: handleTakePicture,
    },
    {
      key: 'location',
      icon: 'location',
      color: '#F59E0B',
      label: t('chats.location') || 'Location',
      onPress: handleSendLocation,
      loading: locationLoading,
    },
    {
      key: 'tag',
      icon: 'at',
      color: '#6366F1',
      label: t('chats.tagUser') || 'Tag',
      onPress: handleTagUser,
      hidden: !showMentionButton,
    },
    {
      key: 'file',
      icon: 'document',
      color: '#3B82F6',
      label: t('chats.file') || 'File',
      onPress: handleSendFile,
    },
    {
      key: 'gif',
      icon: 'happy',
      color: '#EC4899',
      label: t('chats.gifSticker') || 'GIF',
      onPress: handleOpenGiphy,
    },
  ].filter((item) => !item.hidden);

  const canSendMessage = (message.trim() || selectedImage) && !disabled && !uploading;
  const shouldShowSendButton = !!(message.trim() || selectedImage);
  const isSmallDevice = screenHeight < 750;
  const baseBottomPadding = Platform.OS === 'ios' ? spacing.xs : spacing.sm;
  const extraBottomPadding = moderateScale(isSmallDevice ? 8 : 5);
  const wrapperBottomPadding = Math.max(baseBottomPadding + extraBottomPadding - moderateScale(5), insets.bottom + moderateScale(4));

  // Colors
  const containerBg = isDarkMode ? '#1a1a2e' : '#F8F9FA';
  const inputBg = isDarkMode ? 'rgba(255,255,255,0.08)' : '#FFFFFF';
  const borderColor = isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';

  return (
    <View
      style={[
        styles.wrapper,
        {
          backgroundColor: containerBg,
          borderTopColor: borderColor,
          paddingBottom: wrapperBottomPadding,
        },
      ]}
    >
      {/* Reply preview bar */}
      {replyingTo && (
        <View
          style={[
            styles.replyPreview,
            { borderLeftColor: theme.primary, backgroundColor: isDarkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)' },
          ]}
        >
          <View style={styles.replyContent}>
            <Text style={[styles.replyLabel, { color: theme.primary, fontSize: fontSize(11) }]}>
              {t('chats.replyingTo')} {replyingTo.senderName}
            </Text>
            <Text
              style={[styles.replyText, { color: theme.textSecondary, fontSize: fontSize(12) }]}
              numberOfLines={1}
            >
              {replyingTo.type === 'voice'
                ? t('chats.voiceMessage')
                : (replyingTo.content || t('chats.image'))}
            </Text>
          </View>
          <TouchableOpacity
            onPress={onCancelReply}
            style={styles.cancelReplyBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close-circle" size={moderateScale(20)} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>
      )}

      {/* Image preview */}
      {selectedImage && (
        <View style={styles.imagePreviewRow}>
          <View style={styles.imagePreviewWrap}>
            <Image
              source={{ uri: selectedImage.uri }}
              style={styles.imagePreview}
              resizeMode="cover"
            />
            {!uploading && (
              <TouchableOpacity
                style={styles.removeImageBtn}
                onPress={handleRemoveImage}
                activeOpacity={0.7}
              >
                <View style={styles.removeImageCircle}>
                  <Ionicons name="close" size={moderateScale(14)} color="#FFFFFF" />
                </View>
              </TouchableOpacity>
            )}
            {uploading && (
              <View style={styles.uploadingOverlay}>
                <ActivityIndicator size="small" color="#FFFFFF" />
              </View>
            )}
          </View>
        </View>
      )}

      {/* Mention suggestions */}
      {showMentionSuggestions &&
        (groupMembers.length > 0 || friends.length > 0 || canMentionEveryone) && (
          <View
            style={[
              styles.mentionBox,
              { backgroundColor: isDarkMode ? '#2a2a40' : '#FFFFFF' },
            ]}
          >
            {getMentionSuggestions().map((suggestion) => (
              <TouchableOpacity
                key={suggestion.id}
                style={styles.mentionItem}
                onPress={() => handleSelectMention(suggestion)}
              >
                {suggestion.isSpecial ? (
                  <View style={[styles.mentionAvatar, { backgroundColor: theme.primary + '20' }]}>
                    <Ionicons name="people" size={moderateScale(16)} color={theme.primary} />
                  </View>
                ) : suggestion.profilePicture ? (
                  <Image source={{ uri: suggestion.profilePicture }} style={styles.mentionAvatarImg} />
                ) : (
                  <View style={[styles.mentionAvatar, { backgroundColor: theme.primary + '20' }]}>
                    <Text style={{ color: theme.primary, fontWeight: '600' }}>
                      {suggestion.name?.charAt(0)?.toUpperCase() || '?'}
                    </Text>
                  </View>
                )}
                <Text style={[styles.mentionName, { color: theme.text, fontSize: fontSize(14) }]}>
                  {suggestion.displayName}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

      {/* Main input row */}
      <View style={styles.inputRow}>
        {/* "+" attachment button */}
        <TouchableOpacity
          style={[
            styles.plusButton,
            {
              backgroundColor: showActionSheet ? theme.primary : (isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)'),
              opacity: disabled || uploading ? 0.5 : 1,
            },
          ]}
          onPress={() => {
            Keyboard.dismiss();
            setShowActionSheet((prev) => !prev);
          }}
          disabled={disabled || uploading}
          activeOpacity={0.7}
        >
          <Animated.View
            style={{
              transform: [
                {
                  rotate: actionSheetAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0deg', '45deg'],
                  }),
                },
              ],
            }}
          >
            <Ionicons
              name="add"
              size={moderateScale(22)}
              color={showActionSheet ? '#FFFFFF' : theme.primary}
            />
          </Animated.View>
        </TouchableOpacity>

        {/* Text input */}
        <View
          style={[
            styles.inputContainer,
            {
              backgroundColor: inputBg,
              borderColor: borderColor,
            },
          ]}
        >
          <TextInput
            ref={inputRef}
            style={[
              styles.textInput,
              {
                fontSize: fontSize(14),
                color: theme.text,
                maxHeight: MAX_INPUT_HEIGHT,
              },
            ]}
            placeholder={placeholder || t('chats.typeMessage')}
            placeholderTextColor={theme.textSecondary}
            value={message}
            onChangeText={handleTextChange}
            multiline
            maxLength={1000}
            editable={!disabled && !uploading}
            onFocus={() => setShowActionSheet(false)}
          />
        </View>

        {/* Send / Voice button */}
        {shouldShowSendButton ? (
          <TouchableOpacity
            style={[
              styles.sendButton,
              {
                backgroundColor: canSendMessage ? theme.primary : (isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'),
              },
            ]}
            onPress={handleSend}
            disabled={!canSendMessage}
            activeOpacity={0.7}
          >
            {uploading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons
                name="send"
                size={moderateScale(18)}
                color={canSendMessage ? '#FFFFFF' : theme.textSecondary}
              />
            )}
          </TouchableOpacity>
        ) : (
          <View style={styles.voiceButtonWrap}>
            <TouchableOpacity
            style={[
              styles.sendButton,
              {
                backgroundColor: isRecording
                  ? '#EF4444'
                  : (isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'),
                opacity: disabled || uploading ? 0.5 : 1,
              },
            ]}
            activeOpacity={0.8}
            hitSlop={{ top: spacing.sm, bottom: spacing.sm, left: spacing.sm, right: spacing.sm }}
            pressRetentionOffset={{
              top: VOICE_PRESS_RETENTION,
              bottom: VOICE_PRESS_RETENTION,
              left: VOICE_PRESS_RETENTION,
              right: VOICE_PRESS_RETENTION,
            }}
            onPressIn={(event) => {
              if (disabled || uploading || isRecordingRef.current) {
                return;
              }
              recordingStartYRef.current = event?.nativeEvent?.pageY || 0;
              recordingStartXRef.current = event?.nativeEvent?.pageX || 0;
              recordingDeltaYRef.current = 0;
              recordingDeltaXRef.current = 0;
              recordingGestureCancelledRef.current = false;
              setRecordingSlideOffsetX(0);
              startVoiceRecording();
            }}
            onPressOut={(event) => {
              if (!isRecordingRef.current || isRecordingLockedRef.current || recordingGestureCancelledRef.current) {
                return;
              }

              if (isPanGestureActiveRef.current) {
                return;
              }

              const currentY = event?.nativeEvent?.pageY || 0;
              const currentX = event?.nativeEvent?.pageX || 0;
              const deltaY = recordingStartYRef.current - currentY;
              const deltaX = currentX - recordingStartXRef.current;

              applyGestureDeltas(deltaY, deltaX);

              if (deltaX <= -VOICE_CANCEL_THRESHOLD) {
                recordingGestureCancelledRef.current = true;
                stopVoiceRecording({ shouldSend: false });
                return;
              }

              if (isWithinLockTarget(deltaY, deltaX)) {
                lockCurrentRecording();
                return;
              }

              stopVoiceRecording({ shouldSend: true });
            }}
            {...voicePanResponder.panHandlers}
            >
              {uploading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons
                  name={isRecording ? 'mic' : 'mic-outline'}
                  size={moderateScale(19)}
                  color={isRecording ? '#FFFFFF' : theme.textSecondary}
                />
              )}
            </TouchableOpacity>

            {isRecording && !isRecordingLocked && (
              <View
                style={[
                  styles.voiceLockPopup,
                  {
                    borderColor: isLockTargetActive ? '#EF4444' : borderColor,
                    backgroundColor: isDarkMode ? '#1f1f33' : '#FFFFFF',
                  },
                  isLockTargetActive && styles.voiceLockPopupActive,
                ]}
              >
                <Ionicons
                  name={isLockTargetActive ? 'lock-closed' : 'lock-open-outline'}
                  size={moderateScale(16)}
                  color={isLockTargetActive ? '#FFFFFF' : '#EF4444'}
                />
              </View>
            )}
          </View>
        )}
      </View>

      {isRecording && (
        <View
          style={[
            styles.voiceRecordingBar,
            {
              backgroundColor: isDarkMode ? 'rgba(239,68,68,0.15)' : 'rgba(239,68,68,0.1)',
              borderColor: isDarkMode ? 'rgba(239,68,68,0.35)' : 'rgba(239,68,68,0.25)',
            },
          ]}
        >
          <View style={styles.voiceRecordingInfoRow}>
            <Ionicons name="mic" size={moderateScale(16)} color="#EF4444" />
            <Text style={[styles.voiceRecordingTime, { color: theme.text }]}>
              {formatVoiceDuration(recordingDurationMs)}
            </Text>
            {!isRecordingLocked && (
              <View style={styles.voiceHintsContainer}>
                <Text style={[styles.voiceRecordingHint, { color: theme.textSecondary }]}>
                  {t('chats.slideUpToLock')}
                </Text>
                <Animated.View
                  style={[
                    styles.slideCancelPill,
                    {
                      borderColor: borderColor,
                      backgroundColor: isDarkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
                      transform: [{ translateX: recordingSlideOffsetX }],
                    },
                  ]}
                >
                  <Ionicons name="chevron-back" size={moderateScale(12)} color="#EF4444" />
                  <Text style={[styles.slideCancelText, { color: theme.textSecondary }]}>
                    {t('chats.slideLeftToCancel')}
                  </Text>
                </Animated.View>
              </View>
            )}
            {isRecordingLocked && (
              <Text style={[styles.voiceRecordingHint, { color: theme.textSecondary }]}>
                {t('chats.recordingLocked')}
              </Text>
            )}
          </View>

          <View style={styles.voiceWaveformRow}>
            {recordingWaveform.map((sample, index) => {
              const barHeight = moderateScale(4) + sample * moderateScale(16);
              return (
                <View
                  key={`voice-wave-${index}`}
                  style={[
                    styles.voiceWaveBar,
                    {
                      height: barHeight,
                      backgroundColor: sample > 0.52
                        ? '#EF4444'
                        : (isDarkMode ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.28)'),
                    },
                  ]}
                />
              );
            })}
          </View>

          {isRecording && (
            <View style={styles.voiceRecordingActions}>
              <TouchableOpacity
                style={[styles.voiceActionButton, { borderColor: borderColor }]}
                onPress={() => stopVoiceRecording({ shouldSend: false })}
                activeOpacity={0.7}
              >
                <Ionicons name="trash-outline" size={moderateScale(16)} color="#EF4444" />
                <Text style={[styles.voiceActionText, { color: '#EF4444' }]}>
                  {t('common.cancel')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.voiceActionButton, { backgroundColor: theme.primary, borderColor: theme.primary }]}
                onPress={() => stopVoiceRecording({ shouldSend: true })}
                activeOpacity={0.7}
              >
                <Ionicons name="send" size={moderateScale(14)} color="#FFFFFF" />
                <Text style={[styles.voiceActionText, { color: '#FFFFFF' }]}>
                  {t('common.send')}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* Action Sheet (expandable grid) */}
      {showActionSheet && (
        <Animated.View
          style={[
            styles.actionSheet,
            {
              backgroundColor: isDarkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
              opacity: actionSheetAnim,
              transform: [
                {
                  translateY: actionSheetAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.actionGrid}>
            {actionItems.map((item) => (
              <TouchableOpacity
                key={item.key}
                style={styles.actionItem}
                onPress={item.onPress}
                disabled={item.loading}
                activeOpacity={0.7}
              >
                <View style={[styles.actionIconCircle, { backgroundColor: item.color + '18' }]}>
                  {item.loading ? (
                    <ActivityIndicator size="small" color={item.color} />
                  ) : (
                    <Ionicons name={item.icon} size={moderateScale(22)} color={item.color} />
                  )}
                </View>
                <Text
                  style={[
                    styles.actionLabel,
                    { color: theme.text, fontSize: fontSize(11) },
                  ]}
                  numberOfLines={1}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>
      )}

      {/* Giphy Picker Modal */}
      <GiphyPickerModal
        visible={showGiphyPicker}
        onClose={() => setShowGiphyPicker(false)}
        onSelect={handleGifSelected}
      />

      {/* Location Preview Modal */}
      <Modal
        visible={showLocationPreview}
        transparent
        animationType="slide"
        onRequestClose={handleCancelLocation}
      >
        <Pressable style={styles.locationOverlay} onPress={handleCancelLocation}>
          <Pressable
            style={[
              styles.locationModal,
              { backgroundColor: isDarkMode ? '#2a2a40' : '#FFFFFF' },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <Text
              style={[
                styles.locationTitle,
                { color: theme.text, fontSize: fontSize(18) },
              ]}
            >
              {t('chats.locationPreview') || 'Send Location'}
            </Text>

            {pendingLocation && (
              <>
                <View style={styles.locationMapWrap}>
                  <LeafletMap
                    containerStyle={styles.locationMap}
                    interactive={false}
                    zoom={16}
                    markers={[
                      {
                        latitude: pendingLocation.lat,
                        longitude: pendingLocation.long,
                        title: t('chats.location'),
                      },
                    ]}
                    initialRegion={{
                      latitude: pendingLocation.lat,
                      longitude: pendingLocation.long,
                    }}
                  />
                </View>

                <View style={styles.locationCoords}>
                  <Ionicons
                    name="location-outline"
                    size={moderateScale(16)}
                    color={theme.primary}
                  />
                  <Text
                    style={[
                      styles.locationCoordsText,
                      { color: theme.textSecondary, fontSize: fontSize(13) },
                    ]}
                  >
                    {`${pendingLocation.lat.toFixed(6)}, ${pendingLocation.long.toFixed(6)}`}
                  </Text>
                </View>

                <Text
                  style={[
                    styles.locationConfirm,
                    { color: theme.textSecondary, fontSize: fontSize(14) },
                  ]}
                >
                  {t('chats.sendLocationConfirm') || 'Send this location to the chat?'}
                </Text>
              </>
            )}

            <View style={styles.locationBtns}>
              <TouchableOpacity
                style={[
                  styles.locationCancelBtn,
                  {
                    borderColor: isDarkMode
                      ? 'rgba(255,255,255,0.2)'
                      : 'rgba(0,0,0,0.15)',
                  },
                ]}
                onPress={handleCancelLocation}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.locationCancelText,
                    { color: theme.textSecondary, fontSize: fontSize(15) },
                  ]}
                >
                  {t('common.cancel')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.locationSendBtn, { backgroundColor: theme.primary }]}
                onPress={handleConfirmLocation}
                activeOpacity={0.7}
              >
                <Ionicons name="send" size={moderateScale(16)} color="#FFFFFF" />
                <Text style={[styles.locationSendText, { fontSize: fontSize(15) }]}>
                  {t('chats.sendLocationButton') || 'Send'}
                </Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    borderTopWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.xs,
  },

  // Reply preview
  replyPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    marginBottom: spacing.xs,
    borderRadius: borderRadius.md,
    borderLeftWidth: 3,
  },
  replyContent: { flex: 1 },
  replyLabel: { fontWeight: '600', marginBottom: 2 },
  replyText: { fontWeight: '400' },
  cancelReplyBtn: { padding: spacing.xs },

  // Image preview
  imagePreviewRow: {
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  imagePreviewWrap: {
    width: moderateScale(80),
    height: moderateScale(80),
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  removeImageBtn: {
    position: 'absolute',
    top: moderateScale(4),
    right: moderateScale(4),
  },
  removeImageCircle: {
    width: moderateScale(22),
    height: moderateScale(22),
    borderRadius: moderateScale(11),
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: borderRadius.lg,
  },

  // Mention suggestions
  mentionBox: {
    position: 'absolute',
    bottom: moderateScale(60),
    left: spacing.sm,
    right: spacing.sm,
    borderRadius: borderRadius.lg,
    padding: spacing.xs,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 10,
    maxHeight: moderateScale(180),
  },
  mentionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  mentionAvatar: {
    width: moderateScale(30),
    height: moderateScale(30),
    borderRadius: moderateScale(15),
    justifyContent: 'center',
    alignItems: 'center',
  },
  mentionAvatarImg: {
    width: moderateScale(30),
    height: moderateScale(30),
    borderRadius: moderateScale(15),
  },
  mentionName: { fontWeight: '500', flex: 1 },

  // Input row
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  plusButton: {
    width: moderateScale(38),
    height: moderateScale(38),
    borderRadius: moderateScale(19),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: moderateScale(1),
  },
  inputContainer: {
    flex: 1,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: Platform.OS === 'ios' ? spacing.sm : spacing.xs,
    justifyContent: 'center',
  },
  textInput: {
    lineHeight: LINE_HEIGHT,
    minHeight: moderateScale(22),
    textAlignVertical: 'center',
  },
  sendButton: {
    width: moderateScale(38),
    height: moderateScale(38),
    borderRadius: moderateScale(19),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: moderateScale(1),
  },
  voiceButtonWrap: {
    position: 'relative',
  },
  voiceLockPopup: {
    position: 'absolute',
    left: '50%',
    top: -VOICE_LOCK_THRESHOLD,
    marginLeft: moderateScale(-16),
    width: moderateScale(32),
    height: moderateScale(32),
    borderRadius: moderateScale(16),
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  voiceLockPopupActive: {
    backgroundColor: '#EF4444',
    borderColor: '#EF4444',
  },
  voiceRecordingBar: {
    marginTop: spacing.xs,
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    gap: spacing.xs,
  },
  voiceRecordingInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  voiceRecordingTime: {
    fontWeight: '700',
    fontSize: fontSize(13),
  },
  voiceRecordingHint: {
    fontWeight: '500',
    fontSize: fontSize(12),
  },
  voiceHintsContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  slideCancelPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.xs / 2,
    paddingHorizontal: spacing.xs,
    gap: spacing.xs / 2,
  },
  slideCancelText: {
    fontWeight: '600',
    fontSize: fontSize(11),
  },
  voiceWaveformRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs / 2,
    minHeight: moderateScale(20),
  },
  voiceWaveBar: {
    width: moderateScale(3),
    borderRadius: moderateScale(2),
  },
  voiceRecordingActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  voiceActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  voiceActionText: {
    fontWeight: '600',
    fontSize: fontSize(12),
  },

  // Action sheet
  actionSheet: {
    marginTop: spacing.sm,
    borderRadius: borderRadius.xl,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
  },
  actionItem: {
    alignItems: 'center',
    width: wp(18),
    marginBottom: spacing.sm,
  },
  actionIconCircle: {
    width: moderateScale(50),
    height: moderateScale(50),
    borderRadius: moderateScale(25),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  actionLabel: {
    fontWeight: '500',
    textAlign: 'center',
  },

  // Location modal
  locationOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  locationModal: {
    width: '100%',
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  locationTitle: {
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  locationMapWrap: {
    width: '100%',
    height: moderateScale(180),
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    marginBottom: spacing.md,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  locationMap: { width: '100%', height: '100%' },
  locationCoords: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  locationCoordsText: { fontWeight: '500' },
  locationConfirm: { textAlign: 'center', marginBottom: spacing.lg },
  locationBtns: { flexDirection: 'row', gap: spacing.md },
  locationCancelBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationCancelText: { fontWeight: '600' },
  locationSendBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  locationSendText: { fontWeight: '600', color: '#FFFFFF' },
});

export default MessageInput;
