import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Image,
  TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import * as ImagePicker from 'expo-image-picker';
import { useAppSettings } from '../../context/AppSettingsContext';
import { useUser } from '../../context/UserContext';
import { borderRadius, shadows } from '../../theme/designTokens';
import { wp, hp, fontSize as responsiveFontSize, spacing, moderateScale } from '../../utils/responsive';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getReactionDefaults, updateReactionDefaults, DEFAULT_REACTION_SET } from '../../../database/userChatSettings';

const MIN_BUBBLE_RADIUS = 4;
const MAX_BUBBLE_RADIUS = 28;

// Solid colors
const BUBBLE_COLORS_SOLID = [
  { key: '#667eea', labelKey: 'settings.colorPurple' },
  { key: '#3B82F6', labelKey: 'settings.colorBlue' },
  { key: '#10B981', labelKey: 'settings.colorGreen' },
  { key: '#F59E0B', labelKey: 'settings.colorOrange' },
  { key: '#EF4444', labelKey: 'settings.colorRed' },
  { key: '#EC4899', labelKey: 'settings.colorPink' },
  { key: '#6366F1', labelKey: 'settings.colorIndigo' },
  { key: '#14B8A6', labelKey: 'settings.colorTeal' },
];

// Gradient colors (stored as JSON string)
const BUBBLE_COLORS_GRADIENT = [
  { key: 'gradient::#667eea,#764ba2', labelKey: 'settings.gradientPurpleFade', colors: ['#667eea', '#764ba2'] },
  { key: 'gradient::#f093fb,#f5576c', labelKey: 'settings.gradientPinkGlow', colors: ['#f093fb', '#f5576c'] },
  { key: 'gradient::#4facfe,#00f2fe', labelKey: 'settings.gradientOceanWave', colors: ['#4facfe', '#00f2fe'] },
  { key: 'gradient::#43e97b,#38f9d7', labelKey: 'settings.gradientMintFresh', colors: ['#43e97b', '#38f9d7'] },
  { key: 'gradient::#fa709a,#fee140', labelKey: 'settings.gradientSunsetGlow', colors: ['#fa709a', '#fee140'] },
  { key: 'gradient::#a18cd1,#fbc2eb', labelKey: 'settings.gradientLavender', colors: ['#a18cd1', '#fbc2eb'] },
  { key: 'gradient::#ff9a9e,#fecfef', labelKey: 'settings.gradientSoftPink', colors: ['#ff9a9e', '#fecfef'] },
  { key: 'gradient::#667eea,#43e97b', labelKey: 'settings.gradientAurora', colors: ['#667eea', '#43e97b'] },
];

const BACKGROUND_PRESETS = [
  { key: null, labelKey: 'settings.defaultBackground', preview: null },
  // Gradient backgrounds
  { key: 'gradient_purple', labelKey: 'settings.backgroundPurpleNight', colors: ['#667eea', '#764ba2'] },
  { key: 'gradient_blue', labelKey: 'settings.backgroundDeepSpace', colors: ['#1a1a2e', '#16213e'] },
  { key: 'gradient_green', labelKey: 'settings.backgroundForest', colors: ['#134e5e', '#71b280'] },
  { key: 'gradient_sunset', labelKey: 'settings.backgroundSunset', colors: ['#ff7e5f', '#feb47b'] },
  { key: 'gradient_ocean', labelKey: 'settings.backgroundOcean', colors: ['#2193b0', '#6dd5ed'] },
  { key: 'gradient_midnight', labelKey: 'settings.backgroundMidnight', colors: ['#232526', '#414345'] },
  { key: 'gradient_aurora', labelKey: 'settings.backgroundAurora', colors: ['#00c6fb', '#005bea'] },
  { key: 'gradient_rose', labelKey: 'settings.backgroundRoseGold', colors: ['#f4c4f3', '#fc67fa'] },
  // Pattern backgrounds (using color key to identify pattern type)
  { key: 'pattern_dots', labelKey: 'settings.backgroundDots', pattern: 'dots', baseColor: '#1a1a2e' },
  { key: 'pattern_grid', labelKey: 'settings.backgroundGrid', pattern: 'grid', baseColor: '#1a1a2e' },
  { key: 'pattern_waves', labelKey: 'settings.backgroundWaves', pattern: 'waves', baseColor: '#16213e' },
];

