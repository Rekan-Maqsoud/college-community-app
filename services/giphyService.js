import { GiphyFetch } from '@giphy/js-fetch-api';

const GIPHY_API_KEY = process.env.EXPO_PUBLIC_GIPHY_API_KEY;

if (!GIPHY_API_KEY) {
  console.warn('[GiphyService] EXPO_PUBLIC_GIPHY_API_KEY is not set in .env');
}

const gf = new GiphyFetch(GIPHY_API_KEY || '');

/**
 * Search GIFs from Giphy
 * @param {string} query - Search term
 * @param {number} offset - Pagination offset
 * @param {number} limit - Results per page
 * @returns {Promise<{data: Array, totalCount: number}>}
 */
export const searchGifs = async (query, offset = 0, limit = 20) => {
  try {
    const result = await gf.search(query, { offset, limit, type: 'gifs' });
    return {
      data: result.data.map(formatGiphyItem),
      totalCount: result.pagination.total_count,
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Search Stickers from Giphy
 * @param {string} query - Search term
 * @param {number} offset - Pagination offset
 * @param {number} limit - Results per page
 * @returns {Promise<{data: Array, totalCount: number}>}
 */
export const searchStickers = async (query, offset = 0, limit = 20) => {
  try {
    const result = await gf.search(query, { offset, limit, type: 'stickers' });
    return {
      data: result.data.map(formatGiphyItem),
      totalCount: result.pagination.total_count,
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Get trending GIFs from Giphy
 * @param {number} offset - Pagination offset
 * @param {number} limit - Results per page
 * @returns {Promise<{data: Array, totalCount: number}>}
 */
export const trendingGifs = async (offset = 0, limit = 20) => {
  try {
    const result = await gf.trending({ offset, limit, type: 'gifs' });
    return {
      data: result.data.map(formatGiphyItem),
      totalCount: result.pagination.total_count,
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Get trending Stickers from Giphy
 * @param {number} offset - Pagination offset
 * @param {number} limit - Results per page
 * @returns {Promise<{data: Array, totalCount: number}>}
 */
export const trendingStickers = async (offset = 0, limit = 20) => {
  try {
    const result = await gf.trending({ offset, limit, type: 'stickers' });
    return {
      data: result.data.map(formatGiphyItem),
      totalCount: result.pagination.total_count,
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Format a Giphy API item into our app's GIF metadata structure
 * @param {Object} item - Raw Giphy API object
 * @returns {Object} Normalized gif metadata
 */
const formatGiphyItem = (item) => {
  const original = item.images?.original || {};
  const fixedWidth = item.images?.fixed_width || {};
  const preview = item.images?.fixed_width_small || fixedWidth;

  return {
    id: item.id,
    title: item.title || '',
    url: original.url || fixedWidth.url || '',
    previewUrl: preview.url || fixedWidth.url || '',
    width: parseInt(original.width, 10) || 200,
    height: parseInt(original.height, 10) || 200,
    aspectRatio: (parseInt(original.width, 10) || 200) / (parseInt(original.height, 10) || 200),
    source: 'giphy',
  };
};

export default gf;
