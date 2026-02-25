import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  PanResponder,
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
import * as DocumentPicker from 'expo-document-picker';
import LeafletMap from './LeafletMap';
import GiphyPickerModal from './GiphyPickerModal';
import { useAppSettings } from '../context/AppSettingsContext';
import {
  fontSize,
  spacing,
  moderateScale,
} from '../utils/responsive';
import { pickAndCompressImages, takePictureAndCompress } from '../utils/imageCompression';
import { uploadChatImage, uploadChatVoiceMessage, uploadChatFile } from '../../database/chats';
import { createPollPayload } from '../utils/pollUtils';
import { formatFileSize, getFilePreviewDescriptor } from '../utils/fileTypes';
import { MAX_FILE_UPLOAD_BYTES, validateFileUploadSize } from '../utils/fileUploadUtils';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import styles from './messageInput/styles';
import {
  MAX_INPUT_HEIGHT,
  GIF_SEND_COOLDOWN_MS,
  VOICE_LOCK_THRESHOLD,
  VOICE_CANCEL_THRESHOLD,
  VOICE_LOCK_HORIZONTAL_TOLERANCE,
  VOICE_PRESS_RETENTION,
  MIN_VOICE_DURATION_MS,
  VOICE_WAVE_BARS,
  VOICE_WAVE_PAYLOAD_BARS,
  VOICE_WAVE_HISTORY_LIMIT,
} from './messageInput/constants';
import {
  formatVoiceDuration,
  serializeVoiceWaveform,
  buildMentionSuggestions,
} from './messageInput/helpers';
import { getMessageInputActionItems } from './messageInput/actionItems';

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
  excludedMentionUserIds = [],
  showAlert,
}) => {
  const { theme, isDarkMode, t } = useAppSettings();
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();
  const [message, setMessage] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [pendingLocation, setPendingLocation] = useState(null);
  const [showLocationPreview, setShowLocationPreview] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [showGiphyPicker, setShowGiphyPicker] = useState(false);
  const [showPollComposer, setShowPollComposer] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [pollAllowMultiple, setPollAllowMultiple] = useState(false);
  const [pollMaxSelections, setPollMaxSelections] = useState('2');
  const [pollIsQuiz, setPollIsQuiz] = useState(false);
  const [pollCorrectOptionId, setPollCorrectOptionId] = useState('');
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
    if (disabled || uploading || isRecordingRef.current || message.trim() || selectedImage || selectedFile) {
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
      await audioRecorder.record();

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
        setSelectedFile(null);
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
        setSelectedFile(null);
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

  const handleSendFile = async () => {
    if (disabled || uploading) return;
    closeActionSheet();

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        multiple: false,
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.length) {
        return;
      }

      const pickedFile = result.assets[0];
      const resolvedSize = await resolveSelectedFileSize(pickedFile);
      validateFileUploadSize(resolvedSize, MAX_FILE_UPLOAD_BYTES);

      setSelectedImage(null);
      setSelectedFile({
        uri: pickedFile.uri,
        name: pickedFile.name,
        size: resolvedSize,
        mimeType: pickedFile.mimeType || 'application/octet-stream',
      });
    } catch (error) {
      if (error?.code === 'FILE_TOO_LARGE') {
        triggerAlert(
          t('common.error'),
          t('chats.fileTooLarge').replace('{size}', formatFileSize(MAX_FILE_UPLOAD_BYTES))
        );
        return;
      }

      triggerAlert(t('common.error'), t('chats.filePickError'));
    }
  };

  const handleOpenGiphy = () => {
    closeActionSheet();
    Keyboard.dismiss();
    setTimeout(() => setShowGiphyPicker(true), 200);
  };

  const resetPollComposer = () => {
    setPollQuestion('');
    setPollOptions(['', '']);
    setPollAllowMultiple(false);
    setPollMaxSelections('2');
    setPollIsQuiz(false);
    setPollCorrectOptionId('');
  };

  const handleOpenPollComposer = () => {
    closeActionSheet();
    Keyboard.dismiss();
    setShowPollComposer(true);
  };

  const handleClosePollComposer = () => {
    setShowPollComposer(false);
    resetPollComposer();
  };

  const handlePollOptionChange = (index, value) => {
    setPollOptions((prevOptions) => {
      const nextOptions = [...prevOptions];
      nextOptions[index] = value;
      return nextOptions;
    });
  };

  const handleAddPollOption = () => {
    if (pollOptions.length >= 8) {
      triggerAlert(t('common.error'), t('chats.pollMaxOptionsError'));
      return;
    }
    setPollOptions((prevOptions) => [...prevOptions, '']);
  };

  const handleRemovePollOption = (index) => {
    if (pollOptions.length <= 2) {
      return;
    }

    const removedOptionId = `opt_${index + 1}`;
    const nextOptions = pollOptions.filter((_, optionIndex) => optionIndex !== index);
    setPollOptions(nextOptions);

    if (pollCorrectOptionId === removedOptionId) {
      setPollCorrectOptionId('');
    }
  };

  const handleSendPoll = async () => {
    if (!onSend) {
      return;
    }

    try {
      const payload = createPollPayload({
        question: pollQuestion,
        options: pollOptions,
        allowMultiple: pollAllowMultiple && !pollIsQuiz,
        maxSelections: pollAllowMultiple && !pollIsQuiz
          ? Math.max(1, Number(pollMaxSelections) || 1)
          : 1,
        isQuiz: pollIsQuiz,
        correctOptionId: pollCorrectOptionId,
      });

      await onSend('', null, 'poll', payload);
      setShowPollComposer(false);
      resetPollComposer();
    } catch (error) {
      triggerAlert(t('common.error'), error?.message || t('chats.pollSendError'));
    }
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

  const handleRemoveFile = () => {
    setSelectedFile(null);
  };

  const resolveSelectedFileSize = async (fileAsset) => {
    const pickedSize = Number(fileAsset?.size || 0);
    if (Number.isFinite(pickedSize) && pickedSize > 0) {
      return pickedSize;
    }

    try {
      const info = await FileSystem.getInfoAsync(fileAsset?.uri || '', { size: true });
      const fallbackSize = Number(info?.size || 0);
      return Number.isFinite(fallbackSize) ? fallbackSize : 0;
    } catch {
      return 0;
    }
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
    if (!trimmedMessage && !selectedImage && !selectedFile) return;
    if (!onSend) return;

    const messageToSend = trimmedMessage;
    const imageToSend = selectedImage;
    const fileToSend = selectedFile;
    setMessage('');
    if (inputRef.current) inputRef.current.focus();

    try {
      if (fileToSend) {
        setUploading(true);
        setSelectedFile(null);
        const resolvedFileSize = await resolveSelectedFileSize(fileToSend);
        validateFileUploadSize(resolvedFileSize, MAX_FILE_UPLOAD_BYTES);

        console.log('[MessageInput] sending file', {
          name: fileToSend.name,
          mimeType: fileToSend.mimeType,
          size: resolvedFileSize,
        });

        const uploadedFile = await uploadChatFile({
          uri: fileToSend.uri,
          name: fileToSend.name,
          type: fileToSend.mimeType || 'application/octet-stream',
          size: resolvedFileSize,
        });

        const descriptor = getFilePreviewDescriptor({
          name: fileToSend.name,
          mimeType: uploadedFile.mimeType || fileToSend.mimeType,
        });

        await onSend('', null, 'file', {
          file_url: uploadedFile.viewUrl,
          file_id: uploadedFile.fileId,
          file_name: uploadedFile.name || fileToSend.name,
          file_size: Number(uploadedFile.size || resolvedFileSize || 0),
          file_mime_type: uploadedFile.mimeType || fileToSend.mimeType || 'application/octet-stream',
          file_kind: descriptor.kind,
          file_extension: descriptor.extension,
          file_caption: messageToSend,
        });

        return;
      }

      let imageUrl = null;
      if (imageToSend) {
        setUploading(true);
        setSelectedImage(null);
        imageUrl = await uploadImage(imageToSend);
      }
      await onSend(messageToSend, imageUrl);
    } catch (error) {
      console.error('[MessageInput] send failed', {
        isFile: !!fileToSend,
        code: error?.code,
        status: error?.status,
        message: error?.message,
      });

      setMessage(messageToSend);
      if (error?.code === 'FILE_TOO_LARGE') {
        triggerAlert(t('common.error'), t('chats.fileTooLarge').replace('{size}', formatFileSize(MAX_FILE_UPLOAD_BYTES)));
      } else if (fileToSend) {
        triggerAlert(t('common.error'), t('chats.fileUploadError'));
      } else {
        triggerAlert(t('common.error'), error.message || t('chats.sendError'));
      }
    } finally {
      setUploading(false);
    }
  };

  const actionItems = getMessageInputActionItems({
    t,
    locationLoading,
    showMentionButton,
    handlers: {
      handlePickImage,
      handleTakePicture,
      handleSendLocation,
      handleTagUser,
      handleSendFile,
      handleOpenGiphy,
      handleOpenPollComposer,
    },
  });

  const mentionSuggestions = buildMentionSuggestions({
    canMentionEveryone,
    t,
    groupMembers,
    friends,
    mentionQuery,
    excludedUserIds: excludedMentionUserIds,
  });

  const canSendMessage = (message.trim() || selectedImage || selectedFile) && !disabled && !uploading;
  const shouldShowSendButton = !!(message.trim() || selectedImage || selectedFile);
  const selectedFileDescriptor = selectedFile
    ? getFilePreviewDescriptor({ name: selectedFile.name, mimeType: selectedFile.mimeType })
    : null;
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
                : replyingTo.type === 'file'
                  ? t('chats.file')
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

      {selectedFile && selectedFileDescriptor && (
        <View style={styles.filePreviewRow}>
          <View
            style={[
              styles.filePreviewCard,
              {
                backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : '#FFFFFF',
                borderColor: borderColor,
              },
            ]}
          >
            <View style={[styles.filePreviewIconWrap, { backgroundColor: theme.primary + '22' }]}>
              <Ionicons name={selectedFileDescriptor.iconName} size={moderateScale(18)} color={theme.primary} />
            </View>

            <View style={styles.filePreviewInfo}>
              <Text
                numberOfLines={1}
                style={[styles.filePreviewName, { color: theme.text, fontSize: fontSize(12) }]}
              >
                {selectedFile.name}
              </Text>
              <Text
                style={[styles.filePreviewMeta, { color: theme.textSecondary, fontSize: fontSize(10) }]}
              >
                {`${selectedFileDescriptor.extensionLabel || t('chats.file').toUpperCase()} • ${formatFileSize(selectedFile.size)}`}
              </Text>
            </View>

            {!uploading && (
              <TouchableOpacity
                style={styles.removeFileBtn}
                onPress={handleRemoveFile}
                activeOpacity={0.7}
              >
                <Ionicons name="close-circle" size={moderateScale(18)} color={theme.textSecondary} />
              </TouchableOpacity>
            )}

            {uploading && (
              <View style={styles.fileUploadingWrap}>
                <ActivityIndicator size="small" color={theme.primary} />
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
            {mentionSuggestions.map((suggestion) => (
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

      <Modal
        visible={showPollComposer}
        transparent
        animationType="slide"
        onRequestClose={handleClosePollComposer}
      >
        <Pressable style={styles.pollComposerOverlay} onPress={handleClosePollComposer}>
          <Pressable
            style={[
              styles.pollComposerCard,
              { backgroundColor: isDarkMode ? '#2a2a40' : '#FFFFFF' },
            ]}
            onPress={(event) => event.stopPropagation()}
          >
            <Text style={[styles.pollComposerTitle, { color: theme.text }]}>
              {t('chats.createPoll')}
            </Text>

            <TextInput
              style={[
                styles.pollComposerInput,
                {
                  borderColor: borderColor,
                  color: theme.text,
                  backgroundColor: isDarkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
                },
              ]}
              value={pollQuestion}
              onChangeText={setPollQuestion}
              placeholder={t('chats.pollQuestionPlaceholder')}
              placeholderTextColor={theme.textSecondary}
              maxLength={200}
            />

            {pollOptions.map((option, index) => (
              <View key={`chat-poll-option-${index}`} style={styles.pollComposerOptionRow}>
                <TextInput
                  style={[
                    styles.pollComposerInput,
                    styles.pollComposerOptionInput,
                    {
                      borderColor: borderColor,
                      color: theme.text,
                      backgroundColor: isDarkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
                    },
                  ]}
                  value={option}
                  onChangeText={(value) => handlePollOptionChange(index, value)}
                  placeholder={t('chats.pollOptionPlaceholder').replace('{number}', String(index + 1))}
                  placeholderTextColor={theme.textSecondary}
                  maxLength={120}
                />
                <TouchableOpacity
                  style={[styles.pollComposerRemoveButton, { borderColor }]}
                  disabled={pollOptions.length <= 2}
                  onPress={() => handleRemovePollOption(index)}
                >
                  <Ionicons name="trash-outline" size={16} color={theme.textSecondary} />
                </TouchableOpacity>
              </View>
            ))}

            <TouchableOpacity style={styles.pollComposerInlineAction} onPress={handleAddPollOption}>
              <Ionicons name="add-circle-outline" size={18} color={theme.primary} />
              <Text style={[styles.pollComposerInlineActionText, { color: theme.primary }]}>{t('chats.addOption')}</Text>
            </TouchableOpacity>

            <View style={styles.pollComposerModeRow}>
              <TouchableOpacity
                style={styles.pollComposerModeItem}
                onPress={() => {
                  setPollIsQuiz(false);
                  setPollCorrectOptionId('');
                }}
              >
                <Ionicons
                  name={!pollIsQuiz ? 'checkbox' : 'square-outline'}
                  size={20}
                  color={!pollIsQuiz ? theme.primary : theme.textSecondary}
                />
                <Text style={[styles.pollComposerModeText, { color: theme.text }]}>{t('chats.pollModePoll')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.pollComposerModeItem}
                onPress={() => {
                  setPollIsQuiz(true);
                  setPollAllowMultiple(false);
                }}
              >
                <Ionicons
                  name={pollIsQuiz ? 'checkbox' : 'square-outline'}
                  size={20}
                  color={pollIsQuiz ? theme.primary : theme.textSecondary}
                />
                <Text style={[styles.pollComposerModeText, { color: theme.text }]}>{t('chats.pollModeQuestion')}</Text>
              </TouchableOpacity>
            </View>

            {!pollIsQuiz && (
              <>
                <TouchableOpacity
                  style={styles.pollComposerModeItem}
                  onPress={() => setPollAllowMultiple((prev) => !prev)}
                >
                  <Ionicons
                    name={pollAllowMultiple ? 'checkbox' : 'square-outline'}
                    size={20}
                    color={pollAllowMultiple ? theme.primary : theme.textSecondary}
                  />
                  <Text style={[styles.pollComposerModeText, { color: theme.text }]}>{t('chats.allowMultiple')}</Text>
                </TouchableOpacity>

                {pollAllowMultiple && (
                  <View style={styles.pollComposerMaxRow}>
                    <Text style={[styles.pollComposerMaxLabel, { color: theme.textSecondary }]}>{t('chats.maxChoicesPerUser')}</Text>
                    <TextInput
                      style={[
                        styles.pollComposerMaxInput,
                        {
                          borderColor: borderColor,
                          color: theme.text,
                          backgroundColor: isDarkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
                        },
                      ]}
                      value={pollMaxSelections}
                      onChangeText={setPollMaxSelections}
                      keyboardType="number-pad"
                      maxLength={2}
                    />
                  </View>
                )}
              </>
            )}

            {pollIsQuiz && (
              <View style={styles.pollComposerCorrectWrap}>
                <Text style={[styles.pollComposerMaxLabel, { color: theme.textSecondary }]}>{t('chats.correctAnswer')}</Text>
                {pollOptions.map((option, index) => {
                  const optionLabel = option.trim();
                  if (!optionLabel) {
                    return null;
                  }

                  const optionId = `opt_${index + 1}`;
                  return (
                    <TouchableOpacity
                      key={`chat-poll-correct-${optionId}`}
                      style={styles.pollComposerModeItem}
                      onPress={() => setPollCorrectOptionId(optionId)}
                    >
                      <Ionicons
                        name={pollCorrectOptionId === optionId ? 'radio-button-on' : 'radio-button-off'}
                        size={18}
                        color={pollCorrectOptionId === optionId ? theme.primary : theme.textSecondary}
                      />
                      <Text style={[styles.pollComposerModeText, { color: theme.text }]} numberOfLines={1}>{optionLabel}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            <View style={styles.pollComposerActions}>
              <TouchableOpacity
                style={[styles.pollComposerActionButton, { borderColor }]}
                onPress={handleClosePollComposer}
              >
                <Text style={[styles.pollComposerActionText, { color: theme.textSecondary }]}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.pollComposerActionButton, { backgroundColor: theme.primary, borderColor: theme.primary }]}
                onPress={handleSendPoll}
              >
                <Text style={[styles.pollComposerActionText, { color: '#FFFFFF' }]}>{t('common.send')}</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

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

export default MessageInput;