const ChatSettings = ({ navigation, route }) => {
  const {
    t,
    theme,
    isDarkMode,
    chatSettings,
    updateChatSetting,
  } = useAppSettings();
  const { user } = useUser();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef(null);
  const { chatId, focusSection } = route?.params || {};
  const [reactionDraft, setReactionDraft] = useState('');
  const [reactionDraftList, setReactionDraftList] = useState(DEFAULT_REACTION_SET);
  const [reactionSectionY, setReactionSectionY] = useState(null);

  const [selectedBackground, setSelectedBackground] = useState(chatSettings.backgroundImage);

  useEffect(() => {
    if (!chatId || !user?.$id) return;
    let isActive = true;

    const loadReactionDefaults = async () => {
      try {
        const defaults = await getReactionDefaults(user.$id, chatId);
        if (isActive) {
          setReactionDraftList(defaults || DEFAULT_REACTION_SET);
        }
      } catch (error) {
        if (isActive) {
          setReactionDraftList(DEFAULT_REACTION_SET);
        }
      }
    };

    loadReactionDefaults();
    return () => {
      isActive = false;
    };
  }, [chatId, user?.$id]);

  useEffect(() => {
    if (focusSection !== 'reactions' || reactionSectionY === null) return;
    const timer = setTimeout(() => {
      scrollRef.current?.scrollTo({
        y: Math.max(reactionSectionY - spacing.md, 0),
        animated: true,
      });
    }, 150);
    return () => clearTimeout(timer);
  }, [focusSection, reactionSectionY]);

  const GlassCard = ({ children, style }) => (
    <BlurView
      intensity={isDarkMode ? 30 : 0}
      tint={isDarkMode ? 'dark' : 'light'}
      style={[
        styles.glassCard,
        {
          backgroundColor: isDarkMode ? 'rgba(28, 28, 30, 0.6)' : '#FFFFFF',
          borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
        },
        style,
      ]}>
      {children}
    </BlurView>
  );

  const [sliderBubbleRadius, setSliderBubbleRadius] = useState(null);

  const handleBubbleRoundnessChange = (radius) => {
    updateChatSetting('bubbleRadius', Math.round(radius));
  };

  const handleBubbleColorChange = (color) => {
    updateChatSetting('bubbleColor', color);
  };

  const handleBackgroundChange = (bg) => {
    setSelectedBackground(bg);
    updateChatSetting('backgroundImage', bg);
  };

  const handleAddReactionDefault = () => {
    if (!chatId || !user?.$id) return;
    const value = reactionDraft.trim();
    if (!value) return;
    setReactionDraftList(prev => (prev.includes(value) ? prev : [...prev, value]));
    setReactionDraft('');
  };

  const handleRemoveReactionDefault = (emoji) => {
    if (!chatId || !user?.$id) return;
    setReactionDraftList(prev => prev.filter(item => item !== emoji));
  };

  const handleSaveReactionDefaults = async () => {
    if (!chatId || !user?.$id) return;
    try {
      const updated = await updateReactionDefaults(user.$id, chatId, reactionDraftList);
      setReactionDraftList(updated || reactionDraftList);
    } catch (error) {
      // Silent fail
    }
  };

  const getBubbleRadius = () => {
    const parsedRadius = Number(chatSettings?.bubbleRadius);
    if (!Number.isFinite(parsedRadius)) return borderRadius.lg;
    return Math.max(MIN_BUBBLE_RADIUS, Math.min(MAX_BUBBLE_RADIUS, parsedRadius));
  };

  const getPreviewBubbleRadius = () => {
    if (sliderBubbleRadius !== null && Number.isFinite(sliderBubbleRadius)) {
      return Math.max(MIN_BUBBLE_RADIUS, Math.min(MAX_BUBBLE_RADIUS, sliderBubbleRadius));
    }
    return getBubbleRadius();
  };

  const pickCustomBackground = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [9, 16],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const uri = result.assets[0].uri;
      handleBackgroundChange(uri);
    }
  };

  // Helper function to render preview bubbles
  const renderPreviewBubbles = () => (
    <>
      {/* Received message bubble */}
      <View style={[styles.previewBubbleWrapper, { alignSelf: 'flex-start' }]}>
        <View style={[
          styles.previewBubble,
          { 
            backgroundColor: 'rgba(255,255,255,0.15)',
              borderRadius: getPreviewBubbleRadius(),
            borderBottomLeftRadius: spacing.xs / 2,
          }
        ]}>
          <Text style={[styles.previewText, { color: '#FFFFFF' }]}>
            {t('settings.sampleReceived') || 'Hey! How are you?'}
          </Text>
          <Text style={[styles.previewTime, { color: 'rgba(255,255,255,0.6)' }]}>10:30</Text>
        </View>
      </View>
      
      {/* Sent message bubble - with current settings */}
      <View style={[styles.previewBubbleWrapper, { alignSelf: 'flex-end' }]}>
        {chatSettings.bubbleColor?.startsWith('gradient::') ? (
          <LinearGradient
            colors={chatSettings.bubbleColor.replace('gradient::', '').split(',')}
            style={[
              styles.previewBubble,
              { 
                borderRadius: getPreviewBubbleRadius(),
                borderBottomRightRadius: spacing.xs / 2,
              }
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={[styles.previewText, { color: '#FFFFFF' }]}>
              {t('settings.sampleSent') || "I'm doing great! 😊"}
            </Text>
            <Text style={[styles.previewTime, { color: 'rgba(255,255,255,0.6)' }]}>10:31</Text>
          </LinearGradient>
        ) : (
          <View style={[
            styles.previewBubble,
            { 
              backgroundColor: chatSettings.bubbleColor || '#667eea',
              borderRadius: getPreviewBubbleRadius(),
              borderBottomRightRadius: spacing.xs / 2,
            }
          ]}>
            <Text style={[styles.previewText, { color: '#FFFFFF' }]}>
              {t('settings.sampleSent') || "I'm doing great! 😊"}
            </Text>
            <Text style={[styles.previewTime, { color: 'rgba(255,255,255,0.6)' }]}>10:31</Text>
          </View>
        )}
      </View>
    </>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <LinearGradient
        colors={isDarkMode
          ? ['rgba(102, 126, 234, 0.15)', 'transparent']
          : ['rgba(102, 126, 234, 0.1)', 'transparent']
        }
        style={styles.headerGradient}
      />

      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}>
          <Ionicons name="arrow-back" size={moderateScale(22)} color={theme.text} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>
            {t('settings.chatCustomization') || 'Chat Customization'}
          </Text>
        </View>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}>

        {/* Bubble Settings Section with Preview */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
            {t('settings.bubbleSettings') || 'Bubble Settings'}
          </Text>
          
          {/* Bubble Preview - Shows actual bubble appearance */}
          <GlassCard style={styles.previewCard}>
            {/* Preview Background - shows selected background */}
            {selectedBackground?.startsWith('gradient_') ? (
              <LinearGradient
                colors={BACKGROUND_PRESETS.find(b => b.key === selectedBackground)?.colors || ['#1a1a2e', '#16213e']}
                style={styles.bubblePreviewContainer}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                {renderPreviewBubbles()}
              </LinearGradient>
            ) : selectedBackground?.startsWith('pattern_') ? (
              <View style={[styles.bubblePreviewContainer, { backgroundColor: BACKGROUND_PRESETS.find(b => b.key === selectedBackground)?.baseColor || '#1a1a2e' }]}>
                {renderPreviewBubbles()}
              </View>
            ) : selectedBackground && !BACKGROUND_PRESETS.find(b => b.key === selectedBackground) ? (
              <View style={styles.bubblePreviewContainer}>
                <Image 
                  source={{ uri: selectedBackground }} 
                  style={StyleSheet.absoluteFillObject}
                  resizeMode="cover"
                />
                {renderPreviewBubbles()}
              </View>
            ) : (
              <View style={[styles.bubblePreviewContainer, { backgroundColor: isDarkMode ? '#1a1a2e' : '#f5f5f5' }]}>
                {renderPreviewBubbles()}
              </View>
            )}
          </GlassCard>
        </View>

        {/* Bubble Roundness */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
            {t('settings.bubbleRoundness') || 'Bubble Roundness'}
          </Text>
          <GlassCard>
            <View style={styles.sliderSection}>
              <View style={styles.sliderHeaderRow}>
                <Text style={[styles.sliderHint, { color: theme.textSecondary }]}>
                  {t('settings.bubbleLessRound') || 'Less round'}
                </Text>
                <Text style={[styles.sliderValue, { color: theme.primary }]}>
                  {sliderBubbleRadius !== null ? Math.round(sliderBubbleRadius) : Math.round(getBubbleRadius())}
                </Text>
                <Text style={[styles.sliderHint, { color: theme.textSecondary }]}>
                  {t('settings.bubbleMoreRound') || 'More round'}
                </Text>
              </View>
              <Slider
                style={styles.sliderControl}
                minimumValue={MIN_BUBBLE_RADIUS}
                maximumValue={MAX_BUBBLE_RADIUS}
                step={0}
                value={sliderBubbleRadius !== null ? Math.round(sliderBubbleRadius) : Math.round(getBubbleRadius())}
                minimumTrackTintColor={theme.primary}
                maximumTrackTintColor={isDarkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)'}
                thumbTintColor={theme.primary}
                onValueChange={(value) => {
                  const rounded = Math.round(value);
                  setSliderBubbleRadius((prev) => (prev === rounded ? prev : rounded));
                  console.log('[SETTINGS_DEBUG] bubbleRadius:onValueChange', {
                    raw: value,
                    rounded,
                  });
                }}
                onSlidingComplete={(value) => {
                  const rounded = Math.round(value);
                  setSliderBubbleRadius(null);
                  console.log('[SETTINGS_DEBUG] bubbleRadius:onSlidingComplete', {
                    raw: value,
                    rounded,
                  });
                  handleBubbleRoundnessChange(rounded);
                }}
              />
            </View>
          </GlassCard>
        </View>

        {/* Bubble Color */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
            {t('settings.solidColors') || 'Solid Colors'}
          </Text>
          <GlassCard>
            <View style={styles.colorsGrid}>
              {BUBBLE_COLORS_SOLID.map((color) => (
                <TouchableOpacity
                  key={color.key}
                  style={[
                    styles.colorOption,
                    { backgroundColor: color.key },
                    chatSettings.bubbleColor === color.key && styles.colorOptionSelected,
                  ]}
                  onPress={() => handleBubbleColorChange(color.key)}>
                  {chatSettings.bubbleColor === color.key && (
                    <Ionicons name="checkmark" size={moderateScale(18)} color="#FFFFFF" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </GlassCard>
        </View>

        {/* Gradient Bubble Colors */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
            {t('settings.gradientColors') || 'Gradient Colors'}
          </Text>
          <GlassCard>
            <View style={styles.colorsGrid}>
              {BUBBLE_COLORS_GRADIENT.map((gradient) => (
                <TouchableOpacity
                  key={gradient.key}
                  style={[
                    styles.colorOption,
                    chatSettings.bubbleColor === gradient.key && styles.colorOptionSelected,
                  ]}
                  onPress={() => handleBubbleColorChange(gradient.key)}>
                  <LinearGradient
                    colors={gradient.colors}
                    style={styles.gradientColorFill}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  />
                  {chatSettings.bubbleColor === gradient.key && (
                    <View style={styles.checkOverlay}>
                      <Ionicons name="checkmark" size={moderateScale(18)} color="#FFFFFF" />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </GlassCard>
        </View>

        {/* Chat Background */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
            {t('settings.chatBackground') || 'Chat Background'}
          </Text>
          <GlassCard>
            <View style={styles.backgroundsGrid}>
              {BACKGROUND_PRESETS.map((bg) => (
                <TouchableOpacity
                  key={bg.key || 'default'}
                  style={[
                    styles.backgroundOption,
                    selectedBackground === bg.key && styles.backgroundOptionSelected,
                    selectedBackground === bg.key && { borderColor: theme.primary },
                  ]}
                  onPress={() => handleBackgroundChange(bg.key)}>
                  {bg.colors ? (
                    <LinearGradient
                      colors={bg.colors}
                      style={styles.backgroundPreview}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <Text style={[styles.bgLabel, { fontSize: responsiveFontSize(8) }]} numberOfLines={1}>
                        {t(bg.labelKey)}
                      </Text>
                    </LinearGradient>
                  ) : bg.pattern ? (
                    <View style={[styles.backgroundPreview, { backgroundColor: bg.baseColor }]}>
                      {bg.pattern === 'dots' && (
                        <View style={styles.patternDotsContainer}>
                          {[...Array(12)].map((_, i) => (
                            <View key={i} style={styles.patternDot} />
                          ))}
                        </View>
                      )}
                      {bg.pattern === 'grid' && (
                        <View style={styles.patternGridContainer}>
                          {[...Array(9)].map((_, i) => (
                            <View key={i} style={styles.patternGridCell} />
                          ))}
                        </View>
                      )}
                      {bg.pattern === 'waves' && (
                        <View style={styles.patternWavesContainer}>
                          <View style={[styles.patternWave, { top: '20%' }]} />
                          <View style={[styles.patternWave, { top: '50%' }]} />
                          <View style={[styles.patternWave, { top: '80%' }]} />
                        </View>
                      )}
                      <Text style={[styles.bgLabel, { fontSize: responsiveFontSize(8) }]} numberOfLines={1}>
                        {t(bg.labelKey)}
                      </Text>
                    </View>
                  ) : (
                    <View style={[
                      styles.backgroundPreview,
                      { backgroundColor: isDarkMode ? '#1a1a2e' : '#f5f5f5' }
                    ]}>
                      <Text style={[styles.defaultLabel, { color: theme.textSecondary, fontSize: responsiveFontSize(10) }]}>
                        {t('common.default') || 'Default'}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
              
              {/* Custom image option */}
              <TouchableOpacity
                style={[
                  styles.backgroundOption,
                  selectedBackground && !BACKGROUND_PRESETS.find(b => b.key === selectedBackground) && styles.backgroundOptionSelected,
                ]}
                onPress={pickCustomBackground}>
                {selectedBackground && !BACKGROUND_PRESETS.find(b => b.key === selectedBackground) ? (
                  <Image 
                    source={{ uri: selectedBackground }} 
                    style={styles.backgroundPreview}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={[
                    styles.backgroundPreview,
                    styles.customBackgroundOption,
                    { borderColor: theme.border }
                  ]}>
                    <Ionicons name="add" size={moderateScale(24)} color={theme.textSecondary} />
                    <Text style={[styles.customLabel, { color: theme.textSecondary, fontSize: responsiveFontSize(10) }]}>
                      {t('settings.custom') || 'Custom'}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </GlassCard>
        </View>

        {chatId && user?.$id && (
          <View
            style={styles.section}
            onLayout={(event) => setReactionSectionY(event.nativeEvent.layout.y)}
          >
            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
              {t('chats.reactionDefaultsTitle')}
            </Text>
            <GlassCard>
              <View style={styles.reactionDefaultsRow}>
                {reactionDraftList.map((emoji) => (
                  <TouchableOpacity
                    key={emoji}
                    style={[
                      styles.reactionDefaultChip,
                      { borderColor: isDarkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)' }
                    ]}
                    onPress={() => handleRemoveReactionDefault(emoji)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.reactionEmoji}>{emoji}</Text>
                    <Ionicons name="close" size={moderateScale(14)} color={theme.textSecondary} />
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.reactionInputRow}>
                <TextInput
                  value={reactionDraft}
                  onChangeText={setReactionDraft}
                  placeholder={t('chats.customReactionPlaceholder')}
                  placeholderTextColor={theme.textSecondary}
                  style={[
                    styles.reactionInput,
                    {
                      color: theme.text,
                      borderColor: isDarkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)'
                    }
                  ]}
                  autoCorrect={false}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  style={[styles.reactionAddButton, { backgroundColor: theme.primary }]}
                  onPress={handleAddReactionDefault}
                  activeOpacity={0.8}
                >
                  <Ionicons name="add" size={moderateScale(18)} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              <View style={styles.reactionFooterRow}>
                <TouchableOpacity
                  style={[styles.reactionSaveButton, { backgroundColor: theme.primary }]}
                  onPress={handleSaveReactionDefaults}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.reactionSaveText, { color: '#FFFFFF' }]}>
                    {t('common.save')}
                  </Text>
                </TouchableOpacity>
              </View>
            </GlassCard>
          </View>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: hp(20),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: wp(5),
    paddingBottom: spacing.md,
  },
  backButton: {
    width: moderateScale(40),
    height: moderateScale(40),
    justifyContent: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: responsiveFontSize(20),
    fontWeight: '600',
  },
  placeholder: {
    width: moderateScale(40),
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: wp(5),
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: responsiveFontSize(13),
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.md,
  },
  reactionDefaultsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
    justifyContent: 'center',
  },
  reactionDefaultChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.lg,
  },
  reactionEmoji: {
    fontSize: responsiveFontSize(16),
  },
  reactionInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  reactionInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: Platform.OS === 'ios' ? spacing.sm : spacing.xs,
  },
  reactionAddButton: {
    width: moderateScale(42),
    height: moderateScale(42),
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reactionFooterRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: spacing.md,
  },
  reactionSaveButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  reactionSaveText: {
    fontWeight: '600',
  },
  glassCard: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    padding: spacing.md,
    ...shadows.small,
  },
  sliderSection: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  sliderHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  sliderHint: {
    fontSize: responsiveFontSize(11),
    fontWeight: '500',
  },
  sliderValue: {
    fontSize: responsiveFontSize(14),
    fontWeight: '700',
  },
  sliderControl: {
    width: '100%',
    height: moderateScale(34),
  },
  colorsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  colorOption: {
    width: moderateScale(44),
    height: moderateScale(44),
    borderRadius: moderateScale(22),
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  colorOptionSelected: {
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  gradientColorFill: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: moderateScale(22),
  },
  checkOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  backgroundsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  backgroundOption: {
    width: moderateScale(70),
    height: moderateScale(100),
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  backgroundOptionSelected: {
    borderWidth: 2,
  },
  backgroundPreview: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: spacing.xs,
  },
  bgLabel: {
    color: '#FFFFFF',
    fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  defaultLabel: {
    fontWeight: '500',
  },
  customBackgroundOption: {
    borderWidth: 1,
    borderStyle: 'dashed',
    justifyContent: 'center',
  },
  customLabel: {
    marginTop: spacing.xs / 2,
    fontWeight: '500',
  },
  // Pattern styles
  patternDotsContainer: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    alignContent: 'space-around',
    padding: spacing.xs,
  },
  patternDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  patternGridContainer: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  patternGridCell: {
    width: '33.33%',
    height: '33.33%',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  patternWavesContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  patternWave: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 1,
  },
  previewCard: {
    padding: 0,
    overflow: 'hidden',
  },
  bubblePreviewContainer: {
    padding: spacing.lg,
    minHeight: moderateScale(140),
    justifyContent: 'center',
    gap: spacing.md,
    borderRadius: borderRadius.lg,
  },
  previewBubbleWrapper: {
    maxWidth: '80%',
  },
  previewBubble: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    overflow: 'hidden',
  },
  previewText: {
    fontSize: responsiveFontSize(14),
    lineHeight: responsiveFontSize(20),
  },
  previewTime: {
    fontSize: responsiveFontSize(9),
    alignSelf: 'flex-end',
    marginTop: spacing.xs / 2,
  },
  previewContainer: {
    padding: spacing.md,
    minHeight: moderateScale(120),
    justifyContent: 'center',
    gap: spacing.sm,
  },
  receivedBubble: {
    alignSelf: 'flex-start',
    borderBottomLeftRadius: spacing.xs / 2,
  },
  sentBubble: {
    alignSelf: 'flex-end',
    borderBottomRightRadius: spacing.xs / 2,
  },
  bottomPadding: {
    height: hp(5),
  },
});

export default ChatSettings;
