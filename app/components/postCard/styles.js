import { StyleSheet } from 'react-native';
import { moderateScale, fontSize, spacing, wp, hp, getResponsiveSize } from '../../utils/responsive';
import { borderRadius } from '../../theme/designTokens';

export const postCardStyles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.lg,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.12,
    shadowRadius: moderateScale(8),
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: moderateScale(8),
  },
  userAvatar: {
    width: moderateScale(34),
    height: moderateScale(34),
    borderRadius: moderateScale(17),
    marginRight: spacing.xs,
  },
  headerInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(4),
    marginBottom: moderateScale(2),
  },
  userNameContainer: {
    flex: 1,
    marginRight: moderateScale(5),
  },
  userName: {
    fontSize: fontSize(12),
    fontWeight: '700',
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(5),
    flexWrap: 'wrap',
  },
  timeText: {
    fontSize: fontSize(10),
    fontWeight: '400',
  },
  editedText: {
    fontSize: fontSize(9),
    fontStyle: 'italic',
  },
  youBadge: {
    paddingHorizontal: moderateScale(5),
    paddingVertical: moderateScale(1),
    borderRadius: moderateScale(3),
  },
  youBadgeText: {
    fontSize: fontSize(8),
    fontWeight: '700',
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
  stageBadge: {
    paddingHorizontal: moderateScale(5),
    paddingVertical: moderateScale(2),
    borderRadius: moderateScale(5),
    borderWidth: 1,
  },
  stageText: {
    fontSize: fontSize(8),
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  typeBadgeInline: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: moderateScale(5),
    paddingVertical: moderateScale(2),
    borderRadius: moderateScale(5),
    gap: moderateScale(2),
  },
  typeTextInline: {
    fontSize: fontSize(8),
    fontWeight: '600',
  },
  repostBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: moderateScale(5),
    paddingVertical: moderateScale(2),
    borderRadius: moderateScale(5),
    gap: moderateScale(2),
  },
  repostText: {
    fontSize: fontSize(8),
    fontWeight: '600',
  },
  menuButton: {
    padding: moderateScale(4),
  },
  content: {
    marginBottom: moderateScale(10),
  },
  topic: {
    fontSize: fontSize(15),
    fontWeight: '700',
    marginBottom: moderateScale(8),
    lineHeight: fontSize(15) * 1.45,
  },
  text: {
    fontSize: fontSize(13),
    lineHeight: fontSize(13) * 1.5,
    marginBottom: moderateScale(8),
  },
  pollContainer: {
    marginTop: spacing.xs,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  pollQuestion: {
    fontSize: fontSize(12),
    fontWeight: '600',
    marginBottom: spacing.xs / 2,
  },
  pollOptionButton: {
    borderWidth: 1,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  pollOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  pollOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flex: 1,
  },
  pollOptionText: {
    fontSize: fontSize(12),
    fontWeight: '500',
    flex: 1,
  },
  pollOptionPercent: {
    fontSize: fontSize(11),
    fontWeight: '600',
  },
  pollFooterRow: {
    marginTop: spacing.xs / 2,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pollMetaText: {
    fontSize: fontSize(10),
    fontWeight: '500',
  },
  linksContainer: {
    marginTop: spacing.sm,
    marginBottom: moderateScale(4),
    gap: moderateScale(6),
  },
  linkChipDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    paddingHorizontal: moderateScale(8),
    paddingVertical: moderateScale(5),
    borderRadius: borderRadius.sm,
    gap: moderateScale(6),
    alignSelf: 'flex-start',
  },
  linkText: {
    fontSize: fontSize(12),
    color: '#3B82F6',
    flex: 1,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.sm,
    alignItems: 'center',
  },
  tag: {
    paddingHorizontal: moderateScale(10),
    paddingVertical: moderateScale(5),
    borderRadius: moderateScale(14),
    marginRight: spacing.xs,
    marginBottom: moderateScale(5),
  },
  tagText: {
    fontSize: fontSize(11),
    fontWeight: '600',
  },
  seeMoreButton: {
    marginTop: spacing.xs,
    marginBottom: moderateScale(3),
  },
  seeMoreText: {
    fontSize: fontSize(12),
    fontWeight: '600',
  },
  singleImage: {
    width: '100%',
    height: hp(32),
    borderRadius: borderRadius.lg,
    marginTop: moderateScale(14),
  },
  twoImagesContainer: {
    flexDirection: 'row',
    marginTop: moderateScale(14),
    gap: spacing.sm,
  },
  twoImageWrapper: {
    flex: 1,
  },
  twoImage: {
    width: '100%',
    height: hp(24),
    borderRadius: moderateScale(14),
  },
  threeImagesContainer: {
    flexDirection: 'row',
    marginTop: moderateScale(14),
    gap: spacing.sm,
    height: hp(32),
  },
  threeImageMain: {
    flex: 2,
  },
  threeMainImage: {
    width: '100%',
    height: '100%',
    borderRadius: moderateScale(14),
  },
  threeImageSide: {
    flex: 1,
    gap: spacing.sm,
  },
  threeSideWrapper: {
    flex: 1,
  },
  threeSideImage: {
    width: '100%',
    height: '100%',
    borderRadius: moderateScale(14),
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: moderateScale(14),
    gap: spacing.sm,
  },
  gridImageWrapper: {
    width: '48.5%',
    height: hp(20),
    position: 'relative',
  },
  gridImage: {
    width: '100%',
    height: '100%',
    borderRadius: moderateScale(14),
  },
  moreImagesOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: moderateScale(14),
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreImagesText: {
    color: '#fff',
    fontSize: fontSize(24),
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: moderateScale(8),
    borderTopWidth: 1,
  },
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    flexWrap: 'wrap',
  },
  footerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    flexShrink: 1,
    maxWidth: '45%',
    gap: getResponsiveSize(moderateScale(4), moderateScale(8), moderateScale(10)),
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: getResponsiveSize(moderateScale(4), moderateScale(6), moderateScale(8)),
    paddingHorizontal: getResponsiveSize(moderateScale(4), moderateScale(8), moderateScale(10)),
    gap: getResponsiveSize(moderateScale(2), moderateScale(3), moderateScale(4)),
  },
  actionText: {
    fontSize: getResponsiveSize(fontSize(9), fontSize(10), fontSize(11)),
    fontWeight: '600',
  },
  statsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
    gap: getResponsiveSize(moderateScale(2), moderateScale(3), moderateScale(4)),
  },
  statsText: {
    fontSize: getResponsiveSize(fontSize(8), fontSize(9), fontSize(10)),
    fontWeight: '500',
    flexShrink: 1,
  },
  // Compact mode styles
  cardCompact: {
    padding: moderateScale(12),
    marginBottom: moderateScale(10),
    borderRadius: borderRadius.lg,
  },
  headerCompact: {
    marginBottom: spacing.sm,
  },
  userAvatarCompact: {
    width: moderateScale(32),
    height: moderateScale(32),
    borderRadius: moderateScale(16),
  },
  contentCompact: {
    marginBottom: spacing.sm,
  },
  topicCompact: {
    fontSize: fontSize(14),
    marginBottom: moderateScale(4),
    lineHeight: fontSize(14) * 1.5,
  },
  footerCompact: {
    paddingTop: spacing.sm,
    marginTop: spacing.sm,
  },
  // Compact image styles
  compactImageContainer: {
    marginTop: spacing.sm,
    position: 'relative',
    borderRadius: moderateScale(12),
    overflow: 'hidden',
  },
  compactImage: {
    width: '100%',
    height: moderateScale(120),
    borderRadius: moderateScale(12),
  },
  compactImageCount: {
    position: 'absolute',
    bottom: moderateScale(6),
    right: moderateScale(6),
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: spacing.sm,
    paddingVertical: moderateScale(4),
    borderRadius: moderateScale(10),
  },
  compactImageCountText: {
    color: '#fff',
    fontSize: fontSize(11),
    fontWeight: '600',
  },
});

