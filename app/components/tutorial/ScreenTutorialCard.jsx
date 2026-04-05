import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { moderateScale, spacing } from '../../utils/responsive';
import { borderRadius } from '../../theme/designTokens';
import {
  clearTutorialMeasure,
  subscribeTutorialMeasure,
} from './tutorialMeasureStore';

const ScreenTutorialCard = ({
  visible,
  theme,
  isRTL,
  t,
  step,
  stepIndex,
  totalSteps,
  onPrev,
  onNext,
  onSkip,
  targetRect,
}) => {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [cardHeight, setCardHeight] = useState(208);
  const [measuredTargetRect, setMeasuredTargetRect] = useState(null);

  useEffect(() => {
    const unsubscribe = subscribeTutorialMeasure((rect) => {
      setMeasuredTargetRect(rect || null);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!visible) {
      setMeasuredTargetRect(null);
      clearTutorialMeasure();
      return;
    }

    // Reset on each step to avoid carrying stale position from previous targets/screens.
    setMeasuredTargetRect(null);
  }, [step?.target, visible]);

  const anchorRect = targetRect || measuredTargetRect;

  const cardPositionStyle = useMemo(() => {
    const horizontalPadding = spacing.md;
    const topSafe = insets.top + spacing.sm;
    const bottomSafe = insets.bottom + spacing.lg;
    const bottomClickGuard = bottomSafe + moderateScale(64);
    const gap = spacing.sm;
    const maxWidth = 360;
    const usableWidth = Math.max(0, windowWidth - horizontalPadding * 2);
    const cardWidth = Math.min(maxWidth, usableWidth);
    const maxCardHeight = Math.max(160, windowHeight - topSafe - bottomClickGuard);

    const centeredTop = Math.max(
      topSafe,
      Math.min((windowHeight - cardHeight) / 2, windowHeight - cardHeight - bottomClickGuard)
    );

    if (!anchorRect || !anchorRect.width || !anchorRect.height) {
      return {
        width: cardWidth,
        maxHeight: maxCardHeight,
        left: horizontalPadding,
        top: centeredTop,
      };
    }

    const anchorCenterY = anchorRect.y + anchorRect.height / 2;
    const forceCenterCard = step?.centerCard === true;

    if (forceCenterCard) {
      return {
        width: cardWidth,
        maxHeight: maxCardHeight,
        left: Math.max(horizontalPadding, Math.min((windowWidth - cardWidth) / 2, windowWidth - cardWidth - horizontalPadding)),
        top: centeredTop,
      };
    }

    const rawLeft = anchorRect.x + anchorRect.width / 2 - cardWidth / 2;
    const left = Math.max(horizontalPadding, Math.min(rawLeft, windowWidth - cardWidth - horizontalPadding));
    const cardMaxTop = Math.max(topSafe, windowHeight - cardHeight - bottomClickGuard);
    const spaceBelow = windowHeight - (anchorRect.y + anchorRect.height) - bottomClickGuard;
    const spaceAbove = anchorRect.y - topSafe;
    const belowTop = Math.min(anchorRect.y + anchorRect.height + gap, cardMaxTop);
    const aboveTop = Math.max(topSafe, anchorRect.y - cardHeight - gap);
    const belowDoesNotOverlap = belowTop >= anchorRect.y + anchorRect.height + gap;
    const aboveDoesNotOverlap = aboveTop + cardHeight <= anchorRect.y - gap;

    const prefersBelow = anchorCenterY < windowHeight * 0.45;
    const canPlaceBelow = spaceBelow >= cardHeight + gap && belowDoesNotOverlap;
    const canPlaceAbove = spaceAbove >= cardHeight + gap && aboveDoesNotOverlap;

    if (canPlaceBelow && (prefersBelow || !canPlaceAbove)) {
      return {
        width: cardWidth,
        maxHeight: maxCardHeight,
        left,
        top: belowTop,
      };
    }

    if (canPlaceAbove) {
      return {
        width: cardWidth,
        maxHeight: maxCardHeight,
        left,
        top: aboveTop,
      };
    }

    if (spaceBelow >= spaceAbove) {
      const targetBottom = anchorRect.y + anchorRect.height + gap;
      const top = Math.max(topSafe, Math.min(targetBottom, windowHeight - bottomClickGuard));
      const constrainedHeight = Math.max(0, windowHeight - top - bottomClickGuard);

      return {
        width: cardWidth,
        maxHeight: Math.min(maxCardHeight, constrainedHeight),
        left,
        top,
      };
    }

    const constrainedHeight = Math.max(0, anchorRect.y - topSafe - gap);
    const top = Math.max(topSafe, anchorRect.y - constrainedHeight - gap);

    return {
      width: cardWidth,
      maxHeight: Math.min(maxCardHeight, constrainedHeight),
      left,
      top,
    };
  }, [anchorRect, cardHeight, insets.bottom, insets.top, step?.centerCard, windowHeight, windowWidth]);

  if (!visible || !step) {
    return null;
  }

  const isLastStep = stepIndex >= totalSteps - 1;
  const nextLabel = isLastStep ? t('tutorial.common.done') : t('tutorial.common.next');
  const progressTemplate = t('tutorial.common.progress');
  const normalizedProgressTemplate = (typeof progressTemplate === 'string'
    && progressTemplate.includes('{current}')
    && progressTemplate.includes('{total}'))
    ? progressTemplate
    : '{current}/{total}';
  const progressLabel = normalizedProgressTemplate
    .replace('{current}', String(stepIndex + 1))
    .replace('{total}', String(totalSteps));

  return (
    <View pointerEvents="box-none" style={styles.overlay}>
      <View
        onLayout={(event) => {
          const nextHeight = event?.nativeEvent?.layout?.height;
          if (nextHeight && Math.abs(nextHeight - cardHeight) > 2) {
            setCardHeight(nextHeight);
          }
        }}
        style={[
          styles.card,
          cardPositionStyle,
          {
            backgroundColor: theme.card,
            borderColor: theme.border,
            shadowColor: theme.shadow,
          },
        ]}
      >
        <Text style={[styles.progress, isRTL && styles.directionalText, { color: theme.textSecondary }]}> 
          {progressLabel}
        </Text>

        <Text style={[styles.title, isRTL && styles.directionalText, { color: theme.text }]}>
          {step.title}
        </Text>

        <Text style={[styles.description, isRTL && styles.directionalText, { color: theme.textSecondary }]}> 
          {step.description}
        </Text>

        <View style={[styles.actions, isRTL && styles.actionsRtl]}>
          <TouchableOpacity
            style={[styles.secondaryButton, { borderColor: theme.border }]}
            onPress={onSkip}
            accessibilityRole="button"
            accessibilityLabel={t('tutorial.common.skip')}
          >
            <Text style={[styles.secondaryButtonText, { color: theme.textSecondary }]}> 
              {t('tutorial.common.skip')}
            </Text>
          </TouchableOpacity>

          <View style={[styles.inlineActions, isRTL && styles.actionsRtl]}>
            {stepIndex > 0 ? (
              <TouchableOpacity
                style={[styles.secondaryButton, { borderColor: theme.border }]}
                onPress={onPrev}
                accessibilityRole="button"
                accessibilityLabel={t('tutorial.common.back')}
              >
                <Text style={[styles.secondaryButtonText, { color: theme.textSecondary }]}> 
                  {t('tutorial.common.back')}
                </Text>
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: theme.primary }]}
              onPress={onNext}
              accessibilityRole="button"
              accessibilityLabel={nextLabel}
            >
              <Text style={[styles.primaryButtonText, { color: theme.buttonText || '#FFFFFF' }]}> 
                {nextLabel}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
    elevation: 9999,
  },
  card: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    zIndex: 10000,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 8,
  },
  progress: {
    fontSize: moderateScale(12),
    fontWeight: '600',
  },
  title: {
    marginTop: spacing.xs,
    fontSize: moderateScale(16),
    fontWeight: '700',
  },
  description: {
    marginTop: spacing.xs,
    fontSize: moderateScale(13),
    lineHeight: moderateScale(20),
  },
  actions: {
    marginTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  actionsRtl: {
    flexDirection: 'row-reverse',
  },
  inlineActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  secondaryButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  secondaryButtonText: {
    fontSize: moderateScale(12),
    fontWeight: '600',
  },
  primaryButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  primaryButtonText: {
    fontSize: moderateScale(12),
    fontWeight: '700',
  },
  directionalText: {
    writingDirection: 'rtl',
    textAlign: 'right',
  },
});

export default ScreenTutorialCard;
