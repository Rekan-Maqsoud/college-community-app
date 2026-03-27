import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { moderateScale, spacing } from '../../utils/responsive';
import { borderRadius } from '../../theme/designTokens';
import {
  clearTutorialMeasure,
  getLatestTutorialMeasure,
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
    const topSafe = spacing.md;
    const bottomSafe = spacing.xl;
    const gap = spacing.sm;
    const maxWidth = 360;
    const usableWidth = Math.max(0, windowWidth - horizontalPadding * 2);
    const cardWidth = Math.min(maxWidth, usableWidth);

    if (!anchorRect || !anchorRect.width || !anchorRect.height) {
      return {
        left: horizontalPadding,
        right: horizontalPadding,
        bottom: spacing.lg,
      };
    }

    const rawLeft = anchorRect.x + anchorRect.width / 2 - cardWidth / 2;
    const left = Math.max(horizontalPadding, Math.min(rawLeft, windowWidth - cardWidth - horizontalPadding));
    const cardMaxTop = Math.max(topSafe, windowHeight - cardHeight - bottomSafe);
    const spaceBelow = windowHeight - (anchorRect.y + anchorRect.height) - bottomSafe;
    const spaceAbove = anchorRect.y - topSafe;
    const belowTop = Math.min(anchorRect.y + anchorRect.height + gap, cardMaxTop);
    const aboveTop = Math.max(topSafe, anchorRect.y - cardHeight - gap);
    const belowDoesNotOverlap = belowTop >= anchorRect.y + anchorRect.height + gap;
    const aboveDoesNotOverlap = aboveTop + cardHeight <= anchorRect.y - gap;

    if (spaceBelow >= cardHeight + gap && belowDoesNotOverlap) {
      return {
        width: cardWidth,
        left,
        top: belowTop,
      };
    }

    if (spaceAbove >= cardHeight + gap && aboveDoesNotOverlap) {
      return {
        width: cardWidth,
        left,
        top: aboveTop,
      };
    }

    if (spaceBelow >= spaceAbove) {
      return {
        width: cardWidth,
        left,
        top: cardMaxTop,
      };
    }

    return {
      width: cardWidth,
      left,
      top: topSafe,
    };
  }, [anchorRect, cardHeight, windowHeight, windowWidth]);

  if (!visible || !step) {
    return null;
  }

  const isLastStep = stepIndex >= totalSteps - 1;
  const nextLabel = isLastStep ? t('tutorial.common.done') : t('tutorial.common.next');
  const progressTemplate = t('tutorial.common.progress') || 'Step {current} of {total}';
  const progressLabel = progressTemplate
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
  },
  card: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
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
