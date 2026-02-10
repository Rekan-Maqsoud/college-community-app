import React, { useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useAppSettings } from '../context/AppSettingsContext';
import { useTranslation } from '../hooks/useTranslation';
import { borderRadius, shadows } from '../theme/designTokens';
import { wp, fontSize, spacing } from '../utils/responsive';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const CustomAlert = ({
  visible,
  type = 'info',
  title,
  message,
  buttons = [],
  onDismiss,
}) => {
  const { theme, isDarkMode } = useAppSettings();
  const { t } = useTranslation();
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto-dismiss success alerts after 1.5 seconds
      if (type === 'success') {
        const autoDismissTimer = setTimeout(() => {
          onDismiss?.();
        }, 1500);
        return () => clearTimeout(autoDismissTimer);
      }

      // Safety auto-dismiss for alerts with no custom buttons after 5 seconds
      if (buttons.length === 0) {
        const safetyTimer = setTimeout(() => {
          onDismiss?.();
        }, 5000);
        return () => clearTimeout(safetyTimer);
      }
    } else {
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 0.8,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, type]);

  const getIconConfig = () => {
    switch (type) {
      case 'success':
        return { name: 'checkmark-circle', color: '#34C759' };
      case 'error':
        return { name: 'close-circle', color: '#FF3B30' };
      case 'warning':
        return { name: 'warning', color: '#FF9500' };
      default:
        return { name: 'information-circle', color: theme.primary };
    }
  };

  const iconConfig = getIconConfig();

  const defaultButtons = buttons.length > 0 ? buttons : [
    {
      text: t('common.ok') || 'OK',
      onPress: onDismiss,
      style: 'primary',
    },
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onDismiss}
      statusBarTranslucent>
      <Animated.View
        style={[
          styles.overlay,
          {
            opacity: opacityAnim,
          },
        ]}>
        <TouchableOpacity
          style={styles.overlayTouchable}
          activeOpacity={1}
          onPress={onDismiss}>
          <Animated.View
            style={[
              styles.alertContainer,
              {
                transform: [{ scale: scaleAnim }],
                opacity: opacityAnim,
              },
            ]}>
            <TouchableOpacity activeOpacity={1}>
              <BlurView
                intensity={isDarkMode ? 40 : 60}
                tint={isDarkMode ? 'dark' : 'light'}
                style={[
                  styles.alertContent,
                  {
                    backgroundColor: isDarkMode
                      ? 'rgba(28, 28, 30, 0.95)'
                      : 'rgba(255, 255, 255, 0.95)',
                    borderColor: isDarkMode
                      ? 'rgba(255, 255, 255, 0.1)'
                      : 'rgba(0, 0, 0, 0.1)',
                  },
                ]}>
                <View style={styles.iconContainer}>
                  <View
                    style={[
                      styles.iconCircle,
                      {
                        backgroundColor: isDarkMode
                          ? `${iconConfig.color}20`
                          : `${iconConfig.color}20`,
                      },
                    ]}>
                    <Ionicons
                      name={iconConfig.name}
                      size={40}
                      color={iconConfig.color}
                    />
                  </View>
                </View>

                {title && (
                  <Text
                    style={[
                      styles.title,
                      { color: theme.text, fontSize: fontSize(18) },
                    ]}>
                    {title}
                  </Text>
                )}

                {message && (
                  <Text
                    style={[
                      styles.message,
                      {
                        color: theme.textSecondary,
                        fontSize: fontSize(14),
                      },
                    ]}>
                    {message}
                  </Text>
                )}

                <View
                  style={[
                    styles.buttonsContainer,
                    defaultButtons.length > 2 && styles.buttonsColumn,
                  ]}>
                  {defaultButtons.map((button, index) => (
                    <TouchableOpacity
                      key={index}
                      onPress={() => {
                        button.onPress?.();
                        onDismiss?.();
                      }}
                      style={[
                        styles.button,
                        defaultButtons.length === 1 && styles.buttonSingle,
                        defaultButtons.length > 2 && styles.buttonColumn,
                        button.style === 'primary' && {
                          backgroundColor: theme.primary,
                        },
                        button.style === 'destructive' && {
                          backgroundColor: '#FF3B30',
                        },
                        (button.style === 'cancel' || button.style === 'default') && {
                          backgroundColor: isDarkMode
                            ? 'rgba(255, 255, 255, 0.1)'
                            : 'rgba(0, 0, 0, 0.08)',
                        },
                      ]}
                      activeOpacity={0.7}>
                      <Text
                        style={[
                          styles.buttonText,
                          { fontSize: fontSize(16) },
                          (button.style === 'primary' || button.style === 'destructive') && {
                            color: '#FFFFFF',
                            fontWeight: '600',
                          },
                          (button.style === 'cancel' || button.style === 'default') && {
                            color: theme.text,
                            fontWeight: '500',
                          },
                        ]}>
                        {button.text}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </BlurView>
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
    elevation: 9999,
  },
  overlayTouchable: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertContainer: {
    width: SCREEN_WIDTH - wp(20),
    maxWidth: 340,
  },
  alertContent: {
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    borderWidth: 1,
    ...shadows.large,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  iconCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  message: {
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  buttonsContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  buttonsColumn: {
    flexDirection: 'column',
  },
  button: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 46,
  },
  buttonSingle: {
    flex: 1,
  },
  buttonColumn: {
    flex: 0,
    width: '100%',
  },
  buttonText: {
    fontWeight: '500',
  },
});

export default CustomAlert;
