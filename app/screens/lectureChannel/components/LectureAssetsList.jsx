import React from 'react';
import { Image, Linking, Text, TouchableOpacity, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Ionicons } from '@expo/vector-icons';
import { moderateScale } from '../../../utils/responsive';
import { LECTURE_UPLOAD_TYPES } from '../../../../database/lectures';
import {
  buildYouTubeVideoId,
  formatBytesAsMb,
  getYouTubeWatchUrl,
} from '../lectureChannelUtils';
import styles from '../LectureChannelStyles';

const LectureAssetsList = ({
  assetListData,
  canViewAssetInfo,
  colors,
  handleDownloadAsset,
  openAsset,
  openAssetMenu,
  openComments,
  setAssetStatsOpen,
  setAssetStatsTarget,
  loading,
  t,
}) => {
  const renderAsset = ({ item }) => {
    if (item?.type === 'folder') {
      return (
        <View style={[styles.folderHeaderRow, { borderColor: colors.border, backgroundColor: colors.inputBackground }]}> 
          <Ionicons name="folder-open-outline" size={16} color={colors.primary} />
          <Text style={[styles.folderHeaderText, { color: colors.text }]}>{item.name}</Text>
        </View>
      );
    }

    const asset = item?.asset;
    if (!asset) {
      return null;
    }

    const typeText = asset.uploadType === LECTURE_UPLOAD_TYPES.YOUTUBE
      ? t('lectures.youtube')
      : asset.uploadType === LECTURE_UPLOAD_TYPES.LINK
        ? t('lectures.link')
        : t('lectures.file');

    const accentColor = asset.uploadType === LECTURE_UPLOAD_TYPES.YOUTUBE
      ? colors.danger
      : asset.uploadType === LECTURE_UPLOAD_TYPES.LINK
        ? colors.warning
        : colors.primary;
    const previewBg = `${accentColor}1A`;
    const youtubeVideoId = asset.uploadType === LECTURE_UPLOAD_TYPES.YOUTUBE
      ? buildYouTubeVideoId(asset.youtubeUrl || '')
      : '';
    const youtubeThumbUrl = youtubeVideoId ? `https://img.youtube.com/vi/${youtubeVideoId}/hqdefault.jpg` : '';
    const youtubeWatchUrl = getYouTubeWatchUrl(youtubeVideoId);

    const fileExtension = String(asset?.fileName || asset?.title || '')
      .split('.')
      .pop()
      .toUpperCase();
    const compactExt = fileExtension && fileExtension.length <= 5 ? fileExtension : t('lectures.file');

    let previewContent = null;

    if (asset.uploadType === LECTURE_UPLOAD_TYPES.YOUTUBE) {
      const onOpenYoutube = () => {
        const urlToOpen = youtubeWatchUrl || asset.youtubeUrl;
        if (!urlToOpen) {
          return;
        }
        Linking.openURL(urlToOpen).catch(() => {});
      };

      previewContent = (
        <View style={[styles.previewContainer, styles.youtubePreviewContainer, { borderColor: accentColor, backgroundColor: previewBg }]}> 
          {!!youtubeThumbUrl && (
            <TouchableOpacity activeOpacity={0.84} onPress={onOpenYoutube}>
              <Image source={{ uri: youtubeThumbUrl }} style={styles.youtubeThumb} resizeMode="cover" />
            </TouchableOpacity>
          )}

          <View style={styles.previewOverlayRow}>
            <View style={[styles.previewBadge, { borderColor: accentColor, backgroundColor: colors.card }]}> 
              <Ionicons name="logo-youtube" size={12} color={accentColor} />
              <Text style={[styles.previewBadgeText, { color: accentColor }]}>{t('lectures.previewVideo')}</Text>
            </View>

            <TouchableOpacity
              style={[styles.previewPlayButton, { borderColor: accentColor, backgroundColor: colors.card }]}
              onPress={onOpenYoutube}
            >
              <Ionicons
                name={'open-outline'}
                size={14}
                color={accentColor}
              />
              <Text style={[styles.previewPlayText, { color: accentColor }]}> 
                {t('lectures.openInYoutube')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    } else if (asset.uploadType === LECTURE_UPLOAD_TYPES.FILE) {
      previewContent = (
        <View style={[styles.previewContainer, styles.filePreviewContainer, { borderColor: accentColor, backgroundColor: previewBg }]}> 
          <View style={[styles.fileExtBadge, { backgroundColor: accentColor }]}> 
            <Text style={styles.fileExtText}>{compactExt}</Text>
          </View>
          <View style={styles.previewMetaColumn}>
            <Text style={[styles.previewMetaTitle, { color: colors.text }]} numberOfLines={1}>
              {asset?.fileName || asset?.title}
            </Text>
            <Text style={[styles.previewMetaSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
              {asset?.fileSize ? `${formatBytesAsMb(asset.fileSize)} MB` : t('lectures.file')}
            </Text>
          </View>
          <Ionicons name="document-text-outline" size={18} color={accentColor} />
        </View>
      );
    } else {
      let hostname = asset?.externalUrl || '';
      try {
        hostname = new URL(asset?.externalUrl || '').hostname || hostname;
      } catch {
      }

      previewContent = (
        <View style={[styles.previewContainer, styles.linkPreviewContainer, { borderColor: accentColor, backgroundColor: previewBg }]}> 
          <View style={[styles.linkIconWrap, { borderColor: accentColor }]}> 
            <Ionicons name="link-outline" size={16} color={accentColor} />
          </View>
          <View style={styles.previewMetaColumn}>
            <Text style={[styles.previewMetaTitle, { color: colors.text }]} numberOfLines={1}>{t('lectures.previewLink')}</Text>
            <Text style={[styles.previewMetaSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>{hostname}</Text>
          </View>
          <Ionicons name="open-outline" size={16} color={accentColor} />
        </View>
      );
    }

    return (
      <TouchableOpacity
        onPress={() => openAsset(asset)}
        onLongPress={() => openAssetMenu(asset)}
        delayLongPress={260}
        style={[
          styles.assetCard,
          {
            borderColor: accentColor,
            backgroundColor: colors.card,
            minHeight: asset.uploadType === LECTURE_UPLOAD_TYPES.YOUTUBE
              ? moderateScale(210)
              : asset.uploadType === LECTURE_UPLOAD_TYPES.FILE
                ? moderateScale(134)
                : moderateScale(118),
          },
        ]}>
        <View style={styles.assetHeader}>
          <Text style={[styles.assetTitle, { color: colors.text }]} numberOfLines={2}>{asset.title}</Text>
          <Text style={[styles.assetType, { color: accentColor }]}>{typeText}</Text>
        </View>

        {previewContent}

        {!!asset.description && (
          <Text style={[styles.assetDescription, { color: colors.textSecondary }]} numberOfLines={2}>{asset.description}</Text>
        )}

        <View style={styles.assetStatsCompact}>
          <Text style={[styles.assetStatsLabel, { color: colors.textSecondary }]}>{t('lectures.longPressForActions')}</Text>
        </View>

        <View style={styles.assetActionsRow}>
          {!!asset.isPinned && <Text style={[styles.pinnedLabel, { color: colors.primary }]}>{t('lectures.pinned')}</Text>}
          <TouchableOpacity style={[styles.pinBtn, { borderColor: colors.border }]} onPress={() => openComments(asset)}>
            <Text style={[styles.pinBtnText, { color: colors.text }]}>{t('lectures.discussion')}</Text>
          </TouchableOpacity>
          {asset.uploadType === LECTURE_UPLOAD_TYPES.FILE && (
            <TouchableOpacity style={[styles.pinBtn, { borderColor: colors.border }]} onPress={() => handleDownloadAsset(asset)}>
              <Text style={[styles.pinBtnText, { color: colors.text }]}>{t('lectures.download')}</Text>
            </TouchableOpacity>
          )}
          {canViewAssetInfo(asset) && (
            <TouchableOpacity
              style={[styles.pinBtn, { borderColor: colors.border }]}
              onPress={() => {
                setAssetStatsTarget(asset);
                setAssetStatsOpen(true);
              }}>
              <Text style={[styles.pinBtnText, { color: colors.text }]}>{t('lectures.showStats')}</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('lectures.uploads')}</Text>
      <FlashList
        data={assetListData}
        keyExtractor={(item) => item.id}
        renderItem={renderAsset}
        scrollEnabled={false}
        ListEmptyComponent={!loading ? (
          <View style={styles.emptyWrap}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{t('lectures.noUploads')}</Text>
          </View>
        ) : null}
      />
    </>
  );
};

export default LectureAssetsList;
