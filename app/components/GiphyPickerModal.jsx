import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  FlatList,
  Image,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  useWindowDimensions,
  Pressable,
  Switch,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppSettings } from '../context/AppSettingsContext';
import {
  fontSize,
  spacing,
  moderateScale,
  wp,
} from '../utils/responsive';
import { borderRadius } from '../theme/designTokens';
import {
  searchGifs,
  searchStickers,
  trendingGifs,
  trendingStickers,
} from '../../services/giphyService';

const NUM_COLUMNS = 2;
const GRID_GAP = spacing.xs;
const DEBOUNCE_MS = 400;
const GIF_SEND_COOLDOWN_MS = 300;
const MAX_GRID_WIDTH = 700;

const GiphyPickerModal = ({ visible, onClose, onSelect }) => {
  const { theme, isDarkMode, t } = useAppSettings();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const effectiveWidth = Math.min(screenWidth, MAX_GRID_WIDTH);
  const itemWidth = useMemo(
    () => (effectiveWidth - spacing.md * 2 - GRID_GAP) / NUM_COLUMNS,
    [effectiveWidth]
  );
  const [activeTab, setActiveTab] = useState('gifs');
  const [query, setQuery] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [closeOnSelect, setCloseOnSelect] = useState(true);
  const [lastSentItemId, setLastSentItemId] = useState(null);
  const [sendFeedback, setSendFeedback] = useState(null);
  const debounceRef = useRef(null);
  const inputRef = useRef(null);
  const lastSendAtRef = useRef(0);
  const feedbackTimerRef = useRef(null);
  const sentMarkerTimerRef = useRef(null);

  const showSendFeedback = useCallback((type, message) => {
    setSendFeedback({ type, message });
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    feedbackTimerRef.current = setTimeout(() => {
      setSendFeedback(null);
    }, 1200);
  }, []);

  useEffect(() => {
    return () => {
      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
      if (sentMarkerTimerRef.current) clearTimeout(sentMarkerTimerRef.current);
    };
  }, []);

  const fetchData = useCallback(async (searchQuery, tab, pageOffset = 0, append = false) => {
    try {
      if (pageOffset === 0) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      let result;
      if (searchQuery.trim().length > 0) {
        result = tab === 'gifs'
          ? await searchGifs(searchQuery, pageOffset, 20)
          : await searchStickers(searchQuery, pageOffset, 20);
      } else {
        result = tab === 'gifs'
          ? await trendingGifs(pageOffset, 20)
          : await trendingStickers(pageOffset, 20);
      }

      if (append) {
        setItems(prev => [...prev, ...result.data]);
      } else {
        setItems(result.data);
      }
      setTotalCount(result.totalCount);
      setOffset(pageOffset + result.data.length);
    } catch {
      // Silently fail, keep existing items
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  // Load trending on mount / tab switch
  useEffect(() => {
    if (visible) {
      setOffset(0);
      fetchData(query, activeTab, 0, false);
    }
  }, [visible, activeTab]);

  // Debounced search
  useEffect(() => {
    if (!visible) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setOffset(0);
      fetchData(query, activeTab, 0, false);
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const handleLoadMore = () => {
    if (loadingMore || loading || offset >= totalCount) return;
    fetchData(query, activeTab, offset, true);
  };

  const handleSelect = async (item) => {
    const now = Date.now();
    if (now - lastSendAtRef.current < GIF_SEND_COOLDOWN_MS) {
      showSendFeedback('warning', t('chats.gifSendCooldown'));
      return;
    }
    lastSendAtRef.current = now;

    const payload = {
      id: item.id,
      url: item.url,
      previewUrl: item.previewUrl,
      width: item.width,
      height: item.height,
      aspectRatio: item.aspectRatio,
      title: item.title,
      source: 'giphy',
      type: activeTab === 'gifs' ? 'gif' : 'sticker',
    };

    let sent = true;
    if (onSelect) {
      const result = await onSelect(payload);
      sent = result !== false;
    }

    if (!sent) {
      showSendFeedback('error', t('chats.sendError'));
      return;
    }

    setLastSentItemId(item.id);
    if (sentMarkerTimerRef.current) clearTimeout(sentMarkerTimerRef.current);
    sentMarkerTimerRef.current = setTimeout(() => {
      setLastSentItemId(null);
    }, 900);
    showSendFeedback('success', t('chats.sentGif'));

    if (closeOnSelect) {
      onClose();
    }
  };

  const handleTabSwitch = (tab) => {
    if (tab === activeTab) return;
    setActiveTab(tab);
    setItems([]);
    setOffset(0);
  };

  const renderItem = ({ item }) => {
    const itemHeight = itemWidth / (item.aspectRatio || 1);
    return (
      <TouchableOpacity
        style={[
          styles.gridItem,
          {
            width: itemWidth,
            height: Math.min(itemHeight, itemWidth * 1.5),
            backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
          },
        ]}
        onPress={() => handleSelect(item)}
        activeOpacity={0.7}
      >
        <Image
          source={{ uri: item.previewUrl || item.url }}
          style={styles.gridImage}
          resizeMode="cover"
        />
        {lastSentItemId === item.id && (
          <View style={styles.sentOverlay}>
            <Ionicons name="checkmark-circle" size={moderateScale(22)} color="#FFFFFF" />
            <Text style={[styles.sentOverlayText, { fontSize: fontSize(11) }]}>
              {t('chats.messageSent')}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const bg = isDarkMode ? '#1a1a2e' : '#FFFFFF';
  const surfaceBg = isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)';

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: bg, paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={onClose}
            style={styles.closeButton}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="chevron-down" size={moderateScale(26)} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text, fontSize: fontSize(17) }]}>
            {activeTab === 'gifs'
              ? (t('chats.gifs') || 'GIFs')
              : (t('chats.stickers') || 'Stickers')}
          </Text>
          <View style={styles.closeButton} />
        </View>

        {/* Tab Switcher */}
        <View style={[styles.tabRow, { backgroundColor: surfaceBg }]}>
          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'gifs' && { backgroundColor: theme.primary },
            ]}
            onPress={() => handleTabSwitch('gifs')}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.tabText,
                {
                  fontSize: fontSize(13),
                  color: activeTab === 'gifs' ? '#FFFFFF' : theme.textSecondary,
                  fontWeight: activeTab === 'gifs' ? '600' : '400',
                },
              ]}
            >
              {t('chats.gifs') || 'GIFs'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'stickers' && { backgroundColor: theme.primary },
            ]}
            onPress={() => handleTabSwitch('stickers')}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.tabText,
                {
                  fontSize: fontSize(13),
                  color: activeTab === 'stickers' ? '#FFFFFF' : theme.textSecondary,
                  fontWeight: activeTab === 'stickers' ? '600' : '400',
                },
              ]}
            >
              {t('chats.stickers') || 'Stickers'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={[styles.searchBar, { backgroundColor: surfaceBg }]}>
          <Ionicons name="search" size={moderateScale(18)} color={theme.textSecondary} />
          <TextInput
            ref={inputRef}
            style={[styles.searchInput, { color: theme.text, fontSize: fontSize(14) }]}
            placeholder={
              activeTab === 'gifs'
                ? (t('chats.searchGifs') || 'Search GIFs...')
                : (t('chats.searchStickers') || 'Search Stickers...')
            }
            placeholderTextColor={theme.textSecondary}
            value={query}
            onChangeText={setQuery}
            autoCorrect={false}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <Ionicons name="close-circle" size={moderateScale(18)} color={theme.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        <View style={[styles.toggleRow, { backgroundColor: surfaceBg }]}>
          <Text style={[styles.toggleLabel, { color: theme.text, fontSize: fontSize(13) }]}>
            {t('chats.autoCloseGifPicker')}
          </Text>
          <Switch
            value={closeOnSelect}
            onValueChange={setCloseOnSelect}
            trackColor={{ false: theme.border, true: theme.primary }}
            thumbColor="#FFFFFF"
            ios_backgroundColor={theme.border}
          />
        </View>

        {sendFeedback && (
          <View
            style={[
              styles.feedbackRow,
              {
                backgroundColor:
                  sendFeedback.type === 'error'
                    ? (isDarkMode ? 'rgba(239,68,68,0.2)' : 'rgba(239,68,68,0.12)')
                    : sendFeedback.type === 'warning'
                      ? (isDarkMode ? 'rgba(245,158,11,0.2)' : 'rgba(245,158,11,0.12)')
                      : (isDarkMode ? 'rgba(52,199,89,0.2)' : 'rgba(52,199,89,0.12)'),
              },
            ]}
          >
            <Text style={[styles.feedbackText, { color: theme.text, fontSize: fontSize(12) }]}>
              {sendFeedback.message}
            </Text>
          </View>
        )}

        {/* Grid */}
        {loading && items.length === 0 ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={theme.primary} />
          </View>
        ) : items.length === 0 ? (
          <View style={styles.centered}>
            <Ionicons name="sad-outline" size={moderateScale(48)} color={theme.textSecondary} />
            <Text style={[styles.emptyText, { color: theme.textSecondary, fontSize: fontSize(14) }]}>
              {t('chats.noGifsFound') || 'No results found'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={items}
            renderItem={renderItem}
            keyExtractor={(item, index) => `${item.id}-${index}`}
            numColumns={NUM_COLUMNS}
            columnWrapperStyle={styles.columnWrapper}
            contentContainerStyle={styles.listContent}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.4}
            showsVerticalScrollIndicator={false}
            ListFooterComponent={
              loadingMore ? (
                <ActivityIndicator
                  style={styles.footer}
                  size="small"
                  color={theme.primary}
                />
              ) : null
            }
          />
        )}

        {/* Powered by Giphy attribution */}
        <View style={styles.attribution}>
          <Text style={[styles.attributionText, { color: theme.textSecondary, fontSize: fontSize(10) }]}>
            Powered by GIPHY
          </Text>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  closeButton: {
    width: moderateScale(40),
    height: moderateScale(40),
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontWeight: '700',
  },
  tabRow: {
    flexDirection: 'row',
    marginHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    padding: spacing.xs / 2,
    marginBottom: spacing.sm,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  tabText: {},
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.md,
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: Platform.OS === 'ios' ? spacing.sm : spacing.xs,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    minHeight: moderateScale(20),
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
  },
  toggleLabel: {
    fontWeight: '500',
    flex: 1,
    marginRight: spacing.sm,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
  },
  emptyText: {
    fontWeight: '500',
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
  },
  columnWrapper: {
    gap: GRID_GAP,
    marginBottom: GRID_GAP,
  },
  gridItem: {
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  gridImage: {
    width: '100%',
    height: '100%',
  },
  sentOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xs,
  },
  sentOverlayText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  feedbackRow: {
    marginHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    marginBottom: spacing.sm,
    alignItems: 'center',
  },
  feedbackText: {
    fontWeight: '600',
  },
  footer: {
    paddingVertical: spacing.lg,
  },
  attribution: {
    paddingVertical: spacing.xs,
    alignItems: 'center',
  },
  attributionText: {
    fontWeight: '500',
    letterSpacing: 0.5,
  },
});

export default GiphyPickerModal;
