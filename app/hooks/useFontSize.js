import { useAppSettings } from '../context/AppSettingsContext';
import { fontSize as responsiveFontSize, moderateScale } from '../utils/responsive';

/**
 * Hook that returns a font size function that respects the user's font scale setting
 * @returns {Object} Object containing the scaledFontSize function and current fontScale
 */
export const useFontSize = () => {
  const { fontScale } = useAppSettings();

  /**
   * Returns a responsive font size adjusted by the user's font scale preference
   * @param {number} size - The base font size
   * @returns {number} The scaled font size
   */
  const scaledFontSize = (size) => {
    const result = responsiveFontSize(size * fontScale);
    return result;
  };

  /**
   * Returns a moderate scale adjusted by the user's font scale preference
   * @param {number} size - The base size
   * @returns {number} The scaled size
   */
  const scaledModerateSize = (size) => {
    return moderateScale(size * fontScale);
  };

  return {
    scaledFontSize,
    scaledModerateSize,
    fontScale,
  };
};

export default useFontSize;