export const STAGE_COLORS = {
  stage_1: '#3B82F6',
  stage_2: '#8B5CF6',
  stage_3: '#10B981',
  stage_4: '#F59E0B',
  stage_5: '#EF4444',
  stage_6: '#EC4899',
  graduate: '#6366F1',
  all: '#6B7280',
};

export const sanitizeTag = (tag) => {
  if (!tag) return '';
  return String(tag).replace(/[^a-zA-Z0-9\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\s_-]/g, '').trim();
};

export const formatTimeAgo = (timestamp, t) => {
  if (!timestamp) return '';
  
  try {
    const now = new Date();
    const postDate = new Date(timestamp);
    
    if (isNaN(postDate.getTime())) return '';
    
    const diffMs = now - postDate;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    const diffWeeks = Math.floor(diffDays / 7);

    // Helper function to safely replace {count} in translation
    const replaceCount = (translationKey, count, fallback) => {
      try {
        const text = t(translationKey);
        if (text && typeof text === 'string' && text.includes('{count}')) {
          return text.replace('{count}', String(count));
        }
        // If translation doesn't have {count}, return fallback
        return fallback;
      } catch {
        return fallback;
      }
    };

    // For recent times, show relative time
    if (diffMins < 1) {
      const text = t('time.justNow');
      return (text && typeof text === 'string') ? text : 'Just now';
    }
    if (diffMins < 60) {
      return replaceCount('time.minutesAgo', diffMins, `${diffMins} min`);
    }
    if (diffHours < 24) {
      return replaceCount('time.hoursAgo', diffHours, `${diffHours} hr`);
    }
    if (diffDays < 7) {
      return replaceCount('time.daysAgo', diffDays, `${diffDays} day`);
    }
    if (diffWeeks < 4) {
      return replaceCount('time.weeksAgo', diffWeeks, `${diffWeeks} wk`);
    }
    
    // For older posts (1+ month), show the date in a nice format
    const day = postDate.getDate();
    const month = postDate.getMonth() + 1;
    const year = postDate.getFullYear();
    const currentYear = now.getFullYear();
    
    // If same year, don't show year
    if (year === currentYear) {
      return `${day}/${month}`;
    }
    
    return `${day}/${month}/${year}`;
  } catch (error) {
    return '';
  }
};

export const getDefaultAvatar = (name) => {
  const sanitizedName = (name || 'User').replace(/[^a-zA-Z0-9\s]/g, '').substring(0, 50);
  return 'https://ui-avatars.com/api/?name=' + encodeURIComponent(sanitizedName) + '&size=200&background=667eea&color=fff&bold=true';
};
